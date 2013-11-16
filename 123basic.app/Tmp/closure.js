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
	return "Uncought 123Basic Exception '"+this.text+"' stacktrace: "+STACKTRACE_Str();
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
	//var obj = callStack.pop();
	//__debugInfo = obj.dbg;
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
		return cur != to;
	}
	//return (step > 0) ? (cur <= to) : ((step > 0) ? (cur >= to) : true);
}

function untilCheck(cur, to, step) {
	if (step > 0) {
		return cur < to;
	} else if(step < 0) {
		return cur > to;
	} else {
		return true;
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
	if (value instanceof Array) { //not sure about this
		return [CAST2INT(value[0])];
	} else {
		switch (typeof value) {
			case 'function':
				return 1;
			case 'undefined':
				throwError("Cannot cast 'undefined'");
			case 'number':
				return ~~value; //experimental
				//if (value < 0) return Math.ceil(value); else if (value > 0) return Math.floor(value); else return 0;
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
	return this;
}

//Klonen!
OTTArray.prototype.clone = function() {
	var other = new OTTArray();
	
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
			if (this.values != undefined && this.dimensions != undefined) {
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
	tmpPositionCache = 0;
	
	for (var i = arguments.length-1; i >= 0 ; i--) {
		if (i >= this.dimensions.length) throwError("Wrong dimension count '"+(arguments.length-1)+"' expected '"+this.dimensions.length+"'");
		
		var position = arguments[i]; //CAST2INT( normalerweise sollten access automatisch nach INT gecastet worden sein!
		
		if (position < 0)
			position = (this.dimensions[i] + position);
		
		if (position < 0 || position >= this.dimensions[i]) throwError("Array index out of bounds access, position: "+dumpArray(arguments));
		
		arrargs[i] = position;
	}
	
	
	switch (arguments.length) {
		case 1:
			tmpPositionCache = arrargs[0];
			break;
		case 2:
			tmpPositionCache = arrargs[0] + arrargs[1]*this.dimensions[0];
			break;
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
	
	return this;
}

function realArrSize(dims) {
	var realSize = 1;
	for(d in dims) {
		dims[d] = CAST2INT(dims[d]);
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
	vari.dimensions = dims;
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
	
	
	//OBACHT könnte bei mehrdimensionalen arrys unerwartete ergebnisse liefern, wenn man elemente rauslöscht
	vari.values.length = realArrSize(dims);
	var start = oldLength;
	if (doDim) start = 0;
	for(i = start; i < vari.values.length; i++) {
		if (vari.values[i]) {
			if (action == 1) {
				//Es muss ein Array sein
				vari.values[i] = [vari.values[i]];
			} else if (action == 2) {
				//Es darf kein Array sein
				vari.values[i] = vari.values[i][0];
			}
		} else {
			//default wert geben
			vari.values[i] = tryClone(vari.defval);
		}
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
	//OBACHT könnte bei mehrdimensionalen arrys unerwartete ergebnisse liefern, wenn man elemente rauslöscht
	array.values.splice(position, 1);
	array.dimensions[0]--;
}

function DIMDATA(array, values) {
	array.values = values;
	array.dimensions = [values.length];
}


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
	return (range+1) * random();
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
					throwError("TODO: Default sortarray with types!");
					return;
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
			
			init2D('OTTCANVAS');
		}
	}
});


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

var waitForFont = false;

var sub_loadingName = "GLB_ON_LOADING";
var sub_loopName = "GLB_ON_LOOP";

//------------------------------------------------------------
// Basic 2D stuff
//------------------------------------------------------------

var doCurrentFunction = function() {
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
			} else {
				canvasWidth = canvas.width; 
				canvasHeight = canvas.height;
				canvasOffsetLeft = getOffsetLeft(canvas);
				canvasOffsetTop = getOffsetTop(canvas);
				
				
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
	} catch(ex) {
		if (!(ex instanceof OTTExitException)) throw(formatError(ex));
	}
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
		USESCREEN(-2);
		CLEARSCREEN(clrColor);
		USESCREEN(-1);
		frontbuffer.context.drawImage(backbuffer.canvas,0, 0);
		CLEARSCREEN(clrColor);
		//nun noch falls vorhanden den bg zeichnen
		if (!!background) {
			backbuffer.context.drawImage(background, 0, 0);
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
	
	frontbuffer = new Screen(document.getElementById(canvasName), -2);
	register(frontbuffer);
	
	var cnvs = document.createElement('canvas');
	cnvs.width = frontbuffer.canvas.width
	cnvs.height = frontbuffer.canvas.height
	backbuffer = new Screen(cnvs, -1);
	register(backbuffer);
	
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
		context.globalCompositeOperation = 'source-atop'; // TODO
		val = 1 - (1 + mode);
	} else if (mode > 0) {
		context.globalCompositeOperation = 'lighter';
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
	r = r%256; g = g%256; b = b%256
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
	throwError("TODO: allowescape");
}

function AUTOPAUSE(mode) {
	throwError("TODO: autopause");
}

function HIBERNATE() {
	hibernate = true;
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
	context.moveTo(CAST2INT(x1), CAST2INT(y1));
	context.lineTo(CAST2INT(x2), CAST2INT(y2));
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
		context.fillRect(CAST2INT(x), CAST2INT(y), CAST2INT(w), CAST2INT(h));
		context.restore();
	}
}

function formatColor(col) {
	col = col.toString(16);
	while(col.length<6) {
		col = "00"+col;
	}
	return '#'+col;
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
				
				var charwidth = null, charheight = null;
				var is256 = height > width;
				charwidth = INTEGER(width/16);
				charheight = INTEGER(height/(is256 ? 16 : 8));
				
				
				font.charwidth = charwidth;
				font.charheight = charheight;
				
				for (var y = fy; y < height; y += charheight) {
					for (var x = fx; x < width; x += charwidth) {
						var realwidth = charwidth;
						
						var startx, endx;
						
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
						
						if (endx > startx) {
							realwidth = (endx - startx) + 1;
						} else {
							realwidth = charwidth;
						}
						
						font.chars[i] = {
							x: x, y: y,
							
							//kerning data
							width: realwidth+6
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
				var pos;
				if (kerning) {
					pos = x-~~(font.charwidth/2+.5)+~~(c.width/2+.5);
				} else {
					pos = x;
				}
				
				context.drawImage(font.img, c.x, c.y, font.charwidth, font.charheight, pos, y, font.charwidth, font.charheight);
				
				
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
				soundEngine.newSource(curChn);
			}
			
			if (sound.loop) {
				curChn.source.loop = true;
			}
			// clear timeout if exists
			if (!!curChn.timeout) {
				clearTimeout(curChn.timeout);
				curChn.timeout = null;
			}
			
			
			curChn.playing = true;
			var startPos = 0;
			if (!!curChn.pauseTime) {
				curChn.startTime = GETTIMERALL() - curChn.pauseTime;
				curChn.source.start(0, startPos = (curChn.pauseTime / 1000));
			} else {
				curChn.startTime = GETTIMERALL();
				curChn.source.start(0);
			}
			
			curChn.panner.setPosition(pan*5, 0, 0);
			curChn.gainNode.gain.value = volume;
			
			curChn.timeout = setTimeout(function() {
				soundEngine.stop(curChn);
			}, (curChn.sound.data.duration+1)*1000 - startPos*1000);
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
				
				// new
				soundEngine.newSource(channel);
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
		newSource: function(channel) {
			channel.gainNode = audioContext.createGain();
			channel.panner = audioContext.createPanner();
			channel.source = audioContext.createBufferSource();
			
			if (!channel.source.start) channel.source.start = channel.source.noteOn;
			if (!channel.source.stop) channel.source.stop = channel.source.noteOff;
			
			channel.source.buffer = channel.sound.data;
			// channel.source.connect(audioContext.destination);
			
			channel.startTime = null; // used when pausing
			channel.pauseTime = null; // used when pausing
			
			channel.source.connect(channel.gainNode);
			channel.gainNode.connect(channel.panner);
			channel.panner.connect(audioContext.destination);
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
						(function() {
							var channel = new SoundChannel(sound);
							soundEngine.newSource(channel);
							sound.buffers[i] = channel;
							channel.timeout = null; // when audio is finished
							channel.finishedLoading();
						})();
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

window.AudioContext = window.AudioContext||window.webkitAudioContext||window.mozAudioContext||window.msAudioContext||window.oAudioContext;
var audioContext;
if (!!window.AudioContext) {
	try {
		audioContext = new AudioContext();
		if (!audioContext.createGain) audioContext.createGain = audioContext.createGainNode
		
		audioContext.listener.setPosition(0,0,0);
	} catch(e) {
		audioContext = null;
	}
}

var soundEngine =  !!audioContext ? engines.WEBAUDIO : engines.AUDIO; // which sound engine is currently being used
var sounds = [];
var soundChannels = [ ];
var music = null, musicVolume = 1;

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
	if (file == "") {
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
	if (file == "") {
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
				spr.frames.push({posx: x, posy: y});
			}
		}
	}
}

function LOADANIM(path,num, width, height) {
	LOADSPRITE(path, num, width, height);
	SETSPRITEANIM(num, width, height);
}


function MEM2SPRITE(pixels, num, width, height) {
	var buf = document.createElement('canvas');
	buf.width = width;
	buf.height = height;
	var spr = new Sprite(buf, num);
	register(spr);
	spr.loaded = true;
	var scrn = new Screen(buf, -42);
	try {
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
				
				if (a == -1) a = 255;
				
				pos *= 4;
				data[pos]   = r; 
				data[pos+1] = g;
				data[pos+2] = b;
				data[pos+3] = a;
			}
		}
		scrn.context.putImageData(imageData, 0, 0);
	} catch(ex) {
		//kann keine imagedata holen
		return 0;
	}
	return 1;
}

function SPRITE2MEM(pixels, num) {
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
	
	//data modifizieren
	try {
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
	}  catch(ex) {
		//kann keine imagedata holen
		return 0;
	}
	
	return 1;
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
var tmpPolyStack = new Array(3);

function ENDPOLY() {
	if (!inPoly) throwError("ENDPOLY has to be in STARTPOLY - ENDPOLY ");
	if (polyStack.length > 0) {
		//schließen!
		if (polyStack.length == 4) {
			POLYNEWSTRIP();
		} else {
			context.save();
			//Zeichnen
			if (mode == 1) {
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
						
						drawPolygon(false, simpletris, tmpPolyStack, spr); //TODO: plzTint Parameter
					}
				}
			} else if (mode == 0) {
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
						drawPolygon(false, simpletris, tmpPolyStack, spr); //TODO: plzTint Parameter
					}
				}
			} else if (mode == 2) {
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

var simpletris = [[0, 1, 2]];
var tris2 = [[0, 1, 2], [2, 3, 1]];
var tris1 = [[0, 1, 2], [2, 3, 0]];

function POLYNEWSTRIP() {
	if (!inPoly) throwError("POLYNEWSTRIP has to be in STARTPOLY - ENDPOLY ");
		
	context.save();
	if (num == -1) {
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
		var tris
		if (mode == 2) {
			tris = tris2;
		} else if (mode == 1) {
			tris =  tris1;
		} else if (mode == 0){
			tris = tris1 //TODO;
		}else {
			throwError("Invalid drawing mode!")
		}
		
		var spr = getSprite(num);
		
		//muss das sprite gefärbt werden?
		var plzTint;
		if (polyStack[0].col != whiteRGB && polyStack[1].col != whiteRGB && polyStack[2].col != whiteRGB  && polyStack[2].col != whiteRGB) {
			plzTint = true;
		} else {
			plzTint = false;
		}
		
		
		drawPolygon(plzTint, tris, polyStack, spr);
	}
	
	context.restore();
	
	polyStack.length = 0; //anstatt = []
}

function drawPolygon(plzTint, tris, polyStack, spr) {
	if (plzTint) {
		var tmpAlpha = context.globalAlpha;
		var tmpOperation = context.globalCompositeOperation;
	}
	
	var pts = polyStack
	for (var t=0; t<tris.length; t++) {
		var pp = tris[t];
		var x0 = pts[pp[0]].x, x1 = pts[pp[1]].x, x2 = pts[pp[2]].x;
		var y0 = pts[pp[0]].y, y1 = pts[pp[1]].y, y2 = pts[pp[2]].y;
		var u0 = pts[pp[0]].u, u1 = pts[pp[1]].u, u2 = pts[pp[2]].u;
		var v0 = pts[pp[0]].v, v1 = pts[pp[1]].v, v2 = pts[pp[2]].v;

		// Set clipping area so that only pixels inside the triangle will
		// be affected by the image drawing operation
		context.save(); context.beginPath(); context.moveTo(x0, y0); context.lineTo(x1, y1);
		context.lineTo(x2, y2); context.closePath(); context.clip();

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

		// Draw the transformed image
		context.transform(delta_a/delta, delta_d/delta,
					  delta_b/delta, delta_e/delta,
					  delta_c/delta, delta_f/delta);
		
		if (plzTint) {
			//schauen ob alle gleiche Farbe haben
			if (polyStack[0].col == polyStack[1].col && polyStack[1].col == polyStack[2].col && (polyStack.length > 2 && polyStack[2].col == polyStack[3].col)) {
				if (!spr.tint) {
				//Hat noch nicht die Tinting Farbchannel
					try {
						//farbkanäle holen!
						spr.tint = generateRGBKs(spr.img);
					} catch (ex) {
						domExceptionError(ex);
					}
				}
				if (spr.tint) {
					//selbe farbe \o/
					
					var red = (polyStack[t].col & 0xFF0000)/0x10000 
					var green = (polyStack[t].col & 0xFF00)/0x100 
					var blue = polyStack[t].col & 0xFF 
					
					context.globalAlpha = 1;
					context.globalCompositeOperation = 'copy';
					context.drawImage( spr.tint[3], 0, 0 );

					context.globalCompositeOperation = 'lighter';
					if ( red > 0 ) {
						context.globalAlpha = red   / 255.0;
						context.drawImage( spr.tint[0], 0, 0 );
					}
					if ( green > 0 ) {
						context.globalAlpha = green / 255.0;
						context.drawImage( spr.tint[1], 0, 0 );
					}
					if ( blue > 0 ) {
						context.globalAlpha = blue  / 255.0;
						context.drawImage( spr.tint[2], 0, 0 );
					}
					
					
				} else {
					//Kann nicht tinten...
				}
			} else {
				//Die Farbe ist ein Farbverlauf!
				//Das kann ich noch nicht...
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
	
	if (polyStack[polyStack.length]) {
		//existiert bereits!
		polyStack[polyStack.length].x = posx;
		polyStack[polyStack.length].y = posy;
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
	if ((phi%360) == 0) {
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
	if (sx == 1 && sy == 1) {
		DRAWSPRITE(num, x, y);
	} else if (sx != 0 && sy != 0){
		context.save();
		var spr = getSprite(num);
		var dx = 0, dy = 0
		if (sx < 0) dx = spr.img.width*sx;
		if (sy < 0) dy = spr.img.height*sy;
		
		context.translate(x-dx,y-dy);
		context.scale(sx, sy);
		DRAWSPRITE(num, 0, 0);
		context.restore();
	}
}

function STRETCHSPRITE(num,  x, y, width, height) {
	var spr = getSprite(num);
	if (width != 0 && height != 0) {
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
	if (spr.frames == null) throwError("DRAWANIM can only draw an animation!");
	frame = frame % spr.frames.length;
	if (frame < 0) throwError("Invalid frame '"+frame+"'");
	context.drawImage(spr.img, ~~(spr.frames[frame].posx+.5), ~~(spr.frames[frame].posy+.5), spr.frameWidth, spr.frameHeight, CAST2INT(x), CAST2INT(y), spr.frameWidth, spr.frameHeight);
}

function ROTOZOOMANIM(num, frame, x, y,phi, scale) {
	context.save();
	context.translate(x, y)
	context.scale(scale, scale);
	ROTOANIM(num, frame, 0, 0, phi);
	context.restore();
}

function ROTOANIM(num, frame, x, y, phi) {
	if ((phi%360) == 0) {
		DRAWANIM(num, frame, x, y);
	} else {
		context.save();
		context.translate(x, y);
		context.rotate(phi * Math.PI / 180); //convert into RAD
		DRAWSPRITE(num, -spr.img.width/2, -spr.img.height/2);
		context.restore();
	}
}

function ZOOMANIM(num,frame, x, y, sx, sy) {
	if (sx == 1 && sy == 1) {
		DRAWANIM(num,frame, x, y);
	} else if (sx != 0 && sy != 0){
		context.save();
		context.translate(x, y);
		context.scale(sx, sy);
		DRAWANIM(num,frame, 0, 0);
		context.restore();
	}
}

function STRETCHANIM(num,frame,  x, y, width, height) {
	var spr = getSprite(num);
	if (width != 0 && height != 0) {
		context.save();
		var sx = width/spr.img.frameWidth, sy = height/spr.img.frameHeight;
		context.translate(x, y);
		context.scale(sx, sy);
		DRAWANIM(num,frame, 0, 0);
		context.restore();
	}
}

function GRABSPRITE(num, x, y, width, height) {
	if (width < 1 || height < 1) throwError("Invalid width/height!");
	try {
		var data = context.getImageData(x, y, width, height);
		
		var canvas = document.createElement('canvas');
		canvas.width = width;
		canvas.height = height;
		var ctxt = canvas.getContext("2d");
		ctxt.putImageData(data, 0, 0);
		
		var spr = new Sprite(canvas, num);
		spr.loaded = true;
		register(spr);
	}  catch(ex) {
		//kann keine imagedata holen
		domExceptionError(ex);
	}
}
//------------------------------------------------------------
//collision
//------------------------------------------------------------

function SPRCOLL(spr1, x1, y1, spr2, x2, y2) {
	//throwError("TODO: sprcoll");
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

function ANIMCOLL(ani1, tile, x1, y1, ani2, time2, x2, y2) {
	throwError("TODO: animcoll");
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

		rgbks.push( imgComp );
	}

	return rgbks;
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
	background = backbuffer.canvas;
	var buffer = document.createElement('canvas');
    buffer.width = canvasWidth;
    buffer.height = canvasHeight;
	backbuffer = new Screen(buffer, -1);
	register(backbuffer);
	USESCREEN(-1);
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
var static10_DDgui_show_intern_mouse_down = 0, static10_DDgui_show_intern_movemousex = 0, static10_DDgui_show_intern_movemousey = 0, static12_DDgui_show_intern_ToolTipDelay = 0, static9_DDgui_show_intern_ToolTipMx = 0, static9_DDgui_show_intern_ToolTipMy = 0;
var static9_DDgui_draw_widget_intern_lines_Str = new OTTArray("");
var static7_DDgui_backgnd_QuickGL = 0;
var static9_DDgui_drawwidget_dummy_Str_ref = [""];
var static9_DDgui_handlewidget_dummy_Str_ref = [""];
var static7_DDgui_radio_opt_Str = new OTTArray("");
var static7_DDgui_handleradio_txt_Str = new OTTArray("");
var static7_DDgui_list_opt_Str = new OTTArray("");
var static7_DDgui_drawlist_opt_Str_ref = [new OTTArray([""])];
var static11_ddgui_handletext_st_lasttime = 0, static10_ddgui_handletext_st_lastkey = 0;
var static7_DDgui_drawtab_str_Str = new OTTArray(""), static8_DDgui_drawtab_str2_Str_ref = [new OTTArray([""])];
var static7_DDgui_handletab_str_Str = new OTTArray(""), static8_DDgui_handletab_str2_Str_ref = [new OTTArray([""])];
var static7_DDgui_selecttab_str_Str = new OTTArray(""), static8_DDgui_selecttab_str2_Str_ref = [new OTTArray([""])];
var __debugInfo = "";
var debugMode = true;
window['main'] = function(){
	stackPush("main", __debugInfo);
	try {
		__debugInfo = "14:\ddgui.gbas";
		global25_gDDguiMinControlDimension = 32;
		__debugInfo = "15:\ddgui.gbas";
		global20_DDGUI_AUTO_INPUT_DLG = 1;
		__debugInfo = "17:\ddgui.gbas";
		GLB_ON_INIT();
		__debugInfo = "218:\ddgui.gbas";
		global17_gDDguiCaretColour = 0;
		__debugInfo = "14:\ddgui.gbas";
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
}
window['GLB_ON_LOOP'] = function() {
	stackPush("sub: GLB_ON_LOOP", __debugInfo);
	try {
		var local3_now_1609 = 0;
		__debugInfo = "29:\ddgui.gbas";
		global3_old = ~~(GETTIMERALL());
		__debugInfo = "30:\ddgui.gbas";
		func10_DDgui_show(0);
		__debugInfo = "45:\ddgui.gbas";
		local3_now_1609 = ~~(GETTIMERALL());
		__debugInfo = "46:\ddgui.gbas";
		global5_delta+=((local3_now_1609) - (global3_old));
		__debugInfo = "47:\ddgui.gbas";
		global5_flips+=1;
		__debugInfo = "53:\ddgui.gbas";
		if ((((global5_flips) > (300)) ? 1 : 0)) {
			__debugInfo = "49:\ddgui.gbas";
			global2_nt = 1000;
			__debugInfo = "50:\ddgui.gbas";
			global3_fps = ~~(global5_delta);
			__debugInfo = "51:\ddgui.gbas";
			global5_delta = 0;
			__debugInfo = "52:\ddgui.gbas";
			global5_flips = 0;
			__debugInfo = "49:\ddgui.gbas";
		};
		__debugInfo = "54:\ddgui.gbas";
		PRINT((("fps:") + (CAST2STRING(INTEGER(global3_fps)))), 0, 0, 0);
		__debugInfo = "57:\ddgui.gbas";
		SHOWSCREEN();
		__debugInfo = "29:\ddgui.gbas";
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
window['GLB_ON_INIT'] = function() {
	stackPush("sub: GLB_ON_INIT", __debugInfo);
	try {
		__debugInfo = "69:\ddgui.gbas";
		func16_DDgui_pushdialog(0, 0, 300, 300, 0);
		__debugInfo = "72:\ddgui.gbas";
		func9_DDgui_set("", "MOVEABLE", CAST2STRING(1));
		__debugInfo = "74:\ddgui.gbas";
		func12_DDgui_widget("", "Static Text", 0, 0);
		__debugInfo = "75:\ddgui.gbas";
		func12_DDgui_spacer(10000, 20);
		__debugInfo = "83:\ddgui.gbas";
		func9_DDgui_tab("tab1", (((("Lig_sts,ls_test,ra_test|") + ("Buttons,fr_buttons|"))) + ("Texts,st_text,tx_test")), 0);
		__debugInfo = "88:\ddgui.gbas";
		func11_DDgui_combo("ls_test", "one|two|three", 0, 0);
		__debugInfo = "89:\ddgui.gbas";
		func12_DDgui_spacer(10000, 0);
		__debugInfo = "90:\ddgui.gbas";
		func11_DDgui_radio("ra_test", "red|green|blue", 0);
		__debugInfo = "91:\ddgui.gbas";
		func12_DDgui_slider("sl_test", 0.5, 0, 0);
		__debugInfo = "92:\ddgui.gbas";
		func12_DDgui_spacer(10000, 0);
		__debugInfo = "94:\ddgui.gbas";
		func16_DDgui_framestart("fr_buttons", "", 0);
		__debugInfo = "95:\ddgui.gbas";
		func12_DDgui_button("bt_complex", "complex dialog", 0, 0);
		__debugInfo = "96:\ddgui.gbas";
		func12_DDgui_button("bt_col", (("SPR_C") + (CAST2STRING(RGB(255, 0, 255)))), 0, 0);
		__debugInfo = "97:\ddgui.gbas";
		func12_DDgui_button("bt_disable", "readonly", 0, 0);
		__debugInfo = "98:\ddgui.gbas";
		func9_DDgui_set("bt_disable", "READONLY", CAST2STRING(1));
		__debugInfo = "102:\ddgui.gbas";
		func14_DDgui_frameend();
		__debugInfo = "104:\ddgui.gbas";
		func12_DDgui_widget("st_text", "Write text here:", 0, 0);
		__debugInfo = "105:\ddgui.gbas";
		func12_DDgui_spacer(10000, 0);
		__debugInfo = "106:\ddgui.gbas";
		func10_DDgui_text("tx_test", "Some text\nnext line", 150, 75);
		__debugInfo = "107:\ddgui.gbas";
		func12_DDgui_spacer(10000, 20);
		__debugInfo = "108:\ddgui.gbas";
		func16_DDgui_singletext("tx_sin", "SingleText", 150);
		__debugInfo = "109:\ddgui.gbas";
		func16_DDgui_numbertext("tx_num", "123.1233", 150);
		__debugInfo = "69:\ddgui.gbas";
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
window['func11_DDgui_index'] = function(param10_ddgui_vals, param8_name_Str_ref, param6_create) {
	stackPush("function: DDgui_index", __debugInfo);
	try {
		var local2_up_2248 = 0, local2_dn_2249 = 0, local3_mid_2250 = 0;
		__debugInfo = "354:\ddgui.gbas";
		local2_up_2248 = 0;
		__debugInfo = "355:\ddgui.gbas";
		local2_dn_2249 = ((BOUNDS(param10_ddgui_vals.attr7_widgets_ref[0], 0)) - (1));
		__debugInfo = "367:\ddgui.gbas";
		while ((((local2_up_2248) < (local2_dn_2249)) ? 1 : 0)) {
			__debugInfo = "357:\ddgui.gbas";
			local3_mid_2250 = CAST2INT(((((local2_up_2248) + (local2_dn_2249))) / (2)));
			__debugInfo = "366:\ddgui.gbas";
			if (((strcmp((param10_ddgui_vals.attr7_widgets_ref[0].arrAccess(local3_mid_2250).values[tmpPositionCache][0].attr7_wid_Str), (param8_name_Str_ref[0]))  == 1 ) ? 1 : 0)) {
				__debugInfo = "359:\ddgui.gbas";
				local2_dn_2249 = MAX(((local3_mid_2250) - (1)), local2_up_2248);
				__debugInfo = "359:\ddgui.gbas";
			} else {
				__debugInfo = "365:\ddgui.gbas";
				if (((strcmp((param10_ddgui_vals.attr7_widgets_ref[0].arrAccess(local3_mid_2250).values[tmpPositionCache][0].attr7_wid_Str), (param8_name_Str_ref[0]))  == -1 ) ? 1 : 0)) {
					__debugInfo = "362:\ddgui.gbas";
					local2_up_2248 = MIN(local2_dn_2249, ((local3_mid_2250) + (1)));
					__debugInfo = "362:\ddgui.gbas";
				} else {
					__debugInfo = "364:\ddgui.gbas";
					return tryClone(local3_mid_2250);
					__debugInfo = "364:\ddgui.gbas";
				};
				__debugInfo = "365:\ddgui.gbas";
			};
			__debugInfo = "357:\ddgui.gbas";
		};
		__debugInfo = "369:\ddgui.gbas";
		if ((((BOUNDS(param10_ddgui_vals.attr7_widgets_ref[0], 0)) && ((((param10_ddgui_vals.attr7_widgets_ref[0].arrAccess(local2_up_2248).values[tmpPositionCache][0].attr7_wid_Str) == (param8_name_Str_ref[0])) ? 1 : 0))) ? 1 : 0)) {
			__debugInfo = "369:\ddgui.gbas";
			return tryClone(local2_up_2248);
			__debugInfo = "369:\ddgui.gbas";
		};
		__debugInfo = "396:\ddgui.gbas";
		if (param6_create) {
			var local4_widg_2251 = new type9_DDGUI_WDG(), local5_order_2252 = new type11_DDGUI_ORDER();
			__debugInfo = "374:\ddgui.gbas";
			local2_dn_2249 = BOUNDS(param10_ddgui_vals.attr7_widgets_ref[0], 0);
			__debugInfo = "375:\ddgui.gbas";
			REDIM(unref(param10_ddgui_vals.attr7_widgets_ref[0]), [((local2_dn_2249) + (1))], [new type9_DDGUI_WDG()] );
			__debugInfo = "375:\ddgui.gbas";
			{
				__debugInfo = "378:\ddgui.gbas";
				for (local3_mid_2250 = local2_dn_2249;toCheck(local3_mid_2250, ((local2_up_2248) + (1)), -(1));local3_mid_2250 += -(1)) {
					__debugInfo = "377:\ddgui.gbas";
					param10_ddgui_vals.attr7_widgets_ref[0].arrAccess(local3_mid_2250).values[tmpPositionCache][0] = param10_ddgui_vals.attr7_widgets_ref[0].arrAccess(((local3_mid_2250) - (1))).values[tmpPositionCache][0].clone(/* In Assign */);
					__debugInfo = "377:\ddgui.gbas";
				};
				__debugInfo = "378:\ddgui.gbas";
			};
			__debugInfo = "379:\ddgui.gbas";
			if (((((((local2_dn_2249) > (0)) ? 1 : 0)) && (((strcmp((param10_ddgui_vals.attr7_widgets_ref[0].arrAccess(local2_up_2248).values[tmpPositionCache][0].attr7_wid_Str), (param8_name_Str_ref[0]))  == -1 ) ? 1 : 0))) ? 1 : 0)) {
				__debugInfo = "379:\ddgui.gbas";
				local2_up_2248 = ((local2_up_2248) + (1));
				__debugInfo = "379:\ddgui.gbas";
			};
			__debugInfo = "381:\ddgui.gbas";
			local4_widg_2251.attr7_wid_Str = param8_name_Str_ref[0];
			__debugInfo = "382:\ddgui.gbas";
			param10_ddgui_vals.attr7_widgets_ref[0].arrAccess(local2_up_2248).values[tmpPositionCache][0] = local4_widg_2251.clone(/* In Assign */);
			__debugInfo = "386:\ddgui.gbas";
			local5_order_2252.attr6_id_Str_ref[0] = param8_name_Str_ref[0];
			__debugInfo = "387:\ddgui.gbas";
			DIMPUSH(param10_ddgui_vals.attr9_draworder, local5_order_2252);
			__debugInfo = "393:\ddgui.gbas";
			var forEachSaver13825 = param10_ddgui_vals.attr9_draworder;
			for(var forEachCounter13825 = 0 ; forEachCounter13825 < forEachSaver13825.values.length ; forEachCounter13825++) {
				var local2_od_2253 = forEachSaver13825.values[forEachCounter13825];
			{
					__debugInfo = "392:\ddgui.gbas";
					local2_od_2253.attr5_index = func11_DDgui_index(param10_ddgui_vals, local2_od_2253.attr6_id_Str_ref, 0);
					__debugInfo = "392:\ddgui.gbas";
				}
				forEachSaver13825.values[forEachCounter13825] = local2_od_2253;
			
			};
			__debugInfo = "395:\ddgui.gbas";
			return tryClone(local2_up_2248);
			__debugInfo = "374:\ddgui.gbas";
		};
		__debugInfo = "397:\ddgui.gbas";
		return tryClone(-(1));
		__debugInfo = "398:\ddgui.gbas";
		return 0;
		__debugInfo = "354:\ddgui.gbas";
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
window['func20_DDgui_get_intern_Str'] = function(param3_wdg, param8_name_Str_ref) {
	stackPush("function: DDgui_get_intern_Str", __debugInfo);
	try {
		__debugInfo = "406:\ddgui.gbas";
		{
			var local17___SelectHelper10__2320 = "";
			__debugInfo = "406:\ddgui.gbas";
			local17___SelectHelper10__2320 = param8_name_Str_ref[0];
			__debugInfo = "430:\ddgui.gbas";
			if ((((local17___SelectHelper10__2320) == ("CLICKED")) ? 1 : 0)) {
				__debugInfo = "407:\ddgui.gbas";
				return tryClone(CAST2STRING(param3_wdg.attr8_wclicked));
				__debugInfo = "407:\ddgui.gbas";
			} else if ((((local17___SelectHelper10__2320) == ("TEXT")) ? 1 : 0)) {
				__debugInfo = "408:\ddgui.gbas";
				return tryClone(unref(param3_wdg.attr9_wtext_Str_ref[0]));
				__debugInfo = "408:\ddgui.gbas";
			} else if ((((local17___SelectHelper10__2320) == ("WIDTH")) ? 1 : 0)) {
				__debugInfo = "409:\ddgui.gbas";
				return tryClone(CAST2STRING(param3_wdg.attr6_wwidth));
				__debugInfo = "409:\ddgui.gbas";
			} else if ((((local17___SelectHelper10__2320) == ("HEIGHT")) ? 1 : 0)) {
				__debugInfo = "410:\ddgui.gbas";
				return tryClone(CAST2STRING(param3_wdg.attr7_wheight));
				__debugInfo = "410:\ddgui.gbas";
			} else if ((((local17___SelectHelper10__2320) == ("SELECT")) ? 1 : 0)) {
				__debugInfo = "411:\ddgui.gbas";
				return tryClone(CAST2STRING(param3_wdg.attr7_wselect));
				__debugInfo = "411:\ddgui.gbas";
			} else if ((((local17___SelectHelper10__2320) == ("COUNT")) ? 1 : 0)) {
				__debugInfo = "412:\ddgui.gbas";
				return tryClone(CAST2STRING(param3_wdg.attr6_wcount));
				__debugInfo = "412:\ddgui.gbas";
			} else if ((((local17___SelectHelper10__2320) == ("HOVER")) ? 1 : 0)) {
				__debugInfo = "413:\ddgui.gbas";
				return tryClone(CAST2STRING(param3_wdg.attr6_whover));
				__debugInfo = "413:\ddgui.gbas";
			} else if ((((local17___SelectHelper10__2320) == ("READONLY")) ? 1 : 0)) {
				__debugInfo = "414:\ddgui.gbas";
				return tryClone(CAST2STRING(param3_wdg.attr9_wreadonly));
				__debugInfo = "414:\ddgui.gbas";
			} else if ((((local17___SelectHelper10__2320) == ("SELSTART")) ? 1 : 0)) {
				__debugInfo = "415:\ddgui.gbas";
				return tryClone(CAST2STRING(param3_wdg.attr9_wselstart));
				__debugInfo = "415:\ddgui.gbas";
			} else if ((((local17___SelectHelper10__2320) == ("SELEND")) ? 1 : 0)) {
				__debugInfo = "416:\ddgui.gbas";
				return tryClone(CAST2STRING(param3_wdg.attr7_wselend));
				__debugInfo = "416:\ddgui.gbas";
			} else if ((((local17___SelectHelper10__2320) == ("HIDE")) ? 1 : 0)) {
				__debugInfo = "417:\ddgui.gbas";
				return tryClone(CAST2STRING(param3_wdg.attr5_whide));
				__debugInfo = "417:\ddgui.gbas";
			} else if ((((local17___SelectHelper10__2320) == ("TYPE")) ? 1 : 0)) {
				__debugInfo = "418:\ddgui.gbas";
				return tryClone(param3_wdg.attr9_wtype_Str);
				__debugInfo = "418:\ddgui.gbas";
			} else if ((((local17___SelectHelper10__2320) == ("FILTER")) ? 1 : 0)) {
				__debugInfo = "419:\ddgui.gbas";
				return tryClone(param3_wdg.attr11_wfilter_Str);
				__debugInfo = "419:\ddgui.gbas";
			} else if ((((local17___SelectHelper10__2320) == ("TIPTEXT")) ? 1 : 0)) {
				__debugInfo = "420:\ddgui.gbas";
				return tryClone(unref(param3_wdg.attr11_tiptext_Str_ref[0]));
				__debugInfo = "420:\ddgui.gbas";
			} else if ((((local17___SelectHelper10__2320) == ("MINVAL")) ? 1 : 0)) {
				__debugInfo = "421:\ddgui.gbas";
				return tryClone(CAST2STRING(param3_wdg.attr7_wminval));
				__debugInfo = "421:\ddgui.gbas";
			} else if ((((local17___SelectHelper10__2320) == ("MAXVAL")) ? 1 : 0)) {
				__debugInfo = "422:\ddgui.gbas";
				return tryClone(CAST2STRING(param3_wdg.attr7_wmaxval));
				__debugInfo = "422:\ddgui.gbas";
			} else if ((((local17___SelectHelper10__2320) == ("STEP")) ? 1 : 0)) {
				__debugInfo = "423:\ddgui.gbas";
				return tryClone(CAST2STRING(param3_wdg.attr5_wstep));
				__debugInfo = "423:\ddgui.gbas";
			} else if ((((local17___SelectHelper10__2320) == ("SCROLL")) ? 1 : 0)) {
				__debugInfo = "424:\ddgui.gbas";
				return tryClone(CAST2STRING(param3_wdg.attr7_wscroll));
				__debugInfo = "424:\ddgui.gbas";
			} else if ((((local17___SelectHelper10__2320) == ("ALIGN")) ? 1 : 0)) {
				__debugInfo = "425:\ddgui.gbas";
				return tryClone(CAST2STRING(param3_wdg.attr6_walign));
				__debugInfo = "425:\ddgui.gbas";
			} else if ((((local17___SelectHelper10__2320) == ("XPOS")) ? 1 : 0)) {
				__debugInfo = "426:\ddgui.gbas";
				return tryClone(CAST2STRING(param3_wdg.attr5_wxpos));
				__debugInfo = "426:\ddgui.gbas";
			} else if ((((local17___SelectHelper10__2320) == ("YPOS")) ? 1 : 0)) {
				__debugInfo = "427:\ddgui.gbas";
				return tryClone(CAST2STRING(param3_wdg.attr5_wypos));
				__debugInfo = "427:\ddgui.gbas";
			} else {
				__debugInfo = "429:\ddgui.gbas";
				DEBUG((((("DDgui_get_intern$: Widget property ") + (param8_name_Str_ref[0]))) + (" is unknown\n")));
				__debugInfo = "429:\ddgui.gbas";
			};
			__debugInfo = "406:\ddgui.gbas";
		};
		__debugInfo = "431:\ddgui.gbas";
		return "";
		__debugInfo = "406:\ddgui.gbas";
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
window['func13_DDgui_get_Str'] = function(param6_id_Str, param8_name_Str) {
	stackPush("function: DDgui_get_Str", __debugInfo);
	try {
		var local6_id_Str_ref_2254 = [param6_id_Str]; /* NEWCODEHERE */
		var local8_name_Str_ref_2255 = [param8_name_Str]; /* NEWCODEHERE */
		__debugInfo = "439:\ddgui.gbas";
		if ((((BOUNDS(global11_ddgui_stack_ref[0], 0)) == (0)) ? 1 : 0)) {
			__debugInfo = "437:\ddgui.gbas";
			DEBUG("DDgui_get$: No active dialog!\n");
			__debugInfo = "438:\ddgui.gbas";
			return "";
			__debugInfo = "437:\ddgui.gbas";
		};
		__debugInfo = "462:\ddgui.gbas";
		if (((((local6_id_Str_ref_2254[0]).length) == (0)) ? 1 : 0)) {
			__debugInfo = "441:\ddgui.gbas";
			{
				var local16___SelectHelper8__2256 = "";
				__debugInfo = "441:\ddgui.gbas";
				local16___SelectHelper8__2256 = local8_name_Str_ref_2255[0];
				__debugInfo = "457:\ddgui.gbas";
				if ((((local16___SelectHelper8__2256) == ("FOCUS")) ? 1 : 0)) {
					__debugInfo = "442:\ddgui.gbas";
					return tryClone(global11_ddgui_stack_ref[0].arrAccess(-(1)).values[tmpPositionCache][0].attr9_focus_Str);
					__debugInfo = "442:\ddgui.gbas";
				} else if ((((local16___SelectHelper8__2256) == ("INKEY")) ? 1 : 0)) {
					__debugInfo = "443:\ddgui.gbas";
					return tryClone(global11_ddgui_stack_ref[0].arrAccess(-(1)).values[tmpPositionCache][0].attr13_dlg_inkey_Str);
					__debugInfo = "443:\ddgui.gbas";
				} else if ((((local16___SelectHelper8__2256) == ("TEXT")) ? 1 : 0)) {
					__debugInfo = "444:\ddgui.gbas";
					return tryClone(unref(global11_ddgui_stack_ref[0].arrAccess(-(1)).values[tmpPositionCache][0].attr4_main.attr9_wtext_Str_ref[0]));
					__debugInfo = "444:\ddgui.gbas";
				} else if ((((local16___SelectHelper8__2256) == ("COL_BRIGHT")) ? 1 : 0)) {
					__debugInfo = "445:\ddgui.gbas";
					return tryClone(CAST2STRING(global11_ddgui_stack_ref[0].arrAccess(-(1)).values[tmpPositionCache][0].attr10_col_bright));
					__debugInfo = "445:\ddgui.gbas";
				} else if ((((local16___SelectHelper8__2256) == ("COL_NORM")) ? 1 : 0)) {
					__debugInfo = "446:\ddgui.gbas";
					return tryClone(CAST2STRING(global11_ddgui_stack_ref[0].arrAccess(-(1)).values[tmpPositionCache][0].attr8_col_norm));
					__debugInfo = "446:\ddgui.gbas";
				} else if ((((local16___SelectHelper8__2256) == ("COL_HOVER_BRIGHT")) ? 1 : 0)) {
					__debugInfo = "447:\ddgui.gbas";
					return tryClone(CAST2STRING(global11_ddgui_stack_ref[0].arrAccess(-(1)).values[tmpPositionCache][0].attr16_col_hover_bright));
					__debugInfo = "447:\ddgui.gbas";
				} else if ((((local16___SelectHelper8__2256) == ("COL_HOVER_NORM")) ? 1 : 0)) {
					__debugInfo = "448:\ddgui.gbas";
					return tryClone(CAST2STRING(global11_ddgui_stack_ref[0].arrAccess(-(1)).values[tmpPositionCache][0].attr14_col_hover_norm));
					__debugInfo = "448:\ddgui.gbas";
				} else if ((((local16___SelectHelper8__2256) == ("XPOS")) ? 1 : 0)) {
					__debugInfo = "449:\ddgui.gbas";
					return tryClone(CAST2STRING(global11_ddgui_stack_ref[0].arrAccess(-(1)).values[tmpPositionCache][0].attr4_xpos));
					__debugInfo = "449:\ddgui.gbas";
				} else if ((((local16___SelectHelper8__2256) == ("YPOS")) ? 1 : 0)) {
					__debugInfo = "450:\ddgui.gbas";
					return tryClone(CAST2STRING(global11_ddgui_stack_ref[0].arrAccess(-(1)).values[tmpPositionCache][0].attr4_ypos));
					__debugInfo = "450:\ddgui.gbas";
				} else if ((((local16___SelectHelper8__2256) == ("WIDTH")) ? 1 : 0)) {
					__debugInfo = "451:\ddgui.gbas";
					return tryClone(CAST2STRING(global11_ddgui_stack_ref[0].arrAccess(-(1)).values[tmpPositionCache][0].attr4_main.attr6_wwidth));
					__debugInfo = "451:\ddgui.gbas";
				} else if ((((local16___SelectHelper8__2256) == ("HEIGHT")) ? 1 : 0)) {
					__debugInfo = "452:\ddgui.gbas";
					return tryClone(CAST2STRING(global11_ddgui_stack_ref[0].arrAccess(-(1)).values[tmpPositionCache][0].attr4_main.attr7_wheight));
					__debugInfo = "452:\ddgui.gbas";
				} else if ((((local16___SelectHelper8__2256) == ("MOVEABLE")) ? 1 : 0)) {
					__debugInfo = "453:\ddgui.gbas";
					return tryClone(CAST2STRING(global11_ddgui_stack_ref[0].arrAccess(-(1)).values[tmpPositionCache][0].attr8_moveable));
					__debugInfo = "453:\ddgui.gbas";
				} else if ((((local16___SelectHelper8__2256) == ("SCALEABLE")) ? 1 : 0)) {
					__debugInfo = "454:\ddgui.gbas";
					return tryClone(CAST2STRING(global11_ddgui_stack_ref[0].arrAccess(-(1)).values[tmpPositionCache][0].attr9_scaleable));
					__debugInfo = "454:\ddgui.gbas";
				} else if ((((local16___SelectHelper8__2256) == ("MOVING")) ? 1 : 0)) {
					__debugInfo = "455:\ddgui.gbas";
					return tryClone(CAST2STRING(global11_ddgui_stack_ref[0].arrAccess(-(1)).values[tmpPositionCache][0].attr6_moving));
					__debugInfo = "455:\ddgui.gbas";
				} else if ((((local16___SelectHelper8__2256) == ("SCALEING")) ? 1 : 0)) {
					__debugInfo = "456:\ddgui.gbas";
					return tryClone(CAST2STRING(global11_ddgui_stack_ref[0].arrAccess(-(1)).values[tmpPositionCache][0].attr8_scaleing));
					__debugInfo = "456:\ddgui.gbas";
				};
				__debugInfo = "441:\ddgui.gbas";
			};
			__debugInfo = "441:\ddgui.gbas";
		} else {
			var local2_iw_2257 = 0;
			__debugInfo = "459:\ddgui.gbas";
			local2_iw_2257 = func11_DDgui_index(unref(global11_ddgui_stack_ref[0].arrAccess(-(1)).values[tmpPositionCache][0]), local6_id_Str_ref_2254, 0);
			__debugInfo = "460:\ddgui.gbas";
			if ((((local2_iw_2257) >= (0)) ? 1 : 0)) {
				__debugInfo = "460:\ddgui.gbas";
				return tryClone(func20_DDgui_get_intern_Str(unref(global11_ddgui_stack_ref[0].arrAccess(-(1)).values[tmpPositionCache][0].attr7_widgets_ref[0].arrAccess(local2_iw_2257).values[tmpPositionCache][0]), local8_name_Str_ref_2255));
				__debugInfo = "460:\ddgui.gbas";
			};
			__debugInfo = "461:\ddgui.gbas";
			DEBUG((((("DDgui_get$: Widget not found ") + (local6_id_Str_ref_2254[0]))) + ("\n")));
			__debugInfo = "459:\ddgui.gbas";
		};
		__debugInfo = "463:\ddgui.gbas";
		return "";
		__debugInfo = "464:\ddgui.gbas";
		return "";
		__debugInfo = "439:\ddgui.gbas";
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
window['func9_DDgui_get'] = function(param6_id_Str, param8_name_Str) {
	stackPush("function: DDgui_get", __debugInfo);
	try {
		var local6_id_Str_ref_2258 = [param6_id_Str]; /* NEWCODEHERE */
		var local8_name_Str_ref_2259 = [param8_name_Str]; /* NEWCODEHERE */
		__debugInfo = "471:\ddgui.gbas";
		if ((((BOUNDS(global11_ddgui_stack_ref[0], 0)) == (0)) ? 1 : 0)) {
			__debugInfo = "469:\ddgui.gbas";
			DEBUG("DDgui_get: No active dialog!\n");
			__debugInfo = "470:\ddgui.gbas";
			return tryClone(0);
			__debugInfo = "469:\ddgui.gbas";
		};
		__debugInfo = "490:\ddgui.gbas";
		if (((((local6_id_Str_ref_2258[0]).length) == (0)) ? 1 : 0)) {
			__debugInfo = "473:\ddgui.gbas";
			return tryClone(FLOAT2STR(func13_DDgui_get_Str(unref(local6_id_Str_ref_2258[0]), unref(local8_name_Str_ref_2259[0]))));
			__debugInfo = "473:\ddgui.gbas";
		} else {
			var local2_iw_2260 = 0;
			__debugInfo = "475:\ddgui.gbas";
			local2_iw_2260 = func11_DDgui_index(unref(global11_ddgui_stack_ref[0].arrAccess(-(1)).values[tmpPositionCache][0]), local6_id_Str_ref_2258, 0);
			__debugInfo = "488:\ddgui.gbas";
			if ((((local2_iw_2260) >= (0)) ? 1 : 0)) {
				var alias3_wdg_ref_2261 = [new type9_DDGUI_WDG()];
				__debugInfo = "478:\ddgui.gbas";
				alias3_wdg_ref_2261 = global11_ddgui_stack_ref[0].arrAccess(-(1)).values[tmpPositionCache][0].attr7_widgets_ref[0].arrAccess(local2_iw_2260).values[tmpPositionCache] /* ALIAS */;
				__debugInfo = "479:\ddgui.gbas";
				{
					var local16___SelectHelper9__2262 = "";
					__debugInfo = "479:\ddgui.gbas";
					local16___SelectHelper9__2262 = local8_name_Str_ref_2259[0];
					__debugInfo = "485:\ddgui.gbas";
					if ((((local16___SelectHelper9__2262) == ("CLICKED")) ? 1 : 0)) {
						__debugInfo = "480:\ddgui.gbas";
						return tryClone(alias3_wdg_ref_2261[0].attr8_wclicked);
						__debugInfo = "480:\ddgui.gbas";
					} else if ((((local16___SelectHelper9__2262) == ("SELECT")) ? 1 : 0)) {
						__debugInfo = "481:\ddgui.gbas";
						return tryClone(alias3_wdg_ref_2261[0].attr7_wselect);
						__debugInfo = "481:\ddgui.gbas";
					} else if ((((local16___SelectHelper9__2262) == ("COUNT")) ? 1 : 0)) {
						__debugInfo = "482:\ddgui.gbas";
						return tryClone(alias3_wdg_ref_2261[0].attr6_wcount);
						__debugInfo = "482:\ddgui.gbas";
					} else if ((((local16___SelectHelper9__2262) == ("SELSTART")) ? 1 : 0)) {
						__debugInfo = "483:\ddgui.gbas";
						return tryClone(alias3_wdg_ref_2261[0].attr9_wselstart);
						__debugInfo = "483:\ddgui.gbas";
					} else if ((((local16___SelectHelper9__2262) == ("SELEND")) ? 1 : 0)) {
						__debugInfo = "484:\ddgui.gbas";
						return tryClone(alias3_wdg_ref_2261[0].attr7_wselend);
						__debugInfo = "484:\ddgui.gbas";
					};
					__debugInfo = "479:\ddgui.gbas";
				};
				__debugInfo = "487:\ddgui.gbas";
				return tryClone(FLOAT2STR(func20_DDgui_get_intern_Str(unref(alias3_wdg_ref_2261[0]), local8_name_Str_ref_2259)));
				__debugInfo = "478:\ddgui.gbas";
			};
			__debugInfo = "489:\ddgui.gbas";
			DEBUG((((("DDgui_get: Widget not found ") + (local6_id_Str_ref_2258[0]))) + ("\n")));
			__debugInfo = "475:\ddgui.gbas";
		};
		__debugInfo = "491:\ddgui.gbas";
		return 0;
		__debugInfo = "471:\ddgui.gbas";
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
window['func9_DDgui_set'] = function(param6_id_Str, param8_name_Str, param7_val_Str) {
	stackPush("function: DDgui_set", __debugInfo);
	try {
		var local6_id_Str_ref_1610 = [param6_id_Str]; /* NEWCODEHERE */
		__debugInfo = "540:\ddgui.gbas";
		if (((((local6_id_Str_ref_1610[0]).length) == (0)) ? 1 : 0)) {
			__debugInfo = "495:\ddgui.gbas";
			{
				var local16___SelectHelper1__1613 = "";
				__debugInfo = "495:\ddgui.gbas";
				local16___SelectHelper1__1613 = param8_name_Str;
				__debugInfo = "511:\ddgui.gbas";
				if ((((local16___SelectHelper1__1613) == ("FOCUS")) ? 1 : 0)) {
					__debugInfo = "496:\ddgui.gbas";
					global11_ddgui_stack_ref[0].arrAccess(-(1)).values[tmpPositionCache][0].attr9_focus_Str = param7_val_Str;
					__debugInfo = "496:\ddgui.gbas";
				} else if ((((local16___SelectHelper1__1613) == ("INKEY")) ? 1 : 0)) {
					__debugInfo = "497:\ddgui.gbas";
					global11_ddgui_stack_ref[0].arrAccess(-(1)).values[tmpPositionCache][0].attr13_dlg_inkey_Str = param7_val_Str;
					__debugInfo = "497:\ddgui.gbas";
				} else if ((((local16___SelectHelper1__1613) == ("COL_BRIGHT")) ? 1 : 0)) {
					__debugInfo = "498:\ddgui.gbas";
					global11_ddgui_stack_ref[0].arrAccess(-(1)).values[tmpPositionCache][0].attr10_col_bright = INT2STR(param7_val_Str);
					__debugInfo = "498:\ddgui.gbas";
				} else if ((((local16___SelectHelper1__1613) == ("COL_NORM")) ? 1 : 0)) {
					__debugInfo = "499:\ddgui.gbas";
					global11_ddgui_stack_ref[0].arrAccess(-(1)).values[tmpPositionCache][0].attr8_col_norm = INT2STR(param7_val_Str);
					__debugInfo = "499:\ddgui.gbas";
				} else if ((((local16___SelectHelper1__1613) == ("COL_HOVER_BRIGHT")) ? 1 : 0)) {
					__debugInfo = "500:\ddgui.gbas";
					global11_ddgui_stack_ref[0].arrAccess(-(1)).values[tmpPositionCache][0].attr16_col_hover_bright = INT2STR(param7_val_Str);
					__debugInfo = "500:\ddgui.gbas";
				} else if ((((local16___SelectHelper1__1613) == ("COL_HOVER_NORM")) ? 1 : 0)) {
					__debugInfo = "501:\ddgui.gbas";
					global11_ddgui_stack_ref[0].arrAccess(-(1)).values[tmpPositionCache][0].attr14_col_hover_norm = INT2STR(param7_val_Str);
					__debugInfo = "501:\ddgui.gbas";
				} else if ((((local16___SelectHelper1__1613) == ("TEXT")) ? 1 : 0)) {
					__debugInfo = "502:\ddgui.gbas";
					global11_ddgui_stack_ref[0].arrAccess(-(1)).values[tmpPositionCache][0].attr4_main.attr9_wtext_Str_ref[0] = param7_val_Str;
					__debugInfo = "502:\ddgui.gbas";
				} else if ((((local16___SelectHelper1__1613) == ("XPOS")) ? 1 : 0)) {
					__debugInfo = "503:\ddgui.gbas";
					global11_ddgui_stack_ref[0].arrAccess(-(1)).values[tmpPositionCache][0].attr4_xpos = INT2STR(param7_val_Str);
					__debugInfo = "503:\ddgui.gbas";
				} else if ((((local16___SelectHelper1__1613) == ("YPOS")) ? 1 : 0)) {
					__debugInfo = "504:\ddgui.gbas";
					global11_ddgui_stack_ref[0].arrAccess(-(1)).values[tmpPositionCache][0].attr4_ypos = INT2STR(param7_val_Str);
					__debugInfo = "504:\ddgui.gbas";
				} else if ((((local16___SelectHelper1__1613) == ("WIDTH")) ? 1 : 0)) {
					__debugInfo = "505:\ddgui.gbas";
					global11_ddgui_stack_ref[0].arrAccess(-(1)).values[tmpPositionCache][0].attr4_main.attr6_wwidth = INT2STR(param7_val_Str);
					__debugInfo = "505:\ddgui.gbas";
				} else if ((((local16___SelectHelper1__1613) == ("HEIGHT")) ? 1 : 0)) {
					__debugInfo = "506:\ddgui.gbas";
					global11_ddgui_stack_ref[0].arrAccess(-(1)).values[tmpPositionCache][0].attr4_main.attr7_wheight = INT2STR(param7_val_Str);
					__debugInfo = "506:\ddgui.gbas";
				} else if ((((local16___SelectHelper1__1613) == ("MOVEABLE")) ? 1 : 0)) {
					__debugInfo = "507:\ddgui.gbas";
					global11_ddgui_stack_ref[0].arrAccess(-(1)).values[tmpPositionCache][0].attr8_moveable = INT2STR(param7_val_Str);
					__debugInfo = "507:\ddgui.gbas";
				} else if ((((local16___SelectHelper1__1613) == ("SCALEABLE")) ? 1 : 0)) {
					__debugInfo = "508:\ddgui.gbas";
					global11_ddgui_stack_ref[0].arrAccess(-(1)).values[tmpPositionCache][0].attr9_scaleable = INT2STR(param7_val_Str);
					__debugInfo = "508:\ddgui.gbas";
				} else {
					__debugInfo = "510:\ddgui.gbas";
					DEBUG((((("DDgui_set dialog (\"\") property: ") + (param8_name_Str))) + (" is unknown\n")));
					__debugInfo = "510:\ddgui.gbas";
				};
				__debugInfo = "495:\ddgui.gbas";
			};
			__debugInfo = "495:\ddgui.gbas";
		} else {
			var local2_iw_1614 = 0.0, alias3_wdg_ref_1615 = [new type9_DDGUI_WDG()];
			__debugInfo = "513:\ddgui.gbas";
			local2_iw_1614 = func11_DDgui_index(unref(global11_ddgui_stack_ref[0].arrAccess(-(1)).values[tmpPositionCache][0]), local6_id_Str_ref_1610, 1);
			__debugInfo = "515:\ddgui.gbas";
			alias3_wdg_ref_1615 = global11_ddgui_stack_ref[0].arrAccess(-(1)).values[tmpPositionCache][0].attr7_widgets_ref[0].arrAccess(~~(local2_iw_1614)).values[tmpPositionCache] /* ALIAS */;
			__debugInfo = "517:\ddgui.gbas";
			{
				var local16___SelectHelper2__1616 = "";
				__debugInfo = "517:\ddgui.gbas";
				local16___SelectHelper2__1616 = param8_name_Str;
				__debugInfo = "539:\ddgui.gbas";
				if ((((local16___SelectHelper2__1616) == ("TEXT")) ? 1 : 0)) {
					__debugInfo = "518:\ddgui.gbas";
					alias3_wdg_ref_1615[0].attr9_wtext_Str_ref[0] = param7_val_Str;
					__debugInfo = "518:\ddgui.gbas";
				} else if ((((local16___SelectHelper2__1616) == ("CLICKED")) ? 1 : 0)) {
					__debugInfo = "519:\ddgui.gbas";
					alias3_wdg_ref_1615[0].attr8_wclicked = INT2STR(param7_val_Str);
					__debugInfo = "519:\ddgui.gbas";
				} else if ((((local16___SelectHelper2__1616) == ("WIDTH")) ? 1 : 0)) {
					__debugInfo = "520:\ddgui.gbas";
					alias3_wdg_ref_1615[0].attr6_wwidth = INT2STR(param7_val_Str);
					__debugInfo = "520:\ddgui.gbas";
				} else if ((((local16___SelectHelper2__1616) == ("HEIGHT")) ? 1 : 0)) {
					__debugInfo = "521:\ddgui.gbas";
					alias3_wdg_ref_1615[0].attr7_wheight = INT2STR(param7_val_Str);
					__debugInfo = "521:\ddgui.gbas";
				} else if ((((local16___SelectHelper2__1616) == ("SELECT")) ? 1 : 0)) {
					__debugInfo = "522:\ddgui.gbas";
					alias3_wdg_ref_1615[0].attr7_wselect = INT2STR(param7_val_Str);
					__debugInfo = "522:\ddgui.gbas";
				} else if ((((local16___SelectHelper2__1616) == ("COUNT")) ? 1 : 0)) {
					__debugInfo = "523:\ddgui.gbas";
					alias3_wdg_ref_1615[0].attr6_wcount = INT2STR(param7_val_Str);
					__debugInfo = "523:\ddgui.gbas";
				} else if ((((local16___SelectHelper2__1616) == ("HOVER")) ? 1 : 0)) {
					__debugInfo = "524:\ddgui.gbas";
					alias3_wdg_ref_1615[0].attr6_whover = INT2STR(param7_val_Str);
					__debugInfo = "524:\ddgui.gbas";
				} else if ((((local16___SelectHelper2__1616) == ("READONLY")) ? 1 : 0)) {
					__debugInfo = "525:\ddgui.gbas";
					alias3_wdg_ref_1615[0].attr9_wreadonly = INT2STR(param7_val_Str);
					__debugInfo = "525:\ddgui.gbas";
				} else if ((((local16___SelectHelper2__1616) == ("SELSTART")) ? 1 : 0)) {
					__debugInfo = "526:\ddgui.gbas";
					alias3_wdg_ref_1615[0].attr9_wselstart = INT2STR(param7_val_Str);
					__debugInfo = "526:\ddgui.gbas";
				} else if ((((local16___SelectHelper2__1616) == ("SELEND")) ? 1 : 0)) {
					__debugInfo = "527:\ddgui.gbas";
					alias3_wdg_ref_1615[0].attr7_wselend = INT2STR(param7_val_Str);
					__debugInfo = "527:\ddgui.gbas";
				} else if ((((local16___SelectHelper2__1616) == ("HIDE")) ? 1 : 0)) {
					__debugInfo = "528:\ddgui.gbas";
					alias3_wdg_ref_1615[0].attr5_whide = INT2STR(param7_val_Str);
					__debugInfo = "528:\ddgui.gbas";
				} else if ((((local16___SelectHelper2__1616) == ("TYPE")) ? 1 : 0)) {
					__debugInfo = "529:\ddgui.gbas";
					alias3_wdg_ref_1615[0].attr9_wtype_Str = param7_val_Str;
					__debugInfo = "529:\ddgui.gbas";
				} else if ((((local16___SelectHelper2__1616) == ("FILTER")) ? 1 : 0)) {
					__debugInfo = "530:\ddgui.gbas";
					alias3_wdg_ref_1615[0].attr11_wfilter_Str = param7_val_Str;
					__debugInfo = "530:\ddgui.gbas";
				} else if ((((local16___SelectHelper2__1616) == ("TIPTEXT")) ? 1 : 0)) {
					__debugInfo = "531:\ddgui.gbas";
					alias3_wdg_ref_1615[0].attr11_tiptext_Str_ref[0] = param7_val_Str;
					__debugInfo = "531:\ddgui.gbas";
				} else if ((((local16___SelectHelper2__1616) == ("MINVAL")) ? 1 : 0)) {
					__debugInfo = "532:\ddgui.gbas";
					alias3_wdg_ref_1615[0].attr7_wminval = FLOAT2STR(param7_val_Str);
					__debugInfo = "532:\ddgui.gbas";
				} else if ((((local16___SelectHelper2__1616) == ("MAXVAL")) ? 1 : 0)) {
					__debugInfo = "533:\ddgui.gbas";
					alias3_wdg_ref_1615[0].attr7_wmaxval = FLOAT2STR(param7_val_Str);
					__debugInfo = "533:\ddgui.gbas";
				} else if ((((local16___SelectHelper2__1616) == ("STEP")) ? 1 : 0)) {
					__debugInfo = "534:\ddgui.gbas";
					alias3_wdg_ref_1615[0].attr5_wstep = FLOAT2STR(param7_val_Str);
					__debugInfo = "534:\ddgui.gbas";
				} else if ((((local16___SelectHelper2__1616) == ("SCROLL")) ? 1 : 0)) {
					__debugInfo = "535:\ddgui.gbas";
					alias3_wdg_ref_1615[0].attr7_wscroll = INT2STR(param7_val_Str);
					__debugInfo = "535:\ddgui.gbas";
				} else if ((((local16___SelectHelper2__1616) == ("ALIGN")) ? 1 : 0)) {
					__debugInfo = "536:\ddgui.gbas";
					alias3_wdg_ref_1615[0].attr6_walign = INT2STR(param7_val_Str);
					__debugInfo = "536:\ddgui.gbas";
				} else {
					__debugInfo = "538:\ddgui.gbas";
					DEBUG((((("DDgui_set: Widget property ") + (param8_name_Str))) + (" is unknown\n")));
					__debugInfo = "538:\ddgui.gbas";
				};
				__debugInfo = "517:\ddgui.gbas";
			};
			__debugInfo = "513:\ddgui.gbas";
		};
		__debugInfo = "542:\ddgui.gbas";
		return 0;
		__debugInfo = "540:\ddgui.gbas";
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
window['func17_DDGui_PrintIntern'] = function(param5_t_Str_ref, param1_x, param1_y, param5_bBold) {
	stackPush("function: DDGui_PrintIntern", __debugInfo);
	try {
		__debugInfo = "628:\ddgui.gbas";
		if (param5_bBold) {
			__debugInfo = "625:\ddgui.gbas";
			ALPHAMODE(-(0.5));
			__debugInfo = "626:\ddgui.gbas";
			func17_DDGui_PrintIntern(param5_t_Str_ref, ((param1_x) + (1)), param1_y, 0);
			__debugInfo = "627:\ddgui.gbas";
			ALPHAMODE(0);
			__debugInfo = "625:\ddgui.gbas";
		};
		__debugInfo = "631:\ddgui.gbas";
		PRINT(unref(param5_t_Str_ref[0]), param1_x, param1_y, global18_ddgui_font_kerning.attr11_bHasKerning);
		__debugInfo = "632:\ddgui.gbas";
		return 0;
		__debugInfo = "648:\ddgui.gbas";
		if (global18_ddgui_font_kerning.attr11_bHasKerning) {
			var local2_fx_2267 = 0, local2_lt_2268 = 0, local5_c_Str_2269 = "", local4_kern_2270 = 0, local2_ac_2271 = 0;
			__debugInfo = "638:\ddgui.gbas";
			local2_lt_2268 = (((param5_t_Str_ref[0]).length) - (1));
			__debugInfo = "638:\ddgui.gbas";
			{
				var local1_c_2272 = 0;
				__debugInfo = "645:\ddgui.gbas";
				for (local1_c_2272 = 0;toCheck(local1_c_2272, local2_lt_2268, 1);local1_c_2272 += 1) {
					__debugInfo = "640:\ddgui.gbas";
					local5_c_Str_2269 = MID_Str(unref(param5_t_Str_ref[0]), local1_c_2272, 1);
					__debugInfo = "641:\ddgui.gbas";
					local2_ac_2271 = ASC(local5_c_Str_2269, 0);
					__debugInfo = "642:\ddgui.gbas";
					local4_kern_2270 = global18_ddgui_font_kerning.attr4_left.arrAccess(local2_ac_2271).values[tmpPositionCache];
					__debugInfo = "643:\ddgui.gbas";
					PRINT(local5_c_Str_2269, ((param1_x) - (local4_kern_2270)), param1_y, 0);
					__debugInfo = "644:\ddgui.gbas";
					param1_x+=global18_ddgui_font_kerning.attr5_width.arrAccess(local2_ac_2271).values[tmpPositionCache];
					__debugInfo = "640:\ddgui.gbas";
				};
				__debugInfo = "645:\ddgui.gbas";
			};
			__debugInfo = "638:\ddgui.gbas";
		} else {
			__debugInfo = "647:\ddgui.gbas";
			PRINT(unref(param5_t_Str_ref[0]), param1_x, param1_y, 0);
			__debugInfo = "647:\ddgui.gbas";
		};
		__debugInfo = "649:\ddgui.gbas";
		return 0;
		__debugInfo = "628:\ddgui.gbas";
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
window['func21_DDGui_TextWidthIntern'] = function(param5_t_Str_ref) {
	stackPush("function: DDGui_TextWidthIntern", __debugInfo);
	try {
		__debugInfo = "659:\ddgui.gbas";
		return tryClone(KERNLEN(param5_t_Str_ref[0], global18_ddgui_font_kerning.attr11_bHasKerning));
		__debugInfo = "674:\ddgui.gbas";
		if (global18_ddgui_font_kerning.attr11_bHasKerning) {
			var local2_fx_2274 = 0, local2_lt_2275 = 0, local5_c_Str_2276 = "", local1_x_2277 = 0, local2_ac_2278 = 0;
			__debugInfo = "664:\ddgui.gbas";
			local2_lt_2275 = (((param5_t_Str_ref[0]).length) - (1));
			__debugInfo = "664:\ddgui.gbas";
			{
				var local1_c_2279 = 0;
				__debugInfo = "668:\ddgui.gbas";
				for (local1_c_2279 = 0;toCheck(local1_c_2279, local2_lt_2275, 1);local1_c_2279 += 1) {
					__debugInfo = "666:\ddgui.gbas";
					local2_ac_2278 = ASC(MID_Str(unref(param5_t_Str_ref[0]), local1_c_2279, 1), 0);
					__debugInfo = "667:\ddgui.gbas";
					local1_x_2277+=global18_ddgui_font_kerning.attr5_width.arrAccess(local2_ac_2278).values[tmpPositionCache];
					__debugInfo = "666:\ddgui.gbas";
				};
				__debugInfo = "668:\ddgui.gbas";
			};
			__debugInfo = "669:\ddgui.gbas";
			return tryClone(local1_x_2277);
			__debugInfo = "664:\ddgui.gbas";
		} else {
			var local2_fx_ref_2280 = [0], local2_fy_ref_2281 = [0];
			__debugInfo = "672:\ddgui.gbas";
			GETFONTSIZE(local2_fx_ref_2280, local2_fy_ref_2281);
			__debugInfo = "673:\ddgui.gbas";
			return tryClone((((param5_t_Str_ref[0]).length) * (local2_fx_ref_2280[0])));
			__debugInfo = "672:\ddgui.gbas";
		};
		__debugInfo = "675:\ddgui.gbas";
		return 0;
		__debugInfo = "659:\ddgui.gbas";
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
window['func10_DDgui_init'] = function() {
	stackPush("function: DDgui_init", __debugInfo);
	try {
		__debugInfo = "682:\ddgui.gbas";
		if ((((BOUNDS(global11_ddgui_stack_ref[0], 0)) == (0)) ? 1 : 0)) {
			__debugInfo = "682:\ddgui.gbas";
			DIM(unref(global11_ddgui_stack_ref[0]), [1], [new type9_DDGUI_DLG()]);
			__debugInfo = "682:\ddgui.gbas";
		};
		__debugInfo = "689:\ddgui.gbas";
		if (((((((global11_ddgui_stack_ref[0].arrAccess(-(1)).values[tmpPositionCache][0].attr8_col_norm) == (0)) ? 1 : 0)) && ((((global11_ddgui_stack_ref[0].arrAccess(-(1)).values[tmpPositionCache][0].attr10_col_bright) == (0)) ? 1 : 0))) ? 1 : 0)) {
			__debugInfo = "685:\ddgui.gbas";
			global11_ddgui_stack_ref[0].arrAccess(-(1)).values[tmpPositionCache][0].attr8_col_norm = RGB(192, 192, 192);
			__debugInfo = "686:\ddgui.gbas";
			global11_ddgui_stack_ref[0].arrAccess(-(1)).values[tmpPositionCache][0].attr10_col_bright = RGB(255, 255, 255);
			__debugInfo = "687:\ddgui.gbas";
			global11_ddgui_stack_ref[0].arrAccess(-(1)).values[tmpPositionCache][0].attr14_col_hover_norm = RGB(64, 144, 255);
			__debugInfo = "688:\ddgui.gbas";
			global11_ddgui_stack_ref[0].arrAccess(-(1)).values[tmpPositionCache][0].attr16_col_hover_bright = RGB(160, 240, 255);
			__debugInfo = "685:\ddgui.gbas";
		};
		__debugInfo = "690:\ddgui.gbas";
		DIM(unref(global11_ddgui_stack_ref[0].arrAccess(-(1)).values[tmpPositionCache][0].attr7_widgets_ref[0]), [0], [new type9_DDGUI_WDG()]);
		__debugInfo = "691:\ddgui.gbas";
		DIM(global11_ddgui_stack_ref[0].arrAccess(-(1)).values[tmpPositionCache][0].attr9_draworder, [0], new type11_DDGUI_ORDER());
		__debugInfo = "692:\ddgui.gbas";
		DIM(global11_ddgui_stack_ref[0].arrAccess(-(1)).values[tmpPositionCache][0].attr5_autos, [0], new type10_DDGUI_AUTO());
		__debugInfo = "700:\ddgui.gbas";
		if ((((((((((((((((((((((PLATFORMINFO_Str("")) == ("WINCE")) ? 1 : 0)) || ((((PLATFORMINFO_Str("")) == ("GP2X")) ? 1 : 0))) ? 1 : 0)) || ((((PLATFORMINFO_Str("")) == ("ANDROID")) ? 1 : 0))) ? 1 : 0)) || ((((PLATFORMINFO_Str("")) == ("IPHONE")) ? 1 : 0))) ? 1 : 0)) || ((((PLATFORMINFO_Str("")) == ("PANDORA")) ? 1 : 0))) ? 1 : 0)) || ((((PLATFORMINFO_Str("")) == ("WEBOS")) ? 1 : 0))) ? 1 : 0)) || ((((PLATFORMINFO_Str("")) == ("PALM_PIXI")) ? 1 : 0))) ? 1 : 0)) {
			__debugInfo = "698:\ddgui.gbas";
			global20_DDGUI_AUTO_INPUT_DLG = 1;
			__debugInfo = "699:\ddgui.gbas";
			if ((((global20_gDDguiScrollbarWidth) == (0)) ? 1 : 0)) {
				__debugInfo = "699:\ddgui.gbas";
				global20_gDDguiScrollbarWidth = 30;
				__debugInfo = "699:\ddgui.gbas";
			};
			__debugInfo = "698:\ddgui.gbas";
		};
		__debugInfo = "701:\ddgui.gbas";
		if ((((global20_gDDguiScrollbarWidth) == (0)) ? 1 : 0)) {
			__debugInfo = "701:\ddgui.gbas";
			global20_gDDguiScrollbarWidth = 20;
			__debugInfo = "701:\ddgui.gbas";
		};
		__debugInfo = "703:\ddgui.gbas";
		return 0;
		__debugInfo = "682:\ddgui.gbas";
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
window['func16_DDgui_pushdialog'] = function(param1_x, param1_y, param5_width, param6_height, param16_center_to_screen) {
	stackPush("function: DDgui_pushdialog", __debugInfo);
	try {
		var local2_sx_ref_1622 = [0], local2_sy_ref_1623 = [0], local3_dlg_ref_1624 = [new type9_DDGUI_DLG()];
		__debugInfo = "785:\ddgui.gbas";
		if ((((global25_gDDguiMinControlDimension) <= (0)) ? 1 : 0)) {
			__debugInfo = "772:\ddgui.gbas";
			global25_gDDguiMinControlDimension = 16;
			__debugInfo = "772:\ddgui.gbas";
		};
		__debugInfo = "787:\ddgui.gbas";
		DIMPUSH(global11_ddgui_stack_ref[0], local3_dlg_ref_1624);
		__debugInfo = "789:\ddgui.gbas";
		GETSCREENSIZE(local2_sx_ref_1622, local2_sy_ref_1623);
		__debugInfo = "793:\ddgui.gbas";
		func10_DDgui_init();
		__debugInfo = "794:\ddgui.gbas";
		global11_ddgui_stack_ref[0].arrAccess(-(1)).values[tmpPositionCache][0].attr4_xpos = MIN(param1_x, ((local2_sx_ref_1622[0]) - (1)));
		__debugInfo = "795:\ddgui.gbas";
		global11_ddgui_stack_ref[0].arrAccess(-(1)).values[tmpPositionCache][0].attr4_ypos = MIN(param1_y, ((local2_sy_ref_1623[0]) - (1)));
		__debugInfo = "796:\ddgui.gbas";
		global11_ddgui_stack_ref[0].arrAccess(-(1)).values[tmpPositionCache][0].attr4_main.attr6_wwidth = MIN(param5_width, ((local2_sx_ref_1622[0]) - (param1_x)));
		__debugInfo = "797:\ddgui.gbas";
		global11_ddgui_stack_ref[0].arrAccess(-(1)).values[tmpPositionCache][0].attr4_main.attr7_wheight = MIN(param6_height, ((local2_sy_ref_1623[0]) - (param1_y)));
		__debugInfo = "800:\ddgui.gbas";
		global11_ddgui_stack_ref[0].arrAccess(-(1)).values[tmpPositionCache][0].attr8_col_norm = global11_ddgui_stack_ref[0].arrAccess(0).values[tmpPositionCache][0].attr8_col_norm;
		__debugInfo = "801:\ddgui.gbas";
		global11_ddgui_stack_ref[0].arrAccess(-(1)).values[tmpPositionCache][0].attr10_col_bright = global11_ddgui_stack_ref[0].arrAccess(0).values[tmpPositionCache][0].attr10_col_bright;
		__debugInfo = "802:\ddgui.gbas";
		global11_ddgui_stack_ref[0].arrAccess(-(1)).values[tmpPositionCache][0].attr14_col_hover_norm = global11_ddgui_stack_ref[0].arrAccess(0).values[tmpPositionCache][0].attr14_col_hover_norm;
		__debugInfo = "803:\ddgui.gbas";
		global11_ddgui_stack_ref[0].arrAccess(-(1)).values[tmpPositionCache][0].attr16_col_hover_bright = global11_ddgui_stack_ref[0].arrAccess(0).values[tmpPositionCache][0].attr16_col_hover_bright;
		__debugInfo = "806:\ddgui.gbas";
		if (param16_center_to_screen) {
			__debugInfo = "806:\ddgui.gbas";
			func18_DDgui_CenterDialog();
			__debugInfo = "806:\ddgui.gbas";
		};
		__debugInfo = "807:\ddgui.gbas";
		return 0;
		__debugInfo = "785:\ddgui.gbas";
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
window['func15_DDgui_popdialog'] = function() {
	stackPush("function: DDgui_popdialog", __debugInfo);
	try {
		__debugInfo = "827:\ddgui.gbas";
		if ((((BOUNDS(global11_ddgui_stack_ref[0], 0)) > (0)) ? 1 : 0)) {
			var local1_n_2282 = 0, local9_dummy_Str_ref_2283 = [""];
			__debugInfo = "815:\ddgui.gbas";
			local1_n_2282 = ((BOUNDS(global11_ddgui_stack_ref[0], 0)) - (1));
			__debugInfo = "821:\ddgui.gbas";
			var forEachSaver14554 = global11_ddgui_stack_ref[0].arrAccess(local1_n_2282).values[tmpPositionCache][0].attr7_widgets_ref[0];
			for(var forEachCounter14554 = 0 ; forEachCounter14554 < forEachSaver14554.values.length ; forEachCounter14554++) {
				var local3_wdg_ref_2284 = forEachSaver14554.values[forEachCounter14554];
			{
					__debugInfo = "820:\ddgui.gbas";
					if (local3_wdg_ref_2284[0].attr8_wuserfoo_ref[0]) {
						__debugInfo = "820:\ddgui.gbas";
						func12_DDgui_signal(local3_wdg_ref_2284[0].attr7_wid_Str, "DESTROY", local9_dummy_Str_ref_2283);
						__debugInfo = "820:\ddgui.gbas";
					};
					__debugInfo = "820:\ddgui.gbas";
				}
				forEachSaver14554.values[forEachCounter14554] = local3_wdg_ref_2284;
			
			};
			__debugInfo = "823:\ddgui.gbas";
			DIMDEL(global11_ddgui_stack_ref[0], local1_n_2282);
			__debugInfo = "815:\ddgui.gbas";
		};
		__debugInfo = "829:\ddgui.gbas";
		if (BOUNDS(global11_ddgui_stack_ref[0], 0)) {
			__debugInfo = "829:\ddgui.gbas";
			func18_DDgui_resizedialog(0, 0, 0, 0);
			__debugInfo = "829:\ddgui.gbas";
		};
		__debugInfo = "830:\ddgui.gbas";
		return 0;
		__debugInfo = "827:\ddgui.gbas";
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
window['func10_DDgui_show'] = function(param17_only_show_current) {
	stackPush("function: DDgui_show", __debugInfo);
	try {
		__debugInfo = "840:\ddgui.gbas";
		if ((((BOUNDS(global11_ddgui_stack_ref[0], 0)) == (0)) ? 1 : 0)) {
			__debugInfo = "838:\ddgui.gbas";
			DEBUG("DDshow: No active dialog!\n");
			__debugInfo = "839:\ddgui.gbas";
			return tryClone(0);
			__debugInfo = "838:\ddgui.gbas";
		};
		__debugInfo = "848:\ddgui.gbas";
		if ((((param17_only_show_current) == (0)) ? 1 : 0)) {
			var local1_i_1626 = 0;
			__debugInfo = "843:\ddgui.gbas";
			{
				__debugInfo = "847:\ddgui.gbas";
				for (local1_i_1626 = 0;toCheck(local1_i_1626, ((BOUNDS(global11_ddgui_stack_ref[0], 0)) - (2)), 1);local1_i_1626 += 1) {
					var alias3_dlg_ref_1627 = [new type9_DDGUI_DLG()];
					__debugInfo = "845:\ddgui.gbas";
					alias3_dlg_ref_1627 = global11_ddgui_stack_ref[0].arrAccess(local1_i_1626).values[tmpPositionCache] /* ALIAS */;
					__debugInfo = "846:\ddgui.gbas";
					func17_DDgui_show_intern(unref(alias3_dlg_ref_1627[0]), 0);
					__debugInfo = "845:\ddgui.gbas";
				};
				__debugInfo = "847:\ddgui.gbas";
			};
			__debugInfo = "843:\ddgui.gbas";
		};
		__debugInfo = "849:\ddgui.gbas";
		func17_DDgui_show_intern(unref(global11_ddgui_stack_ref[0].arrAccess(-(1)).values[tmpPositionCache][0]), 1);
		__debugInfo = "853:\ddgui.gbas";
		var forEachSaver2298 = global11_ddgui_stack_ref[0].arrAccess(-(1)).values[tmpPositionCache][0].attr5_autos;
		for(var forEachCounter2298 = 0 ; forEachCounter2298 < forEachSaver2298.values.length ; forEachCounter2298++) {
			var local5_autom_1628 = forEachSaver2298.values[forEachCounter2298];
		{
				__debugInfo = "852:\ddgui.gbas";
				func9_DDgui_set(local5_autom_1628.attr8_idto_Str, local5_autom_1628.attr9_objto_Str, func13_DDgui_get_Str(local5_autom_1628.attr10_idfrom_Str, local5_autom_1628.attr11_objfrom_Str));
				__debugInfo = "852:\ddgui.gbas";
			}
			forEachSaver2298.values[forEachCounter2298] = local5_autom_1628;
		
		};
		__debugInfo = "854:\ddgui.gbas";
		return 0;
		__debugInfo = "840:\ddgui.gbas";
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
window['func17_DDgui_show_intern'] = function(param10_ddgui_vals, param10_is_current) {
	stackPush("function: DDgui_show_intern", __debugInfo);
	try {
		var local1_x_1631 = 0, local1_y_1632 = 0, local5_width_1633 = 0, local6_height_1634 = 0, local2_c1_1635 = 0, local2_c2_1636 = 0, local1_i_1637 = 0, local6_id_Str_1638 = "", local7_dy_line_ref_1639 = [0], local4_xpos_ref_1640 = [0], local4_ypos_ref_1641 = [0], local4_ytop_1642 = 0, local5_yclip_1643 = 0, local2_mx_ref_1644 = [0], local2_my_ref_1645 = [0], local2_b1_1646 = 0, local2_b2_1647 = 0, local6_realb1_ref_1648 = [0], local6_realb2_ref_1649 = [0], local2_tx_ref_1650 = [0], local2_ty_ref_1651 = [0], local7_spacing_1652 = 0, local7_movable_1653 = 0, local3_col_1654 = 0, local14_caption_height_1661 = 0, local10_sizer_size_1662 = 0, local9_show_tips_1664 = 0, local5_xclip_1665 = 0, local6_ybclip_1666 = 0, local6_retval_1668 = 0, local10_KickId_Str_1669 = "";
		__debugInfo = "878:\ddgui.gbas";
		local7_spacing_1652 = 2;
		__debugInfo = "879:\ddgui.gbas";
		MOUSESTATE(local2_mx_ref_1644, local2_my_ref_1645, local6_realb1_ref_1648, local6_realb2_ref_1649);
		__debugInfo = "880:\ddgui.gbas";
		GETFONTSIZE(local2_tx_ref_1650, local2_ty_ref_1651);
		__debugInfo = "884:\ddgui.gbas";
		local14_caption_height_1661 = MAX(unref(local2_ty_ref_1651[0]), global25_gDDguiMinControlDimension);
		__debugInfo = "890:\ddgui.gbas";
		if (((((((ABS(((local2_mx_ref_1644[0]) - (static9_DDgui_show_intern_ToolTipMx)))) > (4)) ? 1 : 0)) || ((((ABS(((local2_my_ref_1645[0]) - (static9_DDgui_show_intern_ToolTipMy)))) > (4)) ? 1 : 0))) ? 1 : 0)) {
			__debugInfo = "887:\ddgui.gbas";
			static12_DDgui_show_intern_ToolTipDelay = ~~(GETTIMERALL());
			__debugInfo = "888:\ddgui.gbas";
			static9_DDgui_show_intern_ToolTipMx = local2_mx_ref_1644[0];
			__debugInfo = "889:\ddgui.gbas";
			static9_DDgui_show_intern_ToolTipMy = local2_my_ref_1645[0];
			__debugInfo = "887:\ddgui.gbas";
		};
		__debugInfo = "918:\ddgui.gbas";
		if (param10_is_current) {
			__debugInfo = "893:\ddgui.gbas";
			local2_b1_1646 = 0;
			__debugInfo = "900:\ddgui.gbas";
			if ((((local6_realb1_ref_1648[0]) && ((((static10_DDgui_show_intern_mouse_down) == (0)) ? 1 : 0))) ? 1 : 0)) {
				__debugInfo = "896:\ddgui.gbas";
				local2_b1_1646 = -(1);
				__debugInfo = "897:\ddgui.gbas";
				static10_DDgui_show_intern_mouse_down = 1;
				__debugInfo = "898:\ddgui.gbas";
				static10_DDgui_show_intern_movemousex = local2_mx_ref_1644[0];
				__debugInfo = "899:\ddgui.gbas";
				static10_DDgui_show_intern_movemousey = local2_my_ref_1645[0];
				__debugInfo = "896:\ddgui.gbas";
			};
			__debugInfo = "910:\ddgui.gbas";
			if (((((((local6_realb1_ref_1648[0]) == (0)) ? 1 : 0)) && ((((static10_DDgui_show_intern_mouse_down) > (0)) ? 1 : 0))) ? 1 : 0)) {
				__debugInfo = "903:\ddgui.gbas";
				local2_b1_1646 = 1;
				__debugInfo = "904:\ddgui.gbas";
				static10_DDgui_show_intern_mouse_down = 0;
				__debugInfo = "903:\ddgui.gbas";
			};
			__debugInfo = "893:\ddgui.gbas";
		};
		__debugInfo = "921:\ddgui.gbas";
		VIEWPORT(0, 0, 0, 0);
		__debugInfo = "922:\ddgui.gbas";
		local2_c1_1635 = param10_ddgui_vals.attr10_col_bright;
		__debugInfo = "923:\ddgui.gbas";
		local2_c2_1636 = param10_ddgui_vals.attr8_col_norm;
		__debugInfo = "924:\ddgui.gbas";
		local1_x_1631 = param10_ddgui_vals.attr4_xpos;
		__debugInfo = "925:\ddgui.gbas";
		local1_y_1632 = param10_ddgui_vals.attr4_ypos;
		__debugInfo = "926:\ddgui.gbas";
		local5_width_1633 = param10_ddgui_vals.attr4_main.attr6_wwidth;
		__debugInfo = "927:\ddgui.gbas";
		local6_height_1634 = param10_ddgui_vals.attr4_main.attr7_wheight;
		__debugInfo = "948:\ddgui.gbas";
		if (param10_is_current) {
			__debugInfo = "947:\ddgui.gbas";
			if (param10_ddgui_vals.attr8_moveable) {
				__debugInfo = "946:\ddgui.gbas";
				if (local6_realb1_ref_1648[0]) {
					__debugInfo = "934:\ddgui.gbas";
					local1_i_1637 = BOXCOLL(local1_x_1631, local1_y_1632, local5_width_1633, local14_caption_height_1661, unref(local2_mx_ref_1644[0]), unref(local2_my_ref_1645[0]), 1, 1);
					__debugInfo = "943:\ddgui.gbas";
					if (((((((local1_i_1637) || (param10_ddgui_vals.attr6_moving)) ? 1 : 0)) && (((((param10_ddgui_vals.attr9_focus_Str).length) == (0)) ? 1 : 0))) ? 1 : 0)) {
						__debugInfo = "936:\ddgui.gbas";
						param10_ddgui_vals.attr6_moving = 1;
						__debugInfo = "937:\ddgui.gbas";
						local1_x_1631 = MAX(0, ((((local1_x_1631) + (local2_mx_ref_1644[0]))) - (static10_DDgui_show_intern_movemousex)));
						__debugInfo = "938:\ddgui.gbas";
						local1_y_1632 = MAX(0, ((((local1_y_1632) + (local2_my_ref_1645[0]))) - (static10_DDgui_show_intern_movemousey)));
						__debugInfo = "939:\ddgui.gbas";
						param10_ddgui_vals.attr4_xpos = local1_x_1631;
						__debugInfo = "940:\ddgui.gbas";
						param10_ddgui_vals.attr4_ypos = local1_y_1632;
						__debugInfo = "936:\ddgui.gbas";
					} else if (local1_i_1637) {
						__debugInfo = "942:\ddgui.gbas";
						param10_ddgui_vals.attr9_focus_Str = "";
						__debugInfo = "942:\ddgui.gbas";
					};
					__debugInfo = "934:\ddgui.gbas";
				} else {
					__debugInfo = "945:\ddgui.gbas";
					param10_ddgui_vals.attr6_moving = 0;
					__debugInfo = "945:\ddgui.gbas";
				};
				__debugInfo = "946:\ddgui.gbas";
			};
			__debugInfo = "947:\ddgui.gbas";
		};
		__debugInfo = "971:\ddgui.gbas";
		if ((((param10_ddgui_vals.attr8_moveable) || ((param10_ddgui_vals.attr4_main.attr9_wtext_Str_ref[0]).length)) ? 1 : 0)) {
			__debugInfo = "952:\ddgui.gbas";
			local7_movable_1653 = 1;
			__debugInfo = "953:\ddgui.gbas";
			local1_y_1632 = ((((local1_y_1632) + (local14_caption_height_1661))) + (4));
			__debugInfo = "956:\ddgui.gbas";
			func13_DDgui_backgnd(local2_c1_1635, local2_c2_1636, ((local1_x_1631) + (1)), ((((local1_y_1632) - (local14_caption_height_1661))) - (3)), ((local5_width_1633) - (2)), ((local14_caption_height_1661) + (4)));
			__debugInfo = "958:\ddgui.gbas";
			func17_DDGui_PrintIntern(param10_ddgui_vals.attr4_main.attr9_wtext_Str_ref, ((local1_x_1631) + (3)), ((((local1_y_1632) - (local14_caption_height_1661))) - (2)), 1);
			__debugInfo = "959:\ddgui.gbas";
			func14_DDgui_backrect(local1_x_1631, ((((local1_y_1632) - (local14_caption_height_1661))) - (4)), local5_width_1633, ((((local6_height_1634) + (local14_caption_height_1661))) + (4)), local2_c2_1636);
			__debugInfo = "961:\ddgui.gbas";
			param10_ddgui_vals.attr5_rectx = local1_x_1631;
			__debugInfo = "962:\ddgui.gbas";
			param10_ddgui_vals.attr5_recty = ((((local1_y_1632) - (local14_caption_height_1661))) - (4));
			__debugInfo = "963:\ddgui.gbas";
			param10_ddgui_vals.attr5_rectw = local5_width_1633;
			__debugInfo = "964:\ddgui.gbas";
			param10_ddgui_vals.attr5_recth = ((((local6_height_1634) + (local14_caption_height_1661))) + (4));
			__debugInfo = "952:\ddgui.gbas";
		} else {
			__debugInfo = "966:\ddgui.gbas";
			func14_DDgui_backrect(local1_x_1631, local1_y_1632, local5_width_1633, local6_height_1634, local2_c2_1636);
			__debugInfo = "967:\ddgui.gbas";
			param10_ddgui_vals.attr5_rectx = local1_x_1631;
			__debugInfo = "968:\ddgui.gbas";
			param10_ddgui_vals.attr5_recty = local1_y_1632;
			__debugInfo = "969:\ddgui.gbas";
			param10_ddgui_vals.attr5_rectw = local5_width_1633;
			__debugInfo = "970:\ddgui.gbas";
			param10_ddgui_vals.attr5_recth = local6_height_1634;
			__debugInfo = "966:\ddgui.gbas";
		};
		__debugInfo = "975:\ddgui.gbas";
		func13_DDgui_backgnd(local2_c1_1635, local2_c1_1635, ((local1_x_1631) + (1)), ((local1_y_1632) + (1)), ((local5_width_1633) - (2)), ((local6_height_1634) - (2)));
		__debugInfo = "978:\ddgui.gbas";
		local4_ytop_1642 = local1_y_1632;
		__debugInfo = "979:\ddgui.gbas";
		local5_yclip_1643 = local4_ytop_1642;
		__debugInfo = "982:\ddgui.gbas";
		local10_sizer_size_1662 = MAX(((local2_tx_ref_1650[0]) * (2)), global20_gDDguiScrollbarWidth);
		__debugInfo = "999:\ddgui.gbas";
		if (param10_is_current) {
			__debugInfo = "998:\ddgui.gbas";
			if ((((param10_ddgui_vals.attr9_scaleable) || (param10_ddgui_vals.attr8_scaleing)) ? 1 : 0)) {
				__debugInfo = "997:\ddgui.gbas";
				if (local6_realb1_ref_1648[0]) {
					__debugInfo = "987:\ddgui.gbas";
					local1_i_1637 = BOXCOLL(((((((local1_x_1631) + (local5_width_1633))) - (local10_sizer_size_1662))) - (4)), ((((((local1_y_1632) + (local6_height_1634))) - (local10_sizer_size_1662))) - (4)), ((local10_sizer_size_1662) + (4)), ((local10_sizer_size_1662) + (4)), unref(local2_mx_ref_1644[0]), unref(local2_my_ref_1645[0]), 1, 1);
					__debugInfo = "994:\ddgui.gbas";
					if ((((local1_i_1637) || (param10_ddgui_vals.attr8_scaleing)) ? 1 : 0)) {
						__debugInfo = "989:\ddgui.gbas";
						param10_ddgui_vals.attr8_scaleing = 1;
						__debugInfo = "990:\ddgui.gbas";
						local5_width_1633 = MAX(0, ((((local5_width_1633) + (local2_mx_ref_1644[0]))) - (static10_DDgui_show_intern_movemousex)));
						__debugInfo = "991:\ddgui.gbas";
						local6_height_1634 = MAX(0, ((((local6_height_1634) + (local2_my_ref_1645[0]))) - (static10_DDgui_show_intern_movemousey)));
						__debugInfo = "992:\ddgui.gbas";
						param10_ddgui_vals.attr4_main.attr6_wwidth = local5_width_1633;
						__debugInfo = "993:\ddgui.gbas";
						param10_ddgui_vals.attr4_main.attr7_wheight = local6_height_1634;
						__debugInfo = "989:\ddgui.gbas";
					};
					__debugInfo = "987:\ddgui.gbas";
				} else {
					__debugInfo = "996:\ddgui.gbas";
					param10_ddgui_vals.attr8_scaleing = 0;
					__debugInfo = "996:\ddgui.gbas";
				};
				__debugInfo = "997:\ddgui.gbas";
			};
			__debugInfo = "998:\ddgui.gbas";
		};
		__debugInfo = "1011:\ddgui.gbas";
		if ((((param10_ddgui_vals.attr9_scaleable) || (param10_ddgui_vals.attr8_scaleing)) ? 1 : 0)) {
			__debugInfo = "1002:\ddgui.gbas";
			local3_col_1654 = BOXCOLL(((((((local1_x_1631) + (local5_width_1633))) - (local10_sizer_size_1662))) - (4)), ((((((local1_y_1632) + (local6_height_1634))) - (local10_sizer_size_1662))) - (4)), ((local10_sizer_size_1662) + (4)), ((local10_sizer_size_1662) + (4)), unref(local2_mx_ref_1644[0]), unref(local2_my_ref_1645[0]), 1, 1);
			__debugInfo = "1003:\ddgui.gbas";
			if (local3_col_1654) {
				__debugInfo = "1003:\ddgui.gbas";
				local2_c2_1636 = param10_ddgui_vals.attr14_col_hover_norm;
				__debugInfo = "1003:\ddgui.gbas";
			};
			__debugInfo = "1004:\ddgui.gbas";
			local1_i_1637 = ((((((local1_y_1632) + (local6_height_1634))) - (local10_sizer_size_1662))) - (3));
			__debugInfo = "1005:\ddgui.gbas";
			DRAWRECT(((((((local1_x_1631) + (local5_width_1633))) - (CAST2INT(((local10_sizer_size_1662) / (3)))))) - (5)), local1_i_1637, CAST2INT(((local10_sizer_size_1662) / (3))), 2, local2_c2_1636);
			__debugInfo = "1006:\ddgui.gbas";
			local1_i_1637+=CAST2INT(((local10_sizer_size_1662) / (3)));
			__debugInfo = "1007:\ddgui.gbas";
			DRAWRECT(((((((local1_x_1631) + (local5_width_1633))) - (CAST2INT(((((2) * (local10_sizer_size_1662))) / (3)))))) - (5)), local1_i_1637, CAST2INT(((((2) * (local10_sizer_size_1662))) / (3))), 2, local2_c2_1636);
			__debugInfo = "1008:\ddgui.gbas";
			local1_i_1637+=CAST2INT(((local10_sizer_size_1662) / (3)));
			__debugInfo = "1009:\ddgui.gbas";
			DRAWRECT(((((((local1_x_1631) + (local5_width_1633))) - (local10_sizer_size_1662))) - (5)), local1_i_1637, local10_sizer_size_1662, 2, local2_c2_1636);
			__debugInfo = "1010:\ddgui.gbas";
			if (local3_col_1654) {
				__debugInfo = "1010:\ddgui.gbas";
				local2_c2_1636 = param10_ddgui_vals.attr8_col_norm;
				__debugInfo = "1010:\ddgui.gbas";
			};
			__debugInfo = "1002:\ddgui.gbas";
		};
		__debugInfo = "1017:\ddgui.gbas";
		if (param10_is_current) {
			__debugInfo = "1015:\ddgui.gbas";
			static10_DDgui_show_intern_movemousex = local2_mx_ref_1644[0];
			__debugInfo = "1016:\ddgui.gbas";
			static10_DDgui_show_intern_movemousey = local2_my_ref_1645[0];
			__debugInfo = "1015:\ddgui.gbas";
		};
		__debugInfo = "1018:\ddgui.gbas";
		local1_x_1631+=3;
		__debugInfo = "1019:\ddgui.gbas";
		local1_y_1632+=3;
		__debugInfo = "1020:\ddgui.gbas";
		local4_ytop_1642+=3;
		__debugInfo = "1021:\ddgui.gbas";
		local5_yclip_1643+=3;
		__debugInfo = "1022:\ddgui.gbas";
		local5_width_1633+=-(6);
		__debugInfo = "1023:\ddgui.gbas";
		local6_height_1634+=-(6);
		__debugInfo = "1024:\ddgui.gbas";
		local4_ypos_ref_1641[0] = local1_y_1632;
		__debugInfo = "1025:\ddgui.gbas";
		local4_xpos_ref_1640[0] = local1_x_1631;
		__debugInfo = "1049:\ddgui.gbas";
		if (param10_is_current) {
			var local4_hgrp_1663 = 0;
			__debugInfo = "1029:\ddgui.gbas";
			param10_ddgui_vals.attr4_main.attr10_wscrollmax = MAX(0, ((((param10_ddgui_vals.attr10_realheight) - (local6_height_1634))) - (12)));
			__debugInfo = "1031:\ddgui.gbas";
			if (param10_ddgui_vals.attr4_main.attr10_wscrollmax) {
				__debugInfo = "1031:\ddgui.gbas";
				param10_ddgui_vals.attr4_main.attr10_wscrollmax+=24;
				__debugInfo = "1031:\ddgui.gbas";
			};
			__debugInfo = "1036:\ddgui.gbas";
			if (param10_ddgui_vals.attr9_scaleable) {
				__debugInfo = "1035:\ddgui.gbas";
				local4_hgrp_1663 = MAX(32, local10_sizer_size_1662);
				__debugInfo = "1035:\ddgui.gbas";
			};
			__debugInfo = "1048:\ddgui.gbas";
			if ((((param10_is_current) && (func21_DDgui_handlescrollbar(param10_ddgui_vals, param10_ddgui_vals.attr4_main, ((((local2_mx_ref_1644[0]) - (local1_x_1631))) + (10)), ((local2_my_ref_1645[0]) - (local1_y_1632)), local2_b1_1646, local2_b2_1647, ((local6_height_1634) - (local4_hgrp_1663))))) ? 1 : 0)) {
				__debugInfo = "1040:\ddgui.gbas";
				VIEWPORT(local1_x_1631, local1_y_1632, local5_width_1633, local6_height_1634);
				__debugInfo = "1041:\ddgui.gbas";
				func19_DDgui_drawscrollbar(param10_ddgui_vals, param10_ddgui_vals.attr4_main, local5_width_1633, ((local6_height_1634) - (local4_hgrp_1663)), local6_height_1634, 0);
				__debugInfo = "1042:\ddgui.gbas";
				VIEWPORT(0, 0, 0, 0);
				__debugInfo = "1044:\ddgui.gbas";
				local5_width_1633+=-(local10_sizer_size_1662);
				__debugInfo = "1045:\ddgui.gbas";
				local1_i_1637 = param10_ddgui_vals.attr4_main.attr7_wscroll;
				__debugInfo = "1046:\ddgui.gbas";
				local4_ypos_ref_1641[0] = ((local4_ypos_ref_1641[0]) - (local1_i_1637));
				__debugInfo = "1047:\ddgui.gbas";
				local4_ytop_1642 = ((local4_ytop_1642) - (local1_i_1637));
				__debugInfo = "1040:\ddgui.gbas";
			};
			__debugInfo = "1029:\ddgui.gbas";
		};
		__debugInfo = "1051:\ddgui.gbas";
		local7_dy_line_ref_1639[0] = 0;
		__debugInfo = "1055:\ddgui.gbas";
		if ((((BOUNDS(param10_ddgui_vals.attr9_draworder, 0)) != (BOUNDS(param10_ddgui_vals.attr7_widgets_ref[0], 0))) ? 1 : 0)) {
			__debugInfo = "1054:\ddgui.gbas";
			DEBUG((((((((("Draw order is messed up ") + (CAST2STRING(BOUNDS(param10_ddgui_vals.attr9_draworder, 0))))) + ("/"))) + (CAST2STRING(BOUNDS(param10_ddgui_vals.attr7_widgets_ref[0], 0))))) + ("\n")));
			__debugInfo = "1054:\ddgui.gbas";
		};
		__debugInfo = "1058:\ddgui.gbas";
		if ((((((GETTIMERALL()) - (static12_DDgui_show_intern_ToolTipDelay))) > (500)) ? 1 : 0)) {
			__debugInfo = "1058:\ddgui.gbas";
			local9_show_tips_1664 = 1;
			__debugInfo = "1058:\ddgui.gbas";
		};
		__debugInfo = "1061:\ddgui.gbas";
		local5_xclip_1665 = ((local4_xpos_ref_1640[0]) + (local5_width_1633));
		__debugInfo = "1062:\ddgui.gbas";
		local6_ybclip_1666 = ((local5_yclip_1643) + (local6_height_1634));
		__debugInfo = "1063:\ddgui.gbas";
		{
			var local2_od_ref_1667 = [0];
			__debugInfo = "1066:\ddgui.gbas";
			for (local2_od_ref_1667[0] = 0;toCheck(local2_od_ref_1667[0], ((BOUNDS(param10_ddgui_vals.attr9_draworder, 0)) - (1)), 1);local2_od_ref_1667[0] += 1) {
				__debugInfo = "1065:\ddgui.gbas";
				func24_DDgui_draw_widget_intern(param10_ddgui_vals, local2_od_ref_1667, local4_xpos_ref_1640, local4_ypos_ref_1641, local7_dy_line_ref_1639, local5_width_1633, param10_is_current, local7_spacing_1652, local5_xclip_1665, local5_yclip_1643, local6_ybclip_1666, unref(local2_mx_ref_1644[0]), unref(local2_my_ref_1645[0]), local2_b1_1646, local2_b2_1647, local1_x_1631, local1_y_1632, local9_show_tips_1664);
				__debugInfo = "1065:\ddgui.gbas";
			};
			__debugInfo = "1066:\ddgui.gbas";
		};
		__debugInfo = "1067:\ddgui.gbas";
		VIEWPORT(0, 0, 0, 0);
		__debugInfo = "1079:\ddgui.gbas";
		if ((((param10_is_current) == (0)) ? 1 : 0)) {
			__debugInfo = "1071:\ddgui.gbas";
			ALPHAMODE(-(0.5));
			__debugInfo = "1072:\ddgui.gbas";
			local1_x_1631 = param10_ddgui_vals.attr4_xpos;
			__debugInfo = "1073:\ddgui.gbas";
			local1_y_1632 = param10_ddgui_vals.attr4_ypos;
			__debugInfo = "1074:\ddgui.gbas";
			local5_width_1633 = param10_ddgui_vals.attr4_main.attr6_wwidth;
			__debugInfo = "1075:\ddgui.gbas";
			local6_height_1634 = param10_ddgui_vals.attr4_main.attr7_wheight;
			__debugInfo = "1076:\ddgui.gbas";
			if (local7_movable_1653) {
				__debugInfo = "1076:\ddgui.gbas";
				local6_height_1634+=((local14_caption_height_1661) + (4));
				__debugInfo = "1076:\ddgui.gbas";
			};
			__debugInfo = "1077:\ddgui.gbas";
			DRAWRECT(local1_x_1631, local1_y_1632, local5_width_1633, local6_height_1634, RGB(0, 0, 0));
			__debugInfo = "1078:\ddgui.gbas";
			ALPHAMODE(0);
			__debugInfo = "1071:\ddgui.gbas";
		};
		__debugInfo = "1080:\ddgui.gbas";
		SYSTEMPOINTER(1);
		__debugInfo = "1083:\ddgui.gbas";
		local6_height_1634 = ((((((local4_ypos_ref_1641[0]) + (local7_spacing_1652))) + (local7_dy_line_ref_1639[0]))) - (local4_ytop_1642));
		__debugInfo = "1084:\ddgui.gbas";
		if (param10_is_current) {
			__debugInfo = "1084:\ddgui.gbas";
			param10_ddgui_vals.attr10_realheight = local6_height_1634;
			__debugInfo = "1084:\ddgui.gbas";
		};
		__debugInfo = "1085:\ddgui.gbas";
		local6_retval_1668 = MAX(local6_height_1634, param10_ddgui_vals.attr4_main.attr7_wheight);
		__debugInfo = "1089:\ddgui.gbas";
		local1_x_1631 = param10_ddgui_vals.attr15_kick_intern_dlg;
		__debugInfo = "1090:\ddgui.gbas";
		param10_ddgui_vals.attr15_kick_intern_dlg = 0;
		__debugInfo = "1091:\ddgui.gbas";
		local10_KickId_Str_1669 = param10_ddgui_vals.attr18_kick_intern_id_Str;
		__debugInfo = "1093:\ddgui.gbas";
		{
			var local16___SelectHelper3__1670 = 0;
			__debugInfo = "1093:\ddgui.gbas";
			local16___SelectHelper3__1670 = local1_x_1631;
			__debugInfo = "1122:\ddgui.gbas";
			if ((((local16___SelectHelper3__1670) == (1)) ? 1 : 0)) {
				__debugInfo = "1095:\ddgui.gbas";
				local3_col_1654;
				__debugInfo = "1097:\ddgui.gbas";
				local3_col_1654 = func14_DDgui_ColorDlg(INT2STR(MID_Str(func13_DDgui_get_Str(local10_KickId_Str_1669, "TEXT"), 5, 64)));
				__debugInfo = "1098:\ddgui.gbas";
				func9_DDgui_set(local10_KickId_Str_1669, "TEXT", (("SPR_C") + (CAST2STRING(local3_col_1654))));
				__debugInfo = "1099:\ddgui.gbas";
				func9_DDgui_set(local10_KickId_Str_1669, "CLICKED", CAST2STRING(1));
				__debugInfo = "1095:\ddgui.gbas";
			} else if ((((local16___SelectHelper3__1670) == (2)) ? 1 : 0)) {
				var local11_bSingleText_1671 = 0, local9_bIsNumber_1672 = 0, local8_text_Str_1673 = "";
				__debugInfo = "1101:\ddgui.gbas";
				local11_bSingleText_1671 = 0;
				__debugInfo = "1102:\ddgui.gbas";
				local9_bIsNumber_1672 = 0;
				__debugInfo = "1103:\ddgui.gbas";
				if ((((func13_DDgui_get_Str(local10_KickId_Str_1669, "TYPE")) == ("SINGLETEXT")) ? 1 : 0)) {
					__debugInfo = "1103:\ddgui.gbas";
					local11_bSingleText_1671 = 1;
					__debugInfo = "1103:\ddgui.gbas";
				};
				__debugInfo = "1107:\ddgui.gbas";
				if ((((func13_DDgui_get_Str(local10_KickId_Str_1669, "TYPE")) == ("NUMBERTEXT")) ? 1 : 0)) {
					__debugInfo = "1105:\ddgui.gbas";
					local11_bSingleText_1671 = 1;
					__debugInfo = "1106:\ddgui.gbas";
					local9_bIsNumber_1672 = 1;
					__debugInfo = "1105:\ddgui.gbas";
				};
				__debugInfo = "1108:\ddgui.gbas";
				local8_text_Str_1673 = func15_DDgui_input_Str(func13_DDgui_get_Str(local10_KickId_Str_1669, "TEXT"), 0, 0, local11_bSingleText_1671, local9_bIsNumber_1672);
				__debugInfo = "1109:\ddgui.gbas";
				func9_DDgui_set(local10_KickId_Str_1669, "TEXT", local8_text_Str_1673);
				__debugInfo = "1101:\ddgui.gbas";
			} else if ((((local16___SelectHelper3__1670) == (3)) ? 1 : 0)) {
				var local3_scx_ref_1674 = [0], local3_scy_ref_1675 = [0], local4_isel_1676 = 0;
				__debugInfo = "1112:\ddgui.gbas";
				GETSCREENSIZE(local3_scx_ref_1674, local3_scy_ref_1675);
				__debugInfo = "1114:\ddgui.gbas";
				local4_isel_1676 = func24_DDgui_button_list_picker(MIN(((local3_scy_ref_1675[0]) - (16)), func9_DDgui_get(local10_KickId_Str_1669, "XPOS")), ~~(func9_DDgui_get(local10_KickId_Str_1669, "YPOS")), ~~(func9_DDgui_get(local10_KickId_Str_1669, "WIDTH")), MAX(16, ((local3_scy_ref_1675[0]) - (func9_DDgui_get(local10_KickId_Str_1669, "YPOS")))), func13_DDgui_get_Str(local10_KickId_Str_1669, "TEXT"), ~~(func9_DDgui_get(local10_KickId_Str_1669, "SELECT")));
				__debugInfo = "1118:\ddgui.gbas";
				if ((((local4_isel_1676) >= (0)) ? 1 : 0)) {
					__debugInfo = "1116:\ddgui.gbas";
					func9_DDgui_set(local10_KickId_Str_1669, "SELECT", CAST2STRING(local4_isel_1676));
					__debugInfo = "1117:\ddgui.gbas";
					func9_DDgui_set(local10_KickId_Str_1669, "CLICKED", CAST2STRING(1));
					__debugInfo = "1116:\ddgui.gbas";
				};
				__debugInfo = "1112:\ddgui.gbas";
			} else if ((((local16___SelectHelper3__1670) == (4)) ? 1 : 0)) {
				var local7_ret_Str_1677 = "";
				__debugInfo = "1120:\ddgui.gbas";
				local7_ret_Str_1677 = func20_DDgui_FileDialog_Str(1, "*.*", 0);
				__debugInfo = "1121:\ddgui.gbas";
				func9_DDgui_set(local10_KickId_Str_1669, "TEXT", local7_ret_Str_1677);
				__debugInfo = "1120:\ddgui.gbas";
			};
			__debugInfo = "1093:\ddgui.gbas";
		};
		__debugInfo = "1127:\ddgui.gbas";
		return tryClone(local6_retval_1668);
		__debugInfo = "1128:\ddgui.gbas";
		return 0;
		__debugInfo = "878:\ddgui.gbas";
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
window['func24_DDgui_draw_widget_intern'] = function(param10_ddgui_vals, param11_order_index_ref, param4_xpos_ref, param4_ypos_ref, param7_dy_line_ref, param5_width, param10_is_current, param7_spacing, param5_xclip, param5_yclip, param6_ybclip, param2_mx, param2_my, param2_b1, param2_b2, param1_x, param1_y, param9_show_tips) {
	stackPush("function: DDgui_draw_widget_intern", __debugInfo);
	try {
		var local3_vpx_1696 = 0, local3_vpy_1697 = 0, local2_dx_1698 = 0, local2_dy_1699 = 0, local5_vptop_1701 = 0, local4_ytop_1702 = 0, alias3_wdg_ref_1703 = [new type9_DDGUI_WDG()];
		__debugInfo = "1152:\ddgui.gbas";
		alias3_wdg_ref_1703 = param10_ddgui_vals.attr7_widgets_ref[0].arrAccess(param10_ddgui_vals.attr9_draworder.arrAccess(param11_order_index_ref[0]).values[tmpPositionCache].attr5_index).values[tmpPositionCache] /* ALIAS */;
		__debugInfo = "1155:\ddgui.gbas";
		if (alias3_wdg_ref_1703[0].attr5_whide) {
			__debugInfo = "1155:\ddgui.gbas";
			return 1;
			__debugInfo = "1155:\ddgui.gbas";
		};
		__debugInfo = "1157:\ddgui.gbas";
		local2_dx_1698 = alias3_wdg_ref_1703[0].attr6_wwidth;
		__debugInfo = "1158:\ddgui.gbas";
		local2_dy_1699 = alias3_wdg_ref_1703[0].attr7_wheight;
		__debugInfo = "1167:\ddgui.gbas";
		if ((((((param4_xpos_ref[0]) + (local2_dx_1698))) > (((param5_width) + (param1_x)))) ? 1 : 0)) {
			__debugInfo = "1162:\ddgui.gbas";
			param4_xpos_ref[0] = param1_x;
			__debugInfo = "1163:\ddgui.gbas";
			param4_ypos_ref[0] = ((((param4_ypos_ref[0]) + (param7_dy_line_ref[0]))) + (param7_spacing));
			__debugInfo = "1164:\ddgui.gbas";
			param7_dy_line_ref[0] = local2_dy_1699;
			__debugInfo = "1166:\ddgui.gbas";
			if (((((((local2_dx_1698) >= (param5_width)) ? 1 : 0)) && ((((alias3_wdg_ref_1703[0].attr9_wtype_Str) == ("SPACER")) ? 1 : 0))) ? 1 : 0)) {
				__debugInfo = "1166:\ddgui.gbas";
				return 1;
				__debugInfo = "1166:\ddgui.gbas";
			};
			__debugInfo = "1162:\ddgui.gbas";
		};
		__debugInfo = "1173:\ddgui.gbas";
		if ((((((((((alias3_wdg_ref_1703[0].attr6_walign) == (0)) ? 1 : 0)) && ((((local2_dx_1698) < (param5_width)) ? 1 : 0))) ? 1 : 0)) && ((((param5_width) < (10000)) ? 1 : 0))) ? 1 : 0)) {
			__debugInfo = "1172:\ddgui.gbas";
			param4_xpos_ref[0] = ((param4_xpos_ref[0]) + (CAST2INT(((((((((param5_width) + (param1_x))) - (param4_xpos_ref[0]))) - (local2_dx_1698))) / (2)))));
			__debugInfo = "1172:\ddgui.gbas";
		};
		__debugInfo = "1177:\ddgui.gbas";
		if ((((((((((alias3_wdg_ref_1703[0].attr6_walign) > (0)) ? 1 : 0)) && ((((local2_dx_1698) < (param5_width)) ? 1 : 0))) ? 1 : 0)) && ((((param5_width) < (10000)) ? 1 : 0))) ? 1 : 0)) {
			__debugInfo = "1176:\ddgui.gbas";
			param4_xpos_ref[0] = ((((param1_x) + (param5_width))) - (local2_dx_1698));
			__debugInfo = "1176:\ddgui.gbas";
		};
		__debugInfo = "1179:\ddgui.gbas";
		//label: __DrawFrames__;
		__debugInfo = "1261:\ddgui.gbas";
		if ((((alias3_wdg_ref_1703[0].attr9_wtype_Str) == ("FRAME")) ? 1 : 0)) {
			var local6_border_1704 = 0, local13_dy_line_frame_ref_1705 = [0], local6_xstart_1706 = 0, local6_ystart_1707 = 0, local4_iord_ref_1710 = [0], local8_fr_width_1711 = 0, local6_wwidth_1712 = 0;
			__debugInfo = "1181:\ddgui.gbas";
			local6_border_1704 = 0;
			__debugInfo = "1182:\ddgui.gbas";
			if ((((local2_dx_1698) == (10000)) ? 1 : 0)) {
				__debugInfo = "1182:\ddgui.gbas";
				local6_border_1704 = 1;
				__debugInfo = "1182:\ddgui.gbas";
			};
			__debugInfo = "1183:\ddgui.gbas";
			local13_dy_line_frame_ref_1705[0] = 0;
			__debugInfo = "1184:\ddgui.gbas";
			local6_xstart_1706 = param4_xpos_ref[0];
			__debugInfo = "1185:\ddgui.gbas";
			local6_ystart_1707 = param4_ypos_ref[0];
			__debugInfo = "1223:\ddgui.gbas";
			if ((alias3_wdg_ref_1703[0].attr9_wtext_Str_ref[0]).length) {
				var local2_fx_ref_1708 = [0], local2_fy_ref_1709 = [0];
				__debugInfo = "1188:\ddgui.gbas";
				local6_border_1704 = 4;
				__debugInfo = "1190:\ddgui.gbas";
				GETFONTSIZE(local2_fx_ref_1708, local2_fy_ref_1709);
				__debugInfo = "1193:\ddgui.gbas";
				local3_vpx_1696 = alias3_wdg_ref_1703[0].attr6_wwidth;
				__debugInfo = "1194:\ddgui.gbas";
				local3_vpy_1697 = alias3_wdg_ref_1703[0].attr7_wheight;
				__debugInfo = "1195:\ddgui.gbas";
				local5_vptop_1701 = param4_ypos_ref[0];
				__debugInfo = "1197:\ddgui.gbas";
				local4_ytop_1702 = 0;
				__debugInfo = "1202:\ddgui.gbas";
				if ((((param4_ypos_ref[0]) < (param5_yclip)) ? 1 : 0)) {
					__debugInfo = "1199:\ddgui.gbas";
					local4_ytop_1702 = ((param4_ypos_ref[0]) - (param5_yclip));
					__debugInfo = "1200:\ddgui.gbas";
					local5_vptop_1701+=-(local4_ytop_1702);
					__debugInfo = "1201:\ddgui.gbas";
					local3_vpy_1697+=local4_ytop_1702;
					__debugInfo = "1199:\ddgui.gbas";
				};
				__debugInfo = "1203:\ddgui.gbas";
				if ((((((local3_vpx_1696) + (param4_xpos_ref[0]))) > (param5_xclip)) ? 1 : 0)) {
					__debugInfo = "1203:\ddgui.gbas";
					local3_vpx_1696 = ((param5_xclip) - (param4_xpos_ref[0]));
					__debugInfo = "1203:\ddgui.gbas";
				};
				__debugInfo = "1204:\ddgui.gbas";
				if ((((((local3_vpy_1697) + (local5_vptop_1701))) > (param6_ybclip)) ? 1 : 0)) {
					__debugInfo = "1204:\ddgui.gbas";
					local3_vpy_1697 = ((param6_ybclip) - (local5_vptop_1701));
					__debugInfo = "1204:\ddgui.gbas";
				};
				__debugInfo = "1216:\ddgui.gbas";
				if (((((((local3_vpx_1696) > (0)) ? 1 : 0)) && ((((local3_vpy_1697) > (0)) ? 1 : 0))) ? 1 : 0)) {
					__debugInfo = "1208:\ddgui.gbas";
					VIEWPORT(unref(param4_xpos_ref[0]), local5_vptop_1701, local3_vpx_1696, local3_vpy_1697);
					__debugInfo = "1210:\ddgui.gbas";
					ALPHAMODE(-(0.5));
					__debugInfo = "1211:\ddgui.gbas";
					func14_DDgui_backrect(1, ((((local4_ytop_1702) + (CAST2INT(((local2_fy_ref_1709[0]) / (2)))))) + (1)), ((alias3_wdg_ref_1703[0].attr6_wwidth) - (2)), ((((alias3_wdg_ref_1703[0].attr7_wheight) - (CAST2INT(((local2_fy_ref_1709[0]) / (2)))))) - (2)), param10_ddgui_vals.attr8_col_norm);
					__debugInfo = "1212:\ddgui.gbas";
					ALPHAMODE(0);
					__debugInfo = "1213:\ddgui.gbas";
					func14_DDgui_backrect(0, ((local4_ytop_1702) + (CAST2INT(((local2_fy_ref_1709[0]) / (2))))), alias3_wdg_ref_1703[0].attr6_wwidth, ((alias3_wdg_ref_1703[0].attr7_wheight) - (CAST2INT(((local2_fy_ref_1709[0]) / (2))))), param10_ddgui_vals.attr8_col_norm);
					__debugInfo = "1214:\ddgui.gbas";
					DRAWRECT(local6_border_1704, local4_ytop_1702, ((((local6_border_1704) * (4))) + (func21_DDGui_TextWidthIntern(alias3_wdg_ref_1703[0].attr9_wtext_Str_ref))), unref(local2_fy_ref_1709[0]), param10_ddgui_vals.attr10_col_bright);
					__debugInfo = "1215:\ddgui.gbas";
					func17_DDGui_PrintIntern(alias3_wdg_ref_1703[0].attr9_wtext_Str_ref, ((local6_border_1704) * (2)), local4_ytop_1702, 0);
					__debugInfo = "1208:\ddgui.gbas";
				};
				__debugInfo = "1218:\ddgui.gbas";
				param4_ypos_ref[0]+=((local2_fy_ref_1709[0]) + (local6_border_1704));
				__debugInfo = "1219:\ddgui.gbas";
				param4_xpos_ref[0]+=local6_border_1704;
				__debugInfo = "1220:\ddgui.gbas";
				param4_ypos_ref[0]+=local6_border_1704;
				__debugInfo = "1221:\ddgui.gbas";
				local6_xstart_1706+=local6_border_1704;
				__debugInfo = "1188:\ddgui.gbas";
			};
			__debugInfo = "1227:\ddgui.gbas";
			local8_fr_width_1711 = 0;
			__debugInfo = "1231:\ddgui.gbas";
			local6_wwidth_1712 = alias3_wdg_ref_1703[0].attr6_wwidth;
			__debugInfo = "1232:\ddgui.gbas";
			if ((((local6_wwidth_1712) < (10000)) ? 1 : 0)) {
				__debugInfo = "1232:\ddgui.gbas";
				local6_wwidth_1712+=-(((2) * (local6_border_1704)));
				__debugInfo = "1232:\ddgui.gbas";
			};
			__debugInfo = "1232:\ddgui.gbas";
			{
				__debugInfo = "1248:\ddgui.gbas";
				for (local4_iord_ref_1710[0] = ((param11_order_index_ref[0]) + (1));toCheck(local4_iord_ref_1710[0], ((BOUNDS(param10_ddgui_vals.attr9_draworder, 0)) - (1)), 1);local4_iord_ref_1710[0] += 1) {
					var local9_simplewdg_1713 = 0, local4_icur_1714 = 0;
					__debugInfo = "1235:\ddgui.gbas";
					local4_icur_1714 = local4_iord_ref_1710[0];
					__debugInfo = "1240:\ddgui.gbas";
					local9_simplewdg_1713 = func24_DDgui_draw_widget_intern(param10_ddgui_vals, local4_iord_ref_1710, param4_xpos_ref, param4_ypos_ref, local13_dy_line_frame_ref_1705, local6_wwidth_1712, param10_is_current, param7_spacing, param5_xclip, param5_yclip, param6_ybclip, param2_mx, param2_my, param2_b1, param2_b2, local6_xstart_1706, local6_ystart_1707, param9_show_tips);
					__debugInfo = "1243:\ddgui.gbas";
					local8_fr_width_1711 = MAX(local8_fr_width_1711, ((param4_xpos_ref[0]) - (local6_xstart_1706)));
					__debugInfo = "1247:\ddgui.gbas";
					if ((((local9_simplewdg_1713) == (0)) ? 1 : 0)) {
						__debugInfo = "1245:\ddgui.gbas";
						param11_order_index_ref[0] = local4_iord_ref_1710[0];
						__debugInfo = "1246:\ddgui.gbas";
						break;
						__debugInfo = "1245:\ddgui.gbas";
					};
					__debugInfo = "1235:\ddgui.gbas";
				};
				__debugInfo = "1248:\ddgui.gbas";
			};
			__debugInfo = "1253:\ddgui.gbas";
			if ((((alias3_wdg_ref_1703[0].attr6_wwidth) == (10000)) ? 1 : 0)) {
				__debugInfo = "1251:\ddgui.gbas";
				alias3_wdg_ref_1703[0].attr6_wwidth = ((local8_fr_width_1711) + (((2) * (local6_border_1704))));
				__debugInfo = "1252:\ddgui.gbas";
				local2_dx_1698 = alias3_wdg_ref_1703[0].attr6_wwidth;
				__debugInfo = "1251:\ddgui.gbas";
			};
			__debugInfo = "1255:\ddgui.gbas";
			alias3_wdg_ref_1703[0].attr7_wheight = ((((((param4_ypos_ref[0]) - (local6_ystart_1707))) + (local13_dy_line_frame_ref_1705[0]))) + (((local6_border_1704) * (2))));
			__debugInfo = "1256:\ddgui.gbas";
			param4_xpos_ref[0] = local6_xstart_1706;
			__debugInfo = "1257:\ddgui.gbas";
			param4_ypos_ref[0] = local6_ystart_1707;
			__debugInfo = "1181:\ddgui.gbas";
		} else if ((((alias3_wdg_ref_1703[0].attr9_wtype_Str) == ("UNFRAME")) ? 1 : 0)) {
			__debugInfo = "1260:\ddgui.gbas";
			return tryClone(0);
			__debugInfo = "1260:\ddgui.gbas";
		};
		__debugInfo = "1264:\ddgui.gbas";
		if (param10_is_current) {
			__debugInfo = "1264:\ddgui.gbas";
			func18_DDgui_handlewidget(param10_ddgui_vals, unref(alias3_wdg_ref_1703[0]), ((param2_mx) - (param4_xpos_ref[0])), ((param2_my) - (param4_ypos_ref[0])), param2_b1, param2_b2);
			__debugInfo = "1264:\ddgui.gbas";
		};
		__debugInfo = "1266:\ddgui.gbas";
		local3_vpx_1696 = local2_dx_1698;
		__debugInfo = "1267:\ddgui.gbas";
		local3_vpy_1697 = local2_dy_1699;
		__debugInfo = "1268:\ddgui.gbas";
		local5_vptop_1701 = param4_ypos_ref[0];
		__debugInfo = "1269:\ddgui.gbas";
		local4_ytop_1702 = 0;
		__debugInfo = "1274:\ddgui.gbas";
		if ((((param4_ypos_ref[0]) < (param5_yclip)) ? 1 : 0)) {
			__debugInfo = "1271:\ddgui.gbas";
			local4_ytop_1702 = ((param4_ypos_ref[0]) - (param5_yclip));
			__debugInfo = "1272:\ddgui.gbas";
			local5_vptop_1701+=-(local4_ytop_1702);
			__debugInfo = "1273:\ddgui.gbas";
			local3_vpy_1697+=local4_ytop_1702;
			__debugInfo = "1271:\ddgui.gbas";
		};
		__debugInfo = "1275:\ddgui.gbas";
		if ((((((local3_vpx_1696) + (param4_xpos_ref[0]))) > (param5_xclip)) ? 1 : 0)) {
			__debugInfo = "1275:\ddgui.gbas";
			local3_vpx_1696 = ((param5_xclip) - (param4_xpos_ref[0]));
			__debugInfo = "1275:\ddgui.gbas";
		};
		__debugInfo = "1276:\ddgui.gbas";
		if ((((((local3_vpy_1697) + (local5_vptop_1701))) > (param6_ybclip)) ? 1 : 0)) {
			__debugInfo = "1276:\ddgui.gbas";
			local3_vpy_1697 = ((param6_ybclip) - (local5_vptop_1701));
			__debugInfo = "1276:\ddgui.gbas";
		};
		__debugInfo = "1279:\ddgui.gbas";
		alias3_wdg_ref_1703[0].attr5_wxpos = param4_xpos_ref[0];
		__debugInfo = "1280:\ddgui.gbas";
		alias3_wdg_ref_1703[0].attr5_wypos = local5_vptop_1701;
		__debugInfo = "1286:\ddgui.gbas";
		if (((((((local3_vpx_1696) > (0)) ? 1 : 0)) && ((((local3_vpy_1697) > (0)) ? 1 : 0))) ? 1 : 0)) {
			__debugInfo = "1284:\ddgui.gbas";
			VIEWPORT(unref(param4_xpos_ref[0]), local5_vptop_1701, local3_vpx_1696, local3_vpy_1697);
			__debugInfo = "1285:\ddgui.gbas";
			func16_DDgui_drawwidget(param10_ddgui_vals, unref(alias3_wdg_ref_1703[0]), local4_ytop_1702);
			__debugInfo = "1284:\ddgui.gbas";
		};
		__debugInfo = "1338:\ddgui.gbas";
		if (((((((param9_show_tips) && (alias3_wdg_ref_1703[0].attr6_whover)) ? 1 : 0)) && ((alias3_wdg_ref_1703[0].attr11_tiptext_Str_ref[0]).length)) ? 1 : 0)) {
			var local4_boxx_ref_1715 = [0.0], local4_boxy_ref_1716 = [0.0], local5_frame_1717 = 0, local5_truew_1718 = 0, local12_is_multiline_1719 = 0;
			__debugInfo = "1291:\ddgui.gbas";
			local5_frame_1717 = 1;
			__debugInfo = "1292:\ddgui.gbas";
			VIEWPORT(0, 0, 0, 0);
			__debugInfo = "1293:\ddgui.gbas";
			GETFONTSIZE(local4_boxx_ref_1715, local4_boxy_ref_1716);
			__debugInfo = "1297:\ddgui.gbas";
			local12_is_multiline_1719 = INSTR(unref(alias3_wdg_ref_1703[0].attr11_tiptext_Str_ref[0]), "\n", 0);
			__debugInfo = "1312:\ddgui.gbas";
			if ((((local12_is_multiline_1719) != (-(1))) ? 1 : 0)) {
				__debugInfo = "1299:\ddgui.gbas";
				SPLITSTR(unref(alias3_wdg_ref_1703[0].attr11_tiptext_Str_ref[0]), unref(static9_DDgui_draw_widget_intern_lines_Str), "\n", 1);
				__debugInfo = "1300:\ddgui.gbas";
				local4_boxy_ref_1716[0] = ((local4_boxy_ref_1716[0]) * (BOUNDS(static9_DDgui_draw_widget_intern_lines_Str, 0)));
				__debugInfo = "1302:\ddgui.gbas";
				local5_truew_1718 = 0;
				__debugInfo = "1305:\ddgui.gbas";
				var forEachSaver4055 = static9_DDgui_draw_widget_intern_lines_Str;
				for(var forEachCounter4055 = 0 ; forEachCounter4055 < forEachSaver4055.values.length ; forEachCounter4055++) {
					var local5_l_Str_1720 = forEachSaver4055.values[forEachCounter4055];
				{
						__debugInfo = "1304:\ddgui.gbas";
						local5_truew_1718 = MAX(local5_truew_1718, func21_DDGui_TextWidthIntern(local5_l_Str_1720));
						__debugInfo = "1304:\ddgui.gbas";
					}
					forEachSaver4055.values[forEachCounter4055] = local5_l_Str_1720;
				
				};
				__debugInfo = "1306:\ddgui.gbas";
				local4_boxx_ref_1715[0] = local5_truew_1718;
				__debugInfo = "1299:\ddgui.gbas";
			} else {
				__debugInfo = "1308:\ddgui.gbas";
				local5_truew_1718 = func21_DDGui_TextWidthIntern(alias3_wdg_ref_1703[0].attr11_tiptext_Str_ref);
				__debugInfo = "1309:\ddgui.gbas";
				local4_boxx_ref_1715[0] = MAX(local3_vpx_1696, local5_truew_1718);
				__debugInfo = "1310:\ddgui.gbas";
				DIM(static9_DDgui_draw_widget_intern_lines_Str, [1], "");
				__debugInfo = "1311:\ddgui.gbas";
				static9_DDgui_draw_widget_intern_lines_Str.arrAccess(0).values[tmpPositionCache] = alias3_wdg_ref_1703[0].attr11_tiptext_Str_ref[0];
				__debugInfo = "1308:\ddgui.gbas";
			};
			__debugInfo = "1313:\ddgui.gbas";
			param1_x;
			__debugInfo = "1314:\ddgui.gbas";
			param1_y;
			__debugInfo = "1315:\ddgui.gbas";
			param1_x = MAX(0, ((((param4_xpos_ref[0]) + (((((local3_vpx_1696) - (local4_boxx_ref_1715[0]))) / (2))))) - (local5_frame_1717)));
			__debugInfo = "1316:\ddgui.gbas";
			param1_y = MAX(0, ((((param4_ypos_ref[0]) - (local4_boxy_ref_1716[0]))) - (((local5_frame_1717) * (2)))));
			__debugInfo = "1318:\ddgui.gbas";
			param1_y+=-(global25_gDDguiMinControlDimension);
			__debugInfo = "1319:\ddgui.gbas";
			if ((((param1_y) < (0)) ? 1 : 0)) {
				__debugInfo = "1319:\ddgui.gbas";
				param1_y = 0;
				__debugInfo = "1319:\ddgui.gbas";
			};
			__debugInfo = "1321:\ddgui.gbas";
			ALPHAMODE(-(0.8));
			__debugInfo = "1322:\ddgui.gbas";
			DRAWRECT(param1_x, param1_y, ((local4_boxx_ref_1715[0]) + (((local5_frame_1717) * (2)))), ((local4_boxy_ref_1716[0]) + (((local5_frame_1717) * (2)))), param10_ddgui_vals.attr16_col_hover_bright);
			__debugInfo = "1323:\ddgui.gbas";
			ALPHAMODE(0);
			__debugInfo = "1324:\ddgui.gbas";
			func14_DDgui_backrect(param1_x, param1_y, ~~(((local4_boxx_ref_1715[0]) + (((local5_frame_1717) * (2))))), ~~(((local4_boxy_ref_1716[0]) + (((local5_frame_1717) * (2))))), param10_ddgui_vals.attr8_col_norm);
			__debugInfo = "1326:\ddgui.gbas";
			param1_x+=local5_frame_1717;
			__debugInfo = "1327:\ddgui.gbas";
			param1_y+=local5_frame_1717;
			__debugInfo = "1337:\ddgui.gbas";
			if (BOUNDS(static9_DDgui_draw_widget_intern_lines_Str, 0)) {
				var local1_w_ref_1721 = [0], local1_h_ref_1722 = [0];
				__debugInfo = "1330:\ddgui.gbas";
				GETFONTSIZE(local1_w_ref_1721, local1_h_ref_1722);
				__debugInfo = "1334:\ddgui.gbas";
				var forEachSaver4212 = static9_DDgui_draw_widget_intern_lines_Str;
				for(var forEachCounter4212 = 0 ; forEachCounter4212 < forEachSaver4212.values.length ; forEachCounter4212++) {
					var local5_l_Str_1723 = forEachSaver4212.values[forEachCounter4212];
				{
						__debugInfo = "1332:\ddgui.gbas";
						func17_DDGui_PrintIntern(local5_l_Str_1723, ~~(((param1_x) + (((((local4_boxx_ref_1715[0]) - (func21_DDGui_TextWidthIntern(local5_l_Str_1723)))) / (2))))), param1_y, 0);
						__debugInfo = "1333:\ddgui.gbas";
						param1_y+=local1_h_ref_1722[0];
						__debugInfo = "1332:\ddgui.gbas";
					}
					forEachSaver4212.values[forEachCounter4212] = local5_l_Str_1723;
				
				};
				__debugInfo = "1330:\ddgui.gbas";
			} else {
				__debugInfo = "1336:\ddgui.gbas";
				func17_DDGui_PrintIntern(alias3_wdg_ref_1703[0].attr11_tiptext_Str_ref, ~~(((param1_x) + (((((local4_boxx_ref_1715[0]) - (local5_truew_1718))) / (2))))), param1_y, 0);
				__debugInfo = "1336:\ddgui.gbas";
			};
			__debugInfo = "1291:\ddgui.gbas";
		};
		__debugInfo = "1340:\ddgui.gbas";
		param4_xpos_ref[0] = ((((param4_xpos_ref[0]) + (local3_vpx_1696))) + (param7_spacing));
		__debugInfo = "1341:\ddgui.gbas";
		if ((((param7_dy_line_ref[0]) < (local2_dy_1699)) ? 1 : 0)) {
			__debugInfo = "1341:\ddgui.gbas";
			param7_dy_line_ref[0] = local2_dy_1699;
			__debugInfo = "1341:\ddgui.gbas";
		};
		__debugInfo = "1343:\ddgui.gbas";
		return 1;
		__debugInfo = "1344:\ddgui.gbas";
		return 0;
		__debugInfo = "1152:\ddgui.gbas";
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
window['func18_DDgui_resizedialog'] = function(param1_x, param1_y, param5_width, param6_height) {
	stackPush("function: DDgui_resizedialog", __debugInfo);
	try {
		var local1_i_2289 = 0, local6_id_Str_2290 = "", local3_scx_ref_2291 = [0], local3_scy_ref_2292 = [0];
		__debugInfo = "1354:\ddgui.gbas";
		GETSCREENSIZE(local3_scx_ref_2291, local3_scy_ref_2292);
		__debugInfo = "1360:\ddgui.gbas";
		if (((((((param5_width) > (0)) ? 1 : 0)) && ((((param6_height) > (0)) ? 1 : 0))) ? 1 : 0)) {
			__debugInfo = "1356:\ddgui.gbas";
			func9_DDgui_set("", "XPOS", CAST2STRING(param1_x));
			__debugInfo = "1357:\ddgui.gbas";
			func9_DDgui_set("", "YPOS", CAST2STRING(param1_y));
			__debugInfo = "1358:\ddgui.gbas";
			if ((((param5_width) > (0)) ? 1 : 0)) {
				__debugInfo = "1358:\ddgui.gbas";
				func9_DDgui_set("", "WIDTH", CAST2STRING(MIN(unref(local3_scx_ref_2291[0]), param5_width)));
				__debugInfo = "1358:\ddgui.gbas";
			};
			__debugInfo = "1359:\ddgui.gbas";
			if ((((param6_height) > (0)) ? 1 : 0)) {
				__debugInfo = "1359:\ddgui.gbas";
				func9_DDgui_set("", "HEIGHT", CAST2STRING(MIN(unref(local3_scy_ref_2292[0]), param6_height)));
				__debugInfo = "1359:\ddgui.gbas";
			};
			__debugInfo = "1356:\ddgui.gbas";
		};
		__debugInfo = "1364:\ddgui.gbas";
		var forEachSaver14648 = global11_ddgui_stack_ref[0].arrAccess(-(1)).values[tmpPositionCache][0].attr7_widgets_ref[0];
		for(var forEachCounter14648 = 0 ; forEachCounter14648 < forEachSaver14648.values.length ; forEachCounter14648++) {
			var local3_wdg_ref_2293 = forEachSaver14648.values[forEachCounter14648];
		{
				__debugInfo = "1363:\ddgui.gbas";
				func18_DDgui_handlewidget(unref(global11_ddgui_stack_ref[0].arrAccess(-(1)).values[tmpPositionCache][0]), unref(local3_wdg_ref_2293[0]), -(1), -(1), 0, 0);
				__debugInfo = "1363:\ddgui.gbas";
			}
			forEachSaver14648.values[forEachCounter14648] = local3_wdg_ref_2293;
		
		};
		__debugInfo = "1365:\ddgui.gbas";
		return 0;
		__debugInfo = "1354:\ddgui.gbas";
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
window['func10_DDgui_hide'] = function(param6_id_Str, param5_bHide) {
	stackPush("function: DDgui_hide", __debugInfo);
	try {
		__debugInfo = "1372:\ddgui.gbas";
		func9_DDgui_set(param6_id_Str, "HIDE", CAST2STRING(param5_bHide));
		__debugInfo = "1390:\ddgui.gbas";
		if ((((func13_DDgui_get_Str(param6_id_Str, "TYPE")) == ("FRAME")) ? 1 : 0)) {
			var local2_od_2296 = 0, local7_inframe_2297 = 0;
			__debugInfo = "1376:\ddgui.gbas";
			{
				__debugInfo = "1389:\ddgui.gbas";
				for (local2_od_2296 = 0;toCheck(local2_od_2296, ((BOUNDS(global11_ddgui_stack_ref[0].arrAccess(-(1)).values[tmpPositionCache][0].attr9_draworder, 0)) - (1)), 1);local2_od_2296 += 1) {
					__debugInfo = "1378:\ddgui.gbas";
					if (((((((local7_inframe_2297) == (0)) ? 1 : 0)) && ((((global11_ddgui_stack_ref[0].arrAccess(-(1)).values[tmpPositionCache][0].attr9_draworder.arrAccess(local2_od_2296).values[tmpPositionCache].attr6_id_Str_ref[0]) == (param6_id_Str)) ? 1 : 0))) ? 1 : 0)) {
						__debugInfo = "1378:\ddgui.gbas";
						local7_inframe_2297+=1;
						__debugInfo = "1378:\ddgui.gbas";
					};
					__debugInfo = "1388:\ddgui.gbas";
					if (local7_inframe_2297) {
						var alias3_wdg_ref_2298 = [new type9_DDGUI_WDG()];
						__debugInfo = "1380:\ddgui.gbas";
						alias3_wdg_ref_2298 = global11_ddgui_stack_ref[0].arrAccess(-(1)).values[tmpPositionCache][0].attr7_widgets_ref[0].arrAccess(global11_ddgui_stack_ref[0].arrAccess(-(1)).values[tmpPositionCache][0].attr9_draworder.arrAccess(local2_od_2296).values[tmpPositionCache].attr5_index).values[tmpPositionCache] /* ALIAS */;
						__debugInfo = "1384:\ddgui.gbas";
						if ((((alias3_wdg_ref_2298[0].attr9_wtype_Str) == ("UNFRAME")) ? 1 : 0)) {
							__debugInfo = "1382:\ddgui.gbas";
							local7_inframe_2297+=-1;
							__debugInfo = "1383:\ddgui.gbas";
							if ((((local7_inframe_2297) < (2)) ? 1 : 0)) {
								__debugInfo = "1383:\ddgui.gbas";
								break;
								__debugInfo = "1383:\ddgui.gbas";
							};
							__debugInfo = "1382:\ddgui.gbas";
						};
						__debugInfo = "1385:\ddgui.gbas";
						if ((((alias3_wdg_ref_2298[0].attr9_wtype_Str) == ("FRAME")) ? 1 : 0)) {
							__debugInfo = "1385:\ddgui.gbas";
							local7_inframe_2297+=1;
							__debugInfo = "1385:\ddgui.gbas";
						};
						__debugInfo = "1386:\ddgui.gbas";
						alias3_wdg_ref_2298[0].attr5_whide = param5_bHide;
						__debugInfo = "1387:\ddgui.gbas";
						if (param5_bHide) {
							__debugInfo = "1387:\ddgui.gbas";
							alias3_wdg_ref_2298[0].attr8_wclicked = 0;
							__debugInfo = "1387:\ddgui.gbas";
						};
						__debugInfo = "1380:\ddgui.gbas";
					};
					__debugInfo = "1378:\ddgui.gbas";
				};
				__debugInfo = "1389:\ddgui.gbas";
			};
			__debugInfo = "1376:\ddgui.gbas";
		};
		__debugInfo = "1391:\ddgui.gbas";
		return 0;
		__debugInfo = "1372:\ddgui.gbas";
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
window['__DDgui_Callbacks__'] = function() {
	stackPush("sub: __DDgui_Callbacks__", __debugInfo);
	try {
		
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
window['func15_DDgui_draw_user'] = function(param6_id_Str_ref, param5_width, param6_height, param4_ytop) {
	stackPush("function: DDgui_draw_user", __debugInfo);
	try {
		__debugInfo = "1403:\ddgui.gbas";
		func13_DDgui_backgnd(RGB(0, 0, 0), RGB(255, 255, 255), 0, 0, param5_width, param6_height);
		__debugInfo = "1404:\ddgui.gbas";
		PRINT((("user: id=") + (param6_id_Str_ref[0])), 0, 0, 0);
		__debugInfo = "1405:\ddgui.gbas";
		return 0;
		__debugInfo = "1403:\ddgui.gbas";
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
window['func17_DDgui_handle_user'] = function(param6_id_Str_ref, param2_mx, param2_my, param2_b1, param2_b2) {
	stackPush("function: DDgui_handle_user", __debugInfo);
	try {
		__debugInfo = "1411:\ddgui.gbas";
		VIEWPORT(0, 0, 0, 0);
		__debugInfo = "1412:\ddgui.gbas";
		DRAWRECT(0, 0, 1024, 1024, RGB(255, 128, 64));
		__debugInfo = "1413:\ddgui.gbas";
		PRINT("Must overwrite: ddgui_handle_user", 0, 0, 0);
		__debugInfo = "1414:\ddgui.gbas";
		PRINT((("for item: ") + (param6_id_Str_ref[0])), 0, 20, 0);
		__debugInfo = "1415:\ddgui.gbas";
		PRINT((("type=") + (func13_DDgui_get_Str(unref(param6_id_Str_ref[0]), "TYPE"))), 0, 40, 0);
		__debugInfo = "1416:\ddgui.gbas";
		SHOWSCREEN();
		__debugInfo = "1419:\ddgui.gbas";
		return 0;
		__debugInfo = "1411:\ddgui.gbas";
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
window['func14_DDgui_backrect'] = function(param1_x, param1_y, param2_dx, param2_dy, param3_col) {
	stackPush("function: DDgui_backrect", __debugInfo);
	try {
		__debugInfo = "1455:\ddgui.gbas";
		DRAWRECT(((param1_x) + (1)), param1_y, ((param2_dx) - (2)), 1, param3_col);
		__debugInfo = "1456:\ddgui.gbas";
		DRAWRECT(param1_x, ((param1_y) + (1)), 1, ((param2_dy) - (2)), param3_col);
		__debugInfo = "1457:\ddgui.gbas";
		DRAWRECT(((((param1_x) + (param2_dx))) - (1)), ((param1_y) + (1)), 1, ((param2_dy) - (2)), param3_col);
		__debugInfo = "1458:\ddgui.gbas";
		DRAWRECT(((param1_x) + (1)), ((((param1_y) + (param2_dy))) - (1)), ((param2_dx) - (2)), 1, param3_col);
		__debugInfo = "1460:\ddgui.gbas";
		return 0;
		__debugInfo = "1455:\ddgui.gbas";
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
window['func13_DDgui_backgnd'] = function(param4_col1, param4_col2, param1_x, param1_y, param2_dx, param2_dy) {
	stackPush("function: DDgui_backgnd", __debugInfo);
	try {
		__debugInfo = "1489:\ddgui.gbas";
		if ((((static7_DDgui_backgnd_QuickGL) == (-(1))) ? 1 : 0)) {
			__debugInfo = "1488:\ddgui.gbas";
			if ((((INTEGER(FLOAT2STR(PLATFORMINFO_Str("GLEXT:glDrawRangeElements")))) != (0)) ? 1 : 0)) {
				__debugInfo = "1482:\ddgui.gbas";
				static7_DDgui_backgnd_QuickGL = 1;
				__debugInfo = "1482:\ddgui.gbas";
			} else {
				__debugInfo = "1484:\ddgui.gbas";
				static7_DDgui_backgnd_QuickGL = 0;
				__debugInfo = "1484:\ddgui.gbas";
			};
			__debugInfo = "1488:\ddgui.gbas";
		};
		__debugInfo = "1495:\ddgui.gbas";
		if ((((param4_col1) == (param4_col2)) ? 1 : 0)) {
			__debugInfo = "1493:\ddgui.gbas";
			DRAWRECT(param1_x, param1_y, param2_dx, param2_dy, param4_col1);
			__debugInfo = "1494:\ddgui.gbas";
			return 0;
			__debugInfo = "1493:\ddgui.gbas";
		};
		__debugInfo = "1525:\ddgui.gbas";
		if (static7_DDgui_backgnd_QuickGL) {
			var local4_hpos_1736 = 0.0;
			__debugInfo = "1498:\ddgui.gbas";
			local4_hpos_1736 = 0.35;
			__debugInfo = "1499:\ddgui.gbas";
			STARTPOLY(-(1), 2);
			__debugInfo = "1514:\ddgui.gbas";
			if ((((param2_dx) >= (((param2_dy) * (0.65)))) ? 1 : 0)) {
				__debugInfo = "1501:\ddgui.gbas";
				POLYVECTOR(((param1_x) + (param2_dx)), param1_y, 0, 0, param4_col1);
				__debugInfo = "1502:\ddgui.gbas";
				POLYVECTOR(param1_x, param1_y, 0, 0, param4_col1);
				__debugInfo = "1503:\ddgui.gbas";
				POLYVECTOR(((param1_x) + (param2_dx)), ((param1_y) + (((param2_dy) * (local4_hpos_1736)))), 0, 0, param4_col2);
				__debugInfo = "1504:\ddgui.gbas";
				POLYVECTOR(param1_x, ((param1_y) + (((param2_dy) * (local4_hpos_1736)))), 0, 0, param4_col2);
				__debugInfo = "1505:\ddgui.gbas";
				POLYVECTOR(((param1_x) + (param2_dx)), ((param1_y) + (param2_dy)), 0, 0, param4_col2);
				__debugInfo = "1506:\ddgui.gbas";
				POLYVECTOR(param1_x, ((param1_y) + (param2_dy)), 0, 0, param4_col2);
				__debugInfo = "1501:\ddgui.gbas";
			} else {
				__debugInfo = "1508:\ddgui.gbas";
				POLYVECTOR(param1_x, param1_y, 0, 0, param4_col1);
				__debugInfo = "1509:\ddgui.gbas";
				POLYVECTOR(param1_x, ((param1_y) + (param2_dy)), 0, 0, param4_col1);
				__debugInfo = "1510:\ddgui.gbas";
				POLYVECTOR(((param1_x) + (((param2_dx) * (local4_hpos_1736)))), param1_y, 0, 0, param4_col2);
				__debugInfo = "1511:\ddgui.gbas";
				POLYVECTOR(((param1_x) + (((param2_dx) * (local4_hpos_1736)))), ((param1_y) + (param2_dy)), 0, 0, param4_col2);
				__debugInfo = "1512:\ddgui.gbas";
				POLYVECTOR(((param1_x) + (param2_dx)), param1_y, 0, 0, param4_col2);
				__debugInfo = "1513:\ddgui.gbas";
				POLYVECTOR(((param1_x) + (param2_dx)), ((param1_y) + (param2_dy)), 0, 0, param4_col1);
				__debugInfo = "1508:\ddgui.gbas";
			};
			__debugInfo = "1515:\ddgui.gbas";
			ENDPOLY();
			__debugInfo = "1498:\ddgui.gbas";
		} else {
			var local4_hpos_1737 = 0.0;
			__debugInfo = "1517:\ddgui.gbas";
			local4_hpos_1737 = 0.35;
			__debugInfo = "1524:\ddgui.gbas";
			if ((((param2_dx) >= (((param2_dy) * (0.65)))) ? 1 : 0)) {
				__debugInfo = "1519:\ddgui.gbas";
				DRAWRECT(param1_x, param1_y, param2_dx, ((param2_dy) * (local4_hpos_1737)), param4_col1);
				__debugInfo = "1520:\ddgui.gbas";
				DRAWRECT(param1_x, ((param1_y) + (((param2_dy) * (local4_hpos_1737)))), param2_dx, ((((param2_dy) * (((1) - (local4_hpos_1737))))) + (0.99)), param4_col2);
				__debugInfo = "1519:\ddgui.gbas";
			} else {
				__debugInfo = "1522:\ddgui.gbas";
				DRAWRECT(param1_x, param1_y, ((param2_dx) * (local4_hpos_1737)), param2_dy, param4_col1);
				__debugInfo = "1523:\ddgui.gbas";
				DRAWRECT(((param1_x) + (((param2_dx) * (local4_hpos_1737)))), param1_y, ((((param2_dx) * (((1) - (local4_hpos_1737))))) + (0.99)), param2_dy, param4_col2);
				__debugInfo = "1522:\ddgui.gbas";
			};
			__debugInfo = "1517:\ddgui.gbas";
		};
		__debugInfo = "1526:\ddgui.gbas";
		return 0;
		__debugInfo = "1489:\ddgui.gbas";
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
window['__DDgui_Widgets___'] = function() {
	stackPush("sub: __DDgui_Widgets___", __debugInfo);
	try {
		
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
window['func12_DDgui_widget'] = function(param6_id_Str, param11_caption_Str, param5_width, param6_height) {
	stackPush("function: DDgui_widget", __debugInfo);
	try {
		var local5_count_1742 = 0, local2_fx_ref_1743 = [0], local2_fy_ref_1744 = [0], local3_wdg_1745 = new type9_DDGUI_WDG(), local1_i_1746 = 0;
		var local6_id_Str_ref_1738 = [param6_id_Str]; /* NEWCODEHERE */
		var local11_caption_Str_ref_1739 = [param11_caption_Str]; /* NEWCODEHERE */
		__debugInfo = "1540:\ddgui.gbas";
		local5_count_1742 = ((1) + (BOUNDS(global11_ddgui_stack_ref[0].arrAccess(-(1)).values[tmpPositionCache][0].attr7_widgets_ref[0], 0)));
		__debugInfo = "1541:\ddgui.gbas";
		if ((((local6_id_Str_ref_1738[0]) == ("")) ? 1 : 0)) {
			__debugInfo = "1541:\ddgui.gbas";
			local6_id_Str_ref_1738[0] = (("iwdg%") + (CAST2STRING(local5_count_1742)));
			__debugInfo = "1541:\ddgui.gbas";
		};
		__debugInfo = "1543:\ddgui.gbas";
		GETFONTSIZE(local2_fx_ref_1743, local2_fy_ref_1744);
		__debugInfo = "1544:\ddgui.gbas";
		if ((((param5_width) <= (global25_gDDguiMinControlDimension)) ? 1 : 0)) {
			__debugInfo = "1544:\ddgui.gbas";
			param5_width = MAX(global25_gDDguiMinControlDimension, MAX(param5_width, ((func21_DDGui_TextWidthIntern(local11_caption_Str_ref_1739)) + (local2_fx_ref_1743[0]))));
			__debugInfo = "1544:\ddgui.gbas";
		};
		__debugInfo = "1545:\ddgui.gbas";
		if ((((param6_height) <= (global25_gDDguiMinControlDimension)) ? 1 : 0)) {
			__debugInfo = "1545:\ddgui.gbas";
			param6_height = MAX(global25_gDDguiMinControlDimension, MAX(param6_height, ((local2_fy_ref_1744[0]) + (6))));
			__debugInfo = "1545:\ddgui.gbas";
		};
		__debugInfo = "1547:\ddgui.gbas";
		local1_i_1746 = func11_DDgui_index(unref(global11_ddgui_stack_ref[0].arrAccess(-(1)).values[tmpPositionCache][0]), local6_id_Str_ref_1738, 1);
		__debugInfo = "1548:\ddgui.gbas";
		global11_ddgui_stack_ref[0].arrAccess(-(1)).values[tmpPositionCache][0].attr7_widgets_ref[0].arrAccess(local1_i_1746).values[tmpPositionCache][0].attr7_wid_Str = local6_id_Str_ref_1738[0];
		__debugInfo = "1549:\ddgui.gbas";
		global11_ddgui_stack_ref[0].arrAccess(-(1)).values[tmpPositionCache][0].attr7_widgets_ref[0].arrAccess(local1_i_1746).values[tmpPositionCache][0].attr6_wwidth = param5_width;
		__debugInfo = "1550:\ddgui.gbas";
		global11_ddgui_stack_ref[0].arrAccess(-(1)).values[tmpPositionCache][0].attr7_widgets_ref[0].arrAccess(local1_i_1746).values[tmpPositionCache][0].attr7_wheight = param6_height;
		__debugInfo = "1551:\ddgui.gbas";
		global11_ddgui_stack_ref[0].arrAccess(-(1)).values[tmpPositionCache][0].attr7_widgets_ref[0].arrAccess(local1_i_1746).values[tmpPositionCache][0].attr9_wtype_Str = "WIDGET";
		__debugInfo = "1552:\ddgui.gbas";
		global11_ddgui_stack_ref[0].arrAccess(-(1)).values[tmpPositionCache][0].attr7_widgets_ref[0].arrAccess(local1_i_1746).values[tmpPositionCache][0].attr9_wtext_Str_ref[0] = local11_caption_Str_ref_1739[0];
		__debugInfo = "1553:\ddgui.gbas";
		return 0;
		__debugInfo = "1540:\ddgui.gbas";
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
window['func12_DDgui_signal'] = function(param6_id_Str, param8_verb_Str, param8_info_Str_ref) {
	stackPush("function: DDgui_signal", __debugInfo);
	try {
		var local2_id_2311 = 0, alias3_foo_ref_2312 = [DDgui_userfunction];
		var local6_id_Str_ref_2308 = [param6_id_Str]; /* NEWCODEHERE */
		__debugInfo = "1570:\ddgui.gbas";
		local2_id_2311 = func11_DDgui_index(unref(global11_ddgui_stack_ref[0].arrAccess(-(1)).values[tmpPositionCache][0]), local6_id_Str_ref_2308, 0);
		__debugInfo = "1571:\ddgui.gbas";
		if ((((local2_id_2311) < (0)) ? 1 : 0)) {
			__debugInfo = "1571:\ddgui.gbas";
			return tryClone(0);
			__debugInfo = "1571:\ddgui.gbas";
		};
		__debugInfo = "1572:\ddgui.gbas";
		alias3_foo_ref_2312 = global11_ddgui_stack_ref[0].arrAccess(-(1)).values[tmpPositionCache][0].attr7_widgets_ref[0].arrAccess(local2_id_2311).values[tmpPositionCache][0].attr8_wuserfoo_ref /* ALIAS */;
		__debugInfo = "1575:\ddgui.gbas";
		if (alias3_foo_ref_2312[0]) {
			__debugInfo = "1574:\ddgui.gbas";
			alias3_foo_ref_2312[0](local6_id_Str_ref_2308, param8_verb_Str, param8_info_Str_ref);
			__debugInfo = "1574:\ddgui.gbas";
		};
		__debugInfo = "1576:\ddgui.gbas";
		return 0;
		__debugInfo = "1570:\ddgui.gbas";
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
window['func16_DDgui_drawwidget'] = function(param10_ddgui_vals, param3_wdg, param4_ytop) {
	stackPush("function: DDgui_drawwidget", __debugInfo);
	try {
		__debugInfo = "1596:\ddgui.gbas";
		{
			var local16___SelectHelper4__1751 = "";
			__debugInfo = "1596:\ddgui.gbas";
			local16___SelectHelper4__1751 = param3_wdg.attr9_wtype_Str;
			__debugInfo = "1642:\ddgui.gbas";
			if ((((local16___SelectHelper4__1751) == ("FRAME")) ? 1 : 0)) {
				
			} else if ((((local16___SelectHelper4__1751) == ("UNFRAME")) ? 1 : 0)) {
				
			} else if ((((local16___SelectHelper4__1751) == ("SPACER")) ? 1 : 0)) {
				
			} else if ((((local16___SelectHelper4__1751) == ("WIDGET")) ? 1 : 0)) {
				var local1_w_ref_1752 = [0], local1_h_ref_1753 = [0];
				__debugInfo = "1602:\ddgui.gbas";
				ALPHAMODE(-(0.7));
				__debugInfo = "1604:\ddgui.gbas";
				GETFONTSIZE(local1_w_ref_1752, local1_h_ref_1753);
				__debugInfo = "1611:\ddgui.gbas";
				if ((((INSTR(unref(param3_wdg.attr9_wtext_Str_ref[0]), "\ny", 0)) < (0)) ? 1 : 0)) {
					__debugInfo = "1608:\ddgui.gbas";
					local1_h_ref_1753[0] = func14_DDgui_boxprint(param10_ddgui_vals, param3_wdg, 0, ((param4_ytop) + (CAST2INT(((((param3_wdg.attr7_wheight) - (local1_h_ref_1753[0]))) / (2))))), param3_wdg.attr6_wwidth, 1, 0);
					__debugInfo = "1608:\ddgui.gbas";
				} else {
					__debugInfo = "1610:\ddgui.gbas";
					local1_h_ref_1753[0] = func14_DDgui_boxprint(param10_ddgui_vals, param3_wdg, 0, param4_ytop, param3_wdg.attr6_wwidth, 1, 0);
					__debugInfo = "1610:\ddgui.gbas";
				};
				__debugInfo = "1612:\ddgui.gbas";
				param3_wdg.attr7_wheight = MAX(global25_gDDguiMinControlDimension, unref(local1_h_ref_1753[0]));
				__debugInfo = "1613:\ddgui.gbas";
				ALPHAMODE(0);
				__debugInfo = "1602:\ddgui.gbas";
			} else if ((((local16___SelectHelper4__1751) == ("BUTTON")) ? 1 : 0)) {
				__debugInfo = "1615:\ddgui.gbas";
				func16_DDgui_drawbutton(param10_ddgui_vals, param3_wdg, param4_ytop);
				__debugInfo = "1615:\ddgui.gbas";
			} else if ((((local16___SelectHelper4__1751) == ("SLIDER")) ? 1 : 0)) {
				__debugInfo = "1617:\ddgui.gbas";
				func16_DDgui_drawslider(param10_ddgui_vals, param3_wdg, param4_ytop);
				__debugInfo = "1617:\ddgui.gbas";
			} else if ((((local16___SelectHelper4__1751) == ("RADIO")) ? 1 : 0)) {
				__debugInfo = "1619:\ddgui.gbas";
				func15_DDgui_drawradio(param10_ddgui_vals, param3_wdg, param4_ytop);
				__debugInfo = "1619:\ddgui.gbas";
			} else if ((((local16___SelectHelper4__1751) == ("CHECKBOX")) ? 1 : 0)) {
				__debugInfo = "1621:\ddgui.gbas";
				func18_DDgui_drawcheckbox(param10_ddgui_vals, param3_wdg, param4_ytop);
				__debugInfo = "1621:\ddgui.gbas";
			} else if ((((local16___SelectHelper4__1751) == ("TAB")) ? 1 : 0)) {
				__debugInfo = "1623:\ddgui.gbas";
				func13_DDgui_drawtab(param10_ddgui_vals, param3_wdg, param4_ytop);
				__debugInfo = "1623:\ddgui.gbas";
			} else if ((((local16___SelectHelper4__1751) == ("COMBO")) ? 1 : 0)) {
				__debugInfo = "1625:\ddgui.gbas";
				func15_DDgui_drawcombo(param10_ddgui_vals, param3_wdg, param4_ytop);
				__debugInfo = "1625:\ddgui.gbas";
			} else if ((((local16___SelectHelper4__1751) == ("LIST")) ? 1 : 0)) {
				__debugInfo = "1627:\ddgui.gbas";
				func14_DDgui_drawlist(param10_ddgui_vals, param3_wdg, param4_ytop);
				__debugInfo = "1627:\ddgui.gbas";
			} else if ((((local16___SelectHelper4__1751) == ("SINGLETEXT")) ? 1 : 0)) {
				__debugInfo = "1629:\ddgui.gbas";
				func14_DDgui_drawtext(param10_ddgui_vals, param3_wdg, param4_ytop, 1);
				__debugInfo = "1629:\ddgui.gbas";
			} else if ((((local16___SelectHelper4__1751) == ("NUMBERTEXT")) ? 1 : 0)) {
				__debugInfo = "1631:\ddgui.gbas";
				func14_DDgui_drawtext(param10_ddgui_vals, param3_wdg, param4_ytop, 1);
				__debugInfo = "1631:\ddgui.gbas";
			} else if ((((local16___SelectHelper4__1751) == ("TEXT")) ? 1 : 0)) {
				__debugInfo = "1633:\ddgui.gbas";
				func14_DDgui_drawtext(param10_ddgui_vals, param3_wdg, param4_ytop, 0);
				__debugInfo = "1633:\ddgui.gbas";
			} else if ((((local16___SelectHelper4__1751) == ("FILE")) ? 1 : 0)) {
				__debugInfo = "1635:\ddgui.gbas";
				func14_DDgui_drawfile(param10_ddgui_vals, param3_wdg, param4_ytop);
				__debugInfo = "1635:\ddgui.gbas";
			} else {
				__debugInfo = "1641:\ddgui.gbas";
				if (param3_wdg.attr8_wuserfoo_ref[0]) {
					__debugInfo = "1638:\ddgui.gbas";
					param3_wdg.attr8_wuserfoo_ref[0](param3_wdg.attr7_wid_Str, "DRAW", static9_DDgui_drawwidget_dummy_Str_ref);
					__debugInfo = "1638:\ddgui.gbas";
				} else {
					__debugInfo = "1640:\ddgui.gbas";
					func15_DDgui_draw_user(param3_wdg.attr7_wid_Str, param3_wdg.attr6_wwidth, param3_wdg.attr7_wheight, param4_ytop);
					__debugInfo = "1640:\ddgui.gbas";
				};
				__debugInfo = "1641:\ddgui.gbas";
			};
			__debugInfo = "1596:\ddgui.gbas";
		};
		__debugInfo = "1643:\ddgui.gbas";
		return 0;
		__debugInfo = "1596:\ddgui.gbas";
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
window['func18_DDgui_handlewidget'] = function(param10_ddgui_vals, param3_wdg, param2_mx, param2_my, param2_b1, param2_b2) {
	stackPush("function: DDgui_handlewidget", __debugInfo);
	try {
		__debugInfo = "1661:\ddgui.gbas";
		if (((((((((((((param2_mx) >= (0)) ? 1 : 0)) && ((((param2_my) >= (0)) ? 1 : 0))) ? 1 : 0)) && ((((param2_mx) < (param3_wdg.attr6_wwidth)) ? 1 : 0))) ? 1 : 0)) && ((((param2_my) < (param3_wdg.attr7_wheight)) ? 1 : 0))) ? 1 : 0)) {
			__debugInfo = "1657:\ddgui.gbas";
			param3_wdg.attr6_whover = 1;
			__debugInfo = "1657:\ddgui.gbas";
		} else {
			__debugInfo = "1658:\ddgui.gbas";
			param2_b1 = 0;
			__debugInfo = "1659:\ddgui.gbas";
			param2_b2 = 0;
			__debugInfo = "1660:\ddgui.gbas";
			param3_wdg.attr6_whover = 0;
			__debugInfo = "1658:\ddgui.gbas";
		};
		__debugInfo = "1663:\ddgui.gbas";
		{
			var local16___SelectHelper5__1761 = "";
			__debugInfo = "1663:\ddgui.gbas";
			local16___SelectHelper5__1761 = param3_wdg.attr9_wtype_Str;
			__debugInfo = "1709:\ddgui.gbas";
			if ((((local16___SelectHelper5__1761) == ("SPACER")) ? 1 : 0)) {
				
			} else if ((((local16___SelectHelper5__1761) == ("FRAME")) ? 1 : 0)) {
				
			} else if ((((local16___SelectHelper5__1761) == ("UNFRAME")) ? 1 : 0)) {
				
			} else if ((((local16___SelectHelper5__1761) == ("WIDGET")) ? 1 : 0)) {
				__debugInfo = "1669:\ddgui.gbas";
				if ((((param2_b1) != (1)) ? 1 : 0)) {
					__debugInfo = "1669:\ddgui.gbas";
					param2_b1 = 0;
					__debugInfo = "1669:\ddgui.gbas";
				};
				__debugInfo = "1670:\ddgui.gbas";
				param3_wdg.attr8_wclicked = param2_b1;
				__debugInfo = "1669:\ddgui.gbas";
			} else if ((((local16___SelectHelper5__1761) == ("BUTTON")) ? 1 : 0)) {
				__debugInfo = "1672:\ddgui.gbas";
				func18_DDgui_handlebutton(param10_ddgui_vals, param3_wdg, param2_mx, param2_my, param2_b1, param2_b2);
				__debugInfo = "1672:\ddgui.gbas";
			} else if ((((local16___SelectHelper5__1761) == ("SLIDER")) ? 1 : 0)) {
				__debugInfo = "1675:\ddgui.gbas";
				func18_DDgui_handleslider(param10_ddgui_vals, param3_wdg, param2_mx, param2_my, param2_b1, param2_b2);
				__debugInfo = "1675:\ddgui.gbas";
			} else if ((((local16___SelectHelper5__1761) == ("RADIO")) ? 1 : 0)) {
				__debugInfo = "1677:\ddgui.gbas";
				func17_DDgui_handleradio(param10_ddgui_vals, param3_wdg, param2_mx, param2_my, param2_b1, param2_b2);
				__debugInfo = "1677:\ddgui.gbas";
			} else if ((((local16___SelectHelper5__1761) == ("CHECKBOX")) ? 1 : 0)) {
				__debugInfo = "1679:\ddgui.gbas";
				func20_DDgui_handlecheckbox(param10_ddgui_vals, param3_wdg, param2_mx, param2_my, param2_b1, param2_b2);
				__debugInfo = "1679:\ddgui.gbas";
			} else if ((((local16___SelectHelper5__1761) == ("FILE")) ? 1 : 0)) {
				__debugInfo = "1681:\ddgui.gbas";
				func16_DDgui_handlefile(param10_ddgui_vals, param3_wdg, param2_mx, param2_my, param2_b1, param2_b2);
				__debugInfo = "1681:\ddgui.gbas";
			} else if ((((local16___SelectHelper5__1761) == ("LIST")) ? 1 : 0)) {
				__debugInfo = "1683:\ddgui.gbas";
				func16_DDgui_handlelist(param10_ddgui_vals, param3_wdg, param2_mx, param2_my, param2_b1, param2_b2);
				__debugInfo = "1683:\ddgui.gbas";
			} else if ((((local16___SelectHelper5__1761) == ("TAB")) ? 1 : 0)) {
				__debugInfo = "1685:\ddgui.gbas";
				func15_DDgui_handletab(param10_ddgui_vals, param3_wdg, param2_mx, param2_my, param2_b1, param2_b2);
				__debugInfo = "1685:\ddgui.gbas";
			} else if ((((local16___SelectHelper5__1761) == ("COMBO")) ? 1 : 0)) {
				__debugInfo = "1687:\ddgui.gbas";
				func17_DDgui_handlecombo(param10_ddgui_vals, param3_wdg, param2_mx, param2_my, param2_b1, param2_b2);
				__debugInfo = "1687:\ddgui.gbas";
			} else if ((((local16___SelectHelper5__1761) == ("SINGLETEXT")) ? 1 : 0)) {
				__debugInfo = "1689:\ddgui.gbas";
				func16_ddgui_handletext(param10_ddgui_vals, param3_wdg, param2_mx, param2_my, param2_b1, param2_b2, 1, 0);
				__debugInfo = "1689:\ddgui.gbas";
			} else if ((((local16___SelectHelper5__1761) == ("NUMBERTEXT")) ? 1 : 0)) {
				__debugInfo = "1691:\ddgui.gbas";
				func16_ddgui_handletext(param10_ddgui_vals, param3_wdg, param2_mx, param2_my, param2_b1, param2_b2, 1, 1);
				__debugInfo = "1691:\ddgui.gbas";
			} else if ((((local16___SelectHelper5__1761) == ("TEXT")) ? 1 : 0)) {
				__debugInfo = "1693:\ddgui.gbas";
				func16_ddgui_handletext(param10_ddgui_vals, param3_wdg, param2_mx, param2_my, param2_b1, param2_b2, 0, 0);
				__debugInfo = "1693:\ddgui.gbas";
			} else {
				__debugInfo = "1708:\ddgui.gbas";
				if (param3_wdg.attr8_wuserfoo_ref[0]) {
					__debugInfo = "1697:\ddgui.gbas";
					static9_DDgui_handlewidget_dummy_Str_ref[0] = "";
					__debugInfo = "1699:\ddgui.gbas";
					if ((((param2_b1) != (1)) ? 1 : 0)) {
						__debugInfo = "1699:\ddgui.gbas";
						param2_b1 = 0;
						__debugInfo = "1699:\ddgui.gbas";
					};
					__debugInfo = "1700:\ddgui.gbas";
					param3_wdg.attr8_wclicked = param2_b1;
					__debugInfo = "1705:\ddgui.gbas";
					if (param3_wdg.attr8_wclicked) {
						__debugInfo = "1703:\ddgui.gbas";
						static9_DDgui_handlewidget_dummy_Str_ref[0] = ((((((((FORMAT_Str(4, 0, param2_mx)) + (","))) + (FORMAT_Str(4, 0, param2_my)))) + (","))) + (FORMAT_Str(2, 0, param2_b1)));
						__debugInfo = "1704:\ddgui.gbas";
						param3_wdg.attr8_wuserfoo_ref[0](param3_wdg.attr7_wid_Str, "CLICKED", static9_DDgui_handlewidget_dummy_Str_ref);
						__debugInfo = "1703:\ddgui.gbas";
					};
					__debugInfo = "1697:\ddgui.gbas";
				} else {
					__debugInfo = "1707:\ddgui.gbas";
					func17_DDgui_handle_user(param3_wdg.attr7_wid_Str, param2_mx, param2_my, param2_b1, param2_b2);
					__debugInfo = "1707:\ddgui.gbas";
				};
				__debugInfo = "1708:\ddgui.gbas";
			};
			__debugInfo = "1663:\ddgui.gbas";
		};
		__debugInfo = "1710:\ddgui.gbas";
		return 0;
		__debugInfo = "1661:\ddgui.gbas";
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
window['func14_DDgui_boxprint'] = function(param10_ddgui_vals, param3_wdg, param1_x, param1_y, param2_wx, param7_do_draw, param8_find_pos) {
	stackPush("function: DDgui_boxprint", __debugInfo);
	try {
		var local7_str_Str_1769 = "", local2_tx_ref_1770 = [0], local2_ty_ref_1771 = [0], local2_cx_1772 = 0, local2_cy_1773 = 0, local5_s_Str_1774 = "", local5_c_Str_1775 = "", local4_cpos_1776 = 0, local4_spos_1777 = 0, local4_slen_1778 = 0, local8_caretpos_1779 = 0, local9_has_caret_1780 = 0, local5_xseek_1781 = 0, local5_yseek_1782 = 0, local6_selcol_1783 = 0;
		__debugInfo = "1727:\ddgui.gbas";
		local6_selcol_1783 = global11_ddgui_stack_ref[0].arrAccess(-(1)).values[tmpPositionCache][0].attr14_col_hover_norm;
		__debugInfo = "1729:\ddgui.gbas";
		GETFONTSIZE(local2_tx_ref_1770, local2_ty_ref_1771);
		__debugInfo = "1731:\ddgui.gbas";
		if (param8_find_pos) {
			__debugInfo = "1731:\ddgui.gbas";
			param7_do_draw = 0;
			__debugInfo = "1731:\ddgui.gbas";
		};
		__debugInfo = "1733:\ddgui.gbas";
		local7_str_Str_1769 = param3_wdg.attr9_wtext_Str_ref[0];
		__debugInfo = "1757:\ddgui.gbas";
		if (param8_find_pos) {
			__debugInfo = "1735:\ddgui.gbas";
			local5_xseek_1781 = param1_x;
			__debugInfo = "1736:\ddgui.gbas";
			local5_yseek_1782 = param1_y;
			__debugInfo = "1736:\ddgui.gbas";
			param1_x = 0;
			__debugInfo = "1737:\ddgui.gbas";
			param1_y = 0;
			__debugInfo = "1735:\ddgui.gbas";
		} else {
			var local7_strleng_1784 = 0;
			__debugInfo = "1739:\ddgui.gbas";
			local7_strleng_1784 = (local7_str_Str_1769).length;
			__debugInfo = "1740:\ddgui.gbas";
			if ((((param3_wdg.attr7_wselend) > (local7_strleng_1784)) ? 1 : 0)) {
				__debugInfo = "1740:\ddgui.gbas";
				param3_wdg.attr7_wselend = local7_strleng_1784;
				__debugInfo = "1740:\ddgui.gbas";
			};
			__debugInfo = "1741:\ddgui.gbas";
			if ((((param3_wdg.attr9_wselstart) > (local7_strleng_1784)) ? 1 : 0)) {
				__debugInfo = "1741:\ddgui.gbas";
				param3_wdg.attr9_wselstart = local7_strleng_1784;
				__debugInfo = "1741:\ddgui.gbas";
			};
			__debugInfo = "1742:\ddgui.gbas";
			local8_caretpos_1779 = param3_wdg.attr7_wselend;
			__debugInfo = "1756:\ddgui.gbas";
			if ((((param10_ddgui_vals.attr9_focus_Str) == (param3_wdg.attr7_wid_Str)) ? 1 : 0)) {
				__debugInfo = "1751:\ddgui.gbas";
				local9_has_caret_1780 = 1;
				__debugInfo = "1751:\ddgui.gbas";
			} else {
				__debugInfo = "1753:\ddgui.gbas";
				local9_has_caret_1780 = 0;
				__debugInfo = "1754:\ddgui.gbas";
				param3_wdg.attr9_wselstart = -(1);
				__debugInfo = "1755:\ddgui.gbas";
				param3_wdg.attr7_wselend = -(1);
				__debugInfo = "1753:\ddgui.gbas";
			};
			__debugInfo = "1739:\ddgui.gbas";
		};
		__debugInfo = "1758:\ddgui.gbas";
		local2_cx_1772 = param1_x;
		__debugInfo = "1759:\ddgui.gbas";
		local2_cy_1773 = param1_y;
		__debugInfo = "1760:\ddgui.gbas";
		local7_str_Str_1769 = ((local7_str_Str_1769) + (" "));
		__debugInfo = "1761:\ddgui.gbas";
		local4_slen_1778 = (local7_str_Str_1769).length;
		__debugInfo = "1817:\ddgui.gbas";
		while ((((local4_cpos_1776) < (local4_slen_1778)) ? 1 : 0)) {
			__debugInfo = "1763:\ddgui.gbas";
			local5_c_Str_1775 = MID_Str(local7_str_Str_1769, local4_cpos_1776, 1);
			__debugInfo = "1765:\ddgui.gbas";
			local2_tx_ref_1770[0] = KERNLEN(local5_c_Str_1775, global18_ddgui_font_kerning.attr11_bHasKerning);
			__debugInfo = "1768:\ddgui.gbas";
			if (((((((param8_find_pos) && ((((local2_cy_1773) >= (((local5_yseek_1782) - (local2_ty_ref_1771[0])))) ? 1 : 0))) ? 1 : 0)) && (((((((local2_cx_1772) >= (((local5_xseek_1781) - (((local2_tx_ref_1770[0]) * (1.5)))))) ? 1 : 0)) || ((((local5_c_Str_1775) == ("\n")) ? 1 : 0))) ? 1 : 0))) ? 1 : 0)) {
				__debugInfo = "1768:\ddgui.gbas";
				return tryClone(local4_cpos_1776);
				__debugInfo = "1768:\ddgui.gbas";
			};
			__debugInfo = "1780:\ddgui.gbas";
			if (param7_do_draw) {
				__debugInfo = "1777:\ddgui.gbas";
				if ((((((((((param3_wdg.attr9_wselstart) != (param3_wdg.attr7_wselend)) ? 1 : 0)) && (((((((local4_cpos_1776) >= (param3_wdg.attr9_wselstart)) ? 1 : 0)) && ((((local4_cpos_1776) < (param3_wdg.attr7_wselend)) ? 1 : 0))) ? 1 : 0))) ? 1 : 0)) || (((((((local4_cpos_1776) < (param3_wdg.attr9_wselstart)) ? 1 : 0)) && ((((local4_cpos_1776) >= (param3_wdg.attr7_wselend)) ? 1 : 0))) ? 1 : 0))) ? 1 : 0)) {
					__debugInfo = "1775:\ddgui.gbas";
					DRAWRECT(local2_cx_1772, local2_cy_1773, unref(local2_tx_ref_1770[0]), unref(local2_ty_ref_1771[0]), local6_selcol_1783);
					__debugInfo = "1775:\ddgui.gbas";
				};
				__debugInfo = "1779:\ddgui.gbas";
				if ((((local5_c_Str_1775) != ("\n")) ? 1 : 0)) {
					__debugInfo = "1779:\ddgui.gbas";
					PRINT(local5_c_Str_1775, local2_cx_1772, local2_cy_1773, global18_ddgui_font_kerning.attr11_bHasKerning);
					__debugInfo = "1779:\ddgui.gbas";
				};
				__debugInfo = "1777:\ddgui.gbas";
			};
			__debugInfo = "1791:\ddgui.gbas";
			if ((((local9_has_caret_1780) && ((((local4_cpos_1776) == (local8_caretpos_1779)) ? 1 : 0))) ? 1 : 0)) {
				__debugInfo = "1790:\ddgui.gbas";
				if (param7_do_draw) {
					var local5_blink_1785 = 0;
					__debugInfo = "1784:\ddgui.gbas";
					local5_blink_1785 = (((MOD(~~(GETTIMERALL()), 1024)) > (512)) ? 1 : 0);
					__debugInfo = "1785:\ddgui.gbas";
					if (local5_blink_1785) {
						__debugInfo = "1785:\ddgui.gbas";
						ALPHAMODE(-(0.5));
						__debugInfo = "1785:\ddgui.gbas";
					};
					__debugInfo = "1786:\ddgui.gbas";
					DRAWRECT(((local2_cx_1772) - (1)), local2_cy_1773, 2, unref(local2_ty_ref_1771[0]), global17_gDDguiCaretColour);
					__debugInfo = "1787:\ddgui.gbas";
					if (local5_blink_1785) {
						__debugInfo = "1787:\ddgui.gbas";
						ALPHAMODE(0);
						__debugInfo = "1787:\ddgui.gbas";
					};
					__debugInfo = "1788:\ddgui.gbas";
					param3_wdg.attr7_wcaretx = ((INTEGER(((local2_cx_1772) + (CAST2INT(((local2_tx_ref_1770[0]) / (2))))))) - (param1_x));
					__debugInfo = "1789:\ddgui.gbas";
					param3_wdg.attr7_wcarety = ((INTEGER(((local2_cy_1773) + (CAST2INT(((local2_ty_ref_1771[0]) / (2))))))) - (param1_y));
					__debugInfo = "1784:\ddgui.gbas";
				};
				__debugInfo = "1790:\ddgui.gbas";
			};
			__debugInfo = "1794:\ddgui.gbas";
			if ((((local5_c_Str_1775) == ("\n")) ? 1 : 0)) {
				__debugInfo = "1793:\ddgui.gbas";
				local2_cx_1772 = param1_x;
				__debugInfo = "1793:\ddgui.gbas";
				local2_cy_1773+=local2_ty_ref_1771[0];
				__debugInfo = "1793:\ddgui.gbas";
				local4_cpos_1776+=1;
				__debugInfo = "1793:\ddgui.gbas";
				continue;
				__debugInfo = "1793:\ddgui.gbas";
			};
			__debugInfo = "1796:\ddgui.gbas";
			local2_cx_1772 = ((local2_cx_1772) + (local2_tx_ref_1770[0]));
			__debugInfo = "1797:\ddgui.gbas";
			local4_cpos_1776 = ((local4_cpos_1776) + (1));
			__debugInfo = "1816:\ddgui.gbas";
			if (((((((local5_c_Str_1775) == (" ")) ? 1 : 0)) || ((((local5_c_Str_1775) == ("\t")) ? 1 : 0))) ? 1 : 0)) {
				var local10_next_w_len_1786 = 0, local4_code_1787 = 0, local6_co_Str_1788 = "";
				__debugInfo = "1802:\ddgui.gbas";
				local10_next_w_len_1786 = 0;
				__debugInfo = "1804:\ddgui.gbas";
				{
					__debugInfo = "1815:\ddgui.gbas";
					for (local4_spos_1777 = local4_cpos_1776;toCheck(local4_spos_1777, ((local4_slen_1778) - (1)), 1);local4_spos_1777 += 1) {
						__debugInfo = "1806:\ddgui.gbas";
						local6_co_Str_1788 = MID_Str(local7_str_Str_1769, local4_spos_1777, 1);
						__debugInfo = "1807:\ddgui.gbas";
						local4_code_1787 = ASC(local6_co_Str_1788, 0);
						__debugInfo = "1813:\ddgui.gbas";
						if (((((((local4_code_1787) == (ASC(" ", 0))) ? 1 : 0)) || ((((local4_code_1787) == (ASC("\t", 0))) ? 1 : 0))) ? 1 : 0)) {
							__debugInfo = "1811:\ddgui.gbas";
							if ((((((((local2_cx_1772) + (local10_next_w_len_1786))) - (param1_x))) > (param2_wx)) ? 1 : 0)) {
								__debugInfo = "1809:\ddgui.gbas";
								local2_cx_1772 = param1_x;
								__debugInfo = "1810:\ddgui.gbas";
								local2_cy_1773 = ((local2_cy_1773) + (local2_ty_ref_1771[0]));
								__debugInfo = "1809:\ddgui.gbas";
							};
							__debugInfo = "1812:\ddgui.gbas";
							break;
							__debugInfo = "1811:\ddgui.gbas";
						};
						__debugInfo = "1814:\ddgui.gbas";
						local10_next_w_len_1786+=KERNLEN(local6_co_Str_1788, global18_ddgui_font_kerning.attr11_bHasKerning);
						__debugInfo = "1806:\ddgui.gbas";
					};
					__debugInfo = "1815:\ddgui.gbas";
				};
				__debugInfo = "1802:\ddgui.gbas";
			};
			__debugInfo = "1763:\ddgui.gbas";
		};
		__debugInfo = "1818:\ddgui.gbas";
		if (param8_find_pos) {
			__debugInfo = "1818:\ddgui.gbas";
			return tryClone(local4_slen_1778);
			__debugInfo = "1818:\ddgui.gbas";
		};
		__debugInfo = "1819:\ddgui.gbas";
		return tryClone(((((local2_cy_1773) + (local2_ty_ref_1771[0]))) - (param1_y)));
		__debugInfo = "1820:\ddgui.gbas";
		return 0;
		__debugInfo = "1727:\ddgui.gbas";
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
window['func19_DDgui_drawscrollbar'] = function(param10_ddgui_vals, param3_wdg, param5_width, param6_height, param11_page_height, param4_ytop) {
	stackPush("function: DDgui_drawscrollbar", __debugInfo);
	try {
		var local2_c1_1795 = 0, local2_c2_1796 = 0, local3_c1b_1797 = 0, local3_c2b_1798 = 0, local2_tx_ref_1799 = [0], local2_ty_ref_1800 = [0], local1_x_1801 = 0, local2_up_1802 = 0, local4_down_1803 = 0, local3_pos_1804 = 0, local4_smax_1805 = 0, local3_hsb_1806 = 0;
		__debugInfo = "1834:\ddgui.gbas";
		GETFONTSIZE(local2_tx_ref_1799, local2_ty_ref_1800);
		__debugInfo = "1835:\ddgui.gbas";
		local2_tx_ref_1799[0] = MAX(unref(local2_tx_ref_1799[0]), global20_gDDguiScrollbarWidth);
		__debugInfo = "1837:\ddgui.gbas";
		local1_x_1801 = ((((param5_width) - (local2_tx_ref_1799[0]))) - (1));
		__debugInfo = "1839:\ddgui.gbas";
		local4_smax_1805 = param3_wdg.attr10_wscrollmax;
		__debugInfo = "1840:\ddgui.gbas";
		if ((((local4_smax_1805) <= (0)) ? 1 : 0)) {
			__debugInfo = "1840:\ddgui.gbas";
			return 0;
			__debugInfo = "1840:\ddgui.gbas";
		};
		__debugInfo = "1848:\ddgui.gbas";
		if ((((param10_ddgui_vals.attr9_focus_Str) == ((("SB") + (param3_wdg.attr7_wid_Str)))) ? 1 : 0)) {
			__debugInfo = "1843:\ddgui.gbas";
			local2_c1_1795 = param10_ddgui_vals.attr16_col_hover_bright;
			__debugInfo = "1844:\ddgui.gbas";
			local2_c2_1796 = param10_ddgui_vals.attr14_col_hover_norm;
			__debugInfo = "1843:\ddgui.gbas";
		} else {
			__debugInfo = "1846:\ddgui.gbas";
			local2_c1_1795 = param10_ddgui_vals.attr10_col_bright;
			__debugInfo = "1847:\ddgui.gbas";
			local2_c2_1796 = param10_ddgui_vals.attr8_col_norm;
			__debugInfo = "1846:\ddgui.gbas";
		};
		__debugInfo = "1849:\ddgui.gbas";
		local3_c1b_1797 = param10_ddgui_vals.attr10_col_bright;
		__debugInfo = "1850:\ddgui.gbas";
		local3_c2b_1798 = param10_ddgui_vals.attr8_col_norm;
		__debugInfo = "1852:\ddgui.gbas";
		local3_pos_1804 = param3_wdg.attr7_wscroll;
		__debugInfo = "1853:\ddgui.gbas";
		if ((((local3_pos_1804) < (0)) ? 1 : 0)) {
			__debugInfo = "1853:\ddgui.gbas";
			local3_pos_1804 = 0;
			__debugInfo = "1853:\ddgui.gbas";
		};
		__debugInfo = "1854:\ddgui.gbas";
		if ((((local3_pos_1804) > (local4_smax_1805)) ? 1 : 0)) {
			__debugInfo = "1854:\ddgui.gbas";
			local3_pos_1804 = local4_smax_1805;
			__debugInfo = "1854:\ddgui.gbas";
		};
		__debugInfo = "1855:\ddgui.gbas";
		local2_up_1802 = (((local3_pos_1804) > (0)) ? 1 : 0);
		__debugInfo = "1856:\ddgui.gbas";
		local4_down_1803 = (((local3_pos_1804) < (((local4_smax_1805) + (1)))) ? 1 : 0);
		__debugInfo = "1859:\ddgui.gbas";
		DRAWRECT(local1_x_1801, param4_ytop, unref(local2_tx_ref_1799[0]), param6_height, local2_c1_1795);
		__debugInfo = "1860:\ddgui.gbas";
		func14_DDgui_backrect(local1_x_1801, param4_ytop, unref(local2_tx_ref_1799[0]), param6_height, local2_c2_1796);
		__debugInfo = "1863:\ddgui.gbas";
		param4_ytop+=1;
		__debugInfo = "1864:\ddgui.gbas";
		param6_height+=-(2);
		__debugInfo = "1865:\ddgui.gbas";
		local1_x_1801+=1;
		__debugInfo = "1866:\ddgui.gbas";
		local2_tx_ref_1799[0]+=-(2);
		__debugInfo = "1868:\ddgui.gbas";
		local3_hsb_1806 = MAX(2, CAST2INT(((((param6_height) * (128))) / (CAST2INT(((((((((local4_smax_1805) + (param11_page_height))) - (1))) * (128))) / (param11_page_height)))))));
		__debugInfo = "1869:\ddgui.gbas";
		if ((((local3_hsb_1806) > (((param6_height) - (20)))) ? 1 : 0)) {
			__debugInfo = "1869:\ddgui.gbas";
			local3_hsb_1806 = ((param6_height) - (20));
			__debugInfo = "1869:\ddgui.gbas";
		};
		__debugInfo = "1871:\ddgui.gbas";
		local3_pos_1804 = MAX(0, CAST2INT(((((local3_pos_1804) * (((param6_height) - (local3_hsb_1806))))) / (local4_smax_1805))));
		__debugInfo = "1873:\ddgui.gbas";
		local1_x_1801+=3;
		__debugInfo = "1874:\ddgui.gbas";
		local2_tx_ref_1799[0]+=-(6);
		__debugInfo = "1877:\ddgui.gbas";
		func13_DDgui_backgnd(local3_c1b_1797, local3_c2b_1798, local1_x_1801, ((param4_ytop) + (local3_pos_1804)), unref(local2_tx_ref_1799[0]), local3_hsb_1806);
		__debugInfo = "1878:\ddgui.gbas";
		func14_DDgui_backrect(((local1_x_1801) - (1)), ((((param4_ytop) + (local3_pos_1804))) - (1)), ((local2_tx_ref_1799[0]) + (2)), ((local3_hsb_1806) + (2)), local2_c2_1796);
		__debugInfo = "1880:\ddgui.gbas";
		return 0;
		__debugInfo = "1834:\ddgui.gbas";
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
window['func21_DDgui_handlescrollbar'] = function(param10_ddgui_vals, param3_wdg, param2_mx, param2_my, param2_b1, param2_b2, param6_height) {
	stackPush("function: DDgui_handlescrollbar", __debugInfo);
	try {
		var local2_tx_ref_1814 = [0], local2_ty_ref_1815 = [0], local1_x_1816 = 0, local4_smax_1817 = 0, local3_hsb_1818 = 0, local3_pos_1819 = 0, local8_hasfocus_1820 = 0, local5_width_1821 = 0, local3_rmx_ref_1822 = [0], local3_rmy_ref_1823 = [0], local3_rb1_ref_1824 = [0], local3_rb2_ref_1825 = [0];
		__debugInfo = "1895:\ddgui.gbas";
		GETFONTSIZE(local2_tx_ref_1814, local2_ty_ref_1815);
		__debugInfo = "1896:\ddgui.gbas";
		local2_tx_ref_1814[0] = MAX(unref(local2_tx_ref_1814[0]), global20_gDDguiScrollbarWidth);
		__debugInfo = "1898:\ddgui.gbas";
		local5_width_1821 = param3_wdg.attr6_wwidth;
		__debugInfo = "1899:\ddgui.gbas";
		local1_x_1816 = ((local5_width_1821) - (local2_tx_ref_1814[0]));
		__debugInfo = "1901:\ddgui.gbas";
		local4_smax_1817 = param3_wdg.attr10_wscrollmax;
		__debugInfo = "1906:\ddgui.gbas";
		if ((((local4_smax_1817) <= (0)) ? 1 : 0)) {
			__debugInfo = "1903:\ddgui.gbas";
			param3_wdg.attr10_wscrollmax = 0;
			__debugInfo = "1904:\ddgui.gbas";
			param3_wdg.attr7_wscroll = 0;
			__debugInfo = "1905:\ddgui.gbas";
			return 0;
			__debugInfo = "1903:\ddgui.gbas";
		};
		__debugInfo = "1912:\ddgui.gbas";
		if ((((param3_wdg.attr7_wscroll) > (local4_smax_1817)) ? 1 : 0)) {
			__debugInfo = "1910:\ddgui.gbas";
			local3_pos_1819 = local4_smax_1817;
			__debugInfo = "1911:\ddgui.gbas";
			param3_wdg.attr7_wscroll = param3_wdg.attr10_wscrollmax;
			__debugInfo = "1910:\ddgui.gbas";
		};
		__debugInfo = "1915:\ddgui.gbas";
		MOUSESTATE(local3_rmx_ref_1822, local3_rmy_ref_1823, local3_rb1_ref_1824, local3_rb2_ref_1825);
		__debugInfo = "1917:\ddgui.gbas";
		if ((((param10_ddgui_vals.attr9_focus_Str) == ((("SB") + (param3_wdg.attr7_wid_Str)))) ? 1 : 0)) {
			__debugInfo = "1917:\ddgui.gbas";
			local8_hasfocus_1820 = 1;
			__debugInfo = "1917:\ddgui.gbas";
		};
		__debugInfo = "1931:\ddgui.gbas";
		if (((((((local3_rb1_ref_1824[0]) && (BOXCOLL(local1_x_1816, 0, unref(local2_tx_ref_1814[0]), param6_height, param2_mx, param2_my, 1, 1))) ? 1 : 0)) || (local8_hasfocus_1820)) ? 1 : 0)) {
			var local3_div_1826 = 0;
			__debugInfo = "1920:\ddgui.gbas";
			local8_hasfocus_1820 = 1;
			__debugInfo = "1921:\ddgui.gbas";
			param10_ddgui_vals.attr9_focus_Str = (("SB") + (param3_wdg.attr7_wid_Str));
			__debugInfo = "1923:\ddgui.gbas";
			local3_hsb_1818 = MAX(2, CAST2INT(((CAST2INT(((((param6_height) * (1024))) / (local4_smax_1817)))) / (1024))));
			__debugInfo = "1925:\ddgui.gbas";
			local3_div_1826 = ((param6_height) - (local3_hsb_1818));
			__debugInfo = "1930:\ddgui.gbas";
			if ((((local3_div_1826) > (0)) ? 1 : 0)) {
				__debugInfo = "1927:\ddgui.gbas";
				param3_wdg.attr7_wscroll = MAX(0, MIN(param3_wdg.attr10_wscrollmax, CAST2INT(((CAST2INT(((((((param2_my) * (param3_wdg.attr10_wscrollmax))) * (1024))) / (local3_div_1826)))) / (1024)))));
				__debugInfo = "1927:\ddgui.gbas";
			} else {
				__debugInfo = "1929:\ddgui.gbas";
				param3_wdg.attr7_wscroll = 0;
				__debugInfo = "1929:\ddgui.gbas";
			};
			__debugInfo = "1920:\ddgui.gbas";
		};
		__debugInfo = "1933:\ddgui.gbas";
		if ((((local8_hasfocus_1820) && ((((local3_rb1_ref_1824[0]) == (0)) ? 1 : 0))) ? 1 : 0)) {
			__debugInfo = "1933:\ddgui.gbas";
			param10_ddgui_vals.attr9_focus_Str = "";
			__debugInfo = "1933:\ddgui.gbas";
		};
		__debugInfo = "1935:\ddgui.gbas";
		return 1;
		__debugInfo = "1936:\ddgui.gbas";
		return 0;
		__debugInfo = "1895:\ddgui.gbas";
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
window['func12_DDgui_spacer'] = function(param5_width, param6_height) {
	stackPush("function: DDgui_spacer", __debugInfo);
	try {
		var local6_id_Str_1829 = "";
		__debugInfo = "1945:\ddgui.gbas";
		local6_id_Str_1829 = (("ID_SPACER_") + (CAST2STRING(BOUNDS(global11_ddgui_stack_ref[0].arrAccess(-(1)).values[tmpPositionCache][0].attr7_widgets_ref[0], 0))));
		__debugInfo = "1946:\ddgui.gbas";
		func12_DDgui_widget(local6_id_Str_1829, "", param5_width, param6_height);
		__debugInfo = "1948:\ddgui.gbas";
		func9_DDgui_set(local6_id_Str_1829, "WIDTH", CAST2STRING(param5_width));
		__debugInfo = "1949:\ddgui.gbas";
		func9_DDgui_set(local6_id_Str_1829, "HEIGHT", CAST2STRING(param6_height));
		__debugInfo = "1952:\ddgui.gbas";
		func9_DDgui_set(local6_id_Str_1829, "TYPE", "SPACER");
		__debugInfo = "1953:\ddgui.gbas";
		return 0;
		__debugInfo = "1945:\ddgui.gbas";
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
window['func12_DDgui_button'] = function(param6_id_Str, param11_caption_Str, param5_width, param6_height) {
		var __labels = {"__DrawFrames__": 3534, "skip": 6107};
		
	stackPush("function: DDgui_button", __debugInfo);
	try {
		var local2_sx_ref_1834 = [0], local2_sy_ref_1835 = [0];
		var __pc = 6006;
		while(__pc >= 0) {
			switch(__pc) {
				case 6006:
					__debugInfo = "1961:\ddgui.gbas";
					func12_DDgui_widget(param6_id_Str, param11_caption_Str, param5_width, param6_height);
					
				case 6106:
					__debugInfo = "1976:\ddgui.gbas";
					if (!(((((((param5_width) == (0)) ? 1 : 0)) || ((((param6_height) == (0)) ? 1 : 0))) ? 1 : 0))) { __pc = 6014; break; }
					
					case 6058:
						__debugInfo = "1968:\ddgui.gbas";
						if (!((((INSTR(param11_caption_Str, "SPR_B", 0)) == (0)) ? 1 : 0))) { __pc = 6022; break; }
					
					case 6032:
						__debugInfo = "1964:\ddgui.gbas";
						GETSPRITESIZE(INTEGER(FLOAT2STR(MID_Str(param11_caption_Str, 5, (param11_caption_Str).length))), local2_sx_ref_1834, local2_sy_ref_1835);
						
					case 6044:
						__debugInfo = "1965:\ddgui.gbas";
						if (!((((param5_width) == (0)) ? 1 : 0))) { __pc = 6036; break; }
					
					case 6043:
						__debugInfo = "1965:\ddgui.gbas";
						func9_DDgui_set(param6_id_Str, "WIDTH", CAST2STRING(((local2_sx_ref_1834[0]) + (4))));
						
					__debugInfo = "1965:\ddgui.gbas";
					
				case 6036: //dummy jumper1
					;
						
					case 6056:
						__debugInfo = "1966:\ddgui.gbas";
						if (!((((param6_height) == (0)) ? 1 : 0))) { __pc = 6048; break; }
					
					case 6055:
						__debugInfo = "1966:\ddgui.gbas";
						func9_DDgui_set(param6_id_Str, "HEIGHT", CAST2STRING(((local2_sy_ref_1835[0]) + (4))));
						
					__debugInfo = "1966:\ddgui.gbas";
					
				case 6048: //dummy jumper1
					;
						
					case 6057:
						__debugInfo = "1967:\ddgui.gbas";
						__pc = __labels["skip"]; break;
						
					__debugInfo = "1964:\ddgui.gbas";
					
				case 6022: //dummy jumper1
					;
						
					case 6105:
						__debugInfo = "1975:\ddgui.gbas";
						if (!((((INSTR(param11_caption_Str, "SPR_C", 0)) == (0)) ? 1 : 0))) { __pc = 6065; break; }
					
					case 6076:
						__debugInfo = "1970:\ddgui.gbas";
						if (!((((param5_width) == (0)) ? 1 : 0))) { __pc = 6070; break; }
					
					case 6075:
						__debugInfo = "1970:\ddgui.gbas";
						func9_DDgui_set(param6_id_Str, "WIDTH", CAST2STRING(32));
						
					__debugInfo = "1970:\ddgui.gbas";
					
				case 6070: //dummy jumper1
					;
						
					case 6086:
						__debugInfo = "1971:\ddgui.gbas";
						if (!((((param6_height) == (0)) ? 1 : 0))) { __pc = 6080; break; }
					
					case 6085:
						__debugInfo = "1971:\ddgui.gbas";
						func9_DDgui_set(param6_id_Str, "HEIGHT", CAST2STRING(32));
						
					__debugInfo = "1971:\ddgui.gbas";
					
				case 6080: //dummy jumper1
					;
						
					__debugInfo = "1970:\ddgui.gbas";
					__pc = 16965;
					break;
					
				case 6065: //dummy jumper1
					
					case 6090:
						__debugInfo = "1973:\ddgui.gbas";
						GETFONTSIZE(local2_sx_ref_1834, local2_sy_ref_1835);
						
					case 6104:
						__debugInfo = "1974:\ddgui.gbas";
						if (!((((param6_height) == (0)) ? 1 : 0))) { __pc = 6094; break; }
					
					case 6103:
						__debugInfo = "1974:\ddgui.gbas";
						func9_DDgui_set(param6_id_Str, "HEIGHT", CAST2STRING(MAX(global25_gDDguiMinControlDimension, ((local2_sy_ref_1835[0]) + (4)))));
						
					__debugInfo = "1974:\ddgui.gbas";
					
				case 6094: //dummy jumper1
					;
						
					__debugInfo = "1973:\ddgui.gbas";
					
				case 16965: //dummy jumper2
					;
						
					__debugInfo = "1968:\ddgui.gbas";
					
				case 6014: //dummy jumper1
					;
					
				case 6107:
					__debugInfo = "1977:\ddgui.gbas";
					//label: skip;
					
				__debugInfo = "1978:\ddgui.gbas";
				func9_DDgui_set(param6_id_Str, "TYPE", "BUTTON");
				__debugInfo = "1979:\ddgui.gbas";
				return 0;
				__debugInfo = "1961:\ddgui.gbas";__pc = -1; break;
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
window['func16_DDgui_drawbutton'] = function(param10_ddgui_vals, param3_wdg, param4_ytop) {
	stackPush("function: DDgui_drawbutton", __debugInfo);
	try {
		var local2_c1_1839 = 0, local2_c2_1840 = 0, local5_hover_1841 = 0, local1_x_1842 = 0, local1_y_1843 = 0, local1_w_1844 = 0, local1_h_1845 = 0;
		__debugInfo = "1985:\ddgui.gbas";
		ALPHAMODE(0);
		__debugInfo = "1986:\ddgui.gbas";
		local5_hover_1841 = param3_wdg.attr6_whover;
		__debugInfo = "1994:\ddgui.gbas";
		if (((((((local5_hover_1841) > (0)) ? 1 : 0)) && ((((param3_wdg.attr9_wreadonly) == (0)) ? 1 : 0))) ? 1 : 0)) {
			__debugInfo = "1989:\ddgui.gbas";
			local2_c1_1839 = param10_ddgui_vals.attr16_col_hover_bright;
			__debugInfo = "1990:\ddgui.gbas";
			local2_c2_1840 = param10_ddgui_vals.attr14_col_hover_norm;
			__debugInfo = "1989:\ddgui.gbas";
		} else {
			__debugInfo = "1992:\ddgui.gbas";
			local2_c1_1839 = param10_ddgui_vals.attr10_col_bright;
			__debugInfo = "1993:\ddgui.gbas";
			local2_c2_1840 = param10_ddgui_vals.attr8_col_norm;
			__debugInfo = "1992:\ddgui.gbas";
		};
		__debugInfo = "1995:\ddgui.gbas";
		func13_DDgui_backgnd(local2_c1_1839, local2_c2_1840, 1, ((param4_ytop) + (1)), ((param3_wdg.attr6_wwidth) - (2)), ((param3_wdg.attr7_wheight) - (2)));
		__debugInfo = "1996:\ddgui.gbas";
		local1_x_1842 = 1;
		__debugInfo = "1996:\ddgui.gbas";
		local1_y_1843 = ((param4_ytop) + (1));
		__debugInfo = "1996:\ddgui.gbas";
		local1_w_1844 = ((param3_wdg.attr6_wwidth) - (2));
		__debugInfo = "1997:\ddgui.gbas";
		local1_h_1845 = ((param3_wdg.attr7_wheight) - (2));
		__debugInfo = "2005:\ddgui.gbas";
		if (param3_wdg.attr7_wselect) {
			__debugInfo = "2001:\ddgui.gbas";
			local1_x_1842+=1;
			__debugInfo = "2002:\ddgui.gbas";
			local1_y_1843+=1;
			__debugInfo = "2003:\ddgui.gbas";
			local1_w_1844+=-(2);
			__debugInfo = "2004:\ddgui.gbas";
			local1_h_1845+=-(2);
			__debugInfo = "2001:\ddgui.gbas";
		};
		__debugInfo = "2041:\ddgui.gbas";
		if ((((INSTR(unref(param3_wdg.attr9_wtext_Str_ref[0]), "SPR_B", 0)) == (0)) ? 1 : 0)) {
			__debugInfo = "2017:\ddgui.gbas";
			if (param3_wdg.attr9_wreadonly) {
				__debugInfo = "2010:\ddgui.gbas";
				ALPHAMODE(-(0.8));
				__debugInfo = "2010:\ddgui.gbas";
			} else {
				__debugInfo = "2016:\ddgui.gbas";
				if ((((local5_hover_1841) == (0)) ? 1 : 0)) {
					__debugInfo = "2013:\ddgui.gbas";
					ALPHAMODE(-(1));
					__debugInfo = "2013:\ddgui.gbas";
				} else {
					__debugInfo = "2015:\ddgui.gbas";
					ALPHAMODE(-(0.8));
					__debugInfo = "2015:\ddgui.gbas";
				};
				__debugInfo = "2016:\ddgui.gbas";
			};
			__debugInfo = "2019:\ddgui.gbas";
			local2_c1_1839 = INTEGER(FLOAT2STR(MID_Str(unref(param3_wdg.attr9_wtext_Str_ref[0]), 5, (param3_wdg.attr9_wtext_Str_ref[0]).length)));
			__debugInfo = "2020:\ddgui.gbas";
			func23_DDgui_fit_sprite_in_box(local2_c1_1839, ((local1_x_1842) + (1)), ((local1_y_1843) + (1)), ((local1_w_1844) - (2)), ((local1_h_1845) - (2)));
			__debugInfo = "2017:\ddgui.gbas";
		} else if ((((INSTR(unref(param3_wdg.attr9_wtext_Str_ref[0]), "SPR_C", 0)) == (0)) ? 1 : 0)) {
			__debugInfo = "2028:\ddgui.gbas";
			if ((((local5_hover_1841) == (0)) ? 1 : 0)) {
				__debugInfo = "2025:\ddgui.gbas";
				ALPHAMODE(-(1));
				__debugInfo = "2025:\ddgui.gbas";
			} else {
				__debugInfo = "2027:\ddgui.gbas";
				ALPHAMODE(-(0.8));
				__debugInfo = "2027:\ddgui.gbas";
			};
			__debugInfo = "2029:\ddgui.gbas";
			local2_c1_1839 = INTEGER(FLOAT2STR(MID_Str(unref(param3_wdg.attr9_wtext_Str_ref[0]), 5, (param3_wdg.attr9_wtext_Str_ref[0]).length)));
			__debugInfo = "2030:\ddgui.gbas";
			DRAWRECT(local1_x_1842, local1_y_1843, local1_w_1844, local1_h_1845, local2_c1_1839);
			__debugInfo = "2028:\ddgui.gbas";
		} else {
			var local2_fx_ref_1846 = [0], local2_fy_ref_1847 = [0];
			__debugInfo = "2037:\ddgui.gbas";
			if (param3_wdg.attr9_wreadonly) {
				__debugInfo = "2034:\ddgui.gbas";
				ALPHAMODE(-(0.5));
				__debugInfo = "2034:\ddgui.gbas";
			} else {
				__debugInfo = "2036:\ddgui.gbas";
				ALPHAMODE(0);
				__debugInfo = "2036:\ddgui.gbas";
			};
			__debugInfo = "2039:\ddgui.gbas";
			GETFONTSIZE(local2_fx_ref_1846, local2_fy_ref_1847);
			__debugInfo = "2040:\ddgui.gbas";
			func17_DDGui_PrintIntern(param3_wdg.attr9_wtext_Str_ref, CAST2INT(((((param3_wdg.attr6_wwidth) - (func21_DDGui_TextWidthIntern(param3_wdg.attr9_wtext_Str_ref)))) / (2))), ((param4_ytop) + (CAST2INT(((((param3_wdg.attr7_wheight) - (local2_fy_ref_1847[0]))) / (2))))), 0);
			__debugInfo = "2037:\ddgui.gbas";
		};
		__debugInfo = "2042:\ddgui.gbas";
		ALPHAMODE(0);
		__debugInfo = "2048:\ddgui.gbas";
		if (param3_wdg.attr7_wselect) {
			__debugInfo = "2045:\ddgui.gbas";
			func14_DDgui_backrect(0, param4_ytop, param3_wdg.attr6_wwidth, param3_wdg.attr7_wheight, param10_ddgui_vals.attr14_col_hover_norm);
			__debugInfo = "2045:\ddgui.gbas";
		} else {
			__debugInfo = "2047:\ddgui.gbas";
			func14_DDgui_backrect(0, param4_ytop, param3_wdg.attr6_wwidth, param3_wdg.attr7_wheight, local2_c2_1840);
			__debugInfo = "2047:\ddgui.gbas";
		};
		__debugInfo = "2049:\ddgui.gbas";
		return 0;
		__debugInfo = "1985:\ddgui.gbas";
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
window['func18_DDgui_handlebutton'] = function(param10_ddgui_vals, param3_wdg, param2_mx, param2_my, param2_b1, param2_b2) {
	stackPush("function: DDgui_handlebutton", __debugInfo);
	try {
		__debugInfo = "2052:\ddgui.gbas";
		if ((((param3_wdg.attr9_wreadonly) && ((((INSTR(unref(param3_wdg.attr9_wtext_Str_ref[0]), "SPR_C", 0)) != (0)) ? 1 : 0))) ? 1 : 0)) {
			__debugInfo = "2052:\ddgui.gbas";
			return 0;
			__debugInfo = "2052:\ddgui.gbas";
		};
		__debugInfo = "2053:\ddgui.gbas";
		if ((((param2_b1) != (1)) ? 1 : 0)) {
			__debugInfo = "2053:\ddgui.gbas";
			param2_b1 = 0;
			__debugInfo = "2053:\ddgui.gbas";
		};
		__debugInfo = "2054:\ddgui.gbas";
		param3_wdg.attr8_wclicked = param2_b1;
		__debugInfo = "2058:\ddgui.gbas";
		if (((((((param2_b1) && ((((INSTR(unref(param3_wdg.attr9_wtext_Str_ref[0]), "SPR_C", 0)) == (0)) ? 1 : 0))) ? 1 : 0)) && ((((param3_wdg.attr9_wreadonly) == (0)) ? 1 : 0))) ? 1 : 0)) {
			__debugInfo = "2056:\ddgui.gbas";
			param10_ddgui_vals.attr15_kick_intern_dlg = 1;
			__debugInfo = "2057:\ddgui.gbas";
			param10_ddgui_vals.attr18_kick_intern_id_Str = param3_wdg.attr7_wid_Str;
			__debugInfo = "2056:\ddgui.gbas";
		};
		__debugInfo = "2059:\ddgui.gbas";
		return 0;
		__debugInfo = "2052:\ddgui.gbas";
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
window['func12_DDgui_slider'] = function(param6_id_Str, param5_value, param5_width, param6_height) {
	stackPush("function: DDgui_slider", __debugInfo);
	try {
		__debugInfo = "2066:\ddgui.gbas";
		if ((((param5_width) == (0)) ? 1 : 0)) {
			__debugInfo = "2066:\ddgui.gbas";
			param5_width = 100;
			__debugInfo = "2066:\ddgui.gbas";
		};
		__debugInfo = "2067:\ddgui.gbas";
		if ((((param6_height) == (0)) ? 1 : 0)) {
			__debugInfo = "2067:\ddgui.gbas";
			param6_height = 16;
			__debugInfo = "2067:\ddgui.gbas";
		};
		__debugInfo = "2068:\ddgui.gbas";
		func12_DDgui_widget(param6_id_Str, CAST2STRING(0), param5_width, param6_height);
		__debugInfo = "2069:\ddgui.gbas";
		func9_DDgui_set(param6_id_Str, "TYPE", "SLIDER");
		__debugInfo = "2070:\ddgui.gbas";
		func9_DDgui_set(param6_id_Str, "TEXT", CAST2STRING(param5_value));
		__debugInfo = "2071:\ddgui.gbas";
		return 0;
		__debugInfo = "2066:\ddgui.gbas";
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
window['func16_DDgui_drawslider'] = function(param10_ddgui_vals, param3_wdg, param4_ytop) {
	stackPush("function: DDgui_drawslider", __debugInfo);
	try {
		var local2_c1_1861 = 0, local2_c2_1862 = 0, local1_x_1863 = 0.0, local1_w_1864 = 0, local1_h_1865 = 0, local5_t_Str_1866 = "", local5_sltop_1867 = 0;
		__debugInfo = "2076:\ddgui.gbas";
		local1_w_1864 = param3_wdg.attr6_wwidth;
		__debugInfo = "2077:\ddgui.gbas";
		local1_h_1865 = param3_wdg.attr7_wheight;
		__debugInfo = "2084:\ddgui.gbas";
		if ((((param3_wdg.attr6_whover) > (0)) ? 1 : 0)) {
			__debugInfo = "2079:\ddgui.gbas";
			local2_c1_1861 = param10_ddgui_vals.attr16_col_hover_bright;
			__debugInfo = "2080:\ddgui.gbas";
			local2_c2_1862 = param10_ddgui_vals.attr14_col_hover_norm;
			__debugInfo = "2079:\ddgui.gbas";
		} else {
			__debugInfo = "2082:\ddgui.gbas";
			local2_c1_1861 = param10_ddgui_vals.attr10_col_bright;
			__debugInfo = "2083:\ddgui.gbas";
			local2_c2_1862 = param10_ddgui_vals.attr8_col_norm;
			__debugInfo = "2082:\ddgui.gbas";
		};
		__debugInfo = "2087:\ddgui.gbas";
		DRAWRECT(0, ((param4_ytop) + (CAST2INT(((local1_h_1865) / (2))))), local1_w_1864, 3, local2_c2_1862);
		__debugInfo = "2089:\ddgui.gbas";
		local1_x_1863 = FLOAT2STR(param3_wdg.attr9_wtext_Str_ref[0]);
		__debugInfo = "2091:\ddgui.gbas";
		local1_x_1863+=-(param3_wdg.attr7_wminval);
		__debugInfo = "2092:\ddgui.gbas";
		local1_x_1863 = ((local1_x_1863) / (((param3_wdg.attr7_wmaxval) - (param3_wdg.attr7_wminval))));
		__debugInfo = "2094:\ddgui.gbas";
		local1_x_1863 = ((((((local1_w_1864) - (12))) * (local1_x_1863))) + (6));
		__debugInfo = "2095:\ddgui.gbas";
		local2_c1_1861 = param10_ddgui_vals.attr16_col_hover_bright;
		__debugInfo = "2096:\ddgui.gbas";
		local2_c2_1862 = param10_ddgui_vals.attr14_col_hover_norm;
		__debugInfo = "2098:\ddgui.gbas";
		local1_h_1865 = MIN(((local1_h_1865) - (2)), 24);
		__debugInfo = "2099:\ddgui.gbas";
		local5_sltop_1867 = ((((param4_ytop) + (CAST2INT(((((param3_wdg.attr7_wheight) - (local1_h_1865))) / (2)))))) + (1));
		__debugInfo = "2100:\ddgui.gbas";
		STARTPOLY(-(1), 0);
		__debugInfo = "2101:\ddgui.gbas";
		POLYVECTOR(local1_x_1863, local5_sltop_1867, 0, 0, local2_c1_1861);
		__debugInfo = "2103:\ddgui.gbas";
		POLYVECTOR(((local1_x_1863) - (5)), ((local5_sltop_1867) + (2)), 0, 0, local2_c2_1862);
		__debugInfo = "2104:\ddgui.gbas";
		POLYVECTOR(((local1_x_1863) - (5)), ((((local5_sltop_1867) + (local1_h_1865))) - (2)), 0, 0, local2_c2_1862);
		__debugInfo = "2105:\ddgui.gbas";
		POLYVECTOR(local1_x_1863, ((local5_sltop_1867) + (local1_h_1865)), 0, 0, local2_c1_1861);
		__debugInfo = "2108:\ddgui.gbas";
		POLYVECTOR(((local1_x_1863) + (5)), ((((local5_sltop_1867) + (local1_h_1865))) - (2)), 0, 0, local2_c2_1862);
		__debugInfo = "2109:\ddgui.gbas";
		POLYVECTOR(((local1_x_1863) + (5)), ((local5_sltop_1867) + (2)), 0, 0, local2_c2_1862);
		__debugInfo = "2110:\ddgui.gbas";
		ENDPOLY();
		__debugInfo = "2113:\ddgui.gbas";
		if ((((param3_wdg.attr6_whover) == (0)) ? 1 : 0)) {
			__debugInfo = "2113:\ddgui.gbas";
			local2_c2_1862 = param10_ddgui_vals.attr8_col_norm;
			__debugInfo = "2113:\ddgui.gbas";
		};
		__debugInfo = "2114:\ddgui.gbas";
		func14_DDgui_backrect(0, param4_ytop, param3_wdg.attr6_wwidth, param3_wdg.attr7_wheight, local2_c2_1862);
		__debugInfo = "2115:\ddgui.gbas";
		return 0;
		__debugInfo = "2076:\ddgui.gbas";
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
window['func18_DDgui_handleslider'] = function(param10_ddgui_vals, param3_wdg, param2_mx, param2_my, param2_b1, param2_b2) {
	stackPush("function: DDgui_handleslider", __debugInfo);
	try {
		__debugInfo = "2118:\ddgui.gbas";
		if (param3_wdg.attr9_wreadonly) {
			__debugInfo = "2118:\ddgui.gbas";
			return 0;
			__debugInfo = "2118:\ddgui.gbas";
		};
		__debugInfo = "2124:\ddgui.gbas";
		if ((((param2_b1) == (-(1))) ? 1 : 0)) {
			__debugInfo = "2123:\ddgui.gbas";
			if (((((((((((((param2_mx) >= (0)) ? 1 : 0)) && ((((param2_my) >= (0)) ? 1 : 0))) ? 1 : 0)) && ((((param2_mx) <= (param3_wdg.attr6_wwidth)) ? 1 : 0))) ? 1 : 0)) && ((((param2_my) <= (param3_wdg.attr7_wheight)) ? 1 : 0))) ? 1 : 0)) {
				__debugInfo = "2122:\ddgui.gbas";
				param10_ddgui_vals.attr9_focus_Str = param3_wdg.attr7_wid_Str;
				__debugInfo = "2122:\ddgui.gbas";
			};
			__debugInfo = "2123:\ddgui.gbas";
		};
		__debugInfo = "2126:\ddgui.gbas";
		param3_wdg.attr8_wclicked = 0;
		__debugInfo = "2148:\ddgui.gbas";
		if ((((param10_ddgui_vals.attr9_focus_Str) == (param3_wdg.attr7_wid_Str)) ? 1 : 0)) {
			__debugInfo = "2147:\ddgui.gbas";
			if (MOUSEAXIS(3)) {
				var local7_old_Str_1874 = "", local3_pos_1875 = 0.0;
				__debugInfo = "2130:\ddgui.gbas";
				local7_old_Str_1874 = param3_wdg.attr9_wtext_Str_ref[0];
				__debugInfo = "2132:\ddgui.gbas";
				local3_pos_1875 = MIN(1, MAX(0, ((((param2_mx) - (5))) / (((param3_wdg.attr6_wwidth) - (9))))));
				__debugInfo = "2134:\ddgui.gbas";
				local3_pos_1875 = ((param3_wdg.attr7_wminval) + (((local3_pos_1875) * (((param3_wdg.attr7_wmaxval) - (param3_wdg.attr7_wminval))))));
				__debugInfo = "2142:\ddgui.gbas";
				if ((((param3_wdg.attr5_wstep) > (0)) ? 1 : 0)) {
					var local6_iSteps_1876 = 0;
					__debugInfo = "2137:\ddgui.gbas";
					local6_iSteps_1876 = ~~(((((local3_pos_1875) / (param3_wdg.attr5_wstep))) + (0.4)));
					__debugInfo = "2138:\ddgui.gbas";
					local3_pos_1875 = ((param3_wdg.attr5_wstep) * (local6_iSteps_1876));
					__debugInfo = "2139:\ddgui.gbas";
					param3_wdg.attr9_wtext_Str_ref[0] = CAST2STRING(local3_pos_1875);
					__debugInfo = "2137:\ddgui.gbas";
				} else {
					__debugInfo = "2141:\ddgui.gbas";
					param3_wdg.attr9_wtext_Str_ref[0] = FORMAT_Str(0, 2, local3_pos_1875);
					__debugInfo = "2141:\ddgui.gbas";
				};
				__debugInfo = "2144:\ddgui.gbas";
				if ((((local7_old_Str_1874) != (param3_wdg.attr9_wtext_Str_ref[0])) ? 1 : 0)) {
					__debugInfo = "2144:\ddgui.gbas";
					param3_wdg.attr8_wclicked = 1;
					__debugInfo = "2144:\ddgui.gbas";
				};
				__debugInfo = "2130:\ddgui.gbas";
			} else {
				__debugInfo = "2146:\ddgui.gbas";
				param10_ddgui_vals.attr9_focus_Str = "";
				__debugInfo = "2146:\ddgui.gbas";
			};
			__debugInfo = "2147:\ddgui.gbas";
		};
		__debugInfo = "2150:\ddgui.gbas";
		return 0;
		__debugInfo = "2118:\ddgui.gbas";
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
window['func18_DDgui_drawcheckbox'] = function(param10_ddgui_vals, param3_wdg, param4_ytop) {
	stackPush("function: DDgui_drawcheckbox", __debugInfo);
	try {
		var local2_c1_1880 = 0, local2_c2_1881 = 0, local5_hover_1882 = 0, local5_check_1883 = 0, local1_r_1884 = 0, local2_tx_ref_1885 = [0], local2_ty_ref_1886 = [0], local7_txt_Str_ref_1887 = [""];
		__debugInfo = "2189:\ddgui.gbas";
		local7_txt_Str_ref_1887[0] = param3_wdg.attr9_wtext_Str_ref[0];
		__debugInfo = "2190:\ddgui.gbas";
		GETFONTSIZE(local2_tx_ref_1885, local2_ty_ref_1886);
		__debugInfo = "2192:\ddgui.gbas";
		if (param3_wdg.attr7_wselect) {
			__debugInfo = "2192:\ddgui.gbas";
			local5_check_1883 = 1;
			__debugInfo = "2192:\ddgui.gbas";
		};
		__debugInfo = "2193:\ddgui.gbas";
		if ((((param3_wdg.attr6_whover) && ((((param3_wdg.attr9_wreadonly) == (0)) ? 1 : 0))) ? 1 : 0)) {
			__debugInfo = "2193:\ddgui.gbas";
			local5_hover_1882 = 1;
			__debugInfo = "2193:\ddgui.gbas";
		};
		__debugInfo = "2206:\ddgui.gbas";
		if (local5_hover_1882) {
			__debugInfo = "2195:\ddgui.gbas";
			local2_c1_1880 = param10_ddgui_vals.attr16_col_hover_bright;
			__debugInfo = "2196:\ddgui.gbas";
			local2_c2_1881 = param10_ddgui_vals.attr14_col_hover_norm;
			__debugInfo = "2201:\ddgui.gbas";
			if ((((local5_hover_1882) == (0)) ? 1 : 0)) {
				__debugInfo = "2198:\ddgui.gbas";
				local1_r_1884 = local2_c1_1880;
				__debugInfo = "2199:\ddgui.gbas";
				local2_c1_1880 = local2_c2_1881;
				__debugInfo = "2200:\ddgui.gbas";
				local2_c2_1881 = local1_r_1884;
				__debugInfo = "2198:\ddgui.gbas";
			};
			__debugInfo = "2202:\ddgui.gbas";
			func14_DDgui_backrect(1, ((param4_ytop) + (1)), ((param3_wdg.attr6_wwidth) - (1)), ((local2_ty_ref_1886[0]) - (1)), local2_c1_1880);
			__debugInfo = "2195:\ddgui.gbas";
		} else {
			__debugInfo = "2204:\ddgui.gbas";
			local2_c1_1880 = param10_ddgui_vals.attr10_col_bright;
			__debugInfo = "2205:\ddgui.gbas";
			local2_c2_1881 = param10_ddgui_vals.attr8_col_norm;
			__debugInfo = "2204:\ddgui.gbas";
		};
		__debugInfo = "2207:\ddgui.gbas";
		func17_DDGui_PrintIntern(local7_txt_Str_ref_1887, ~~(((((local2_tx_ref_1885[0]) * (1.7))) + (1))), ((param4_ytop) + (1)), local5_check_1883);
		__debugInfo = "2213:\ddgui.gbas";
		if (local5_check_1883) {
			__debugInfo = "2209:\ddgui.gbas";
			local2_c1_1880 = param10_ddgui_vals.attr16_col_hover_bright;
			__debugInfo = "2210:\ddgui.gbas";
			local2_c2_1881 = param10_ddgui_vals.attr14_col_hover_norm;
			__debugInfo = "2209:\ddgui.gbas";
		} else {
			__debugInfo = "2211:\ddgui.gbas";
			local2_c1_1880 = param10_ddgui_vals.attr10_col_bright;
			__debugInfo = "2212:\ddgui.gbas";
			local2_c2_1881 = param10_ddgui_vals.attr8_col_norm;
			__debugInfo = "2211:\ddgui.gbas";
		};
		__debugInfo = "2214:\ddgui.gbas";
		func13_DDgui_backgnd(local2_c1_1880, local2_c2_1881, 3, ((param4_ytop) + (3)), ((local2_ty_ref_1886[0]) - (4)), ((local2_ty_ref_1886[0]) - (4)));
		__debugInfo = "2215:\ddgui.gbas";
		func14_DDgui_backrect(2, ((param4_ytop) + (2)), ((local2_ty_ref_1886[0]) - (2)), ((local2_ty_ref_1886[0]) - (2)), local2_c2_1881);
		__debugInfo = "2216:\ddgui.gbas";
		return 0;
		__debugInfo = "2189:\ddgui.gbas";
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
window['func20_DDgui_handlecheckbox'] = function(param10_ddgui_vals, param3_wdg, param2_mx, param2_my, param2_b1, param2_b2) {
	stackPush("function: DDgui_handlecheckbox", __debugInfo);
	try {
		__debugInfo = "2219:\ddgui.gbas";
		if (param3_wdg.attr9_wreadonly) {
			__debugInfo = "2219:\ddgui.gbas";
			return 0;
			__debugInfo = "2219:\ddgui.gbas";
		};
		__debugInfo = "2220:\ddgui.gbas";
		param3_wdg.attr8_wclicked = 0;
		__debugInfo = "2224:\ddgui.gbas";
		if ((((param2_b1) == (1)) ? 1 : 0)) {
			__debugInfo = "2222:\ddgui.gbas";
			param3_wdg.attr7_wselect = ((1) - (param3_wdg.attr7_wselect));
			__debugInfo = "2223:\ddgui.gbas";
			param3_wdg.attr8_wclicked = 1;
			__debugInfo = "2222:\ddgui.gbas";
		};
		__debugInfo = "2225:\ddgui.gbas";
		return 0;
		__debugInfo = "2219:\ddgui.gbas";
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
window['func11_DDgui_radio'] = function(param6_id_Str, param9_texts_Str, param5_width) {
	stackPush("function: DDgui_radio", __debugInfo);
	try {
		var local2_tx_ref_1897 = [0], local2_ty_ref_1898 = [0], local3_num_1899 = 0, local1_i_1900 = 0;
		__debugInfo = "2235:\ddgui.gbas";
		GETFONTSIZE(local2_tx_ref_1897, local2_ty_ref_1898);
		__debugInfo = "2236:\ddgui.gbas";
		local3_num_1899 = SPLITSTR(param9_texts_Str, unref(static7_DDgui_radio_opt_Str), "|", 1);
		__debugInfo = "2237:\ddgui.gbas";
		if ((((local3_num_1899) == (0)) ? 1 : 0)) {
			__debugInfo = "2237:\ddgui.gbas";
			func9_DDgui_set(param6_id_Str, "SELECT", CAST2STRING(-(1)));
			__debugInfo = "2237:\ddgui.gbas";
		};
		__debugInfo = "2244:\ddgui.gbas";
		if ((((param5_width) == (0)) ? 1 : 0)) {
			__debugInfo = "2238:\ddgui.gbas";
			{
				__debugInfo = "2242:\ddgui.gbas";
				for (local1_i_1900 = 0;toCheck(local1_i_1900, ((local3_num_1899) - (1)), 1);local1_i_1900 += 1) {
					__debugInfo = "2240:\ddgui.gbas";
					local2_ty_ref_1898[0] = (static7_DDgui_radio_opt_Str.arrAccess(local1_i_1900).values[tmpPositionCache]).length;
					__debugInfo = "2241:\ddgui.gbas";
					if ((((local2_ty_ref_1898[0]) > (param5_width)) ? 1 : 0)) {
						__debugInfo = "2241:\ddgui.gbas";
						param5_width = local2_ty_ref_1898[0];
						__debugInfo = "2241:\ddgui.gbas";
					};
					__debugInfo = "2240:\ddgui.gbas";
				};
				__debugInfo = "2242:\ddgui.gbas";
			};
			__debugInfo = "2243:\ddgui.gbas";
			param5_width = ((((param5_width) + (2))) * (local2_tx_ref_1897[0]));
			__debugInfo = "2238:\ddgui.gbas";
		};
		__debugInfo = "2245:\ddgui.gbas";
		func12_DDgui_widget(param6_id_Str, param9_texts_Str, param5_width, 0);
		__debugInfo = "2246:\ddgui.gbas";
		func9_DDgui_set(param6_id_Str, "TYPE", "RADIO");
		__debugInfo = "2249:\ddgui.gbas";
		return 0;
		__debugInfo = "2235:\ddgui.gbas";
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
window['func15_DDgui_drawradio'] = function(param10_ddgui_vals, param3_wdg, param4_ytop) {
	stackPush("function: DDgui_drawradio", __debugInfo);
	try {
		var local1_i_1905 = 0, local2_tx_ref_1906 = [0], local2_ty_ref_1907 = [0], local1_h_1908 = 0, local5_hover_1909 = 0, local5_check_1910 = 0, local6_bright_1911 = 0, local4_dark_1912 = 0, local8_bright_h_1913 = 0, local6_dark_h_1914 = 0, local3_num_1915 = 0, local7_opt_Str_ref_1916 = [""];
		__debugInfo = "2257:\ddgui.gbas";
		local6_bright_1911 = param10_ddgui_vals.attr10_col_bright;
		__debugInfo = "2258:\ddgui.gbas";
		local4_dark_1912 = param10_ddgui_vals.attr8_col_norm;
		__debugInfo = "2259:\ddgui.gbas";
		local8_bright_h_1913 = param10_ddgui_vals.attr16_col_hover_bright;
		__debugInfo = "2260:\ddgui.gbas";
		local6_dark_h_1914 = param10_ddgui_vals.attr14_col_hover_norm;
		__debugInfo = "2263:\ddgui.gbas";
		GETFONTSIZE(local2_tx_ref_1906, local2_ty_ref_1907);
		__debugInfo = "2265:\ddgui.gbas";
		local2_tx_ref_1906[0] = MAX(12, unref(local2_tx_ref_1906[0]));
		__debugInfo = "2266:\ddgui.gbas";
		local2_ty_ref_1907[0] = MAX(12, unref(local2_ty_ref_1907[0]));
		__debugInfo = "2269:\ddgui.gbas";
		local3_num_1915 = param3_wdg.attr6_wcount;
		__debugInfo = "2270:\ddgui.gbas";
		local1_h_1908 = MAX(unref(local2_ty_ref_1907[0]), global25_gDDguiMinControlDimension);
		__debugInfo = "2272:\ddgui.gbas";
		param4_ytop+=CAST2INT(((((local1_h_1908) - (local2_ty_ref_1907[0]))) / (2)));
		__debugInfo = "2277:\ddgui.gbas";
		DRAWRECT(((CAST2INT(((local2_ty_ref_1907[0]) / (2)))) - (1)), ((param4_ytop) + (1)), 3, ((((((local3_num_1915) * (local1_h_1908))) - (4))) - (((local1_h_1908) - (local2_ty_ref_1907[0])))), local4_dark_1912);
		__debugInfo = "2279:\ddgui.gbas";
		{
			__debugInfo = "2302:\ddgui.gbas";
			for (local1_i_1905 = 0;toCheck(local1_i_1905, 9999, 1);local1_i_1905 += 1) {
				var local5_yitem_1917 = 0;
				__debugInfo = "2281:\ddgui.gbas";
				param3_wdg.attr6_wcount = local1_i_1905;
				__debugInfo = "2282:\ddgui.gbas";
				local7_opt_Str_ref_1916[0] = func31_DDgui_intern_list_item_text_Str(param3_wdg.attr9_wtext_Str_ref, local1_i_1905);
				__debugInfo = "2283:\ddgui.gbas";
				if (((((local7_opt_Str_ref_1916[0]).length) == (0)) ? 1 : 0)) {
					__debugInfo = "2283:\ddgui.gbas";
					break;
					__debugInfo = "2283:\ddgui.gbas";
				};
				__debugInfo = "2285:\ddgui.gbas";
				local5_yitem_1917 = ((param4_ytop) + (((local1_i_1905) * (local1_h_1908))));
				__debugInfo = "2286:\ddgui.gbas";
				local5_hover_1909 = 0;
				__debugInfo = "2287:\ddgui.gbas";
				local5_check_1910 = 0;
				__debugInfo = "2288:\ddgui.gbas";
				if ((((param3_wdg.attr7_wselect) == (local1_i_1905)) ? 1 : 0)) {
					__debugInfo = "2288:\ddgui.gbas";
					local5_check_1910 = 1;
					__debugInfo = "2288:\ddgui.gbas";
				};
				__debugInfo = "2289:\ddgui.gbas";
				if (((((((param3_wdg.attr6_whover) == (local1_i_1905)) ? 1 : 0)) && ((((param3_wdg.attr9_wreadonly) == (0)) ? 1 : 0))) ? 1 : 0)) {
					__debugInfo = "2289:\ddgui.gbas";
					local5_hover_1909 = 1;
					__debugInfo = "2289:\ddgui.gbas";
				};
				__debugInfo = "2294:\ddgui.gbas";
				if (local5_check_1910) {
					__debugInfo = "2292:\ddgui.gbas";
					func13_DDgui_backgnd(local8_bright_h_1913, local6_dark_h_1914, 3, ((local5_yitem_1917) + (2)), ((local2_ty_ref_1907[0]) - (6)), ((local2_ty_ref_1907[0]) - (6)));
					__debugInfo = "2293:\ddgui.gbas";
					func14_DDgui_backrect(2, ((local5_yitem_1917) + (1)), ((local2_ty_ref_1907[0]) - (4)), ((local2_ty_ref_1907[0]) - (4)), local6_dark_h_1914);
					__debugInfo = "2292:\ddgui.gbas";
				};
				__debugInfo = "2299:\ddgui.gbas";
				if (local5_hover_1909) {
					__debugInfo = "2298:\ddgui.gbas";
					if (local5_hover_1909) {
						__debugInfo = "2297:\ddgui.gbas";
						func14_DDgui_backrect(0, ((local5_yitem_1917) - (CAST2INT(((((local1_h_1908) - (local2_ty_ref_1907[0]))) / (2))))), ((param3_wdg.attr6_wwidth) - (1)), ((local1_h_1908) - (1)), local8_bright_h_1913);
						__debugInfo = "2297:\ddgui.gbas";
					};
					__debugInfo = "2298:\ddgui.gbas";
				};
				__debugInfo = "2301:\ddgui.gbas";
				func17_DDGui_PrintIntern(local7_opt_Str_ref_1916, ~~(((local2_tx_ref_1906[0]) * (1.7))), local5_yitem_1917, local5_check_1910);
				__debugInfo = "2281:\ddgui.gbas";
			};
			__debugInfo = "2302:\ddgui.gbas";
		};
		__debugInfo = "2306:\ddgui.gbas";
		return 0;
		__debugInfo = "2257:\ddgui.gbas";
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
window['func17_DDgui_handleradio'] = function(param10_ddgui_vals, param3_wdg, param2_mx, param2_my, param2_b1, param2_b2) {
	stackPush("function: DDgui_handleradio", __debugInfo);
	try {
		var local2_tx_ref_1924 = [0], local2_ty_ref_1925 = [0], local1_h_1926 = 0, local5_hover_1927 = 0, local6_oldsel_1928 = 0, local3_num_1929 = 0;
		__debugInfo = "2309:\ddgui.gbas";
		if (param3_wdg.attr9_wreadonly) {
			__debugInfo = "2309:\ddgui.gbas";
			return 0;
			__debugInfo = "2309:\ddgui.gbas";
		};
		__debugInfo = "2315:\ddgui.gbas";
		GETFONTSIZE(local2_tx_ref_1924, local2_ty_ref_1925);
		__debugInfo = "2316:\ddgui.gbas";
		local3_num_1929 = SPLITSTR(unref(param3_wdg.attr9_wtext_Str_ref[0]), unref(static7_DDgui_handleradio_txt_Str), "|", 1);
		__debugInfo = "2317:\ddgui.gbas";
		local1_h_1926 = MAX(unref(local2_ty_ref_1925[0]), global25_gDDguiMinControlDimension);
		__debugInfo = "2318:\ddgui.gbas";
		param3_wdg.attr7_wheight = ((local1_h_1926) * (local3_num_1929));
		__debugInfo = "2319:\ddgui.gbas";
		param3_wdg.attr8_wclicked = 0;
		__debugInfo = "2321:\ddgui.gbas";
		param3_wdg.attr6_whover = -(1);
		__debugInfo = "2333:\ddgui.gbas";
		if (((((((((((((param2_my) > (0)) ? 1 : 0)) && ((((param2_my) <= (param3_wdg.attr7_wheight)) ? 1 : 0))) ? 1 : 0)) && ((((param2_mx) > (0)) ? 1 : 0))) ? 1 : 0)) && ((((param2_mx) < (param3_wdg.attr6_wwidth)) ? 1 : 0))) ? 1 : 0)) {
			__debugInfo = "2323:\ddgui.gbas";
			param2_my = INTEGER(CAST2INT(((param2_my) / (local1_h_1926))));
			__debugInfo = "2331:\ddgui.gbas";
			if ((((param2_b1) == (1)) ? 1 : 0)) {
				__debugInfo = "2325:\ddgui.gbas";
				local6_oldsel_1928 = param3_wdg.attr7_wselect;
				__debugInfo = "2330:\ddgui.gbas";
				if ((((param2_my) != (local6_oldsel_1928)) ? 1 : 0)) {
					__debugInfo = "2327:\ddgui.gbas";
					param2_my = MIN(param2_my, ((local3_num_1929) - (1)));
					__debugInfo = "2328:\ddgui.gbas";
					param3_wdg.attr7_wselect = param2_my;
					__debugInfo = "2329:\ddgui.gbas";
					param3_wdg.attr8_wclicked = 1;
					__debugInfo = "2327:\ddgui.gbas";
				};
				__debugInfo = "2325:\ddgui.gbas";
			};
			__debugInfo = "2332:\ddgui.gbas";
			param3_wdg.attr6_whover = param2_my;
			__debugInfo = "2323:\ddgui.gbas";
		};
		__debugInfo = "2334:\ddgui.gbas";
		return 0;
		__debugInfo = "2309:\ddgui.gbas";
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
window['func14_DDgui_drawfile'] = function(param10_ddgui_vals, param3_wdg, param4_ytop) {
	stackPush("function: DDgui_drawfile", __debugInfo);
	try {
		var local2_c1_1934 = 0, local2_c2_1935 = 0, local2_tx_ref_1936 = [0], local2_ty_ref_1937 = [0], local7_txt_Str_ref_1938 = [""], local7_dheight_1939 = 0;
		__debugInfo = "2352:\ddgui.gbas";
		GETFONTSIZE(local2_tx_ref_1936, local2_ty_ref_1937);
		__debugInfo = "2359:\ddgui.gbas";
		if (((((((param3_wdg.attr6_whover) > (0)) ? 1 : 0)) && ((((param3_wdg.attr9_wreadonly) == (0)) ? 1 : 0))) ? 1 : 0)) {
			__debugInfo = "2354:\ddgui.gbas";
			local2_c1_1934 = param10_ddgui_vals.attr16_col_hover_bright;
			__debugInfo = "2355:\ddgui.gbas";
			local2_c2_1935 = param10_ddgui_vals.attr14_col_hover_norm;
			__debugInfo = "2354:\ddgui.gbas";
		} else {
			__debugInfo = "2357:\ddgui.gbas";
			local2_c1_1934 = param10_ddgui_vals.attr10_col_bright;
			__debugInfo = "2358:\ddgui.gbas";
			local2_c2_1935 = param10_ddgui_vals.attr8_col_norm;
			__debugInfo = "2357:\ddgui.gbas";
		};
		__debugInfo = "2360:\ddgui.gbas";
		func13_DDgui_backgnd(local2_c1_1934, local2_c2_1935, 0, param4_ytop, param3_wdg.attr6_wwidth, param3_wdg.attr7_wheight);
		__debugInfo = "2363:\ddgui.gbas";
		local7_dheight_1939 = ~~(((local2_ty_ref_1937[0]) * (1.2)));
		__debugInfo = "2366:\ddgui.gbas";
		DRAWRECT(1, ((param4_ytop) + (1)), local7_dheight_1939, local7_dheight_1939, RGB(71, 107, 254));
		__debugInfo = "2367:\ddgui.gbas";
		DRAWRECT(((1) + (((local7_dheight_1939) * (0.2)))), ((param4_ytop) + (1)), ((((local7_dheight_1939) * (0.8))) - (2)), ((((local7_dheight_1939) * (0.6))) - (1)), 16777215);
		__debugInfo = "2368:\ddgui.gbas";
		DRAWRECT(((1) + (((local7_dheight_1939) * (0.2)))), ((((param4_ytop) + (1))) + (((local7_dheight_1939) * (0.7)))), ((((local7_dheight_1939) * (0.8))) - (2)), ((((local7_dheight_1939) * (0.3))) + (1)), RGB(204, 204, 204));
		__debugInfo = "2370:\ddgui.gbas";
		local7_txt_Str_ref_1938[0] = param3_wdg.attr9_wtext_Str_ref[0];
		__debugInfo = "2371:\ddgui.gbas";
		local2_ty_ref_1937[0] = 0;
		__debugInfo = "2373:\ddgui.gbas";
		{
			__debugInfo = "2376:\ddgui.gbas";
			for (local2_tx_ref_1936[0] = (((local7_txt_Str_ref_1938[0]).length) - (1));toCheck(local2_tx_ref_1936[0], 0, -(1));local2_tx_ref_1936[0] += -(1)) {
				__debugInfo = "2375:\ddgui.gbas";
				if ((((MID_Str(unref(local7_txt_Str_ref_1938[0]), unref(local2_tx_ref_1936[0]), 1)) == ("/")) ? 1 : 0)) {
					__debugInfo = "2374:\ddgui.gbas";
					local2_ty_ref_1937[0] = ((local2_tx_ref_1936[0]) + (1));
					__debugInfo = "2374:\ddgui.gbas";
					break;
					__debugInfo = "2374:\ddgui.gbas";
				};
				__debugInfo = "2375:\ddgui.gbas";
			};
			__debugInfo = "2376:\ddgui.gbas";
		};
		__debugInfo = "2377:\ddgui.gbas";
		local7_txt_Str_ref_1938[0] = MID_Str(unref(local7_txt_Str_ref_1938[0]), unref(local2_ty_ref_1937[0]), (local7_txt_Str_ref_1938[0]).length);
		__debugInfo = "2379:\ddgui.gbas";
		func17_DDGui_PrintIntern(local7_txt_Str_ref_1938, ((local7_dheight_1939) + (3)), ((param4_ytop) + (3)), 0);
		__debugInfo = "2382:\ddgui.gbas";
		func14_DDgui_backrect(0, param4_ytop, param3_wdg.attr6_wwidth, param3_wdg.attr7_wheight, local2_c2_1935);
		__debugInfo = "2383:\ddgui.gbas";
		return 0;
		__debugInfo = "2352:\ddgui.gbas";
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
window['func16_DDgui_handlefile'] = function(param10_ddgui_vals, param3_wdg, param2_mx, param2_my, param2_b1, param2_b2) {
	stackPush("function: DDgui_handlefile", __debugInfo);
	try {
		var local5_a_Str_1946 = "";
		__debugInfo = "2386:\ddgui.gbas";
		if (param3_wdg.attr9_wreadonly) {
			__debugInfo = "2386:\ddgui.gbas";
			return 0;
			__debugInfo = "2386:\ddgui.gbas";
		};
		__debugInfo = "2389:\ddgui.gbas";
		if (((((param3_wdg.attr11_wfilter_Str).length) == (0)) ? 1 : 0)) {
			__debugInfo = "2389:\ddgui.gbas";
			param3_wdg.attr11_wfilter_Str = "*.*";
			__debugInfo = "2389:\ddgui.gbas";
		};
		__debugInfo = "2390:\ddgui.gbas";
		func9_DDgui_set(param3_wdg.attr7_wid_Str, "CLICKED", CAST2STRING(0));
		__debugInfo = "2404:\ddgui.gbas";
		if ((((param2_b1) == (1)) ? 1 : 0)) {
			__debugInfo = "2392:\ddgui.gbas";
			if (param3_wdg.attr9_wreadonly) {
				__debugInfo = "2392:\ddgui.gbas";
				return 0;
				__debugInfo = "2392:\ddgui.gbas";
			};
			__debugInfo = "2394:\ddgui.gbas";
			param10_ddgui_vals.attr15_kick_intern_dlg = 4;
			__debugInfo = "2395:\ddgui.gbas";
			param10_ddgui_vals.attr18_kick_intern_id_Str = param3_wdg.attr7_wid_Str;
			__debugInfo = "2392:\ddgui.gbas";
		};
		__debugInfo = "2405:\ddgui.gbas";
		return 0;
		__debugInfo = "2386:\ddgui.gbas";
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
window['func23_DDgui_fit_sprite_in_box'] = function(param2_id, param1_x, param1_y, param1_w, param1_h) {
	stackPush("function: DDgui_fit_sprite_in_box", __debugInfo);
	try {
		var local3_spx_ref_1952 = [0], local3_spy_ref_1953 = [0];
		__debugInfo = "2411:\ddgui.gbas";
		if (((((((param1_w) < (1)) ? 1 : 0)) || ((((param1_h) < (1)) ? 1 : 0))) ? 1 : 0)) {
			__debugInfo = "2411:\ddgui.gbas";
			return 0;
			__debugInfo = "2411:\ddgui.gbas";
		};
		__debugInfo = "2414:\ddgui.gbas";
		GETSPRITESIZE(param2_id, local3_spx_ref_1952, local3_spy_ref_1953);
		__debugInfo = "2415:\ddgui.gbas";
		if (((((((local3_spx_ref_1952[0]) == (0)) ? 1 : 0)) || ((((local3_spy_ref_1953[0]) == (0)) ? 1 : 0))) ? 1 : 0)) {
			__debugInfo = "2415:\ddgui.gbas";
			return 0;
			__debugInfo = "2415:\ddgui.gbas";
		};
		__debugInfo = "2431:\ddgui.gbas";
		if (((((((local3_spx_ref_1952[0]) <= (param1_w)) ? 1 : 0)) && ((((local3_spy_ref_1953[0]) <= (param1_h)) ? 1 : 0))) ? 1 : 0)) {
			__debugInfo = "2418:\ddgui.gbas";
			DRAWSPRITE(param2_id, ((param1_x) + (CAST2INT(((((param1_w) - (local3_spx_ref_1952[0]))) / (2))))), ((param1_y) + (CAST2INT(((((param1_h) - (local3_spy_ref_1953[0]))) / (2))))));
			__debugInfo = "2418:\ddgui.gbas";
		} else {
			var local4_facx_1954 = 0.0, local4_facy_1955 = 0.0, local2_dw_1956 = 0.0, local2_dh_1957 = 0.0;
			__debugInfo = "2419:\ddgui.gbas";
			local4_facx_1954 = param1_w;
			__debugInfo = "2420:\ddgui.gbas";
			local4_facx_1954 = ((local4_facx_1954) / (local3_spx_ref_1952[0]));
			__debugInfo = "2420:\ddgui.gbas";
			local4_facy_1955 = param1_h;
			__debugInfo = "2421:\ddgui.gbas";
			local4_facy_1955 = ((local4_facy_1955) / (local3_spy_ref_1953[0]));
			__debugInfo = "2429:\ddgui.gbas";
			if ((((local4_facx_1954) < (local4_facy_1955)) ? 1 : 0)) {
				__debugInfo = "2424:\ddgui.gbas";
				local2_dw_1956 = ((local3_spx_ref_1952[0]) * (local4_facx_1954));
				__debugInfo = "2425:\ddgui.gbas";
				local2_dh_1957 = ((local3_spy_ref_1953[0]) * (local4_facx_1954));
				__debugInfo = "2424:\ddgui.gbas";
			} else {
				__debugInfo = "2427:\ddgui.gbas";
				local2_dw_1956 = ((local3_spx_ref_1952[0]) * (local4_facy_1955));
				__debugInfo = "2428:\ddgui.gbas";
				local2_dh_1957 = ((local3_spy_ref_1953[0]) * (local4_facy_1955));
				__debugInfo = "2427:\ddgui.gbas";
			};
			__debugInfo = "2430:\ddgui.gbas";
			STRETCHSPRITE(param2_id, ((param1_x) + (((((param1_w) - (local2_dw_1956))) / (2)))), ((param1_y) + (((((param1_h) - (local2_dh_1957))) / (2)))), local2_dw_1956, local2_dh_1957);
			__debugInfo = "2419:\ddgui.gbas";
		};
		__debugInfo = "2432:\ddgui.gbas";
		return 0;
		__debugInfo = "2411:\ddgui.gbas";
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
window['func11_DDgui_combo'] = function(param6_id_Str, param9_texts_Str, param5_width, param6_height) {
	stackPush("function: DDgui_combo", __debugInfo);
	try {
		var local2_tx_ref_1962 = [0], local2_ty_ref_1963 = [0];
		__debugInfo = "2437:\ddgui.gbas";
		GETFONTSIZE(local2_tx_ref_1962, local2_ty_ref_1963);
		__debugInfo = "2438:\ddgui.gbas";
		if ((((param6_height) == (0)) ? 1 : 0)) {
			__debugInfo = "2438:\ddgui.gbas";
			param6_height = local2_ty_ref_1963[0];
			__debugInfo = "2438:\ddgui.gbas";
		};
		__debugInfo = "2439:\ddgui.gbas";
		func10_DDgui_list(param6_id_Str, param9_texts_Str, param5_width, param6_height);
		__debugInfo = "2440:\ddgui.gbas";
		func9_DDgui_set(param6_id_Str, "TYPE", "COMBO");
		__debugInfo = "2441:\ddgui.gbas";
		return 0;
		__debugInfo = "2437:\ddgui.gbas";
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
window['func15_DDgui_drawcombo'] = function(param10_ddgui_vals, param3_wdg, param4_ytop) {
	stackPush("function: DDgui_drawcombo", __debugInfo);
	try {
		var local2_fx_ref_1967 = [0], local2_fy_ref_1968 = [0], local2_c1_1969 = 0, local2_c2_1970 = 0, local5_hover_1971 = 0, local1_x_1972 = 0, local1_y_1973 = 0, local1_w_1974 = 0, local1_h_1975 = 0;
		__debugInfo = "2449:\ddgui.gbas";
		GETFONTSIZE(local2_fx_ref_1967, local2_fy_ref_1968);
		__debugInfo = "2454:\ddgui.gbas";
		local5_hover_1971 = param3_wdg.attr6_whover;
		__debugInfo = "2462:\ddgui.gbas";
		if (((((((local5_hover_1971) > (0)) ? 1 : 0)) && ((((param3_wdg.attr9_wreadonly) == (0)) ? 1 : 0))) ? 1 : 0)) {
			__debugInfo = "2457:\ddgui.gbas";
			local2_c1_1969 = param10_ddgui_vals.attr16_col_hover_bright;
			__debugInfo = "2458:\ddgui.gbas";
			local2_c2_1970 = param10_ddgui_vals.attr14_col_hover_norm;
			__debugInfo = "2457:\ddgui.gbas";
		} else {
			__debugInfo = "2460:\ddgui.gbas";
			local2_c1_1969 = param10_ddgui_vals.attr10_col_bright;
			__debugInfo = "2461:\ddgui.gbas";
			local2_c2_1970 = param10_ddgui_vals.attr8_col_norm;
			__debugInfo = "2460:\ddgui.gbas";
		};
		__debugInfo = "2463:\ddgui.gbas";
		func13_DDgui_backgnd(local2_c1_1969, local2_c2_1970, 1, ((param4_ytop) + (1)), ((param3_wdg.attr6_wwidth) - (2)), ((param3_wdg.attr7_wheight) - (2)));
		__debugInfo = "2464:\ddgui.gbas";
		func13_DDgui_backgnd(param10_ddgui_vals.attr16_col_hover_bright, param10_ddgui_vals.attr14_col_hover_norm, ((param3_wdg.attr6_wwidth) - (((local2_fx_ref_1967[0]) * (2)))), ((param4_ytop) + (1)), ((local2_fx_ref_1967[0]) * (2)), ((param3_wdg.attr7_wheight) - (2)));
		__debugInfo = "2466:\ddgui.gbas";
		STARTPOLY(-(1), 0);
		__debugInfo = "2467:\ddgui.gbas";
		POLYVECTOR(((param3_wdg.attr6_wwidth) - (((local2_fx_ref_1967[0]) * (1.7)))), ((param4_ytop) + (((param3_wdg.attr7_wheight) * (0.2)))), 0, 0, local2_c1_1969);
		__debugInfo = "2468:\ddgui.gbas";
		POLYVECTOR(((param3_wdg.attr6_wwidth) - (((local2_fx_ref_1967[0]) * (1)))), ((param4_ytop) + (((param3_wdg.attr7_wheight) * (0.8)))), 0, 0, local2_c1_1969);
		__debugInfo = "2469:\ddgui.gbas";
		POLYVECTOR(((param3_wdg.attr6_wwidth) - (((local2_fx_ref_1967[0]) * (0.3)))), ((param4_ytop) + (((param3_wdg.attr7_wheight) * (0.2)))), 0, 0, local2_c1_1969);
		__debugInfo = "2470:\ddgui.gbas";
		ENDPOLY();
		__debugInfo = "2471:\ddgui.gbas";
		local1_x_1972 = 1;
		__debugInfo = "2471:\ddgui.gbas";
		local1_y_1973 = ((param4_ytop) + (1));
		__debugInfo = "2471:\ddgui.gbas";
		local1_w_1974 = ((((param3_wdg.attr6_wwidth) - (2))) - (((2) * (local2_fx_ref_1967[0]))));
		__debugInfo = "2472:\ddgui.gbas";
		local1_h_1975 = ((param3_wdg.attr7_wheight) - (2));
		__debugInfo = "2480:\ddgui.gbas";
		if (param3_wdg.attr7_wselect) {
			__debugInfo = "2476:\ddgui.gbas";
			local1_x_1972+=1;
			__debugInfo = "2477:\ddgui.gbas";
			local1_y_1973+=1;
			__debugInfo = "2478:\ddgui.gbas";
			local1_w_1974+=-(2);
			__debugInfo = "2479:\ddgui.gbas";
			local1_h_1975+=-(2);
			__debugInfo = "2476:\ddgui.gbas";
		};
		__debugInfo = "2507:\ddgui.gbas";
		if ((((param3_wdg.attr7_wselect) >= (0)) ? 1 : 0)) {
			var local5_a_Str_ref_1976 = [""];
			__debugInfo = "2483:\ddgui.gbas";
			local5_a_Str_ref_1976[0] = func31_DDgui_intern_list_item_text_Str(param3_wdg.attr9_wtext_Str_ref, param3_wdg.attr7_wselect);
			__debugInfo = "2506:\ddgui.gbas";
			if ((((INSTR(unref(local5_a_Str_ref_1976[0]), "SPR_B", 0)) == (0)) ? 1 : 0)) {
				__debugInfo = "2491:\ddgui.gbas";
				if ((((local5_hover_1971) == (0)) ? 1 : 0)) {
					__debugInfo = "2488:\ddgui.gbas";
					ALPHAMODE(-(1));
					__debugInfo = "2488:\ddgui.gbas";
				} else {
					__debugInfo = "2490:\ddgui.gbas";
					ALPHAMODE(-(0.8));
					__debugInfo = "2490:\ddgui.gbas";
				};
				__debugInfo = "2492:\ddgui.gbas";
				local2_c1_1969 = INTEGER(FLOAT2STR(MID_Str(unref(local5_a_Str_ref_1976[0]), 5, -(1))));
				__debugInfo = "2493:\ddgui.gbas";
				func23_DDgui_fit_sprite_in_box(local2_c1_1969, ((local1_x_1972) + (1)), ((local1_y_1973) + (1)), ((local1_w_1974) - (2)), ((local1_h_1975) - (2)));
				__debugInfo = "2491:\ddgui.gbas";
			} else if ((((INSTR(unref(local5_a_Str_ref_1976[0]), "SPR_C", 0)) == (0)) ? 1 : 0)) {
				__debugInfo = "2500:\ddgui.gbas";
				if ((((local5_hover_1971) == (0)) ? 1 : 0)) {
					__debugInfo = "2497:\ddgui.gbas";
					ALPHAMODE(-(1));
					__debugInfo = "2497:\ddgui.gbas";
				} else {
					__debugInfo = "2499:\ddgui.gbas";
					ALPHAMODE(-(0.8));
					__debugInfo = "2499:\ddgui.gbas";
				};
				__debugInfo = "2501:\ddgui.gbas";
				local2_c1_1969 = INTEGER(FLOAT2STR(MID_Str(unref(local5_a_Str_ref_1976[0]), 5, -(1))));
				__debugInfo = "2502:\ddgui.gbas";
				DRAWRECT(local1_x_1972, local1_y_1973, local1_w_1974, local1_h_1975, local2_c1_1969);
				__debugInfo = "2500:\ddgui.gbas";
			} else {
				__debugInfo = "2504:\ddgui.gbas";
				if ((((local5_hover_1971) == (0)) ? 1 : 0)) {
					__debugInfo = "2504:\ddgui.gbas";
					ALPHAMODE(-(0.8));
					__debugInfo = "2504:\ddgui.gbas";
				};
				__debugInfo = "2505:\ddgui.gbas";
				func17_DDGui_PrintIntern(local5_a_Str_ref_1976, CAST2INT(((((local1_w_1974) - (func21_DDGui_TextWidthIntern(local5_a_Str_ref_1976)))) / (2))), ((param4_ytop) + (CAST2INT(((((param3_wdg.attr7_wheight) - (local2_fy_ref_1968[0]))) / (2))))), 0);
				__debugInfo = "2504:\ddgui.gbas";
			};
			__debugInfo = "2483:\ddgui.gbas";
		};
		__debugInfo = "2510:\ddgui.gbas";
		ALPHAMODE(0);
		__debugInfo = "2512:\ddgui.gbas";
		func14_DDgui_backrect(0, param4_ytop, param3_wdg.attr6_wwidth, param3_wdg.attr7_wheight, local2_c2_1970);
		__debugInfo = "2513:\ddgui.gbas";
		return 0;
		__debugInfo = "2449:\ddgui.gbas";
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
window['func17_DDgui_handlecombo'] = function(param10_ddgui_vals, param3_wdg, param2_mx, param2_my, param2_b1, param2_b2) {
	stackPush("function: DDgui_handlecombo", __debugInfo);
	try {
		__debugInfo = "2517:\ddgui.gbas";
		param3_wdg.attr8_wclicked = 0;
		__debugInfo = "2521:\ddgui.gbas";
		if ((((param2_b1) == (1)) ? 1 : 0)) {
			__debugInfo = "2519:\ddgui.gbas";
			param10_ddgui_vals.attr15_kick_intern_dlg = 3;
			__debugInfo = "2520:\ddgui.gbas";
			param10_ddgui_vals.attr18_kick_intern_id_Str = param3_wdg.attr7_wid_Str;
			__debugInfo = "2519:\ddgui.gbas";
		};
		__debugInfo = "2522:\ddgui.gbas";
		return 0;
		__debugInfo = "2517:\ddgui.gbas";
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
window['func24_DDgui_button_list_picker'] = function(param1_x, param1_y, param1_w, param1_h, param9_texts_Str, param6_cursel) {
	stackPush("function: DDgui_button_list_picker", __debugInfo);
	try {
		var local2_tx_ref_1989 = [0], local2_ty_ref_1990 = [0], local8_numitems_1991 = 0, local8_vals_Str_1992 = new OTTArray(""), local7_screenx_ref_1993 = [0], local7_screeny_ref_1994 = [0];
		__debugInfo = "2530:\ddgui.gbas";
		GETFONTSIZE(local2_tx_ref_1989, local2_ty_ref_1990);
		__debugInfo = "2531:\ddgui.gbas";
		local2_tx_ref_1989[0] = MAX(unref(local2_tx_ref_1989[0]), global20_gDDguiScrollbarWidth);
		__debugInfo = "2532:\ddgui.gbas";
		local2_ty_ref_1990[0] = MAX(unref(local2_ty_ref_1990[0]), global25_gDDguiMinControlDimension);
		__debugInfo = "2536:\ddgui.gbas";
		SPLITSTR(param9_texts_Str, unref(local8_vals_Str_1992), "|", 1);
		__debugInfo = "2537:\ddgui.gbas";
		local8_numitems_1991 = BOUNDS(local8_vals_Str_1992, 0);
		__debugInfo = "2538:\ddgui.gbas";
		if ((((local8_numitems_1991) == (0)) ? 1 : 0)) {
			__debugInfo = "2538:\ddgui.gbas";
			return tryClone(-(1));
			__debugInfo = "2538:\ddgui.gbas";
		};
		__debugInfo = "2541:\ddgui.gbas";
		GETSCREENSIZE(local7_screenx_ref_1993, local7_screeny_ref_1994);
		__debugInfo = "2542:\ddgui.gbas";
		if ((((param1_h) > (((((local2_ty_ref_1990[0]) * (local8_numitems_1991))) + (8)))) ? 1 : 0)) {
			__debugInfo = "2542:\ddgui.gbas";
			param1_h = ((((local2_ty_ref_1990[0]) * (local8_numitems_1991))) + (8));
			__debugInfo = "2542:\ddgui.gbas";
		};
		__debugInfo = "2543:\ddgui.gbas";
		if ((((((param1_y) + (param1_h))) >= (local7_screeny_ref_1994[0])) ? 1 : 0)) {
			__debugInfo = "2543:\ddgui.gbas";
			param1_h = ((((local7_screeny_ref_1994[0]) - (param1_y))) - (1));
			__debugInfo = "2543:\ddgui.gbas";
		};
		__debugInfo = "2545:\ddgui.gbas";
		func16_DDgui_pushdialog(((param1_x) - (1)), ((param1_y) - (1)), ((param1_w) + (2)), ((param1_h) + (2)), 0);
		__debugInfo = "2547:\ddgui.gbas";
		func10_DDgui_list("lst", param9_texts_Str, ((param1_w) - (4)), param1_h);
		__debugInfo = "2548:\ddgui.gbas";
		func9_DDgui_set("lst", "SELECT", CAST2STRING(param6_cursel));
		__debugInfo = "2549:\ddgui.gbas";
		func9_DDgui_set("lst", "SCROLL", CAST2STRING(param6_cursel));
		__debugInfo = "2551:\ddgui.gbas";
		global17_buttonlist_retval = 0;
		__debugInfo = "2575:\ddgui.gbas";
		while (1) {
			var local2_mx_ref_1995 = [0], local2_my_ref_1996 = [0], local2_b1_ref_1997 = [0], local2_b2_ref_1998 = [0], local4_down_1999 = 0, local2_px_2000 = 0, local2_py_2001 = 0;
			__debugInfo = "2556:\ddgui.gbas";
			func10_DDgui_show(0);
			__debugInfo = "2557:\ddgui.gbas";
			MOUSESTATE(local2_mx_ref_1995, local2_my_ref_1996, local2_b1_ref_1997, local2_b2_ref_1998);
			__debugInfo = "2561:\ddgui.gbas";
			if (local2_b1_ref_1997[0]) {
				__debugInfo = "2559:\ddgui.gbas";
				local4_down_1999 = 1;
				__debugInfo = "2559:\ddgui.gbas";
				local2_px_2000 = local2_mx_ref_1995[0];
				__debugInfo = "2560:\ddgui.gbas";
				local2_py_2001 = local2_my_ref_1996[0];
				__debugInfo = "2559:\ddgui.gbas";
			};
			__debugInfo = "2567:\ddgui.gbas";
			if (((((((local2_b1_ref_1997[0]) == (0)) ? 1 : 0)) && (local4_down_1999)) ? 1 : 0)) {
				__debugInfo = "2566:\ddgui.gbas";
				if ((((BOXCOLL(~~(func9_DDgui_get("", "XPOS")), ~~(func9_DDgui_get("", "YPOS")), ~~(func9_DDgui_get("", "WIDTH")), ~~(func9_DDgui_get("", "HEIGHT")), local2_px_2000, local2_py_2001, 1, 1)) == (0)) ? 1 : 0)) {
					__debugInfo = "2564:\ddgui.gbas";
					func15_DDgui_popdialog();
					__debugInfo = "2565:\ddgui.gbas";
					return tryClone(-(1));
					__debugInfo = "2564:\ddgui.gbas";
				};
				__debugInfo = "2566:\ddgui.gbas";
			};
			__debugInfo = "2572:\ddgui.gbas";
			if (func9_DDgui_get("lst", "CLICKED")) {
				var local4_isel_2002 = 0;
				__debugInfo = "2569:\ddgui.gbas";
				local4_isel_2002 = ~~(func9_DDgui_get("lst", "SELECT"));
				__debugInfo = "2570:\ddgui.gbas";
				func15_DDgui_popdialog();
				__debugInfo = "2571:\ddgui.gbas";
				return tryClone(local4_isel_2002);
				__debugInfo = "2569:\ddgui.gbas";
			};
			__debugInfo = "2574:\ddgui.gbas";
			SHOWSCREEN();
			__debugInfo = "2556:\ddgui.gbas";
		};
		__debugInfo = "2576:\ddgui.gbas";
		return 0;
		__debugInfo = "2530:\ddgui.gbas";
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
window['func10_DDgui_list'] = function(param6_id_Str, param9_texts_Str, param5_width, param6_height) {
	stackPush("function: DDgui_list", __debugInfo);
	try {
		var local2_tx_ref_2007 = [0], local2_ty_ref_2008 = [0], local3_num_2009 = 0, local1_i_2010 = 0;
		__debugInfo = "2586:\ddgui.gbas";
		GETFONTSIZE(local2_tx_ref_2007, local2_ty_ref_2008);
		__debugInfo = "2587:\ddgui.gbas";
		local2_ty_ref_2008[0] = MAX(unref(local2_ty_ref_2008[0]), global25_gDDguiMinControlDimension);
		__debugInfo = "2589:\ddgui.gbas";
		local3_num_2009 = SPLITSTR(param9_texts_Str, unref(static7_DDgui_list_opt_Str), "|", 1);
		__debugInfo = "2590:\ddgui.gbas";
		if ((((local3_num_2009) == (0)) ? 1 : 0)) {
			__debugInfo = "2590:\ddgui.gbas";
			func9_DDgui_set(param6_id_Str, "SELECT", CAST2STRING(-(1)));
			__debugInfo = "2590:\ddgui.gbas";
		};
		__debugInfo = "2595:\ddgui.gbas";
		if ((((param6_height) == (0)) ? 1 : 0)) {
			__debugInfo = "2592:\ddgui.gbas";
			param6_height = ((((4) * (local2_ty_ref_2008[0]))) + (4));
			__debugInfo = "2592:\ddgui.gbas";
		} else {
			__debugInfo = "2594:\ddgui.gbas";
			param6_height = ((((param6_height) - (MOD(param6_height, unref(local2_ty_ref_2008[0]))))) + (4));
			__debugInfo = "2594:\ddgui.gbas";
		};
		__debugInfo = "2602:\ddgui.gbas";
		if ((((param5_width) == (0)) ? 1 : 0)) {
			__debugInfo = "2596:\ddgui.gbas";
			{
				__debugInfo = "2600:\ddgui.gbas";
				for (local1_i_2010 = 0;toCheck(local1_i_2010, ((local3_num_2009) - (1)), 1);local1_i_2010 += 1) {
					__debugInfo = "2598:\ddgui.gbas";
					local2_ty_ref_2008[0] = (static7_DDgui_list_opt_Str.arrAccess(local1_i_2010).values[tmpPositionCache]).length;
					__debugInfo = "2599:\ddgui.gbas";
					if ((((local2_ty_ref_2008[0]) > (param5_width)) ? 1 : 0)) {
						__debugInfo = "2599:\ddgui.gbas";
						param5_width = local2_ty_ref_2008[0];
						__debugInfo = "2599:\ddgui.gbas";
					};
					__debugInfo = "2598:\ddgui.gbas";
				};
				__debugInfo = "2600:\ddgui.gbas";
			};
			__debugInfo = "2601:\ddgui.gbas";
			param5_width = ((((param5_width) + (3))) * (local2_tx_ref_2007[0]));
			__debugInfo = "2596:\ddgui.gbas";
		};
		__debugInfo = "2603:\ddgui.gbas";
		func12_DDgui_widget(param6_id_Str, param9_texts_Str, param5_width, param6_height);
		__debugInfo = "2604:\ddgui.gbas";
		func9_DDgui_set(param6_id_Str, "TYPE", "LIST");
		__debugInfo = "2605:\ddgui.gbas";
		func9_DDgui_set(param6_id_Str, "COUNT", CAST2STRING(local3_num_2009));
		__debugInfo = "2606:\ddgui.gbas";
		global11_ddgui_stack_ref[0].arrAccess(-(1)).values[tmpPositionCache][0].attr7_widgets_ref[0].arrAccess(-(1)).values[tmpPositionCache][0].attr10_wscrollmax = local3_num_2009;
		__debugInfo = "2607:\ddgui.gbas";
		return 0;
		__debugInfo = "2586:\ddgui.gbas";
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
window['func14_DDgui_drawlist'] = function(param10_ddgui_vals, param3_wdg, param4_ytop) {
	stackPush("function: DDgui_drawlist", __debugInfo);
	try {
		var local2_c1_2015 = 0, local2_c2_2016 = 0, local7_txt_Str_2017 = "", local1_i_2018 = 0, local3_num_2019 = 0, local2_tx_ref_2020 = [0], local2_ty_ref_2021 = [0], local1_r_2022 = 0, local5_hover_2023 = 0, local5_check_2024 = 0, local6_offset_2025 = 0, local6_twidth_2027 = 0;
		__debugInfo = "2615:\ddgui.gbas";
		GETFONTSIZE(local2_tx_ref_2020, local2_ty_ref_2021);
		__debugInfo = "2616:\ddgui.gbas";
		local2_ty_ref_2021[0] = MAX(unref(local2_ty_ref_2021[0]), global25_gDDguiMinControlDimension);
		__debugInfo = "2617:\ddgui.gbas";
		local3_num_2019 = SPLITSTR(unref(param3_wdg.attr9_wtext_Str_ref[0]), unref(static7_DDgui_drawlist_opt_Str_ref[0]), "|", 1);
		__debugInfo = "2618:\ddgui.gbas";
		param3_wdg.attr6_wcount = local3_num_2019;
		__debugInfo = "2620:\ddgui.gbas";
		local6_twidth_2027 = ((param3_wdg.attr6_wwidth) - (8));
		__debugInfo = "2621:\ddgui.gbas";
		if (param3_wdg.attr10_wscrollmax) {
			__debugInfo = "2621:\ddgui.gbas";
			local6_twidth_2027+=-(MAX(unref(local2_tx_ref_2020[0]), global20_gDDguiScrollbarWidth));
			__debugInfo = "2621:\ddgui.gbas";
		};
		__debugInfo = "2625:\ddgui.gbas";
		local6_offset_2025 = param3_wdg.attr7_wscroll;
		__debugInfo = "2626:\ddgui.gbas";
		{
			__debugInfo = "2656:\ddgui.gbas";
			for (local1_i_2018 = local6_offset_2025;toCheck(local1_i_2018, ((local3_num_2019) - (1)), 1);local1_i_2018 += 1) {
				__debugInfo = "2628:\ddgui.gbas";
				local5_hover_2023 = 0;
				__debugInfo = "2629:\ddgui.gbas";
				local5_check_2024 = 0;
				__debugInfo = "2630:\ddgui.gbas";
				if ((((param3_wdg.attr7_wselect) == (local1_i_2018)) ? 1 : 0)) {
					__debugInfo = "2630:\ddgui.gbas";
					local5_check_2024 = 1;
					__debugInfo = "2630:\ddgui.gbas";
				};
				__debugInfo = "2631:\ddgui.gbas";
				if (((((((param3_wdg.attr6_whover) == (local1_i_2018)) ? 1 : 0)) && ((((param3_wdg.attr9_wreadonly) == (0)) ? 1 : 0))) ? 1 : 0)) {
					__debugInfo = "2631:\ddgui.gbas";
					local5_hover_2023 = 1;
					__debugInfo = "2631:\ddgui.gbas";
				};
				__debugInfo = "2648:\ddgui.gbas";
				if ((((local5_hover_2023) || (local5_check_2024)) ? 1 : 0)) {
					__debugInfo = "2633:\ddgui.gbas";
					local2_c1_2015 = param10_ddgui_vals.attr16_col_hover_bright;
					__debugInfo = "2634:\ddgui.gbas";
					local2_c2_2016 = param10_ddgui_vals.attr14_col_hover_norm;
					__debugInfo = "2639:\ddgui.gbas";
					if ((((local5_hover_2023) == (0)) ? 1 : 0)) {
						__debugInfo = "2636:\ddgui.gbas";
						local1_r_2022 = local2_c1_2015;
						__debugInfo = "2637:\ddgui.gbas";
						local2_c1_2015 = local2_c2_2016;
						__debugInfo = "2638:\ddgui.gbas";
						local2_c2_2016 = local1_r_2022;
						__debugInfo = "2636:\ddgui.gbas";
					};
					__debugInfo = "2644:\ddgui.gbas";
					if (local5_check_2024) {
						__debugInfo = "2641:\ddgui.gbas";
						func13_DDgui_backgnd(local2_c1_2015, local2_c2_2016, 0, ((param4_ytop) + (((((local1_i_2018) - (local6_offset_2025))) * (local2_ty_ref_2021[0])))), ((param3_wdg.attr6_wwidth) - (1)), ((local2_ty_ref_2021[0]) - (1)));
						__debugInfo = "2641:\ddgui.gbas";
					} else if (local5_hover_2023) {
						__debugInfo = "2643:\ddgui.gbas";
						func14_DDgui_backrect(1, ((param4_ytop) + (((((local1_i_2018) - (local6_offset_2025))) * (local2_ty_ref_2021[0])))), ((param3_wdg.attr6_wwidth) - (2)), ((local2_ty_ref_2021[0]) - (1)), local2_c1_2015);
						__debugInfo = "2643:\ddgui.gbas";
					};
					__debugInfo = "2633:\ddgui.gbas";
				} else {
					__debugInfo = "2646:\ddgui.gbas";
					local2_c1_2015 = param10_ddgui_vals.attr10_col_bright;
					__debugInfo = "2647:\ddgui.gbas";
					local2_c2_2016 = param10_ddgui_vals.attr8_col_norm;
					__debugInfo = "2646:\ddgui.gbas";
				};
				__debugInfo = "2655:\ddgui.gbas";
				if ((((INSTR(unref(static7_DDgui_drawlist_opt_Str_ref[0].arrAccess(local1_i_2018).values[tmpPositionCache][0]), "SPR_B", 0)) == (0)) ? 1 : 0)) {
					__debugInfo = "2651:\ddgui.gbas";
					local2_c1_2015 = INTEGER(FLOAT2STR(MID_Str(unref(static7_DDgui_drawlist_opt_Str_ref[0].arrAccess(local1_i_2018).values[tmpPositionCache][0]), 5, -(1))));
					__debugInfo = "2652:\ddgui.gbas";
					func23_DDgui_fit_sprite_in_box(local2_c1_2015, 5, ((((param4_ytop) + (((((local1_i_2018) - (local6_offset_2025))) * (local2_ty_ref_2021[0]))))) + (1)), ((local6_twidth_2027) - (2)), ((local2_ty_ref_2021[0]) - (2)));
					__debugInfo = "2651:\ddgui.gbas";
				} else {
					__debugInfo = "2654:\ddgui.gbas";
					func17_DDGui_PrintIntern(static7_DDgui_drawlist_opt_Str_ref[0].arrAccess(local1_i_2018).values[tmpPositionCache], 4, ((param4_ytop) + (((((local1_i_2018) - (local6_offset_2025))) * (local2_ty_ref_2021[0])))), local5_check_2024);
					__debugInfo = "2654:\ddgui.gbas";
				};
				__debugInfo = "2628:\ddgui.gbas";
			};
			__debugInfo = "2656:\ddgui.gbas";
		};
		__debugInfo = "2658:\ddgui.gbas";
		local2_c1_2015 = param10_ddgui_vals.attr8_col_norm;
		__debugInfo = "2659:\ddgui.gbas";
		func14_DDgui_backrect(0, param4_ytop, param3_wdg.attr6_wwidth, param3_wdg.attr7_wheight, local2_c1_2015);
		__debugInfo = "2662:\ddgui.gbas";
		func19_DDgui_drawscrollbar(param10_ddgui_vals, param3_wdg, param3_wdg.attr6_wwidth, param3_wdg.attr7_wheight, CAST2INT(((param3_wdg.attr7_wheight) / (local2_ty_ref_2021[0]))), param4_ytop);
		__debugInfo = "2663:\ddgui.gbas";
		return 0;
		__debugInfo = "2615:\ddgui.gbas";
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
window['func16_DDgui_handlelist'] = function(param10_ddgui_vals, param3_wdg, param2_mx, param2_my, param2_b1, param2_b2) {
	stackPush("function: DDgui_handlelist", __debugInfo);
	try {
		var local2_tx_ref_2034 = [0], local2_ty_ref_2035 = [0], local5_hover_2036 = 0, local5_width_2037 = 0, local6_height_2038 = 0, local2_sb_2039 = 0, local6_offset_2040 = 0, local6_oldsel_2041 = 0, local3_num_2042 = 0;
		__debugInfo = "2670:\ddgui.gbas";
		GETFONTSIZE(local2_tx_ref_2034, local2_ty_ref_2035);
		__debugInfo = "2671:\ddgui.gbas";
		local2_ty_ref_2035[0] = MAX(unref(local2_ty_ref_2035[0]), global25_gDDguiMinControlDimension);
		__debugInfo = "2672:\ddgui.gbas";
		local5_width_2037 = param3_wdg.attr6_wwidth;
		__debugInfo = "2673:\ddgui.gbas";
		local6_height_2038 = param3_wdg.attr7_wheight;
		__debugInfo = "2676:\ddgui.gbas";
		local3_num_2042 = param3_wdg.attr6_wcount;
		__debugInfo = "2677:\ddgui.gbas";
		param3_wdg.attr10_wscrollmax = ((local3_num_2042) - (INTEGER(CAST2INT(((local6_height_2038) / (local2_ty_ref_2035[0]))))));
		__debugInfo = "2679:\ddgui.gbas";
		local2_sb_2039 = func21_DDgui_handlescrollbar(param10_ddgui_vals, param3_wdg, param2_mx, param2_my, param2_b1, param2_b2, local6_height_2038);
		__debugInfo = "2680:\ddgui.gbas";
		local6_offset_2040 = param3_wdg.attr7_wscroll;
		__debugInfo = "2682:\ddgui.gbas";
		if (param3_wdg.attr9_wreadonly) {
			__debugInfo = "2682:\ddgui.gbas";
			return 0;
			__debugInfo = "2682:\ddgui.gbas";
		};
		__debugInfo = "2684:\ddgui.gbas";
		param3_wdg.attr8_wclicked = 0;
		__debugInfo = "2686:\ddgui.gbas";
		param3_wdg.attr6_whover = -(1);
		__debugInfo = "2700:\ddgui.gbas";
		if (((((((((((((param2_my) > (0)) ? 1 : 0)) && ((((param2_my) <= (local6_height_2038)) ? 1 : 0))) ? 1 : 0)) && ((((param2_mx) > (0)) ? 1 : 0))) ? 1 : 0)) && ((((param2_mx) < (((local5_width_2037) - (((local2_sb_2039) * (((local2_tx_ref_2034[0]) * (1.5)))))))) ? 1 : 0))) ? 1 : 0)) {
			__debugInfo = "2688:\ddgui.gbas";
			param2_my = ((INTEGER(CAST2INT(((param2_my) / (local2_ty_ref_2035[0]))))) + (local6_offset_2040));
			__debugInfo = "2698:\ddgui.gbas";
			if ((((param2_b1) == (1)) ? 1 : 0)) {
				__debugInfo = "2694:\ddgui.gbas";
				if ((((param2_my) >= (param3_wdg.attr6_wcount)) ? 1 : 0)) {
					__debugInfo = "2694:\ddgui.gbas";
					param2_my = -(1);
					__debugInfo = "2694:\ddgui.gbas";
				};
				__debugInfo = "2695:\ddgui.gbas";
				param3_wdg.attr7_wselect = param2_my;
				__debugInfo = "2696:\ddgui.gbas";
				param3_wdg.attr8_wclicked = 1;
				__debugInfo = "2694:\ddgui.gbas";
			};
			__debugInfo = "2699:\ddgui.gbas";
			param3_wdg.attr6_whover = param2_my;
			__debugInfo = "2688:\ddgui.gbas";
		};
		__debugInfo = "2701:\ddgui.gbas";
		return 0;
		__debugInfo = "2670:\ddgui.gbas";
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
window['func10_DDgui_text'] = function(param6_id_Str, param8_text_Str, param5_width, param6_height) {
	stackPush("function: DDgui_text", __debugInfo);
	try {
		__debugInfo = "2709:\ddgui.gbas";
		func12_DDgui_widget(param6_id_Str, param8_text_Str, param5_width, param6_height);
		__debugInfo = "2710:\ddgui.gbas";
		func9_DDgui_set(param6_id_Str, "TYPE", "TEXT");
		__debugInfo = "2711:\ddgui.gbas";
		return 0;
		__debugInfo = "2709:\ddgui.gbas";
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
window['func16_DDgui_singletext'] = function(param6_id_Str, param8_text_Str, param5_width) {
	stackPush("function: DDgui_singletext", __debugInfo);
	try {
		__debugInfo = "2714:\ddgui.gbas";
		func12_DDgui_widget(param6_id_Str, param8_text_Str, param5_width, 0);
		__debugInfo = "2715:\ddgui.gbas";
		func9_DDgui_set(param6_id_Str, "TYPE", "SINGLETEXT");
		__debugInfo = "2716:\ddgui.gbas";
		return 0;
		__debugInfo = "2714:\ddgui.gbas";
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
window['func16_DDgui_numbertext'] = function(param6_id_Str, param8_text_Str, param5_width) {
	stackPush("function: DDgui_numbertext", __debugInfo);
	try {
		__debugInfo = "2719:\ddgui.gbas";
		func12_DDgui_widget(param6_id_Str, param8_text_Str, param5_width, 0);
		__debugInfo = "2720:\ddgui.gbas";
		func9_DDgui_set(param6_id_Str, "TYPE", "NUMBERTEXT");
		__debugInfo = "2721:\ddgui.gbas";
		return 0;
		__debugInfo = "2719:\ddgui.gbas";
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
window['func14_DDgui_drawtext'] = function(param10_ddgui_vals, param3_wdg, param4_ytop, param11_bSingleText) {
	stackPush("function: DDgui_drawtext", __debugInfo);
	try {
		var local2_tx_ref_2057 = [0], local2_ty_ref_2058 = [0], local2_c1_2059 = 0, local2_c2_2060 = 0, local6_twidth_2061 = 0;
		__debugInfo = "2727:\ddgui.gbas";
		GETFONTSIZE(local2_tx_ref_2057, local2_ty_ref_2058);
		__debugInfo = "2728:\ddgui.gbas";
		local2_c1_2059 = param10_ddgui_vals.attr10_col_bright;
		__debugInfo = "2729:\ddgui.gbas";
		local2_c2_2060 = param10_ddgui_vals.attr8_col_norm;
		__debugInfo = "2731:\ddgui.gbas";
		local6_twidth_2061 = ((param3_wdg.attr6_wwidth) - (local2_tx_ref_2057[0]));
		__debugInfo = "2732:\ddgui.gbas";
		if (param3_wdg.attr10_wscrollmax) {
			__debugInfo = "2732:\ddgui.gbas";
			local6_twidth_2061 = ((local6_twidth_2061) - (MAX(unref(local2_tx_ref_2057[0]), global20_gDDguiScrollbarWidth)));
			__debugInfo = "2732:\ddgui.gbas";
		};
		__debugInfo = "2736:\ddgui.gbas";
		if (param3_wdg.attr9_wreadonly) {
			__debugInfo = "2735:\ddgui.gbas";
			func13_DDgui_backgnd(local2_c2_2060, local2_c2_2060, 1, ((param4_ytop) + (1)), ((param3_wdg.attr6_wwidth) - (2)), ((param3_wdg.attr7_wheight) - (2)));
			__debugInfo = "2735:\ddgui.gbas";
		};
		__debugInfo = "2742:\ddgui.gbas";
		if (param11_bSingleText) {
			__debugInfo = "2739:\ddgui.gbas";
			func14_DDgui_boxprint(param10_ddgui_vals, param3_wdg, CAST2INT(((local2_tx_ref_2057[0]) / (2))), ((param4_ytop) + (CAST2INT(((((param3_wdg.attr7_wheight) - (local2_ty_ref_2058[0]))) / (2))))), local6_twidth_2061, 1, 0);
			__debugInfo = "2739:\ddgui.gbas";
		} else {
			__debugInfo = "2741:\ddgui.gbas";
			func14_DDgui_boxprint(param10_ddgui_vals, param3_wdg, CAST2INT(((local2_tx_ref_2057[0]) / (2))), ((param4_ytop) - (((param3_wdg.attr7_wscroll) * (local2_ty_ref_2058[0])))), local6_twidth_2061, 1, 0);
			__debugInfo = "2741:\ddgui.gbas";
		};
		__debugInfo = "2743:\ddgui.gbas";
		func19_DDgui_drawscrollbar(param10_ddgui_vals, param3_wdg, param3_wdg.attr6_wwidth, param3_wdg.attr7_wheight, CAST2INT(((param3_wdg.attr7_wheight) / (local2_ty_ref_2058[0]))), param4_ytop);
		__debugInfo = "2744:\ddgui.gbas";
		func14_DDgui_backrect(0, param4_ytop, param3_wdg.attr6_wwidth, param3_wdg.attr7_wheight, local2_c2_2060);
		__debugInfo = "2745:\ddgui.gbas";
		return 0;
		__debugInfo = "2727:\ddgui.gbas";
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
window['func16_ddgui_handletext'] = function(param10_ddgui_vals, param3_wdg, param2_mx, param2_my, param2_b1, param2_b2, param11_bSingleText, param9_bIsNumber) {
	stackPush("function: ddgui_handletext", __debugInfo);
	try {
		var local6_height_2070 = 0, local5_width_2071 = 0, local2_tx_ref_2072 = [0], local2_ty_ref_2073 = [0], local8_text_Str_2074 = "", local8_txheight_2075 = 0, local7_txwidth_2076 = 0, local9_has_focus_2077 = 0, local5_a_Str_2078 = "", local5_l_Str_2079 = "", local5_r_Str_2080 = "", local2_sb_2081 = 0, local8_selstart_2082 = 0, local6_selend_2083 = 0, local3_del_2084 = 0, local6_backsp_2085 = 0, local4_xkey_2086 = 0, local4_ykey_2087 = 0, local3_tab_2088 = 0, local7_lastkey_2089 = 0, local5_shift_2090 = 0, local6_offset_2091 = 0, local7_keycopy_2092 = 0, local8_keypaste_2093 = 0, local8_readonly_2094 = 0;
		__debugInfo = "2754:\ddgui.gbas";
		local8_readonly_2094 = param3_wdg.attr9_wreadonly;
		__debugInfo = "2757:\ddgui.gbas";
		GETFONTSIZE(local2_tx_ref_2072, local2_ty_ref_2073);
		__debugInfo = "2758:\ddgui.gbas";
		local8_text_Str_2074 = param3_wdg.attr9_wtext_Str_ref[0];
		__debugInfo = "2759:\ddgui.gbas";
		local5_width_2071 = param3_wdg.attr6_wwidth;
		__debugInfo = "2760:\ddgui.gbas";
		local6_offset_2091 = ((param3_wdg.attr7_wscroll) * (local2_ty_ref_2073[0]));
		__debugInfo = "2761:\ddgui.gbas";
		local7_txwidth_2076 = ((local5_width_2071) - (local2_tx_ref_2072[0]));
		__debugInfo = "2766:\ddgui.gbas";
		if (param11_bSingleText) {
			__debugInfo = "2765:\ddgui.gbas";
			if (((((((param2_my) > (0)) ? 1 : 0)) && ((((param2_my) < (local6_height_2070)) ? 1 : 0))) ? 1 : 0)) {
				__debugInfo = "2765:\ddgui.gbas";
				param2_my = 1;
				__debugInfo = "2765:\ddgui.gbas";
			};
			__debugInfo = "2765:\ddgui.gbas";
		};
		__debugInfo = "2768:\ddgui.gbas";
		if (param3_wdg.attr10_wscrollmax) {
			__debugInfo = "2768:\ddgui.gbas";
			local7_txwidth_2076 = ((local7_txwidth_2076) - (MAX(unref(local2_tx_ref_2072[0]), global20_gDDguiScrollbarWidth)));
			__debugInfo = "2768:\ddgui.gbas";
		};
		__debugInfo = "2769:\ddgui.gbas";
		local6_height_2070 = param3_wdg.attr7_wheight;
		__debugInfo = "2770:\ddgui.gbas";
		local8_txheight_2075 = func14_DDgui_boxprint(param10_ddgui_vals, param3_wdg, 0, 0, local7_txwidth_2076, 0, 0);
		__debugInfo = "2773:\ddgui.gbas";
		param3_wdg.attr10_wscrollmax = MAX(0, CAST2INT(((((local8_txheight_2075) - (local6_height_2070))) / (local2_ty_ref_2073[0]))));
		__debugInfo = "2774:\ddgui.gbas";
		if (param3_wdg.attr10_wscrollmax) {
			__debugInfo = "2774:\ddgui.gbas";
			param3_wdg.attr10_wscrollmax+=1;
			__debugInfo = "2774:\ddgui.gbas";
		};
		__debugInfo = "2775:\ddgui.gbas";
		local2_sb_2081 = func21_DDgui_handlescrollbar(param10_ddgui_vals, param3_wdg, param2_mx, param2_my, param2_b1, param2_b2, local6_height_2070);
		__debugInfo = "2802:\ddgui.gbas";
		if (((((((((((((param2_mx) >= (0)) ? 1 : 0)) && ((((param2_mx) < (((local5_width_2071) - (((local2_sb_2081) * (((local2_tx_ref_2072[0]) * (1.5)))))))) ? 1 : 0))) ? 1 : 0)) && ((((param2_my) >= (0)) ? 1 : 0))) ? 1 : 0)) && ((((param2_my) < (local6_height_2070)) ? 1 : 0))) ? 1 : 0)) {
			__debugInfo = "2799:\ddgui.gbas";
			if (((((((param2_b1) == (1)) ? 1 : 0)) && ((((param10_ddgui_vals.attr9_focus_Str) != (param3_wdg.attr7_wid_Str)) ? 1 : 0))) ? 1 : 0)) {
				__debugInfo = "2781:\ddgui.gbas";
				func14_DDgui_setfocus(param3_wdg.attr7_wid_Str);
				__debugInfo = "2788:\ddgui.gbas";
				if (((((((((((((param2_b1) == (1)) ? 1 : 0)) && ((((local8_readonly_2094) == (0)) ? 1 : 0))) ? 1 : 0)) && ((((global18_DDGUI_IN_INPUT_DLG) == (0)) ? 1 : 0))) ? 1 : 0)) && (global20_DDGUI_AUTO_INPUT_DLG)) ? 1 : 0)) {
					__debugInfo = "2785:\ddgui.gbas";
					param10_ddgui_vals.attr15_kick_intern_dlg = 2;
					__debugInfo = "2786:\ddgui.gbas";
					param10_ddgui_vals.attr18_kick_intern_id_Str = param3_wdg.attr7_wid_Str;
					__debugInfo = "2787:\ddgui.gbas";
					func14_DDgui_setfocus("");
					__debugInfo = "2785:\ddgui.gbas";
				};
				__debugInfo = "2781:\ddgui.gbas";
			} else {
				__debugInfo = "2790:\ddgui.gbas";
				if (((((((param2_b1) == (0)) ? 1 : 0)) && (MOUSEAXIS(3))) ? 1 : 0)) {
					__debugInfo = "2790:\ddgui.gbas";
					param2_b1 = 1;
					__debugInfo = "2790:\ddgui.gbas";
				};
				__debugInfo = "2791:\ddgui.gbas";
				if ((((param2_b1) != (0)) ? 1 : 0)) {
					__debugInfo = "2791:\ddgui.gbas";
					local2_tx_ref_2072[0] = func14_DDgui_boxprint(param10_ddgui_vals, param3_wdg, param2_mx, ((param2_my) + (local6_offset_2091)), local7_txwidth_2076, 0, 1);
					__debugInfo = "2791:\ddgui.gbas";
				};
				__debugInfo = "2795:\ddgui.gbas";
				if ((((param2_b1) == (-(1))) ? 1 : 0)) {
					__debugInfo = "2793:\ddgui.gbas";
					param3_wdg.attr9_wselstart = local2_tx_ref_2072[0];
					__debugInfo = "2794:\ddgui.gbas";
					param2_b1 = 1;
					__debugInfo = "2793:\ddgui.gbas";
				};
				__debugInfo = "2797:\ddgui.gbas";
				if ((((param2_b1) == (1)) ? 1 : 0)) {
					__debugInfo = "2797:\ddgui.gbas";
					param3_wdg.attr7_wselend = local2_tx_ref_2072[0];
					__debugInfo = "2797:\ddgui.gbas";
				};
				__debugInfo = "2790:\ddgui.gbas";
			};
			__debugInfo = "2799:\ddgui.gbas";
		};
		__debugInfo = "2803:\ddgui.gbas";
		if ((((param10_ddgui_vals.attr9_focus_Str) == (param3_wdg.attr7_wid_Str)) ? 1 : 0)) {
			__debugInfo = "2803:\ddgui.gbas";
			local9_has_focus_2077 = 1;
			__debugInfo = "2803:\ddgui.gbas";
		};
		__debugInfo = "2974:\ddgui.gbas";
		if (local9_has_focus_2077) {
			__debugInfo = "2807:\ddgui.gbas";
			local7_lastkey_2089 = static11_ddgui_handletext_st_lasttime;
			__debugInfo = "2812:\ddgui.gbas";
			if ((((((GETTIMERALL()) - (local7_lastkey_2089))) > (150)) ? 1 : 0)) {
				__debugInfo = "2809:\ddgui.gbas";
				local7_lastkey_2089 = 0;
				__debugInfo = "2809:\ddgui.gbas";
			} else {
				__debugInfo = "2811:\ddgui.gbas";
				local7_lastkey_2089 = static10_ddgui_handletext_st_lastkey;
				__debugInfo = "2811:\ddgui.gbas";
			};
			__debugInfo = "2814:\ddgui.gbas";
			local5_a_Str_2078 = param10_ddgui_vals.attr13_dlg_inkey_Str;
			__debugInfo = "2822:\ddgui.gbas";
			if ((local5_a_Str_2078).length) {
				__debugInfo = "2816:\ddgui.gbas";
				local7_lastkey_2089 = 0;
				__debugInfo = "2817:\ddgui.gbas";
				param10_ddgui_vals.attr13_dlg_inkey_Str = "";
				__debugInfo = "2818:\ddgui.gbas";
				DEBUG((((("ddgui_inpkey: ") + (local5_a_Str_2078))) + ("\n")));
				__debugInfo = "2816:\ddgui.gbas";
			} else {
				__debugInfo = "2820:\ddgui.gbas";
				local5_a_Str_2078 = INKEY_Str();
				__debugInfo = "2821:\ddgui.gbas";
				if ((local5_a_Str_2078).length) {
					__debugInfo = "2821:\ddgui.gbas";
					DEBUG((((("INKEY: ") + (local5_a_Str_2078))) + ("\n")));
					__debugInfo = "2821:\ddgui.gbas";
				};
				__debugInfo = "2820:\ddgui.gbas";
			};
			__debugInfo = "2824:\ddgui.gbas";
			if ((((local5_a_Str_2078) == ("\t")) ? 1 : 0)) {
				__debugInfo = "2824:\ddgui.gbas";
				local5_a_Str_2078 = "";
				__debugInfo = "2824:\ddgui.gbas";
			};
			__debugInfo = "2829:\ddgui.gbas";
			if ((((local5_a_Str_2078) == ("\b")) ? 1 : 0)) {
				__debugInfo = "2827:\ddgui.gbas";
				local5_a_Str_2078 = "";
				__debugInfo = "2828:\ddgui.gbas";
				local6_backsp_2085 = 1;
				__debugInfo = "2827:\ddgui.gbas";
			};
			__debugInfo = "2871:\ddgui.gbas";
			if (((((((local7_lastkey_2089) == (0)) ? 1 : 0)) || ((((KEY(local7_lastkey_2089)) == (0)) ? 1 : 0))) ? 1 : 0)) {
				__debugInfo = "2832:\ddgui.gbas";
				local7_lastkey_2089 = 0;
				__debugInfo = "2833:\ddgui.gbas";
				local4_ykey_2087 = ((KEY(208)) - (KEY(200)));
				__debugInfo = "2834:\ddgui.gbas";
				local4_xkey_2086 = ((KEY(205)) - (KEY(203)));
				__debugInfo = "2835:\ddgui.gbas";
				local3_del_2084 = KEY(211);
				__debugInfo = "2836:\ddgui.gbas";
				local3_tab_2088 = KEY(15);
				__debugInfo = "2837:\ddgui.gbas";
				local6_backsp_2085 = (((local6_backsp_2085) || (KEY(14))) ? 1 : 0);
				__debugInfo = "2838:\ddgui.gbas";
				local5_shift_2090 = (((KEY(42)) || (KEY(54))) ? 1 : 0);
				__debugInfo = "2839:\ddgui.gbas";
				local7_keycopy_2092 = (((KEY(29)) && (KEY(46))) ? 1 : 0);
				__debugInfo = "2840:\ddgui.gbas";
				local8_keypaste_2093 = (((KEY(29)) && (KEY(47))) ? 1 : 0);
				__debugInfo = "2842:\ddgui.gbas";
				if ((((local4_ykey_2087) > (0)) ? 1 : 0)) {
					__debugInfo = "2842:\ddgui.gbas";
					local7_lastkey_2089 = 208;
					__debugInfo = "2842:\ddgui.gbas";
				};
				__debugInfo = "2843:\ddgui.gbas";
				if ((((local4_ykey_2087) < (0)) ? 1 : 0)) {
					__debugInfo = "2843:\ddgui.gbas";
					local7_lastkey_2089 = 200;
					__debugInfo = "2843:\ddgui.gbas";
				};
				__debugInfo = "2844:\ddgui.gbas";
				if ((((local4_xkey_2086) < (0)) ? 1 : 0)) {
					__debugInfo = "2844:\ddgui.gbas";
					local7_lastkey_2089 = 203;
					__debugInfo = "2844:\ddgui.gbas";
				};
				__debugInfo = "2845:\ddgui.gbas";
				if ((((local4_xkey_2086) > (0)) ? 1 : 0)) {
					__debugInfo = "2845:\ddgui.gbas";
					local7_lastkey_2089 = 205;
					__debugInfo = "2845:\ddgui.gbas";
				};
				__debugInfo = "2846:\ddgui.gbas";
				if (local3_del_2084) {
					__debugInfo = "2846:\ddgui.gbas";
					local7_lastkey_2089 = 211;
					__debugInfo = "2846:\ddgui.gbas";
				};
				__debugInfo = "2847:\ddgui.gbas";
				if (local3_tab_2088) {
					__debugInfo = "2846:\ddgui.gbas";
					local7_lastkey_2089 = 15;
					__debugInfo = "2846:\ddgui.gbas";
					local5_a_Str_2078 = " ";
					__debugInfo = "2846:\ddgui.gbas";
				};
				__debugInfo = "2848:\ddgui.gbas";
				if (local6_backsp_2085) {
					__debugInfo = "2848:\ddgui.gbas";
					local7_lastkey_2089 = 14;
					__debugInfo = "2848:\ddgui.gbas";
				};
				__debugInfo = "2849:\ddgui.gbas";
				if (local7_keycopy_2092) {
					__debugInfo = "2849:\ddgui.gbas";
					local7_lastkey_2089 = 29;
					__debugInfo = "2849:\ddgui.gbas";
				};
				__debugInfo = "2850:\ddgui.gbas";
				if (local8_keypaste_2093) {
					__debugInfo = "2850:\ddgui.gbas";
					local7_lastkey_2089 = 29;
					__debugInfo = "2850:\ddgui.gbas";
				};
				__debugInfo = "2859:\ddgui.gbas";
				if (KEY(199)) {
					__debugInfo = "2853:\ddgui.gbas";
					local7_lastkey_2089 = 199;
					__debugInfo = "2854:\ddgui.gbas";
					param3_wdg.attr7_wcaretx = 0;
					__debugInfo = "2858:\ddgui.gbas";
					if (((param11_bSingleText) ? 0 : 1)) {
						__debugInfo = "2856:\ddgui.gbas";
						param3_wdg.attr7_wcarety+=local2_ty_ref_2073[0];
						__debugInfo = "2857:\ddgui.gbas";
						local4_ykey_2087 = -(1);
						__debugInfo = "2856:\ddgui.gbas";
					};
					__debugInfo = "2853:\ddgui.gbas";
				};
				__debugInfo = "2867:\ddgui.gbas";
				if (KEY(207)) {
					__debugInfo = "2861:\ddgui.gbas";
					local7_lastkey_2089 = 207;
					__debugInfo = "2862:\ddgui.gbas";
					param3_wdg.attr7_wcaretx = param3_wdg.attr6_wwidth;
					__debugInfo = "2866:\ddgui.gbas";
					if (((param11_bSingleText) ? 0 : 1)) {
						__debugInfo = "2864:\ddgui.gbas";
						param3_wdg.attr7_wcarety+=local2_ty_ref_2073[0];
						__debugInfo = "2865:\ddgui.gbas";
						local4_ykey_2087 = -(1);
						__debugInfo = "2864:\ddgui.gbas";
					};
					__debugInfo = "2861:\ddgui.gbas";
				};
				__debugInfo = "2869:\ddgui.gbas";
				static10_ddgui_handletext_st_lastkey = local7_lastkey_2089;
				__debugInfo = "2870:\ddgui.gbas";
				static11_ddgui_handletext_st_lasttime = ~~(GETTIMERALL());
				__debugInfo = "2832:\ddgui.gbas";
			};
			__debugInfo = "2881:\ddgui.gbas";
			if ((((local8_readonly_2094) == (1)) ? 1 : 0)) {
				__debugInfo = "2876:\ddgui.gbas";
				local5_a_Str_2078 = "";
				__debugInfo = "2877:\ddgui.gbas";
				local3_del_2084 = 0;
				__debugInfo = "2878:\ddgui.gbas";
				local3_tab_2088 = 0;
				__debugInfo = "2879:\ddgui.gbas";
				local6_backsp_2085 = 0;
				__debugInfo = "2880:\ddgui.gbas";
				local8_keypaste_2093 = 0;
				__debugInfo = "2876:\ddgui.gbas";
			};
			__debugInfo = "2895:\ddgui.gbas";
			if (param11_bSingleText) {
				__debugInfo = "2884:\ddgui.gbas";
				local4_ykey_2087 = 0;
				__debugInfo = "2885:\ddgui.gbas";
				if ((((local5_a_Str_2078) == ("\n")) ? 1 : 0)) {
					__debugInfo = "2885:\ddgui.gbas";
					local5_a_Str_2078 = "";
					__debugInfo = "2885:\ddgui.gbas";
				};
				__debugInfo = "2886:\ddgui.gbas";
				if ((((local5_a_Str_2078) == ("\r")) ? 1 : 0)) {
					__debugInfo = "2886:\ddgui.gbas";
					local5_a_Str_2078 = "";
					__debugInfo = "2886:\ddgui.gbas";
				};
				__debugInfo = "2894:\ddgui.gbas";
				if (local3_tab_2088) {
					__debugInfo = "2892:\ddgui.gbas";
					if (local5_shift_2090) {
						__debugInfo = "2889:\ddgui.gbas";
						func18_DDgui_advancefocus(-(1));
						__debugInfo = "2889:\ddgui.gbas";
					} else {
						__debugInfo = "2891:\ddgui.gbas";
						func18_DDgui_advancefocus(1);
						__debugInfo = "2891:\ddgui.gbas";
					};
					__debugInfo = "2893:\ddgui.gbas";
					return 0;
					__debugInfo = "2892:\ddgui.gbas";
				};
				__debugInfo = "2884:\ddgui.gbas";
			};
			__debugInfo = "2903:\ddgui.gbas";
			if (param9_bIsNumber) {
				__debugInfo = "2902:\ddgui.gbas";
				if (((((((((((((((strcmp((local5_a_Str_2078), ("0"))  >= 0 ) ? 1 : 0)) && (((strcmp((local5_a_Str_2078), ("9"))  <= 0 ) ? 1 : 0))) ? 1 : 0)) || ((((local5_a_Str_2078) == (".")) ? 1 : 0))) ? 1 : 0)) || ((((local5_a_Str_2078) == ("e")) ? 1 : 0))) ? 1 : 0)) || ((((local5_a_Str_2078) == ("-")) ? 1 : 0))) ? 1 : 0)) {
					
				} else {
					__debugInfo = "2901:\ddgui.gbas";
					local5_a_Str_2078 = "";
					__debugInfo = "2901:\ddgui.gbas";
				};
				__debugInfo = "2902:\ddgui.gbas";
			};
			__debugInfo = "2973:\ddgui.gbas";
			if ((((((((((((((((local5_a_Str_2078) != ("")) ? 1 : 0)) || (local3_del_2084)) ? 1 : 0)) || (local6_backsp_2085)) ? 1 : 0)) || (local4_xkey_2086)) ? 1 : 0)) || (local4_ykey_2087)) ? 1 : 0)) {
				__debugInfo = "2906:\ddgui.gbas";
				local8_selstart_2082 = param3_wdg.attr9_wselstart;
				__debugInfo = "2907:\ddgui.gbas";
				local6_selend_2083 = param3_wdg.attr7_wselend;
				__debugInfo = "2967:\ddgui.gbas";
				if ((((local5_shift_2090) && ((((local4_xkey_2086) || (local4_ykey_2087)) ? 1 : 0))) ? 1 : 0)) {
					__debugInfo = "2910:\ddgui.gbas";
					local6_selend_2083+=local4_xkey_2086;
					__debugInfo = "2914:\ddgui.gbas";
					if (local4_ykey_2087) {
						__debugInfo = "2913:\ddgui.gbas";
						local6_selend_2083 = func14_DDgui_boxprint(param10_ddgui_vals, param3_wdg, param3_wdg.attr7_wcaretx, ((param3_wdg.attr7_wcarety) + (((local4_ykey_2087) * (local2_ty_ref_2073[0])))), local7_txwidth_2076, 0, 1);
						__debugInfo = "2913:\ddgui.gbas";
					};
					__debugInfo = "2916:\ddgui.gbas";
					if ((((local6_selend_2083) < (0)) ? 1 : 0)) {
						__debugInfo = "2916:\ddgui.gbas";
						local6_selend_2083 = 0;
						__debugInfo = "2916:\ddgui.gbas";
					};
					__debugInfo = "2917:\ddgui.gbas";
					if ((((local6_selend_2083) > ((local8_text_Str_2074).length)) ? 1 : 0)) {
						__debugInfo = "2917:\ddgui.gbas";
						local6_selend_2083 = (local8_text_Str_2074).length;
						__debugInfo = "2917:\ddgui.gbas";
					};
					__debugInfo = "2919:\ddgui.gbas";
					param3_wdg.attr7_wselend = local6_selend_2083;
					__debugInfo = "2910:\ddgui.gbas";
				} else {
					__debugInfo = "2934:\ddgui.gbas";
					if (((((((local8_selstart_2082) != (local6_selend_2083)) ? 1 : 0)) && (((((((local3_del_2084) || (local6_backsp_2085)) ? 1 : 0)) || ((((local5_a_Str_2078) != ("")) ? 1 : 0))) ? 1 : 0))) ? 1 : 0)) {
						__debugInfo = "2927:\ddgui.gbas";
						if ((((local8_selstart_2082) > (local6_selend_2083)) ? 1 : 0)) {
							__debugInfo = "2924:\ddgui.gbas";
							local2_tx_ref_2072[0] = local8_selstart_2082;
							__debugInfo = "2925:\ddgui.gbas";
							local8_selstart_2082 = local6_selend_2083;
							__debugInfo = "2926:\ddgui.gbas";
							local6_selend_2083 = local2_tx_ref_2072[0];
							__debugInfo = "2924:\ddgui.gbas";
						};
						__debugInfo = "2928:\ddgui.gbas";
						local5_l_Str_2079 = MID_Str(local8_text_Str_2074, 0, local8_selstart_2082);
						__debugInfo = "2929:\ddgui.gbas";
						local5_r_Str_2080 = MID_Str(local8_text_Str_2074, local6_selend_2083, -(1));
						__debugInfo = "2930:\ddgui.gbas";
						local8_text_Str_2074 = ((local5_l_Str_2079) + (local5_r_Str_2080));
						__debugInfo = "2932:\ddgui.gbas";
						if (local3_del_2084) {
							__debugInfo = "2932:\ddgui.gbas";
							local3_del_2084 = 0;
							__debugInfo = "2932:\ddgui.gbas";
						};
						__debugInfo = "2933:\ddgui.gbas";
						if (local6_backsp_2085) {
							__debugInfo = "2933:\ddgui.gbas";
							local6_backsp_2085 = 0;
							__debugInfo = "2933:\ddgui.gbas";
						};
						__debugInfo = "2927:\ddgui.gbas";
					};
					__debugInfo = "2937:\ddgui.gbas";
					local5_l_Str_2079 = MID_Str(local8_text_Str_2074, 0, local8_selstart_2082);
					__debugInfo = "2938:\ddgui.gbas";
					local5_r_Str_2080 = MID_Str(local8_text_Str_2074, local8_selstart_2082, -(1));
					__debugInfo = "2941:\ddgui.gbas";
					local8_selstart_2082+=local4_xkey_2086;
					__debugInfo = "2945:\ddgui.gbas";
					if (local4_ykey_2087) {
						__debugInfo = "2944:\ddgui.gbas";
						local8_selstart_2082 = func14_DDgui_boxprint(param10_ddgui_vals, param3_wdg, param3_wdg.attr7_wcaretx, ((param3_wdg.attr7_wcarety) + (((local4_ykey_2087) * (local2_ty_ref_2073[0])))), local7_txwidth_2076, 0, 1);
						__debugInfo = "2944:\ddgui.gbas";
					};
					__debugInfo = "2948:\ddgui.gbas";
					if (local3_del_2084) {
						__debugInfo = "2948:\ddgui.gbas";
						local5_r_Str_2080 = MID_Str(local5_r_Str_2080, 1, -(1));
						__debugInfo = "2948:\ddgui.gbas";
					};
					__debugInfo = "2954:\ddgui.gbas";
					if (local6_backsp_2085) {
						__debugInfo = "2952:\ddgui.gbas";
						local5_l_Str_2079 = LEFT_Str(local5_l_Str_2079, (((local5_l_Str_2079).length) - (1)));
						__debugInfo = "2953:\ddgui.gbas";
						local8_selstart_2082+=-(1);
						__debugInfo = "2952:\ddgui.gbas";
					};
					__debugInfo = "2959:\ddgui.gbas";
					if ((((local5_a_Str_2078) != ("")) ? 1 : 0)) {
						__debugInfo = "2957:\ddgui.gbas";
						local5_l_Str_2079 = ((local5_l_Str_2079) + (local5_a_Str_2078));
						__debugInfo = "2958:\ddgui.gbas";
						local8_selstart_2082+=1;
						__debugInfo = "2957:\ddgui.gbas";
					};
					__debugInfo = "2960:\ddgui.gbas";
					local8_text_Str_2074 = ((local5_l_Str_2079) + (local5_r_Str_2080));
					__debugInfo = "2962:\ddgui.gbas";
					if ((((local8_selstart_2082) < (0)) ? 1 : 0)) {
						__debugInfo = "2962:\ddgui.gbas";
						local8_selstart_2082 = 0;
						__debugInfo = "2962:\ddgui.gbas";
					};
					__debugInfo = "2963:\ddgui.gbas";
					if ((((local8_selstart_2082) > ((local8_text_Str_2074).length)) ? 1 : 0)) {
						__debugInfo = "2963:\ddgui.gbas";
						local8_selstart_2082 = (local8_text_Str_2074).length;
						__debugInfo = "2963:\ddgui.gbas";
					};
					__debugInfo = "2964:\ddgui.gbas";
					param3_wdg.attr9_wselstart = local8_selstart_2082;
					__debugInfo = "2965:\ddgui.gbas";
					param3_wdg.attr7_wselend = local8_selstart_2082;
					__debugInfo = "2966:\ddgui.gbas";
					param3_wdg.attr9_wtext_Str_ref[0] = local8_text_Str_2074;
					__debugInfo = "2934:\ddgui.gbas";
				};
				__debugInfo = "2970:\ddgui.gbas";
				if (((((((((param3_wdg.attr7_wcarety) + (local2_ty_ref_2073[0]))) > (((((param3_wdg.attr7_wscroll) * (local2_ty_ref_2073[0]))) + (param3_wdg.attr7_wheight)))) ? 1 : 0)) && ((((param3_wdg.attr7_wscroll) < (param3_wdg.attr10_wscrollmax)) ? 1 : 0))) ? 1 : 0)) {
					__debugInfo = "2970:\ddgui.gbas";
					param3_wdg.attr7_wscroll+=1;
					__debugInfo = "2970:\ddgui.gbas";
				};
				__debugInfo = "2971:\ddgui.gbas";
				if (((((((((param3_wdg.attr7_wcarety) - (local2_ty_ref_2073[0]))) < (((param3_wdg.attr7_wscroll) * (local2_ty_ref_2073[0])))) ? 1 : 0)) && ((((param3_wdg.attr7_wscroll) > (0)) ? 1 : 0))) ? 1 : 0)) {
					__debugInfo = "2971:\ddgui.gbas";
					param3_wdg.attr7_wscroll+=-1;
					__debugInfo = "2971:\ddgui.gbas";
				};
				__debugInfo = "2906:\ddgui.gbas";
			};
			__debugInfo = "2807:\ddgui.gbas";
		};
		__debugInfo = "2975:\ddgui.gbas";
		return 0;
		__debugInfo = "2754:\ddgui.gbas";
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
window['func9_DDgui_tab'] = function(param6_id_Str, param12_captions_Str, param6_height) {
	stackPush("function: DDgui_tab", __debugInfo);
	try {
		var local3_num_2100 = 0, local2_fx_ref_2101 = [0], local2_fy_ref_2102 = [0];
		__debugInfo = "2985:\ddgui.gbas";
		GETFONTSIZE(local2_fx_ref_2101, local2_fy_ref_2102);
		__debugInfo = "2994:\ddgui.gbas";
		if ((((param6_height) == (0)) ? 1 : 0)) {
			__debugInfo = "2994:\ddgui.gbas";
			param6_height = ((local2_fy_ref_2102[0]) + (7));
			__debugInfo = "2994:\ddgui.gbas";
		};
		__debugInfo = "2996:\ddgui.gbas";
		func12_DDgui_widget(param6_id_Str, param12_captions_Str, 10000, param6_height);
		__debugInfo = "2998:\ddgui.gbas";
		func9_DDgui_set(param6_id_Str, "TYPE", "TAB");
		__debugInfo = "2999:\ddgui.gbas";
		global11_ddgui_stack_ref[0].arrAccess(~~(0.1)).values[tmpPositionCache][0].attr7_widgets_ref[0].arrAccess(-(1)).values[tmpPositionCache][0].attr7_wselect = -(1);
		__debugInfo = "3001:\ddgui.gbas";
		return 0;
		__debugInfo = "2985:\ddgui.gbas";
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
window['func13_DDgui_drawtab'] = function(param10_ddgui_vals, param3_wdg, param4_ytop) {
	stackPush("function: DDgui_drawtab", __debugInfo);
	try {
		var local3_num_2106 = 0, local4_num2_2107 = 0, local1_i_2108 = 0, local4_isel_2109 = 0, local2_c1_2110 = 0, local2_c2_2111 = 0, local3_c1b_2112 = 0, local3_c2b_2113 = 0, local2_fx_ref_2114 = [0], local2_fy_ref_2115 = [0], local1_x_2116 = 0, local6_twidth_2117 = 0, local4_selx_2118 = 0, local4_selw_2119 = 0, local6_y_text_2122 = 0;
		__debugInfo = "3009:\ddgui.gbas";
		GETFONTSIZE(local2_fx_ref_2114, local2_fy_ref_2115);
		__debugInfo = "3011:\ddgui.gbas";
		local2_c1_2110 = param10_ddgui_vals.attr10_col_bright;
		__debugInfo = "3012:\ddgui.gbas";
		local2_c2_2111 = param10_ddgui_vals.attr8_col_norm;
		__debugInfo = "3013:\ddgui.gbas";
		local3_c1b_2112 = param10_ddgui_vals.attr16_col_hover_bright;
		__debugInfo = "3014:\ddgui.gbas";
		local3_c2b_2113 = param10_ddgui_vals.attr14_col_hover_norm;
		__debugInfo = "3016:\ddgui.gbas";
		func13_DDgui_backgnd(local2_c1_2110, local2_c1_2110, 0, param4_ytop, param3_wdg.attr6_wwidth, ((param3_wdg.attr7_wheight) - (1)));
		__debugInfo = "3018:\ddgui.gbas";
		local4_isel_2109 = param3_wdg.attr7_wselect;
		__debugInfo = "3020:\ddgui.gbas";
		local6_y_text_2122 = ((((((param4_ytop) + (param3_wdg.attr7_wheight))) - (2))) - (local2_fy_ref_2115[0]));
		__debugInfo = "3022:\ddgui.gbas";
		local1_x_2116 = 2;
		__debugInfo = "3023:\ddgui.gbas";
		local3_num_2106 = SPLITSTR(unref(param3_wdg.attr9_wtext_Str_ref[0]), unref(static7_DDgui_drawtab_str_Str), "|", 1);
		__debugInfo = "3023:\ddgui.gbas";
		{
			__debugInfo = "3037:\ddgui.gbas";
			for (local1_i_2108 = 0;toCheck(local1_i_2108, ((local3_num_2106) - (1)), 1);local1_i_2108 += 1) {
				__debugInfo = "3025:\ddgui.gbas";
				local4_num2_2107 = SPLITSTR(static7_DDgui_drawtab_str_Str.arrAccess(local1_i_2108).values[tmpPositionCache], unref(static8_DDgui_drawtab_str2_Str_ref[0]), ",", 1);
				__debugInfo = "3026:\ddgui.gbas";
				local6_twidth_2117 = MAX(global25_gDDguiMinControlDimension, ((func21_DDGui_TextWidthIntern(static8_DDgui_drawtab_str2_Str_ref[0].arrAccess(0).values[tmpPositionCache])) + (local2_fx_ref_2114[0])));
				__debugInfo = "3034:\ddgui.gbas";
				if ((((local1_i_2108) == (local4_isel_2109)) ? 1 : 0)) {
					__debugInfo = "3028:\ddgui.gbas";
					func13_DDgui_backgnd(local3_c1b_2112, local3_c2b_2113, local1_x_2116, ((param4_ytop) + (1)), local6_twidth_2117, param3_wdg.attr7_wheight);
					__debugInfo = "3029:\ddgui.gbas";
					local4_selx_2118 = ((local1_x_2116) - (1));
					__debugInfo = "3030:\ddgui.gbas";
					local4_selw_2119 = ((local6_twidth_2117) + (2));
					__debugInfo = "3028:\ddgui.gbas";
				} else {
					__debugInfo = "3032:\ddgui.gbas";
					func13_DDgui_backgnd(local2_c1_2110, local2_c2_2111, ((local1_x_2116) + (1)), ((param4_ytop) + (4)), ((local6_twidth_2117) - (1)), ((param3_wdg.attr7_wheight) - (4)));
					__debugInfo = "3033:\ddgui.gbas";
					func14_DDgui_backrect(local1_x_2116, ((param4_ytop) + (3)), ((local6_twidth_2117) + (1)), ((param3_wdg.attr7_wheight) - (2)), local2_c2_2111);
					__debugInfo = "3032:\ddgui.gbas";
				};
				__debugInfo = "3035:\ddgui.gbas";
				func17_DDGui_PrintIntern(static8_DDgui_drawtab_str2_Str_ref[0].arrAccess(0).values[tmpPositionCache], ((local1_x_2116) + (INTEGER(CAST2INT(((local2_fx_ref_2114[0]) / (2)))))), local6_y_text_2122, (((local1_i_2108) == (local4_isel_2109)) ? 1 : 0));
				__debugInfo = "3036:\ddgui.gbas";
				local1_x_2116+=local6_twidth_2117;
				__debugInfo = "3025:\ddgui.gbas";
			};
			__debugInfo = "3037:\ddgui.gbas";
		};
		__debugInfo = "3041:\ddgui.gbas";
		if ((((local4_selx_2118) > (0)) ? 1 : 0)) {
			__debugInfo = "3041:\ddgui.gbas";
			func14_DDgui_backrect(local4_selx_2118, ((param4_ytop) + (1)), local4_selw_2119, param3_wdg.attr7_wheight, local3_c2b_2113);
			__debugInfo = "3041:\ddgui.gbas";
		};
		__debugInfo = "3044:\ddgui.gbas";
		DRAWRECT(0, ((param3_wdg.attr7_wheight) - (1)), ((param3_wdg.attr6_wwidth) - (1)), 1, local2_c2_2111);
		__debugInfo = "3045:\ddgui.gbas";
		return 0;
		__debugInfo = "3009:\ddgui.gbas";
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
window['func15_DDgui_handletab'] = function(param10_ddgui_vals, param3_wdg, param2_mx, param2_my, param2_b1, param2_b2) {
	stackPush("function: DDgui_handletab", __debugInfo);
	try {
		var local5_width_2129 = 0, local3_num_2130 = 0, local4_num2_2131 = 0, local1_i_2132 = 0, local2_fx_ref_2133 = [0], local2_fy_ref_2134 = [0], local1_x_2135 = 0, local6_oldsel_2136 = 0, local11_must_update_2139 = 0;
		__debugInfo = "3051:\ddgui.gbas";
		GETFONTSIZE(local2_fx_ref_2133, local2_fy_ref_2134);
		__debugInfo = "3052:\ddgui.gbas";
		param3_wdg.attr8_wclicked = 0;
		__debugInfo = "3054:\ddgui.gbas";
		local2_fy_ref_2134[0] = param3_wdg.attr7_wheight;
		__debugInfo = "3056:\ddgui.gbas";
		local11_must_update_2139 = 0;
		__debugInfo = "3057:\ddgui.gbas";
		if (((((((param3_wdg.attr7_wselect) == (-(1))) ? 1 : 0)) || ((((((((((((((((param2_b1) == (1)) ? 1 : 0)) && ((((param2_my) > (0)) ? 1 : 0))) ? 1 : 0)) && ((((param2_mx) > (0)) ? 1 : 0))) ? 1 : 0)) && ((((param2_my) <= (local2_fy_ref_2134[0])) ? 1 : 0))) ? 1 : 0)) && ((((param2_mx) < (param3_wdg.attr6_wwidth)) ? 1 : 0))) ? 1 : 0))) ? 1 : 0)) {
			__debugInfo = "3057:\ddgui.gbas";
			local11_must_update_2139 = 1;
			__debugInfo = "3057:\ddgui.gbas";
		};
		__debugInfo = "3058:\ddgui.gbas";
		if ((((param3_wdg.attr7_wselect) == (-(1))) ? 1 : 0)) {
			__debugInfo = "3058:\ddgui.gbas";
			func15_DDgui_selecttab(param3_wdg.attr7_wid_Str, 0);
			__debugInfo = "3058:\ddgui.gbas";
		};
		__debugInfo = "3079:\ddgui.gbas";
		if (local11_must_update_2139) {
			__debugInfo = "3062:\ddgui.gbas";
			local6_oldsel_2136 = param3_wdg.attr7_wselect;
			__debugInfo = "3063:\ddgui.gbas";
			local3_num_2130 = SPLITSTR(unref(param3_wdg.attr9_wtext_Str_ref[0]), unref(static7_DDgui_handletab_str_Str), "|", 1);
			__debugInfo = "3064:\ddgui.gbas";
			{
				__debugInfo = "3078:\ddgui.gbas";
				for (local1_i_2132 = 0;toCheck(local1_i_2132, ((local3_num_2130) - (1)), 1);local1_i_2132 += 1) {
					__debugInfo = "3066:\ddgui.gbas";
					local4_num2_2131 = SPLITSTR(static7_DDgui_handletab_str_Str.arrAccess(local1_i_2132).values[tmpPositionCache], unref(static8_DDgui_handletab_str2_Str_ref[0]), ",", 1);
					__debugInfo = "3067:\ddgui.gbas";
					local5_width_2129 = MAX(global25_gDDguiMinControlDimension, ((func21_DDGui_TextWidthIntern(static8_DDgui_handletab_str2_Str_ref[0].arrAccess(0).values[tmpPositionCache])) + (local2_fx_ref_2133[0])));
					__debugInfo = "3076:\ddgui.gbas";
					if (BOXCOLL(param2_mx, param2_my, 1, 1, local1_x_2135, 1, local5_width_2129, unref(local2_fy_ref_2134[0]))) {
						__debugInfo = "3074:\ddgui.gbas";
						if ((((local1_i_2132) != (local6_oldsel_2136)) ? 1 : 0)) {
							__debugInfo = "3071:\ddgui.gbas";
							param3_wdg.attr7_wselect = local1_i_2132;
							__debugInfo = "3072:\ddgui.gbas";
							param3_wdg.attr8_wclicked = 1;
							__debugInfo = "3073:\ddgui.gbas";
							func15_DDgui_selecttab(param3_wdg.attr7_wid_Str, local1_i_2132);
							__debugInfo = "3071:\ddgui.gbas";
						};
						__debugInfo = "3075:\ddgui.gbas";
						break;
						__debugInfo = "3074:\ddgui.gbas";
					};
					__debugInfo = "3077:\ddgui.gbas";
					local1_x_2135+=local5_width_2129;
					__debugInfo = "3066:\ddgui.gbas";
				};
				__debugInfo = "3078:\ddgui.gbas";
			};
			__debugInfo = "3062:\ddgui.gbas";
		};
		__debugInfo = "3080:\ddgui.gbas";
		return 0;
		__debugInfo = "3051:\ddgui.gbas";
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
window['func16_DDgui_framestart'] = function(param6_id_Str, param11_caption_Str, param5_width) {
	stackPush("function: DDgui_framestart", __debugInfo);
	try {
		var local5_count_2143 = 0;
		__debugInfo = "3095:\ddgui.gbas";
		if (((((param6_id_Str).length) == (0)) ? 1 : 0)) {
			__debugInfo = "3093:\ddgui.gbas";
			local5_count_2143 = ((1) + (BOUNDS(global11_ddgui_stack_ref[0].arrAccess(-(1)).values[tmpPositionCache][0].attr7_widgets_ref[0], 0)));
			__debugInfo = "3094:\ddgui.gbas";
			param6_id_Str = (("frm") + (CAST2STRING(local5_count_2143)));
			__debugInfo = "3093:\ddgui.gbas";
		};
		__debugInfo = "3096:\ddgui.gbas";
		func12_DDgui_widget(param6_id_Str, param11_caption_Str, param5_width, 100);
		__debugInfo = "3097:\ddgui.gbas";
		func9_DDgui_set(param6_id_Str, "TYPE", "FRAME");
		__debugInfo = "3098:\ddgui.gbas";
		if ((((param5_width) == (0)) ? 1 : 0)) {
			__debugInfo = "3098:\ddgui.gbas";
			func9_DDgui_set(param6_id_Str, "WIDTH", CAST2STRING(10000));
			__debugInfo = "3098:\ddgui.gbas";
		};
		__debugInfo = "3099:\ddgui.gbas";
		return 0;
		__debugInfo = "3095:\ddgui.gbas";
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
window['func14_DDgui_frameend'] = function() {
	stackPush("function: DDgui_frameend", __debugInfo);
	try {
		var local5_count_2144 = 0, local6_id_Str_2145 = "";
		__debugInfo = "3108:\ddgui.gbas";
		local5_count_2144 = ((1) + (BOUNDS(global11_ddgui_stack_ref[0].arrAccess(-(1)).values[tmpPositionCache][0].attr7_widgets_ref[0], 0)));
		__debugInfo = "3109:\ddgui.gbas";
		local6_id_Str_2145 = (("frm") + (CAST2STRING(local5_count_2144)));
		__debugInfo = "3110:\ddgui.gbas";
		func12_DDgui_widget(local6_id_Str_2145, "", 1, 1);
		__debugInfo = "3111:\ddgui.gbas";
		func9_DDgui_set(local6_id_Str_2145, "TYPE", "UNFRAME");
		__debugInfo = "3112:\ddgui.gbas";
		func9_DDgui_set(local6_id_Str_2145, "WIDTH", CAST2STRING(0));
		__debugInfo = "3113:\ddgui.gbas";
		func9_DDgui_set(local6_id_Str_2145, "HEIGHT", CAST2STRING(0));
		__debugInfo = "3114:\ddgui.gbas";
		return 0;
		__debugInfo = "3108:\ddgui.gbas";
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
window['__DDgui_Helpers___'] = function() {
	stackPush("sub: __DDgui_Helpers___", __debugInfo);
	try {
		
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
window['func18_DDgui_advancefocus'] = function(param10_iDirection) {
	stackPush("function: DDgui_advancefocus", __debugInfo);
	try {
		var local9_focus_Str_2147 = "", local6_ifocus_2148 = 0, local6_iFirst_2149 = 0, local7_iBefore_2150 = 0, local6_iAfter_2151 = 0, local5_iLast_2152 = 0;
		__debugInfo = "3129:\ddgui.gbas";
		local9_focus_Str_2147 = func13_DDgui_get_Str("", "FOCUS");
		__debugInfo = "3130:\ddgui.gbas";
		local6_ifocus_2148 = -(1);
		__debugInfo = "3132:\ddgui.gbas";
		local6_iFirst_2149 = -(1);
		__debugInfo = "3133:\ddgui.gbas";
		local7_iBefore_2150 = -(1);
		__debugInfo = "3134:\ddgui.gbas";
		local6_iAfter_2151 = -(1);
		__debugInfo = "3135:\ddgui.gbas";
		local5_iLast_2152 = -(1);
		__debugInfo = "3135:\ddgui.gbas";
		{
			var local1_i_2153 = 0;
			__debugInfo = "3151:\ddgui.gbas";
			for (local1_i_2153 = 0;toCheck(local1_i_2153, ((BOUNDS(global11_ddgui_stack_ref[0].arrAccess(-(1)).values[tmpPositionCache][0].attr7_widgets_ref[0], 0)) - (1)), 1);local1_i_2153 += 1) {
				var alias3_wdg_ref_2154 = [new type9_DDGUI_WDG()];
				__debugInfo = "3137:\ddgui.gbas";
				alias3_wdg_ref_2154 = global11_ddgui_stack_ref[0].arrAccess(-(1)).values[tmpPositionCache][0].attr7_widgets_ref[0].arrAccess(local1_i_2153).values[tmpPositionCache] /* ALIAS */;
				__debugInfo = "3142:\ddgui.gbas";
				if ((((alias3_wdg_ref_2154[0].attr7_wid_Str) == (local9_focus_Str_2147)) ? 1 : 0)) {
					__debugInfo = "3141:\ddgui.gbas";
					if ((((local6_ifocus_2148) == (-(1))) ? 1 : 0)) {
						__debugInfo = "3140:\ddgui.gbas";
						local6_ifocus_2148 = local1_i_2153;
						__debugInfo = "3140:\ddgui.gbas";
					};
					__debugInfo = "3141:\ddgui.gbas";
				};
				__debugInfo = "3150:\ddgui.gbas";
				if ((((((((((alias3_wdg_ref_2154[0].attr9_wtype_Str) == ("TEXT")) ? 1 : 0)) || ((((alias3_wdg_ref_2154[0].attr9_wtype_Str) == ("SINGLETEXT")) ? 1 : 0))) ? 1 : 0)) || ((((alias3_wdg_ref_2154[0].attr9_wtype_Str) == ("NUMBERTEXT")) ? 1 : 0))) ? 1 : 0)) {
					__debugInfo = "3146:\ddgui.gbas";
					if ((((local6_iFirst_2149) == (-(1))) ? 1 : 0)) {
						__debugInfo = "3146:\ddgui.gbas";
						local6_iFirst_2149 = local1_i_2153;
						__debugInfo = "3146:\ddgui.gbas";
					};
					__debugInfo = "3147:\ddgui.gbas";
					if ((((local6_ifocus_2148) == (-(1))) ? 1 : 0)) {
						__debugInfo = "3147:\ddgui.gbas";
						local7_iBefore_2150 = local1_i_2153;
						__debugInfo = "3147:\ddgui.gbas";
					};
					__debugInfo = "3148:\ddgui.gbas";
					if ((((((((((local6_ifocus_2148) >= (0)) ? 1 : 0)) && ((((local6_iAfter_2151) == (-(1))) ? 1 : 0))) ? 1 : 0)) && ((((local6_ifocus_2148) != (local1_i_2153)) ? 1 : 0))) ? 1 : 0)) {
						__debugInfo = "3148:\ddgui.gbas";
						local6_iAfter_2151 = local1_i_2153;
						__debugInfo = "3148:\ddgui.gbas";
					};
					__debugInfo = "3149:\ddgui.gbas";
					local5_iLast_2152 = local1_i_2153;
					__debugInfo = "3146:\ddgui.gbas";
				};
				__debugInfo = "3137:\ddgui.gbas";
			};
			__debugInfo = "3151:\ddgui.gbas";
		};
		__debugInfo = "3159:\ddgui.gbas";
		if ((((param10_iDirection) < (0)) ? 1 : 0)) {
			__debugInfo = "3154:\ddgui.gbas";
			if ((((local7_iBefore_2150) >= (0)) ? 1 : 0)) {
				__debugInfo = "3154:\ddgui.gbas";
				local6_ifocus_2148 = local7_iBefore_2150;
				__debugInfo = "3154:\ddgui.gbas";
			};
			__debugInfo = "3155:\ddgui.gbas";
			if (((((((local7_iBefore_2150) < (0)) ? 1 : 0)) && ((((local5_iLast_2152) >= (0)) ? 1 : 0))) ? 1 : 0)) {
				__debugInfo = "3155:\ddgui.gbas";
				local6_ifocus_2148 = local5_iLast_2152;
				__debugInfo = "3155:\ddgui.gbas";
			};
			__debugInfo = "3154:\ddgui.gbas";
		} else {
			__debugInfo = "3157:\ddgui.gbas";
			if ((((local6_iAfter_2151) >= (0)) ? 1 : 0)) {
				__debugInfo = "3157:\ddgui.gbas";
				local6_ifocus_2148 = local6_iAfter_2151;
				__debugInfo = "3157:\ddgui.gbas";
			};
			__debugInfo = "3158:\ddgui.gbas";
			if (((((((local6_iAfter_2151) < (0)) ? 1 : 0)) && ((((local6_iFirst_2149) >= (0)) ? 1 : 0))) ? 1 : 0)) {
				__debugInfo = "3158:\ddgui.gbas";
				local6_ifocus_2148 = local6_iFirst_2149;
				__debugInfo = "3158:\ddgui.gbas";
			};
			__debugInfo = "3157:\ddgui.gbas";
		};
		__debugInfo = "3164:\ddgui.gbas";
		if (((((((local6_ifocus_2148) >= (0)) ? 1 : 0)) && ((((local6_ifocus_2148) < (BOUNDS(global11_ddgui_stack_ref[0].arrAccess(-(1)).values[tmpPositionCache][0].attr7_widgets_ref[0], 0))) ? 1 : 0))) ? 1 : 0)) {
			__debugInfo = "3162:\ddgui.gbas";
			local9_focus_Str_2147 = global11_ddgui_stack_ref[0].arrAccess(-(1)).values[tmpPositionCache][0].attr7_widgets_ref[0].arrAccess(local6_ifocus_2148).values[tmpPositionCache][0].attr7_wid_Str;
			__debugInfo = "3163:\ddgui.gbas";
			func14_DDgui_setfocus(local9_focus_Str_2147);
			__debugInfo = "3162:\ddgui.gbas";
		};
		__debugInfo = "3165:\ddgui.gbas";
		return 0;
		__debugInfo = "3129:\ddgui.gbas";
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
window['func14_DDgui_setfocus'] = function(param6_id_Str) {
	stackPush("function: DDgui_setfocus", __debugInfo);
	try {
		__debugInfo = "3171:\ddgui.gbas";
		func9_DDgui_set("", "FOCUS", param6_id_Str);
		__debugInfo = "3172:\ddgui.gbas";
		{
			var local16___SelectHelper6__2156 = "";
			__debugInfo = "3172:\ddgui.gbas";
			local16___SelectHelper6__2156 = func13_DDgui_get_Str(param6_id_Str, "TYPE");
			__debugInfo = "3182:\ddgui.gbas";
			if ((((local16___SelectHelper6__2156) == ("TEXT")) ? 1 : 0)) {
				__debugInfo = "3174:\ddgui.gbas";
				func9_DDgui_set(param6_id_Str, "SELSTART", CAST2STRING(0));
				__debugInfo = "3175:\ddgui.gbas";
				func9_DDgui_set(param6_id_Str, "SELEND", CAST2STRING(0));
				__debugInfo = "3174:\ddgui.gbas";
			} else if ((((local16___SelectHelper6__2156) == ("SINGLETEXT")) ? 1 : 0)) {
				__debugInfo = "3177:\ddgui.gbas";
				func9_DDgui_set(param6_id_Str, "SELSTART", CAST2STRING(0));
				__debugInfo = "3178:\ddgui.gbas";
				func9_DDgui_set(param6_id_Str, "SELEND", CAST2STRING((func13_DDgui_get_Str(param6_id_Str, "TEXT")).length));
				__debugInfo = "3177:\ddgui.gbas";
			} else if ((((local16___SelectHelper6__2156) == ("NUMBERTEXT")) ? 1 : 0)) {
				__debugInfo = "3180:\ddgui.gbas";
				func9_DDgui_set(param6_id_Str, "SELSTART", CAST2STRING(0));
				__debugInfo = "3181:\ddgui.gbas";
				func9_DDgui_set(param6_id_Str, "SELEND", CAST2STRING((func13_DDgui_get_Str(param6_id_Str, "TEXT")).length));
				__debugInfo = "3180:\ddgui.gbas";
			};
			__debugInfo = "3172:\ddgui.gbas";
		};
		__debugInfo = "3184:\ddgui.gbas";
		return 0;
		__debugInfo = "3171:\ddgui.gbas";
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
window['func15_DDgui_selecttab'] = function(param6_id_Str, param4_isel) {
	stackPush("function: DDgui_selecttab", __debugInfo);
	try {
		var local3_num_2159 = 0, local4_num2_2160 = 0, local1_i_2161 = 0, local1_j_2162 = 0, local9_oldselect_2165 = 0;
		__debugInfo = "3194:\ddgui.gbas";
		local9_oldselect_2165 = ~~(func9_DDgui_get(param6_id_Str, "SELECT"));
		__debugInfo = "3196:\ddgui.gbas";
		func9_DDgui_set(param6_id_Str, "SELECT", CAST2STRING(param4_isel));
		__debugInfo = "3197:\ddgui.gbas";
		local3_num_2159 = SPLITSTR(func13_DDgui_get_Str(param6_id_Str, "TEXT"), unref(static7_DDgui_selecttab_str_Str), "|", 1);
		__debugInfo = "3198:\ddgui.gbas";
		{
			var local5_iHide_2166 = 0;
			__debugInfo = "3222:\ddgui.gbas";
			for (local5_iHide_2166 = 0;toCheck(local5_iHide_2166, 1, 1);local5_iHide_2166 += 1) {
				__debugInfo = "3199:\ddgui.gbas";
				{
					__debugInfo = "3221:\ddgui.gbas";
					for (local1_i_2161 = 0;toCheck(local1_i_2161, ((local3_num_2159) - (1)), 1);local1_i_2161 += 1) {
						__debugInfo = "3201:\ddgui.gbas";
						local4_num2_2160 = SPLITSTR(static7_DDgui_selecttab_str_Str.arrAccess(local1_i_2161).values[tmpPositionCache], unref(static8_DDgui_selecttab_str2_Str_ref[0]), ",", 1);
						__debugInfo = "3202:\ddgui.gbas";
						{
							__debugInfo = "3220:\ddgui.gbas";
							for (local1_j_2162 = 1;toCheck(local1_j_2162, ((local4_num2_2160) - (1)), 1);local1_j_2162 += 1) {
								__debugInfo = "3213:\ddgui.gbas";
								if (((((((local9_oldselect_2165) == (-(1))) ? 1 : 0)) && ((((func11_DDgui_index(unref(global11_ddgui_stack_ref[0].arrAccess(-(1)).values[tmpPositionCache][0]), static8_DDgui_selecttab_str2_Str_ref[0].arrAccess(local1_j_2162).values[tmpPositionCache], 0)) < (0)) ? 1 : 0))) ? 1 : 0)) {
									__debugInfo = "3209:\ddgui.gbas";
									DEBUG((((("Invalid widget in Tab: ") + (static8_DDgui_selecttab_str2_Str_ref[0].arrAccess(local1_j_2162).values[tmpPositionCache][0]))) + (" - could crash!\n")));
									__debugInfo = "3210:\ddgui.gbas";
									continue;
									__debugInfo = "3209:\ddgui.gbas";
								} else {
									__debugInfo = "3212:\ddgui.gbas";
									DEBUG((((("Valid widget ") + (static8_DDgui_selecttab_str2_Str_ref[0].arrAccess(local1_j_2162).values[tmpPositionCache][0]))) + ("\n")));
									__debugInfo = "3212:\ddgui.gbas";
								};
								__debugInfo = "3219:\ddgui.gbas";
								if (((((((local1_i_2161) == (param4_isel)) ? 1 : 0)) && ((((local5_iHide_2166) == (1)) ? 1 : 0))) ? 1 : 0)) {
									__debugInfo = "3216:\ddgui.gbas";
									func10_DDgui_hide(unref(static8_DDgui_selecttab_str2_Str_ref[0].arrAccess(local1_j_2162).values[tmpPositionCache][0]), 0);
									__debugInfo = "3216:\ddgui.gbas";
								} else if ((((local5_iHide_2166) == (0)) ? 1 : 0)) {
									__debugInfo = "3218:\ddgui.gbas";
									func10_DDgui_hide(unref(static8_DDgui_selecttab_str2_Str_ref[0].arrAccess(local1_j_2162).values[tmpPositionCache][0]), 1);
									__debugInfo = "3218:\ddgui.gbas";
								};
								__debugInfo = "3213:\ddgui.gbas";
							};
							__debugInfo = "3220:\ddgui.gbas";
						};
						__debugInfo = "3201:\ddgui.gbas";
					};
					__debugInfo = "3221:\ddgui.gbas";
				};
				__debugInfo = "3199:\ddgui.gbas";
			};
			__debugInfo = "3222:\ddgui.gbas";
		};
		__debugInfo = "3223:\ddgui.gbas";
		return 0;
		__debugInfo = "3194:\ddgui.gbas";
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
window['func31_DDgui_intern_list_item_text_Str'] = function(param7_txt_Str_ref, param5_index) {
	stackPush("function: DDgui_intern_list_item_text_Str", __debugInfo);
	try {
		var local5_start_2169 = 0, local4_fine_2170 = 0;
		__debugInfo = "3299:\ddgui.gbas";
		if ((((param5_index) < (0)) ? 1 : 0)) {
			__debugInfo = "3299:\ddgui.gbas";
			return "";
			__debugInfo = "3299:\ddgui.gbas";
		};
		__debugInfo = "3301:\ddgui.gbas";
		local5_start_2169 = -(1);
		__debugInfo = "3306:\ddgui.gbas";
		while ((((param5_index) > (0)) ? 1 : 0)) {
			__debugInfo = "3303:\ddgui.gbas";
			local5_start_2169 = INSTR(unref(param7_txt_Str_ref[0]), "|", ((local5_start_2169) + (1)));
			__debugInfo = "3304:\ddgui.gbas";
			if ((((local5_start_2169) < (0)) ? 1 : 0)) {
				__debugInfo = "3304:\ddgui.gbas";
				return "";
				__debugInfo = "3304:\ddgui.gbas";
			};
			__debugInfo = "3305:\ddgui.gbas";
			param5_index+=-1;
			__debugInfo = "3303:\ddgui.gbas";
		};
		__debugInfo = "3307:\ddgui.gbas";
		local4_fine_2170 = INSTR(unref(param7_txt_Str_ref[0]), "|", ((local5_start_2169) + (1)));
		__debugInfo = "3308:\ddgui.gbas";
		if ((((local4_fine_2170) > (0)) ? 1 : 0)) {
			__debugInfo = "3308:\ddgui.gbas";
			local4_fine_2170 = ((((local4_fine_2170) - (local5_start_2169))) - (1));
			__debugInfo = "3308:\ddgui.gbas";
		};
		__debugInfo = "3309:\ddgui.gbas";
		return tryClone(MID_Str(unref(param7_txt_Str_ref[0]), ((local5_start_2169) + (1)), local4_fine_2170));
		__debugInfo = "3310:\ddgui.gbas";
		return "";
		__debugInfo = "3299:\ddgui.gbas";
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
window['func21_DDgui_getitemtext_Str'] = function(param6_id_Str, param5_index) {
	stackPush("function: DDgui_getitemtext_Str", __debugInfo);
	try {
		var local2_iw_2315 = 0;
		var local6_id_Str_ref_2313 = [param6_id_Str]; /* NEWCODEHERE */
		__debugInfo = "3323:\ddgui.gbas";
		if ((((BOUNDS(global11_ddgui_stack_ref[0], 0)) == (0)) ? 1 : 0)) {
			__debugInfo = "3321:\ddgui.gbas";
			DEBUG("DDgui_get: No active dialog!\n");
			__debugInfo = "3322:\ddgui.gbas";
			return "";
			__debugInfo = "3321:\ddgui.gbas";
		};
		__debugInfo = "3325:\ddgui.gbas";
		local2_iw_2315 = func11_DDgui_index(unref(global11_ddgui_stack_ref[0].arrAccess(-(1)).values[tmpPositionCache][0]), local6_id_Str_ref_2313, 0);
		__debugInfo = "3331:\ddgui.gbas";
		if ((((local2_iw_2315) >= (0)) ? 1 : 0)) {
			var alias3_wdg_ref_2316 = [new type9_DDGUI_WDG()], alias7_txt_Str_ref_2317 = [""];
			__debugInfo = "3328:\ddgui.gbas";
			alias3_wdg_ref_2316 = global11_ddgui_stack_ref[0].arrAccess(-(1)).values[tmpPositionCache][0].attr7_widgets_ref[0].arrAccess(local2_iw_2315).values[tmpPositionCache] /* ALIAS */;
			__debugInfo = "3329:\ddgui.gbas";
			alias7_txt_Str_ref_2317 = alias3_wdg_ref_2316[0].attr9_wtext_Str_ref /* ALIAS */;
			__debugInfo = "3330:\ddgui.gbas";
			return tryClone(func31_DDgui_intern_list_item_text_Str(alias7_txt_Str_ref_2317, param5_index));
			__debugInfo = "3328:\ddgui.gbas";
		};
		__debugInfo = "3332:\ddgui.gbas";
		DEBUG((((("DDgui_get: Widget not found ") + (local6_id_Str_ref_2313[0]))) + ("\n")));
		__debugInfo = "3333:\ddgui.gbas";
		return "";
		__debugInfo = "3323:\ddgui.gbas";
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
window['func15_DDgui_input_Str'] = function(param8_text_Str, param13_bSpecialChars, param11_bFullscreen, param11_bSingleLine, param9_bIsNumber) {
		var __labels = {"__DrawFrames__": 3534, "refresh": 11242};
		
	stackPush("function: DDgui_input_Str", __debugInfo);
	try {
		var local2_fx_ref_2176 = [0], local2_fy_ref_2177 = [0], local4_size_2178 = 0, local7_iTabSel_2179 = 0, local12_text_old_Str_2180 = "", local4_ssel_2181 = 0, local4_esel_2182 = 0, local8_widg_Str_2183 = new OTTArray(""), local3_scx_ref_2184 = [0], local3_scy_ref_2185 = [0], local12_storeoldsize_2186 = 0, local5_texth_2187 = 0, local10_cancel_Str_2189 = "", local3_chr_2190 = 0;
		var __pc = 11105;
		while(__pc >= 0) {
			switch(__pc) {
				case 11105:
					__debugInfo = "3427:\ddgui.gbas";
					local12_text_old_Str_2180 = param8_text_Str;
					
				__debugInfo = "3430:\ddgui.gbas";
				GETSCREENSIZE(local3_scx_ref_2184, local3_scy_ref_2185);
				__debugInfo = "3431:\ddgui.gbas";
				GETFONTSIZE(local2_fx_ref_2176, local2_fy_ref_2177);
				__debugInfo = "3433:\ddgui.gbas";
				local12_storeoldsize_2186 = global25_gDDguiMinControlDimension;
				__debugInfo = "3434:\ddgui.gbas";
				global25_gDDguiMinControlDimension = 16;
				__debugInfo = "3436:\ddgui.gbas";
				local4_size_2178 = MIN(400, MIN(unref(local3_scx_ref_2184[0]), unref(local3_scy_ref_2185[0])));
				case 11197:
					__debugInfo = "3450:\ddgui.gbas";
					if (!(param11_bFullscreen)) { __pc = 11127; break; }
					
					case 11134:
						__debugInfo = "3439:\ddgui.gbas";
						func16_DDgui_pushdialog(0, 0, unref(local3_scx_ref_2184[0]), unref(local3_scy_ref_2185[0]), 1);
						
					__debugInfo = "3440:\ddgui.gbas";
					local4_size_2178 = 20;
					case 11146:
						__debugInfo = "3441:\ddgui.gbas";
						if (!((((local3_scx_ref_2184[0]) > (240)) ? 1 : 0))) { __pc = 11141; break; }
					
					case 11145:
						__debugInfo = "3441:\ddgui.gbas";
						local4_size_2178 = 28;
						
					__debugInfo = "3441:\ddgui.gbas";
					
				case 11141: //dummy jumper1
					;
						
					case 11155:
						__debugInfo = "3442:\ddgui.gbas";
						if (!((((local3_scx_ref_2184[0]) > (320)) ? 1 : 0))) { __pc = 11150; break; }
					
					case 11154:
						__debugInfo = "3442:\ddgui.gbas";
						local4_size_2178 = 36;
						
					__debugInfo = "3442:\ddgui.gbas";
					
				case 11150: //dummy jumper1
					;
						
					__debugInfo = "3439:\ddgui.gbas";
					__pc = 16969;
					break;
					
				case 11127: //dummy jumper1
					
					case 11169:
						__debugInfo = "3444:\ddgui.gbas";
						func16_DDgui_pushdialog(CAST2INT(((((local3_scx_ref_2184[0]) - (local4_size_2178))) / (2))), CAST2INT(((((local3_scy_ref_2185[0]) - (local4_size_2178))) / (2))), local4_size_2178, local4_size_2178, 0);
						
					__debugInfo = "3445:\ddgui.gbas";
					local3_scy_ref_2185[0] = local4_size_2178;
					__debugInfo = "3446:\ddgui.gbas";
					local3_scx_ref_2184[0] = local4_size_2178;
					__debugInfo = "3447:\ddgui.gbas";
					local4_size_2178 = 20;
					case 11187:
						__debugInfo = "3448:\ddgui.gbas";
						if (!((((local3_scx_ref_2184[0]) > (240)) ? 1 : 0))) { __pc = 11182; break; }
					
					case 11186:
						__debugInfo = "3448:\ddgui.gbas";
						local4_size_2178 = 28;
						
					__debugInfo = "3448:\ddgui.gbas";
					
				case 11182: //dummy jumper1
					;
						
					case 11196:
						__debugInfo = "3449:\ddgui.gbas";
						if (!((((local3_scx_ref_2184[0]) > (320)) ? 1 : 0))) { __pc = 11191; break; }
					
					case 11195:
						__debugInfo = "3449:\ddgui.gbas";
						local4_size_2178 = 36;
						
					__debugInfo = "3449:\ddgui.gbas";
					
				case 11191: //dummy jumper1
					;
						
					__debugInfo = "3444:\ddgui.gbas";
					
				case 16969: //dummy jumper2
					;
					
				__debugInfo = "3453:\ddgui.gbas";
				global18_DDGUI_IN_INPUT_DLG = 1;
				__debugInfo = "3455:\ddgui.gbas";
				func9_DDgui_set("tx_text", "TEXT", param8_text_Str);
				__debugInfo = "3456:\ddgui.gbas";
				func9_DDgui_set("tab", "SELECT", CAST2STRING(2));
				case 11217:
					__debugInfo = "3457:\ddgui.gbas";
					if (!(param9_bIsNumber)) { __pc = 11211; break; }
					
					case 11216:
						__debugInfo = "3457:\ddgui.gbas";
						func9_DDgui_set("tab", "SELECT", CAST2STRING(0));
						
					__debugInfo = "3457:\ddgui.gbas";
					
				case 11211: //dummy jumper1
					;
					
				case 11241:
					__debugInfo = "3462:\ddgui.gbas";
					if (!((((param11_bSingleLine) || (((((((INSTR(param8_text_Str, "\n", 0)) < (0)) ? 1 : 0)) && (((((param8_text_Str).length) < (40)) ? 1 : 0))) ? 1 : 0))) ? 1 : 0))) { __pc = 11230; break; }
					
					case 11235:
						__debugInfo = "3460:\ddgui.gbas";
						func9_DDgui_set("tx_text", "SELSTART", CAST2STRING(0));
						
					__debugInfo = "3461:\ddgui.gbas";
					func9_DDgui_set("tx_text", "SELEND", CAST2STRING((param8_text_Str).length));
					__debugInfo = "3460:\ddgui.gbas";
					
				case 11230: //dummy jumper1
					;
					
				case 11242:
					__debugInfo = "3465:\ddgui.gbas";
					//label: refresh;
					
				__debugInfo = "3466:\ddgui.gbas";
				param8_text_Str = func13_DDgui_get_Str("tx_text", "TEXT");
				__debugInfo = "3467:\ddgui.gbas";
				local4_ssel_2181 = ~~(func9_DDgui_get("tx_text", "SELSTART"));
				__debugInfo = "3468:\ddgui.gbas";
				local4_esel_2182 = ~~(func9_DDgui_get("tx_text", "SELEND"));
				__debugInfo = "3469:\ddgui.gbas";
				local7_iTabSel_2179 = ~~(func9_DDgui_get("tab", "SELECT"));
				__debugInfo = "3471:\ddgui.gbas";
				func10_DDgui_init();
				__debugInfo = "3472:\ddgui.gbas";
				local5_texth_2187 = ((((local3_scy_ref_2185[0]) - (((6) * (((local4_size_2178) + (2))))))) - (32));
				case 11316:
					__debugInfo = "3482:\ddgui.gbas";
					if (!(param11_bSingleLine)) { __pc = 11280; break; }
					
					case 11284:
						__debugInfo = "3474:\ddgui.gbas";
						local5_texth_2187 = 0;
						
					case 11305:
						__debugInfo = "3479:\ddgui.gbas";
						if (!(param9_bIsNumber)) { __pc = 11286; break; }
					
					case 11295:
						__debugInfo = "3476:\ddgui.gbas";
						func16_DDgui_numbertext("tx_text", param8_text_Str, ((local3_scx_ref_2184[0]) - (MAX(32, unref(local2_fx_ref_2176[0])))));
						
					__debugInfo = "3476:\ddgui.gbas";
					__pc = 16977;
					break;
					
				case 11286: //dummy jumper1
					
					case 11304:
						__debugInfo = "3478:\ddgui.gbas";
						func16_DDgui_singletext("tx_text", param8_text_Str, ((local3_scx_ref_2184[0]) - (MAX(32, unref(local2_fx_ref_2176[0])))));
						
					__debugInfo = "3478:\ddgui.gbas";
					
				case 16977: //dummy jumper2
					;
						
					__debugInfo = "3474:\ddgui.gbas";
					__pc = 16976;
					break;
					
				case 11280: //dummy jumper1
					
					case 11315:
						__debugInfo = "3481:\ddgui.gbas";
						func10_DDgui_text("tx_text", param8_text_Str, ((local3_scx_ref_2184[0]) - (MAX(32, unref(local2_fx_ref_2176[0])))), local5_texth_2187);
						
					__debugInfo = "3481:\ddgui.gbas";
					
				case 16976: //dummy jumper2
					;
					
				__debugInfo = "3484:\ddgui.gbas";
				func9_DDgui_set("tx_text", "ALIGN", CAST2STRING(0));
				__debugInfo = "3485:\ddgui.gbas";
				func12_DDgui_spacer(10000, 2);
				__debugInfo = "3488:\ddgui.gbas";
				func9_DDgui_set("tab", "SELECT", CAST2STRING(local7_iTabSel_2179));
				__debugInfo = "3489:\ddgui.gbas";
				func9_DDgui_set("tx_text", "SELSTART", CAST2STRING(local4_ssel_2181));
				__debugInfo = "3490:\ddgui.gbas";
				func9_DDgui_set("tx_text", "SELEND", CAST2STRING(local4_esel_2182));
				case 11357:
					__debugInfo = "3500:\ddgui.gbas";
					if (!(param9_bIsNumber)) { __pc = 11337; break; }
					
					case 11342:
						__debugInfo = "3493:\ddgui.gbas";
						func9_DDgui_tab("tab", "123", local4_size_2178);
						
					__debugInfo = "3493:\ddgui.gbas";
					__pc = 16978;
					break;
					
				case 11337: //dummy jumper1
					
					case 11356:
						__debugInfo = "3499:\ddgui.gbas";
						if (!(param13_bSpecialChars)) { __pc = 11345; break; }
					
					case 11350:
						__debugInfo = "3496:\ddgui.gbas";
						func9_DDgui_tab("tab", "123|ABC|abc|ÄÖÜ", local4_size_2178);
						
					__debugInfo = "3496:\ddgui.gbas";
					__pc = 16979;
					break;
					
				case 11345: //dummy jumper1
					
					case 11355:
						__debugInfo = "3498:\ddgui.gbas";
						func9_DDgui_tab("tab", "123|ABC|abc", local4_size_2178);
						
					__debugInfo = "3498:\ddgui.gbas";
					
				case 16979: //dummy jumper2
					;
						
					__debugInfo = "3499:\ddgui.gbas";
					
				case 16978: //dummy jumper2
					;
					
				__debugInfo = "3503:\ddgui.gbas";
				func16_DDgui_framestart("fr_keypad", "", 0);
				case 12245:
					__debugInfo = "3678:\ddgui.gbas";
					if (!(param9_bIsNumber)) { __pc = 11361; break; }
					
					case 11367:
						__debugInfo = "3505:\ddgui.gbas";
						func12_DDgui_button("b7", "7", local4_size_2178, local4_size_2178);
						
					__debugInfo = "3506:\ddgui.gbas";
					func12_DDgui_button("b8", "8", local4_size_2178, local4_size_2178);
					__debugInfo = "3507:\ddgui.gbas";
					func12_DDgui_button("b9", "9", local4_size_2178, local4_size_2178);
					__debugInfo = "3508:\ddgui.gbas";
					func12_DDgui_button("b-", "-", local4_size_2178, local4_size_2178);
					__debugInfo = "3509:\ddgui.gbas";
					func12_DDgui_spacer(10000, 0);
					__debugInfo = "3510:\ddgui.gbas";
					func12_DDgui_button("b4", "4", local4_size_2178, local4_size_2178);
					__debugInfo = "3511:\ddgui.gbas";
					func12_DDgui_button("b5", "5", local4_size_2178, local4_size_2178);
					__debugInfo = "3512:\ddgui.gbas";
					func12_DDgui_button("b6", "6", local4_size_2178, local4_size_2178);
					__debugInfo = "3513:\ddgui.gbas";
					func12_DDgui_button("be", "e", local4_size_2178, local4_size_2178);
					__debugInfo = "3514:\ddgui.gbas";
					func12_DDgui_spacer(10000, 0);
					__debugInfo = "3515:\ddgui.gbas";
					func12_DDgui_button("b1", "1", local4_size_2178, local4_size_2178);
					__debugInfo = "3516:\ddgui.gbas";
					func12_DDgui_button("b2", "2", local4_size_2178, local4_size_2178);
					__debugInfo = "3517:\ddgui.gbas";
					func12_DDgui_button("b3", "3", local4_size_2178, local4_size_2178);
					__debugInfo = "3518:\ddgui.gbas";
					func12_DDgui_spacer(10000, 0);
					__debugInfo = "3519:\ddgui.gbas";
					func12_DDgui_button("b0", "0", ((((local4_size_2178) * (2))) + (2)), local4_size_2178);
					__debugInfo = "3520:\ddgui.gbas";
					func12_DDgui_button("b.", ".", local4_size_2178, local4_size_2178);
					__debugInfo = "3521:\ddgui.gbas";
					func12_DDgui_button("b\b", "<-", ((((local4_size_2178) * (2))) + (2)), local4_size_2178);
					__debugInfo = "3505:\ddgui.gbas";
					__pc = 16980;
					break;
					
				case 11361: //dummy jumper1
					
					case 11452:
						__debugInfo = "3523:\ddgui.gbas";
						
					var local16___SelectHelper7__2188 = 0;
					case 11454:
						__debugInfo = "3523:\ddgui.gbas";
						local16___SelectHelper7__2188 = local7_iTabSel_2179;
						
					case 12244:
						__debugInfo = "3677:\ddgui.gbas";
						if (!((((local16___SelectHelper7__2188) == (0)) ? 1 : 0))) { __pc = 11456; break; }
					
					case 11462:
						__debugInfo = "3525:\ddgui.gbas";
						func12_DDgui_button("b@", "@", local4_size_2178, local4_size_2178);
						
					__debugInfo = "3526:\ddgui.gbas";
					func12_DDgui_button("b#", "#", local4_size_2178, local4_size_2178);
					__debugInfo = "3527:\ddgui.gbas";
					func12_DDgui_button("b[", "[", local4_size_2178, local4_size_2178);
					__debugInfo = "3528:\ddgui.gbas";
					func12_DDgui_button("b]", "]", local4_size_2178, local4_size_2178);
					__debugInfo = "3529:\ddgui.gbas";
					func12_DDgui_button("b~", "~", local4_size_2178, local4_size_2178);
					__debugInfo = "3530:\ddgui.gbas";
					func12_DDgui_button("b7", "7", local4_size_2178, local4_size_2178);
					__debugInfo = "3531:\ddgui.gbas";
					func12_DDgui_button("b8", "8", local4_size_2178, local4_size_2178);
					__debugInfo = "3532:\ddgui.gbas";
					func12_DDgui_button("b9", "9", local4_size_2178, local4_size_2178);
					__debugInfo = "3533:\ddgui.gbas";
					func12_DDgui_button("b/", "/", local4_size_2178, local4_size_2178);
					__debugInfo = "3534:\ddgui.gbas";
					func12_DDgui_button("b*", "*", local4_size_2178, local4_size_2178);
					__debugInfo = "3535:\ddgui.gbas";
					func12_DDgui_spacer(10000, 0);
					__debugInfo = "3536:\ddgui.gbas";
					func12_DDgui_button("b?", "?", local4_size_2178, local4_size_2178);
					__debugInfo = "3537:\ddgui.gbas";
					func12_DDgui_button("b!", "!", local4_size_2178, local4_size_2178);
					__debugInfo = "3538:\ddgui.gbas";
					func12_DDgui_button("b{", "{", local4_size_2178, local4_size_2178);
					__debugInfo = "3539:\ddgui.gbas";
					func12_DDgui_button("b}", "}", local4_size_2178, local4_size_2178);
					__debugInfo = "3540:\ddgui.gbas";
					func12_DDgui_button("b=", "=", local4_size_2178, local4_size_2178);
					__debugInfo = "3541:\ddgui.gbas";
					func12_DDgui_button("b4", "4", local4_size_2178, local4_size_2178);
					__debugInfo = "3542:\ddgui.gbas";
					func12_DDgui_button("b5", "5", local4_size_2178, local4_size_2178);
					__debugInfo = "3543:\ddgui.gbas";
					func12_DDgui_button("b6", "6", local4_size_2178, local4_size_2178);
					__debugInfo = "3544:\ddgui.gbas";
					func12_DDgui_button("b-", "-", local4_size_2178, local4_size_2178);
					__debugInfo = "3545:\ddgui.gbas";
					func12_DDgui_button("b+", "+", local4_size_2178, local4_size_2178);
					__debugInfo = "3546:\ddgui.gbas";
					func12_DDgui_spacer(10000, 0);
					__debugInfo = "3547:\ddgui.gbas";
					func12_DDgui_button("b:", ":", local4_size_2178, local4_size_2178);
					__debugInfo = "3548:\ddgui.gbas";
					func12_DDgui_button("b;", ";", local4_size_2178, local4_size_2178);
					__debugInfo = "3549:\ddgui.gbas";
					func12_DDgui_button("b(", "(", local4_size_2178, local4_size_2178);
					__debugInfo = "3550:\ddgui.gbas";
					func12_DDgui_button("b)", ")", local4_size_2178, local4_size_2178);
					__debugInfo = "3551:\ddgui.gbas";
					func12_DDgui_button("b0", "0", local4_size_2178, local4_size_2178);
					__debugInfo = "3552:\ddgui.gbas";
					func12_DDgui_button("b1", "1", local4_size_2178, local4_size_2178);
					__debugInfo = "3553:\ddgui.gbas";
					func12_DDgui_button("b2", "2", local4_size_2178, local4_size_2178);
					__debugInfo = "3554:\ddgui.gbas";
					func12_DDgui_button("b3", "3", local4_size_2178, local4_size_2178);
					__debugInfo = "3555:\ddgui.gbas";
					func12_DDgui_button("b\b", "<-", ((((local4_size_2178) * (2))) + (2)), local4_size_2178);
					__debugInfo = "3556:\ddgui.gbas";
					func12_DDgui_spacer(10000, 0);
					__debugInfo = "3557:\ddgui.gbas";
					func12_DDgui_button("b,", ",", local4_size_2178, local4_size_2178);
					__debugInfo = "3558:\ddgui.gbas";
					func12_DDgui_button("b.", ".", local4_size_2178, local4_size_2178);
					__debugInfo = "3559:\ddgui.gbas";
					func12_DDgui_button("b<", "<", local4_size_2178, local4_size_2178);
					__debugInfo = "3560:\ddgui.gbas";
					func12_DDgui_button("b>", ">", local4_size_2178, local4_size_2178);
					__debugInfo = "3561:\ddgui.gbas";
					func12_DDgui_button("b'", "'", local4_size_2178, local4_size_2178);
					__debugInfo = "3562:\ddgui.gbas";
					func12_DDgui_button("b\"", "\"", local4_size_2178, local4_size_2178);
					__debugInfo = "3563:\ddgui.gbas";
					func12_DDgui_button("b ", "", ((((local4_size_2178) * (2))) + (2)), local4_size_2178);
					__debugInfo = "3564:\ddgui.gbas";
					func12_DDgui_button("b\n", CHR_Str(182), ((((local4_size_2178) * (2))) + (2)), local4_size_2178);
					__debugInfo = "3525:\ddgui.gbas";
					
				case 11456: //dummy jumper1
					if (!((((local16___SelectHelper7__2188) == (1)) ? 1 : 0))) { __pc = 11666; break; }
					
					case 11672:
						__debugInfo = "3566:\ddgui.gbas";
						func12_DDgui_button("bQ", "Q", local4_size_2178, local4_size_2178);
						
					__debugInfo = "3567:\ddgui.gbas";
					func12_DDgui_button("bW", "W", local4_size_2178, local4_size_2178);
					__debugInfo = "3568:\ddgui.gbas";
					func12_DDgui_button("bE", "E", local4_size_2178, local4_size_2178);
					__debugInfo = "3569:\ddgui.gbas";
					func12_DDgui_button("bR", "R", local4_size_2178, local4_size_2178);
					__debugInfo = "3570:\ddgui.gbas";
					func12_DDgui_button("bT", "T", local4_size_2178, local4_size_2178);
					__debugInfo = "3571:\ddgui.gbas";
					func12_DDgui_button("bY", "Y", local4_size_2178, local4_size_2178);
					__debugInfo = "3572:\ddgui.gbas";
					func12_DDgui_button("bU", "U", local4_size_2178, local4_size_2178);
					__debugInfo = "3573:\ddgui.gbas";
					func12_DDgui_button("bI", "I", local4_size_2178, local4_size_2178);
					__debugInfo = "3574:\ddgui.gbas";
					func12_DDgui_button("bO", "O", local4_size_2178, local4_size_2178);
					__debugInfo = "3575:\ddgui.gbas";
					func12_DDgui_button("bP", "P", local4_size_2178, local4_size_2178);
					__debugInfo = "3576:\ddgui.gbas";
					func12_DDgui_spacer(10000, 0);
					__debugInfo = "3577:\ddgui.gbas";
					func12_DDgui_button("bA", "A", local4_size_2178, local4_size_2178);
					__debugInfo = "3578:\ddgui.gbas";
					func12_DDgui_button("bS", "S", local4_size_2178, local4_size_2178);
					__debugInfo = "3579:\ddgui.gbas";
					func12_DDgui_button("bD", "D", local4_size_2178, local4_size_2178);
					__debugInfo = "3580:\ddgui.gbas";
					func12_DDgui_button("bF", "F", local4_size_2178, local4_size_2178);
					__debugInfo = "3581:\ddgui.gbas";
					func12_DDgui_button("bG", "G", local4_size_2178, local4_size_2178);
					__debugInfo = "3582:\ddgui.gbas";
					func12_DDgui_button("bH", "H", local4_size_2178, local4_size_2178);
					__debugInfo = "3583:\ddgui.gbas";
					func12_DDgui_button("bJ", "J", local4_size_2178, local4_size_2178);
					__debugInfo = "3584:\ddgui.gbas";
					func12_DDgui_button("bK", "K", local4_size_2178, local4_size_2178);
					__debugInfo = "3585:\ddgui.gbas";
					func12_DDgui_button("bL", "L", local4_size_2178, local4_size_2178);
					__debugInfo = "3586:\ddgui.gbas";
					func12_DDgui_button("b,", ",", local4_size_2178, local4_size_2178);
					__debugInfo = "3587:\ddgui.gbas";
					func12_DDgui_spacer(10000, 0);
					__debugInfo = "3588:\ddgui.gbas";
					func12_DDgui_button("bShift", "^", local4_size_2178, local4_size_2178);
					__debugInfo = "3589:\ddgui.gbas";
					func12_DDgui_button("bZ", "Z", local4_size_2178, local4_size_2178);
					__debugInfo = "3590:\ddgui.gbas";
					func12_DDgui_button("bX", "X", local4_size_2178, local4_size_2178);
					__debugInfo = "3591:\ddgui.gbas";
					func12_DDgui_button("bC", "C", local4_size_2178, local4_size_2178);
					__debugInfo = "3592:\ddgui.gbas";
					func12_DDgui_button("bV", "V", local4_size_2178, local4_size_2178);
					__debugInfo = "3593:\ddgui.gbas";
					func12_DDgui_button("bB", "B", local4_size_2178, local4_size_2178);
					__debugInfo = "3594:\ddgui.gbas";
					func12_DDgui_button("bN", "N", local4_size_2178, local4_size_2178);
					__debugInfo = "3595:\ddgui.gbas";
					func12_DDgui_button("bM", "M", local4_size_2178, local4_size_2178);
					__debugInfo = "3596:\ddgui.gbas";
					func12_DDgui_button("b\b", "<-", ((((local4_size_2178) * (2))) + (2)), local4_size_2178);
					__debugInfo = "3597:\ddgui.gbas";
					func12_DDgui_spacer(10000, 0);
					__debugInfo = "3598:\ddgui.gbas";
					func12_DDgui_button("b,", ",", local4_size_2178, local4_size_2178);
					__debugInfo = "3599:\ddgui.gbas";
					func12_DDgui_button("b.", ".", local4_size_2178, local4_size_2178);
					__debugInfo = "3600:\ddgui.gbas";
					func12_DDgui_button("b ", "", ((((local4_size_2178) * (6))) + (10)), local4_size_2178);
					__debugInfo = "3601:\ddgui.gbas";
					func12_DDgui_button("b\n", CHR_Str(182), ((((local4_size_2178) * (2))) + (2)), local4_size_2178);
					__debugInfo = "3566:\ddgui.gbas";
					
				case 11666: //dummy jumper1
					if (!((((local16___SelectHelper7__2188) == (2)) ? 1 : 0))) { __pc = 11856; break; }
					
					case 11862:
						__debugInfo = "3603:\ddgui.gbas";
						func12_DDgui_button("bq", "q", local4_size_2178, local4_size_2178);
						
					__debugInfo = "3604:\ddgui.gbas";
					func12_DDgui_button("bw", "w", local4_size_2178, local4_size_2178);
					__debugInfo = "3605:\ddgui.gbas";
					func12_DDgui_button("be", "e", local4_size_2178, local4_size_2178);
					__debugInfo = "3606:\ddgui.gbas";
					func12_DDgui_button("br", "r", local4_size_2178, local4_size_2178);
					__debugInfo = "3607:\ddgui.gbas";
					func12_DDgui_button("bt", "t", local4_size_2178, local4_size_2178);
					__debugInfo = "3608:\ddgui.gbas";
					func12_DDgui_button("by", "y", local4_size_2178, local4_size_2178);
					__debugInfo = "3609:\ddgui.gbas";
					func12_DDgui_button("bu", "u", local4_size_2178, local4_size_2178);
					__debugInfo = "3610:\ddgui.gbas";
					func12_DDgui_button("bi", "i", local4_size_2178, local4_size_2178);
					__debugInfo = "3611:\ddgui.gbas";
					func12_DDgui_button("bo", "o", local4_size_2178, local4_size_2178);
					__debugInfo = "3612:\ddgui.gbas";
					func12_DDgui_button("bp", "p", local4_size_2178, local4_size_2178);
					__debugInfo = "3613:\ddgui.gbas";
					func12_DDgui_spacer(10000, 0);
					__debugInfo = "3614:\ddgui.gbas";
					func12_DDgui_button("ba", "a", local4_size_2178, local4_size_2178);
					__debugInfo = "3615:\ddgui.gbas";
					func12_DDgui_button("bs", "s", local4_size_2178, local4_size_2178);
					__debugInfo = "3616:\ddgui.gbas";
					func12_DDgui_button("bd", "d", local4_size_2178, local4_size_2178);
					__debugInfo = "3617:\ddgui.gbas";
					func12_DDgui_button("bf", "f", local4_size_2178, local4_size_2178);
					__debugInfo = "3618:\ddgui.gbas";
					func12_DDgui_button("bg", "g", local4_size_2178, local4_size_2178);
					__debugInfo = "3619:\ddgui.gbas";
					func12_DDgui_button("bh", "h", local4_size_2178, local4_size_2178);
					__debugInfo = "3620:\ddgui.gbas";
					func12_DDgui_button("bj", "j", local4_size_2178, local4_size_2178);
					__debugInfo = "3621:\ddgui.gbas";
					func12_DDgui_button("bk", "k", local4_size_2178, local4_size_2178);
					__debugInfo = "3622:\ddgui.gbas";
					func12_DDgui_button("bl", "l", local4_size_2178, local4_size_2178);
					__debugInfo = "3623:\ddgui.gbas";
					func12_DDgui_button("b,", ",", local4_size_2178, local4_size_2178);
					__debugInfo = "3624:\ddgui.gbas";
					func12_DDgui_spacer(10000, 0);
					__debugInfo = "3625:\ddgui.gbas";
					func12_DDgui_button("bShift", "^", local4_size_2178, local4_size_2178);
					__debugInfo = "3626:\ddgui.gbas";
					func12_DDgui_button("bz", "z", local4_size_2178, local4_size_2178);
					__debugInfo = "3627:\ddgui.gbas";
					func12_DDgui_button("bx", "x", local4_size_2178, local4_size_2178);
					__debugInfo = "3628:\ddgui.gbas";
					func12_DDgui_button("bc", "c", local4_size_2178, local4_size_2178);
					__debugInfo = "3629:\ddgui.gbas";
					func12_DDgui_button("bv", "v", local4_size_2178, local4_size_2178);
					__debugInfo = "3630:\ddgui.gbas";
					func12_DDgui_button("bb", "b", local4_size_2178, local4_size_2178);
					__debugInfo = "3631:\ddgui.gbas";
					func12_DDgui_button("bn", "n", local4_size_2178, local4_size_2178);
					__debugInfo = "3632:\ddgui.gbas";
					func12_DDgui_button("bm", "m", local4_size_2178, local4_size_2178);
					__debugInfo = "3633:\ddgui.gbas";
					func12_DDgui_button("b\b", "<-", ((((local4_size_2178) * (2))) + (2)), local4_size_2178);
					__debugInfo = "3634:\ddgui.gbas";
					func12_DDgui_spacer(10000, 0);
					__debugInfo = "3635:\ddgui.gbas";
					func12_DDgui_button("b,", ",", local4_size_2178, local4_size_2178);
					__debugInfo = "3636:\ddgui.gbas";
					func12_DDgui_button("b.", ".", local4_size_2178, local4_size_2178);
					__debugInfo = "3637:\ddgui.gbas";
					func12_DDgui_button("b ", "", ((((local4_size_2178) * (6))) + (10)), local4_size_2178);
					__debugInfo = "3638:\ddgui.gbas";
					func12_DDgui_button("b\n", CHR_Str(182), ((((local4_size_2178) * (2))) + (2)), local4_size_2178);
					__debugInfo = "3603:\ddgui.gbas";
					
				case 11856: //dummy jumper1
					if (!((((local16___SelectHelper7__2188) == (3)) ? 1 : 0))) { __pc = 12046; break; }
					
					case 12052:
						__debugInfo = "3640:\ddgui.gbas";
						func12_DDgui_button("bá", "á", local4_size_2178, local4_size_2178);
						
					__debugInfo = "3641:\ddgui.gbas";
					func12_DDgui_button("bé", "é", local4_size_2178, local4_size_2178);
					__debugInfo = "3642:\ddgui.gbas";
					func12_DDgui_button("bí", "í", local4_size_2178, local4_size_2178);
					__debugInfo = "3643:\ddgui.gbas";
					func12_DDgui_button("bó", "ó", local4_size_2178, local4_size_2178);
					__debugInfo = "3644:\ddgui.gbas";
					func12_DDgui_button("bú", "ú", local4_size_2178, local4_size_2178);
					__debugInfo = "3645:\ddgui.gbas";
					func12_DDgui_button("bÁ", "Á", local4_size_2178, local4_size_2178);
					__debugInfo = "3646:\ddgui.gbas";
					func12_DDgui_button("bÉ", "É", local4_size_2178, local4_size_2178);
					__debugInfo = "3647:\ddgui.gbas";
					func12_DDgui_button("bÍ", "Í", local4_size_2178, local4_size_2178);
					__debugInfo = "3648:\ddgui.gbas";
					func12_DDgui_button("bÓ", "Ó", local4_size_2178, local4_size_2178);
					__debugInfo = "3649:\ddgui.gbas";
					func12_DDgui_button("bÚ", "Ú", local4_size_2178, local4_size_2178);
					__debugInfo = "3650:\ddgui.gbas";
					func12_DDgui_spacer(10000, 0);
					__debugInfo = "3651:\ddgui.gbas";
					func12_DDgui_button("bà", "à", local4_size_2178, local4_size_2178);
					__debugInfo = "3652:\ddgui.gbas";
					func12_DDgui_button("bè", "è", local4_size_2178, local4_size_2178);
					__debugInfo = "3653:\ddgui.gbas";
					func12_DDgui_button("bì", "ì", local4_size_2178, local4_size_2178);
					__debugInfo = "3654:\ddgui.gbas";
					func12_DDgui_button("bò", "ò", local4_size_2178, local4_size_2178);
					__debugInfo = "3655:\ddgui.gbas";
					func12_DDgui_button("bù", "ù", local4_size_2178, local4_size_2178);
					__debugInfo = "3656:\ddgui.gbas";
					func12_DDgui_button("b2", "À", local4_size_2178, local4_size_2178);
					__debugInfo = "3657:\ddgui.gbas";
					func12_DDgui_button("b3", "È", local4_size_2178, local4_size_2178);
					__debugInfo = "3658:\ddgui.gbas";
					func12_DDgui_button("b2", "Ì", local4_size_2178, local4_size_2178);
					__debugInfo = "3659:\ddgui.gbas";
					func12_DDgui_button("b2", "Ò", local4_size_2178, local4_size_2178);
					__debugInfo = "3660:\ddgui.gbas";
					func12_DDgui_button("b3", "Ù", local4_size_2178, local4_size_2178);
					__debugInfo = "3661:\ddgui.gbas";
					func12_DDgui_spacer(10000, 0);
					__debugInfo = "3662:\ddgui.gbas";
					func12_DDgui_button("bä", "ä", local4_size_2178, local4_size_2178);
					__debugInfo = "3663:\ddgui.gbas";
					func12_DDgui_button("bö", "ö", local4_size_2178, local4_size_2178);
					__debugInfo = "3664:\ddgui.gbas";
					func12_DDgui_button("bü", "ü", local4_size_2178, local4_size_2178);
					__debugInfo = "3665:\ddgui.gbas";
					func12_DDgui_button("bÄ", "Ä", local4_size_2178, local4_size_2178);
					__debugInfo = "3666:\ddgui.gbas";
					func12_DDgui_button("bÖ", "Ö", local4_size_2178, local4_size_2178);
					__debugInfo = "3667:\ddgui.gbas";
					func12_DDgui_button("bÜ", "Ü", local4_size_2178, local4_size_2178);
					__debugInfo = "3668:\ddgui.gbas";
					func12_DDgui_button("bß", "ß", local4_size_2178, local4_size_2178);
					__debugInfo = "3669:\ddgui.gbas";
					func12_DDgui_button("bß", "ß", local4_size_2178, local4_size_2178);
					__debugInfo = "3670:\ddgui.gbas";
					func12_DDgui_button("b\b", "<-", ((((local4_size_2178) * (2))) + (2)), local4_size_2178);
					__debugInfo = "3671:\ddgui.gbas";
					func12_DDgui_spacer(10000, 0);
					__debugInfo = "3672:\ddgui.gbas";
					func12_DDgui_button("b´", "´", local4_size_2178, local4_size_2178);
					__debugInfo = "3673:\ddgui.gbas";
					func12_DDgui_button("b`", "`", local4_size_2178, local4_size_2178);
					__debugInfo = "3674:\ddgui.gbas";
					func12_DDgui_button("b° ", "°", local4_size_2178, local4_size_2178);
					__debugInfo = "3675:\ddgui.gbas";
					func12_DDgui_button("b ", "", ((((local4_size_2178) * (5))) + (8)), local4_size_2178);
					__debugInfo = "3675:\ddgui.gbas";
					func12_DDgui_button("b\n", CHR_Str(182), ((((local4_size_2178) * (2))) + (2)), local4_size_2178);
					__debugInfo = "3676:\ddgui.gbas";
					func9_DDgui_set("b\n", "TEXT", "Enter");
					__debugInfo = "3640:\ddgui.gbas";
					
				case 12046: //dummy jumper1
					;
						
					__debugInfo = "3523:\ddgui.gbas";
					;
						
					__debugInfo = "3523:\ddgui.gbas";
					
				case 16980: //dummy jumper2
					;
					
				__debugInfo = "3681:\ddgui.gbas";
				func14_DDgui_frameend();
				__debugInfo = "3682:\ddgui.gbas";
				func9_DDgui_set("fr_keypad", "ALIGN", CAST2STRING(0));
				__debugInfo = "3684:\ddgui.gbas";
				local10_cancel_Str_2189 = "Cancel";
				case 12264:
					__debugInfo = "3685:\ddgui.gbas";
					if (!((((PLATFORMINFO_Str("LOCALE")) == ("de")) ? 1 : 0))) { __pc = 12259; break; }
					
					case 12263:
						__debugInfo = "3685:\ddgui.gbas";
						local10_cancel_Str_2189 = "Abbrechen";
						
					__debugInfo = "3685:\ddgui.gbas";
					
				case 12259: //dummy jumper1
					;
					
				__debugInfo = "3687:\ddgui.gbas";
				func12_DDgui_spacer(10000, 0);
				__debugInfo = "3688:\ddgui.gbas";
				func16_DDgui_framestart("fr_okpad", "", 0);
				__debugInfo = "3689:\ddgui.gbas";
				func12_DDgui_button("btOK", "OK", 0, local4_size_2178);
				__debugInfo = "3690:\ddgui.gbas";
				func12_DDgui_spacer(16, 1);
				__debugInfo = "3691:\ddgui.gbas";
				func12_DDgui_button("btCancel", local10_cancel_Str_2189, 0, local4_size_2178);
				__debugInfo = "3692:\ddgui.gbas";
				func14_DDgui_frameend();
				__debugInfo = "3693:\ddgui.gbas";
				func9_DDgui_set("fr_okpad", "ALIGN", CAST2STRING(0));
				__debugInfo = "3698:\ddgui.gbas";
				DIM(local8_widg_Str_2183, [0], "");
				case 12338:
					__debugInfo = "3704:\ddgui.gbas";
					var forEachSaver12338 = global11_ddgui_stack_ref[0].arrAccess(((BOUNDS(global11_ddgui_stack_ref[0], 0)) - (1))).values[tmpPositionCache][0].attr7_widgets_ref[0];
					var forEachCounter12338 = 0
					
				case 12305: //dummy for1
					if (!(forEachCounter12338 < forEachSaver12338.values.length)) {__pc = 12294; break;}
					var local1_w_ref_2191 = forEachSaver12338.values[forEachCounter12338];
					
					
					case 12337:
						__debugInfo = "3703:\ddgui.gbas";
						if (!((((((((local1_w_ref_2191[0].attr7_wid_Str).length) == (2)) ? 1 : 0)) && ((((MID_Str(local1_w_ref_2191[0].attr7_wid_Str, 0, 1)) == ("b")) ? 1 : 0))) ? 1 : 0))) { __pc = 12322; break; }
					
					case 12329:
						__debugInfo = "3701:\ddgui.gbas";
						DIMPUSH(local8_widg_Str_2183, local1_w_ref_2191[0].attr7_wid_Str);
						
					__debugInfo = "3702:\ddgui.gbas";
					local1_w_ref_2191[0].attr11_tiptext_Str_ref[0] = local1_w_ref_2191[0].attr9_wtext_Str_ref[0];
					__debugInfo = "3701:\ddgui.gbas";
					
				case 12322: //dummy jumper1
					;
						
					__debugInfo = "3703:\ddgui.gbas";
					forEachSaver12338.values[forEachCounter12338] = local1_w_ref_2191;
					
					forEachCounter12338++
					__pc = 12305; break; //back jump
					
				case 12294: //dummy for
					;
					
				__debugInfo = "3706:\ddgui.gbas";
				func9_DDgui_set("", "FOCUS", "tx_text");
				__debugInfo = "3707:\ddgui.gbas";
				func10_DDgui_show(1);
				case 12473:
					__debugInfo = "3748:\ddgui.gbas";
					if (!(1)) {__pc = 16984; break;}
					
					var local10_tab_change_2192 = 0;
					case 12353:
						__debugInfo = "3710:\ddgui.gbas";
						local10_tab_change_2192 = ~~(func9_DDgui_get("tab", "CLICKED"));
						
					__debugInfo = "3711:\ddgui.gbas";
					func9_DDgui_set("", "FOCUS", "tx_text");
					__debugInfo = "3712:\ddgui.gbas";
					func10_DDgui_show(1);
					case 12365:
						__debugInfo = "3714:\ddgui.gbas";
						if (!(local10_tab_change_2192)) { __pc = 12362; break; }
					
					case 12364:
						__debugInfo = "3714:\ddgui.gbas";
						__pc = __labels["refresh"]; break;
						
					__debugInfo = "3714:\ddgui.gbas";
					
				case 12362: //dummy jumper1
					;
						
					case 12401:
						__debugInfo = "3725:\ddgui.gbas";
						var forEachSaver12401 = local8_widg_Str_2183;
					var forEachCounter12401 = 0
					
				case 12369: //dummy for1
					if (!(forEachCounter12401 < forEachSaver12401.values.length)) {__pc = 12367; break;}
					var local5_w_Str_2193 = forEachSaver12401.values[forEachCounter12401];
					
					
					case 12400:
						__debugInfo = "3724:\ddgui.gbas";
						if (!(func9_DDgui_get(local5_w_Str_2193, "CLICKED"))) { __pc = 12373; break; }
					
					case 12381:
						__debugInfo = "3718:\ddgui.gbas";
						func9_DDgui_set("", "INKEY", MID_Str(local5_w_Str_2193, 1, 1));
						
					case 12398:
						__debugInfo = "3722:\ddgui.gbas";
						if (!((((func9_DDgui_get("tab", "SELECT")) == (1)) ? 1 : 0))) { __pc = 12388; break; }
					
					case 12393:
						__debugInfo = "3720:\ddgui.gbas";
						func9_DDgui_set("tab", "SELECT", CAST2STRING(2));
						
					__debugInfo = "3721:\ddgui.gbas";
					func9_DDgui_set("tab", "CLICKED", CAST2STRING(1));
					__debugInfo = "3720:\ddgui.gbas";
					
				case 12388: //dummy jumper1
					;
						
					case 12399:
						__debugInfo = "3723:\ddgui.gbas";
						__pc = 12367; break;
						
					__debugInfo = "3718:\ddgui.gbas";
					
				case 12373: //dummy jumper1
					;
						
					__debugInfo = "3724:\ddgui.gbas";
					forEachSaver12401.values[forEachCounter12401] = local5_w_Str_2193;
					
					forEachCounter12401++
					__pc = 12369; break; //back jump
					
				case 12367: //dummy for
					;
						
					case 12451:
						__debugInfo = "3736:\ddgui.gbas";
						if (!((((((param9_bIsNumber) ? 0 : 1)) && (func9_DDgui_get("bShift", "CLICKED"))) ? 1 : 0))) { __pc = 12409; break; }
					
					var local4_isel_2194 = 0;
					case 12416:
						__debugInfo = "3728:\ddgui.gbas";
						local4_isel_2194 = ~~(func9_DDgui_get("tab", "SELECT"));
						
					case 12450:
						__debugInfo = "3735:\ddgui.gbas";
						if (!(((((((local4_isel_2194) < (3)) ? 1 : 0)) && ((((local4_isel_2194) > (0)) ? 1 : 0))) ? 1 : 0))) { __pc = 12425; break; }
					
					case 12431:
						__debugInfo = "3730:\ddgui.gbas";
						local4_isel_2194 = ((local4_isel_2194) - (1));
						
					__debugInfo = "3731:\ddgui.gbas";
					local4_isel_2194 = ((1) - (local4_isel_2194));
					__debugInfo = "3732:\ddgui.gbas";
					local4_isel_2194 = ((1) + (local4_isel_2194));
					__debugInfo = "3733:\ddgui.gbas";
					func9_DDgui_set("tab", "SELECT", CAST2STRING(local4_isel_2194));
					__debugInfo = "3734:\ddgui.gbas";
					func9_DDgui_set("tab", "CLICKED", CAST2STRING(1));
					__debugInfo = "3730:\ddgui.gbas";
					
				case 12425: //dummy jumper1
					;
						
					__debugInfo = "3728:\ddgui.gbas";
					
				case 12409: //dummy jumper1
					;
						
					case 12462:
						__debugInfo = "3741:\ddgui.gbas";
						if (!(func9_DDgui_get("btOK", "CLICKED"))) { __pc = 12454; break; }
					
					case 12460:
						__debugInfo = "3739:\ddgui.gbas";
						param8_text_Str = func13_DDgui_get_Str("tx_text", "TEXT");
						
					case 12461:
						__debugInfo = "3740:\ddgui.gbas";
						__pc = 16984; break;
						
					__debugInfo = "3739:\ddgui.gbas";
					
				case 12454: //dummy jumper1
					;
						
					case 12471:
						__debugInfo = "3745:\ddgui.gbas";
						if (!(func9_DDgui_get("btCancel", "CLICKED"))) { __pc = 12465; break; }
					
					case 12469:
						__debugInfo = "3743:\ddgui.gbas";
						param8_text_Str = local12_text_old_Str_2180;
						
					case 12470:
						__debugInfo = "3744:\ddgui.gbas";
						__pc = 16984; break;
						
					__debugInfo = "3743:\ddgui.gbas";
					
				case 12465: //dummy jumper1
					;
						
					__debugInfo = "3747:\ddgui.gbas";
					SHOWSCREEN();
					__debugInfo = "3710:\ddgui.gbas";
					__pc = 12473; break; //back jump
					
				case 16984:
					;
					
				__debugInfo = "3750:\ddgui.gbas";
				func15_DDgui_popdialog();
				__debugInfo = "3752:\ddgui.gbas";
				global18_DDGUI_IN_INPUT_DLG = 0;
				__debugInfo = "3755:\ddgui.gbas";
				global25_gDDguiMinControlDimension = local12_storeoldsize_2186;
				__debugInfo = "3757:\ddgui.gbas";
				return tryClone(param8_text_Str);
				__debugInfo = "3758:\ddgui.gbas";
				return "";
				__debugInfo = "3427:\ddgui.gbas";__pc = -1; break;
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
window['func20_DDgui_FileDialog_Str'] = function(param5_bOpen, param13_filterstr_Str, param10_initialise) {
		var __labels = {"__DrawFrames__": 3534, "refresh_fd": 12537};
		
	stackPush("function: DDgui_FileDialog_Str", __debugInfo);
	try {
		var local12_startdir_Str_2198 = "", local8_cdir_Str_2199 = "", local9_bread_Str_2200 = new OTTArray(""), local7_pre_Str_2201 = "", local9_files_Str_2202 = new OTTArray(""), local8_num_file_2203 = 0, local7_num_dir_2204 = 0, local11_outfile_Str_2205 = "", local12_bBreadcrumbs_2206 = 0, local3_scx_ref_2207 = [0], local3_scy_ref_2208 = [0], local11_caption_Str_2209 = "", local7_tmp_Str_2211 = "", local2_ok_2214 = 0;
		var __pc = 12488;
		while(__pc >= 0) {
			switch(__pc) {
				case 12488:
					__debugInfo = "3767:\ddgui.gbas";
					local12_startdir_Str_2198 = GETCURRENTDIR_Str();
					
				__debugInfo = "3768:\ddgui.gbas";
				local8_cdir_Str_2199 = local12_startdir_Str_2198;
				__debugInfo = "3775:\ddgui.gbas";
				local12_bBreadcrumbs_2206 = 0;
				__debugInfo = "3777:\ddgui.gbas";
				GETSCREENSIZE(local3_scx_ref_2207, local3_scy_ref_2208);
				__debugInfo = "3780:\ddgui.gbas";
				local3_scx_ref_2207[0] = MIN(480, unref(local3_scx_ref_2207[0]));
				__debugInfo = "3781:\ddgui.gbas";
				local3_scy_ref_2208[0] = MIN(480, unref(local3_scy_ref_2208[0]));
				case 12530:
					__debugInfo = "3785:\ddgui.gbas";
					if (!(((((((local3_scx_ref_2207[0]) > (400)) ? 1 : 0)) && ((((local3_scy_ref_2208[0]) > (400)) ? 1 : 0))) ? 1 : 0))) { __pc = 12525; break; }
					
					case 12529:
						__debugInfo = "3784:\ddgui.gbas";
						local12_bBreadcrumbs_2206 = 1;
						
					__debugInfo = "3784:\ddgui.gbas";
					
				case 12525: //dummy jumper1
					;
					
				__debugInfo = "3786:\ddgui.gbas";
				func16_DDgui_pushdialog(0, 0, unref(local3_scx_ref_2207[0]), unref(local3_scy_ref_2208[0]), 1);
				case 12537:
					__debugInfo = "3788:\ddgui.gbas";
					//label: refresh_fd;
					
				__debugInfo = "3789:\ddgui.gbas";
				func10_DDgui_init();
				__debugInfo = "3790:\ddgui.gbas";
				func9_DDgui_set("", "MOVEABLE", CAST2STRING(1));
				__debugInfo = "3791:\ddgui.gbas";
				func9_DDgui_set("", "SCALEABLE", CAST2STRING(0));
				__debugInfo = "3792:\ddgui.gbas";
				local11_caption_Str_2209 = "Pick a file:";
				case 12560:
					__debugInfo = "3793:\ddgui.gbas";
					if (!((((PLATFORMINFO_Str("LOCALE")) == ("de")) ? 1 : 0))) { __pc = 12555; break; }
					
					case 12559:
						__debugInfo = "3793:\ddgui.gbas";
						local11_caption_Str_2209 = "Datei auswählen:";
						
					__debugInfo = "3793:\ddgui.gbas";
					
				case 12555: //dummy jumper1
					;
					
				__debugInfo = "3794:\ddgui.gbas";
				func9_DDgui_set("", "TEXT", local11_caption_Str_2209);
				__debugInfo = "3795:\ddgui.gbas";
				local8_cdir_Str_2199 = GETCURRENTDIR_Str();
				case 12574:
					__debugInfo = "3797:\ddgui.gbas";
					if (!((((param10_initialise) == (1)) ? 1 : 0))) { __pc = 12571; break; }
					
					case 12573:
						__debugInfo = "3797:\ddgui.gbas";
						func10_DDgui_init();
						
					__debugInfo = "3797:\ddgui.gbas";
					
				case 12571: //dummy jumper1
					;
					
				case 12629:
					__debugInfo = "3813:\ddgui.gbas";
					if (!((((MID_Str(local8_cdir_Str_2199, 1, 1)) == (":")) ? 1 : 0))) { __pc = 12581; break; }
					
					case 12588:
						__debugInfo = "3802:\ddgui.gbas";
						local7_pre_Str_2201 = MID_Str(local8_cdir_Str_2199, 0, 2);
						
					__debugInfo = "3803:\ddgui.gbas";
					local8_cdir_Str_2199 = MID_Str(local8_cdir_Str_2199, 2, -(1));
					__debugInfo = "3802:\ddgui.gbas";
					__pc = 16995;
					break;
					
				case 12581: //dummy jumper1
					if (!(((((((MID_Str(local8_cdir_Str_2199, 1, 1)) == ("/")) ? 1 : 0)) || ((((MID_Str(local8_cdir_Str_2199, 0, 1)) == ("~")) ? 1 : 0))) ? 1 : 0))) { __pc = 12607; break; }
					
					case 12614:
						__debugInfo = "3807:\ddgui.gbas";
						local7_pre_Str_2201 = MID_Str(local8_cdir_Str_2199, 0, 1);
						
					__debugInfo = "3808:\ddgui.gbas";
					local8_cdir_Str_2199 = MID_Str(local8_cdir_Str_2199, 1, -(1));
					__debugInfo = "3807:\ddgui.gbas";
					__pc = 16995;
					break;
					
				case 12607: //dummy jumper1
					
					case 12623:
						__debugInfo = "3811:\ddgui.gbas";
						local7_pre_Str_2201 = "";
						
					__debugInfo = "3812:\ddgui.gbas";
					local8_cdir_Str_2199 = MID_Str(local8_cdir_Str_2199, 1, -(1));
					__debugInfo = "3811:\ddgui.gbas";
					
				case 16995: //dummy jumper2
					;
					
				__debugInfo = "3814:\ddgui.gbas";
				SPLITSTR(local8_cdir_Str_2199, unref(local9_bread_Str_2200), "/", 1);
				case 12664:
					__debugInfo = "3821:\ddgui.gbas";
					if (!(local12_bBreadcrumbs_2206)) { __pc = 12636; break; }
					
					case 12638:
						__debugInfo = "3816:\ddgui.gbas";
						
					var local1_i_2210 = 0;
					case 12660:
						__debugInfo = "3819:\ddgui.gbas";
						local1_i_2210 = 0
					
				case 12641: //dummy for1
					if (!toCheck(local1_i_2210, ((BOUNDS(local9_bread_Str_2200, 0)) - (1)), 1)) {__pc = 12648; break;}
					
					case 12659:
						__debugInfo = "3818:\ddgui.gbas";
						func12_DDgui_button((("bt_br") + (CAST2STRING(local1_i_2210))), local9_bread_Str_2200.arrAccess(local1_i_2210).values[tmpPositionCache], 0, 0);
						
					__debugInfo = "3818:\ddgui.gbas";
					local1_i_2210 += 1;
					__pc = 12641; break; //back jump
					
				case 12648: //dummy for
					;
						
					__debugInfo = "3819:\ddgui.gbas";
					;
						
					__debugInfo = "3820:\ddgui.gbas";
					func12_DDgui_spacer(1000, 4);
					__debugInfo = "3816:\ddgui.gbas";
					
				case 12636: //dummy jumper1
					;
					
				__debugInfo = "3823:\ddgui.gbas";
				local8_num_file_2203 = ~~(GETFILELIST(param13_filterstr_Str, unref(local9_files_Str_2202)));
				__debugInfo = "3824:\ddgui.gbas";
				local7_num_dir_2204 = INTEGER(CAST2INT(((local8_num_file_2203) / (65536))));
				__debugInfo = "3825:\ddgui.gbas";
				local8_num_file_2203 = MOD(local8_num_file_2203, 65536);
				__debugInfo = "3827:\ddgui.gbas";
				
					var local1_i_2212 = 0;
					case 12729:
						__debugInfo = "3839:\ddgui.gbas";
						local1_i_2212 = 0
					
				case 12687: //dummy for1
					if (!toCheck(local1_i_2212, ((local7_num_dir_2204) - (1)), 1)) {__pc = 12691; break;}
					
					case 12715:
						__debugInfo = "3834:\ddgui.gbas";
						if (!((((local9_files_Str_2202.arrAccess(local1_i_2212).values[tmpPositionCache]) == (".")) ? 1 : 0))) { __pc = 12698; break; }
					
					case 12703:
						__debugInfo = "3830:\ddgui.gbas";
						DIMDEL(local9_files_Str_2202, local1_i_2212);
						
					__debugInfo = "3831:\ddgui.gbas";
					local7_num_dir_2204+=-(1);
					__debugInfo = "3832:\ddgui.gbas";
					local1_i_2212+=-(1);
					case 12714:
						__debugInfo = "3833:\ddgui.gbas";
						__pc = 12687; break;
						
					__debugInfo = "3830:\ddgui.gbas";
					
				case 12698: //dummy jumper1
					;
						
					case 12723:
						__debugInfo = "3837:\ddgui.gbas";
						if (!((local7_tmp_Str_2211).length)) { __pc = 12718; break; }
					
					case 12722:
						__debugInfo = "3836:\ddgui.gbas";
						local7_tmp_Str_2211+="|";
						
					__debugInfo = "3836:\ddgui.gbas";
					
				case 12718: //dummy jumper1
					;
						
					__debugInfo = "3838:\ddgui.gbas";
					local7_tmp_Str_2211+=local9_files_Str_2202.arrAccess(local1_i_2212).values[tmpPositionCache];
					__debugInfo = "3834:\ddgui.gbas";
					local1_i_2212 += 1;
					__pc = 12687; break; //back jump
					
				case 12691: //dummy for
					;
						
					__debugInfo = "3839:\ddgui.gbas";
					;
				__debugInfo = "3841:\ddgui.gbas";
				func11_DDgui_combo("ls_dir", local7_tmp_Str_2211, ((local3_scx_ref_2207[0]) - (20)), 0);
				__debugInfo = "3842:\ddgui.gbas";
				func9_DDgui_set("ls_dir", "SELECT", CAST2STRING(-(1)));
				__debugInfo = "3843:\ddgui.gbas";
				func12_DDgui_spacer(1000, 4);
				__debugInfo = "3845:\ddgui.gbas";
				local7_tmp_Str_2211 = "";
				__debugInfo = "3845:\ddgui.gbas";
				
					var local1_i_2213 = 0;
					case 12773:
						__debugInfo = "3849:\ddgui.gbas";
						local1_i_2213 = 0
					
				case 12751: //dummy for1
					if (!toCheck(local1_i_2213, ((local8_num_file_2203) - (1)), 1)) {__pc = 12755; break;}
					
					case 12765:
						__debugInfo = "3847:\ddgui.gbas";
						if (!((((local1_i_2213) > (0)) ? 1 : 0))) { __pc = 12760; break; }
					
					case 12764:
						__debugInfo = "3847:\ddgui.gbas";
						local7_tmp_Str_2211+="|";
						
					__debugInfo = "3847:\ddgui.gbas";
					
				case 12760: //dummy jumper1
					;
						
					__debugInfo = "3848:\ddgui.gbas";
					local7_tmp_Str_2211+=local9_files_Str_2202.arrAccess(((local1_i_2213) + (local7_num_dir_2204))).values[tmpPositionCache];
					__debugInfo = "3847:\ddgui.gbas";
					local1_i_2213 += 1;
					__pc = 12751; break; //back jump
					
				case 12755: //dummy for
					;
						
					__debugInfo = "3849:\ddgui.gbas";
					;
				__debugInfo = "3850:\ddgui.gbas";
				func10_DDgui_list("ls_file", local7_tmp_Str_2211, ((local3_scx_ref_2207[0]) - (20)), ((((local3_scy_ref_2208[0]) - (120))) - (((local12_bBreadcrumbs_2206) * (64)))));
				__debugInfo = "3851:\ddgui.gbas";
				func9_DDgui_set("ls_file", "SELECT", CAST2STRING(-(1)));
				__debugInfo = "3852:\ddgui.gbas";
				func12_DDgui_spacer(1000, 4);
				__debugInfo = "3853:\ddgui.gbas";
				func16_DDgui_singletext("tx_file", "", ((local3_scx_ref_2207[0]) - (20)));
				__debugInfo = "3854:\ddgui.gbas";
				func12_DDgui_spacer(1000, 4);
				__debugInfo = "3855:\ddgui.gbas";
				func12_DDgui_button("bt_ok", "OK", 0, 0);
				__debugInfo = "3856:\ddgui.gbas";
				func12_DDgui_button("bt_cancel", "Cancel", 0, 0);
				__debugInfo = "3858:\ddgui.gbas";
				local2_ok_2214 = 0;
				case 13122:
					__debugInfo = "3944:\ddgui.gbas";
					if (!(1)) {__pc = 17000; break;}
					
					case 12824:
						__debugInfo = "3860:\ddgui.gbas";
						func10_DDgui_show(0);
						
					case 12886:
						__debugInfo = "3877:\ddgui.gbas";
						if (!(local12_bBreadcrumbs_2206)) { __pc = 12826; break; }
					
					case 12828:
						__debugInfo = "3862:\ddgui.gbas";
						
					var local1_i_2215 = 0;
					case 12885:
						__debugInfo = "3876:\ddgui.gbas";
						local1_i_2215 = 0
					
				case 12831: //dummy for1
					if (!toCheck(local1_i_2215, ((BOUNDS(local9_bread_Str_2200, 0)) - (1)), 1)) {__pc = 12838; break;}
					
					case 12884:
						__debugInfo = "3875:\ddgui.gbas";
						if (!(func9_DDgui_get((("bt_br") + (CAST2STRING(local1_i_2215))), "CLICKED"))) { __pc = 12845; break; }
					
					case 12849:
						__debugInfo = "3865:\ddgui.gbas";
						local8_cdir_Str_2199 = local7_pre_Str_2201;
						
					__debugInfo = "3865:\ddgui.gbas";
					
					var local1_j_2216 = 0;
					case 12865:
						__debugInfo = "3869:\ddgui.gbas";
						local1_j_2216 = 0
					
				case 12853: //dummy for1
					if (!toCheck(local1_j_2216, local1_i_2215, 1)) {__pc = 12855; break;}
					
					case 12859:
						__debugInfo = "3867:\ddgui.gbas";
						local8_cdir_Str_2199+="/";
						
					__debugInfo = "3868:\ddgui.gbas";
					local8_cdir_Str_2199+=local9_bread_Str_2200.arrAccess(local1_j_2216).values[tmpPositionCache];
					__debugInfo = "3867:\ddgui.gbas";
					local1_j_2216 += 1;
					__pc = 12853; break; //back jump
					
				case 12855: //dummy for
					;
						
					__debugInfo = "3869:\ddgui.gbas";
					;
					case 12880:
						__debugInfo = "3871:\ddgui.gbas";
						if (!((((MID_Str(local8_cdir_Str_2199, (((local8_cdir_Str_2199).length) - (1)), 1)) == (":")) ? 1 : 0))) { __pc = 12875; break; }
					
					case 12879:
						__debugInfo = "3871:\ddgui.gbas";
						local8_cdir_Str_2199+="/";
						
					__debugInfo = "3871:\ddgui.gbas";
					
				case 12875: //dummy jumper1
					;
						
					__debugInfo = "3872:\ddgui.gbas";
					SETCURRENTDIR(local8_cdir_Str_2199);
					case 12883:
						__debugInfo = "3873:\ddgui.gbas";
						__pc = __labels["refresh_fd"]; break;
						
					__debugInfo = "3865:\ddgui.gbas";
					
				case 12845: //dummy jumper1
					;
						
					__debugInfo = "3875:\ddgui.gbas";
					local1_i_2215 += 1;
					__pc = 12831; break; //back jump
					
				case 12838: //dummy for
					;
						
					__debugInfo = "3876:\ddgui.gbas";
					;
						
					__debugInfo = "3862:\ddgui.gbas";
					
				case 12826: //dummy jumper1
					;
						
					case 12984:
						__debugInfo = "3895:\ddgui.gbas";
						if (!(func9_DDgui_get("ls_dir", "CLICKED"))) { __pc = 12889; break; }
					
					var local3_sel_2217 = 0;
					case 12896:
						__debugInfo = "3880:\ddgui.gbas";
						local3_sel_2217 = ~~(func9_DDgui_get("ls_dir", "SELECT"));
						
					__debugInfo = "3881:\ddgui.gbas";
					local8_cdir_Str_2199 = local7_pre_Str_2201;
					__debugInfo = "3881:\ddgui.gbas";
					
					var local1_i_2218 = 0;
					case 12921:
						__debugInfo = "3885:\ddgui.gbas";
						local1_i_2218 = 0
					
				case 12904: //dummy for1
					if (!toCheck(local1_i_2218, ((BOUNDS(local9_bread_Str_2200, 0)) - (2)), 1)) {__pc = 12911; break;}
					
					case 12915:
						__debugInfo = "3883:\ddgui.gbas";
						local8_cdir_Str_2199+="/";
						
					__debugInfo = "3884:\ddgui.gbas";
					local8_cdir_Str_2199+=local9_bread_Str_2200.arrAccess(local1_i_2218).values[tmpPositionCache];
					__debugInfo = "3883:\ddgui.gbas";
					local1_i_2218 += 1;
					__pc = 12904; break; //back jump
					
				case 12911: //dummy for
					;
						
					__debugInfo = "3885:\ddgui.gbas";
					;
					case 12965:
						__debugInfo = "3890:\ddgui.gbas";
						if (!((((local9_files_Str_2202.arrAccess(local3_sel_2217).values[tmpPositionCache]) != ("..")) ? 1 : 0))) { __pc = 12927; break; }
					
					case 12944:
						__debugInfo = "3887:\ddgui.gbas";
						if (!(BOUNDS(local9_bread_Str_2200, 0))) { __pc = 12933; break; }
					
					case 12943:
						__debugInfo = "3887:\ddgui.gbas";
						local8_cdir_Str_2199+=(("/") + (local9_bread_Str_2200.arrAccess(-(1)).values[tmpPositionCache]));
						
					__debugInfo = "3887:\ddgui.gbas";
					
				case 12933: //dummy jumper1
					;
						
					__debugInfo = "3888:\ddgui.gbas";
					DEBUG((((((((("sel: ") + (CAST2STRING(local3_sel_2217)))) + (" = "))) + (func21_DDgui_getitemtext_Str("ls_dir", local3_sel_2217)))) + ("\n")));
					__debugInfo = "3889:\ddgui.gbas";
					local8_cdir_Str_2199+=(("/") + (func21_DDgui_getitemtext_Str("ls_dir", local3_sel_2217)));
					__debugInfo = "3887:\ddgui.gbas";
					
				case 12927: //dummy jumper1
					;
						
					case 12980:
						__debugInfo = "3892:\ddgui.gbas";
						if (!((((MID_Str(local8_cdir_Str_2199, (((local8_cdir_Str_2199).length) - (1)), 1)) == (":")) ? 1 : 0))) { __pc = 12975; break; }
					
					case 12979:
						__debugInfo = "3892:\ddgui.gbas";
						local8_cdir_Str_2199+="/";
						
					__debugInfo = "3892:\ddgui.gbas";
					
				case 12975: //dummy jumper1
					;
						
					__debugInfo = "3893:\ddgui.gbas";
					SETCURRENTDIR(local8_cdir_Str_2199);
					case 12983:
						__debugInfo = "3894:\ddgui.gbas";
						__pc = __labels["refresh_fd"]; break;
						
					__debugInfo = "3880:\ddgui.gbas";
					
				case 12889: //dummy jumper1
					;
						
					case 12997:
						__debugInfo = "3899:\ddgui.gbas";
						if (!(func9_DDgui_get("ls_file", "CLICKED"))) { __pc = 12987; break; }
					
					case 12996:
						__debugInfo = "3898:\ddgui.gbas";
						func9_DDgui_set("tx_file", "TEXT", func21_DDgui_getitemtext_Str("ls_file", ~~(func9_DDgui_get("ls_file", "SELECT"))));
						
					__debugInfo = "3898:\ddgui.gbas";
					
				case 12987: //dummy jumper1
					;
						
					case 13114:
						__debugInfo = "3937:\ddgui.gbas";
						if (!(func9_DDgui_get("bt_ok", "CLICKED"))) { __pc = 13000; break; }
					
					case 13006:
						__debugInfo = "3904:\ddgui.gbas";
						local11_outfile_Str_2205 = func13_DDgui_get_Str("tx_file", "TEXT");
						
					case 13112:
						__debugInfo = "3934:\ddgui.gbas";
						if (!((local11_outfile_Str_2205).length)) { __pc = 13009; break; }
					
					case 13013:
						__debugInfo = "3907:\ddgui.gbas";
						local8_cdir_Str_2199 = GETCURRENTDIR_Str();
						
					case 13038:
						__debugInfo = "3912:\ddgui.gbas";
						if (!((((MID_Str(local8_cdir_Str_2199, (((local8_cdir_Str_2199).length) - (1)), 1)) == ("/")) ? 1 : 0))) { __pc = 13023; break; }
					
					case 13029:
						__debugInfo = "3909:\ddgui.gbas";
						local11_outfile_Str_2205 = ((local8_cdir_Str_2199) + (local11_outfile_Str_2205));
						
					__debugInfo = "3909:\ddgui.gbas";
					__pc = 17011;
					break;
					
				case 13023: //dummy jumper1
					
					case 13037:
						__debugInfo = "3911:\ddgui.gbas";
						local11_outfile_Str_2205 = ((((local8_cdir_Str_2199) + ("/"))) + (local11_outfile_Str_2205));
						
					__debugInfo = "3911:\ddgui.gbas";
					
				case 17011: //dummy jumper2
					;
						
					case 13111:
						__debugInfo = "3933:\ddgui.gbas";
						if (!(param5_bOpen)) { __pc = 13040; break; }
					
					case 13049:
						__debugInfo = "3915:\ddgui.gbas";
						if (!(DOESFILEEXIST(local11_outfile_Str_2205))) { __pc = 13044; break; }
					
					case 13048:
						__debugInfo = "3915:\ddgui.gbas";
						local2_ok_2214 = 1;
						
					__debugInfo = "3915:\ddgui.gbas";
					
				case 13044: //dummy jumper1
					;
						
					__debugInfo = "3915:\ddgui.gbas";
					__pc = 17012;
					break;
					
				case 13040: //dummy jumper1
					
					var local7_ext_Str_2219 = "", local8_cext_Str_2220 = "";
					case 13060:
						__debugInfo = "3919:\ddgui.gbas";
						local7_ext_Str_2219 = MID_Str(param13_filterstr_Str, ((INSTR(param13_filterstr_Str, ".", 0)) + (1)), -(1));
						
					__debugInfo = "3920:\ddgui.gbas";
					local8_cext_Str_2220 = MID_Str(local11_outfile_Str_2205, (((local11_outfile_Str_2205).length) - ((local7_ext_Str_2219).length)), (local7_ext_Str_2219).length);
					case 13089:
						__debugInfo = "3923:\ddgui.gbas";
						if (!(((((((local7_ext_Str_2219) != ("*")) ? 1 : 0)) && ((((LCASE_Str(local8_cext_Str_2220)) != (LCASE_Str(local7_ext_Str_2219))) ? 1 : 0))) ? 1 : 0))) { __pc = 13082; break; }
					
					case 13088:
						__debugInfo = "3922:\ddgui.gbas";
						local11_outfile_Str_2205+=((".") + (local7_ext_Str_2219));
						
					__debugInfo = "3922:\ddgui.gbas";
					
				case 13082: //dummy jumper1
					;
						
					case 13110:
						__debugInfo = "3932:\ddgui.gbas";
						if (!(DOESFILEEXIST(local11_outfile_Str_2205))) { __pc = 13092; break; }
					
					case 13096:
						__debugInfo = "3926:\ddgui.gbas";
						local2_ok_2214 = 1;
						
					__debugInfo = "3926:\ddgui.gbas";
					__pc = 17015;
					break;
					
				case 13092: //dummy jumper1
					
					case 13109:
						__debugInfo = "3931:\ddgui.gbas";
						if (!(OPENFILE(1, local11_outfile_Str_2205, 0))) { __pc = 13102; break; }
					
					case 13105:
						__debugInfo = "3929:\ddgui.gbas";
						CLOSEFILE(1);
						
					__debugInfo = "3930:\ddgui.gbas";
					local2_ok_2214 = 1;
					__debugInfo = "3929:\ddgui.gbas";
					
				case 13102: //dummy jumper1
					;
						
					__debugInfo = "3931:\ddgui.gbas";
					
				case 17015: //dummy jumper2
					;
						
					__debugInfo = "3919:\ddgui.gbas";
					
				case 17012: //dummy jumper2
					;
						
					__debugInfo = "3907:\ddgui.gbas";
					
				case 13009: //dummy jumper1
					;
						
					case 13113:
						__debugInfo = "3936:\ddgui.gbas";
						__pc = 17000; break;
						
					__debugInfo = "3904:\ddgui.gbas";
					
				case 13000: //dummy jumper1
					;
						
					case 13120:
						__debugInfo = "3941:\ddgui.gbas";
						if (!(func9_DDgui_get("bt_cancel", "CLICKED"))) { __pc = 13117; break; }
					
					case 13119:
						__debugInfo = "3940:\ddgui.gbas";
						__pc = 17000; break;
						
					__debugInfo = "3940:\ddgui.gbas";
					
				case 13117: //dummy jumper1
					;
						
					__debugInfo = "3943:\ddgui.gbas";
					SHOWSCREEN();
					__debugInfo = "3860:\ddgui.gbas";
					__pc = 13122; break; //back jump
					
				case 17000:
					;
					
				__debugInfo = "3946:\ddgui.gbas";
				func15_DDgui_popdialog();
				__debugInfo = "3948:\ddgui.gbas";
				SETCURRENTDIR(local12_startdir_Str_2198);
				case 13131:
					__debugInfo = "3949:\ddgui.gbas";
					if (!(local2_ok_2214)) { __pc = 13127; break; }
					
					case 13130:
						__debugInfo = "3949:\ddgui.gbas";
						return tryClone(local11_outfile_Str_2205);
						
					__debugInfo = "3949:\ddgui.gbas";
					
				case 13127: //dummy jumper1
					;
					
				__debugInfo = "3951:\ddgui.gbas";
				return "";
				__debugInfo = "3952:\ddgui.gbas";
				return "";
				__debugInfo = "3767:\ddgui.gbas";__pc = -1; break;
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
window['func14_DDgui_ColorDlg'] = function(param5_color) {
	stackPush("function: DDgui_ColorDlg", __debugInfo);
	try {
		var local7_screenx_ref_2222 = [0], local7_screeny_ref_2223 = [0], local2_tx_ref_2224 = [0], local2_ty_ref_2225 = [0], local1_x_2226 = 0, local1_y_2227 = 0, local1_w_2228 = 0, local1_r_2229 = 0.0, local1_g_2230 = 0.0, local1_b_2231 = 0.0, local1_h_2232 = 0.0, local8_oldcolor_2233 = 0;
		__debugInfo = "4013:\ddgui.gbas";
		local8_oldcolor_2233 = param5_color;
		__debugInfo = "4015:\ddgui.gbas";
		local1_r_2229 = ((bAND(param5_color, 255)) / (255));
		__debugInfo = "4016:\ddgui.gbas";
		local1_g_2230 = ((bAND(param5_color, 65280)) / (65280));
		__debugInfo = "4017:\ddgui.gbas";
		local1_b_2231 = ((bAND(param5_color, 16711680)) / (16711680));
		__debugInfo = "4018:\ddgui.gbas";
		local1_h_2232 = 0.5;
		__debugInfo = "4020:\ddgui.gbas";
		GETFONTSIZE(local2_tx_ref_2224, local2_ty_ref_2225);
		__debugInfo = "4021:\ddgui.gbas";
		GETSCREENSIZE(local7_screenx_ref_2222, local7_screeny_ref_2223);
		__debugInfo = "4023:\ddgui.gbas";
		func16_DDgui_pushdialog(0, 0, 240, 240, 0);
		__debugInfo = "4024:\ddgui.gbas";
		func9_DDgui_set("", "MOVEABLE", CAST2STRING(1));
		__debugInfo = "4025:\ddgui.gbas";
		func9_DDgui_set("", "TEXT", "Color Picker");
		__debugInfo = "4026:\ddgui.gbas";
		func16_DDgui_framestart("", "", 0);
		__debugInfo = "4027:\ddgui.gbas";
		func12_DDgui_widget("", "R", 0, 0);
		__debugInfo = "4028:\ddgui.gbas";
		func12_DDgui_slider("sl_R", local1_r_2229, 0, 0);
		__debugInfo = "4029:\ddgui.gbas";
		func16_DDgui_numbertext("tx_R", CAST2STRING(INTEGER(((local1_r_2229) * (255.1)))), ((local2_tx_ref_2224[0]) * (3)));
		__debugInfo = "4030:\ddgui.gbas";
		func9_DDgui_set("tx_R", "READONLY", CAST2STRING(1));
		__debugInfo = "4031:\ddgui.gbas";
		func9_DDgui_set("tx_R", "STEP", CAST2STRING(16));
		__debugInfo = "4032:\ddgui.gbas";
		func12_DDgui_spacer(10000, 0);
		__debugInfo = "4033:\ddgui.gbas";
		func12_DDgui_widget("", "G", 0, 0);
		__debugInfo = "4034:\ddgui.gbas";
		func12_DDgui_slider("sl_G", local1_g_2230, 0, 0);
		__debugInfo = "4035:\ddgui.gbas";
		func16_DDgui_numbertext("tx_G", CAST2STRING(INTEGER(((local1_g_2230) * (255.1)))), ((local2_tx_ref_2224[0]) * (3)));
		__debugInfo = "4036:\ddgui.gbas";
		func9_DDgui_set("tx_G", "READONLY", CAST2STRING(1));
		__debugInfo = "4037:\ddgui.gbas";
		func9_DDgui_set("tx_G", "STEP", CAST2STRING(16));
		__debugInfo = "4038:\ddgui.gbas";
		func12_DDgui_spacer(10000, 0);
		__debugInfo = "4039:\ddgui.gbas";
		func12_DDgui_widget("", "B", 0, 0);
		__debugInfo = "4040:\ddgui.gbas";
		func12_DDgui_slider("sl_B", local1_b_2231, 0, 0);
		__debugInfo = "4041:\ddgui.gbas";
		func16_DDgui_numbertext("tx_B", CAST2STRING(INTEGER(((local1_b_2231) * (255.1)))), ((local2_tx_ref_2224[0]) * (3)));
		__debugInfo = "4042:\ddgui.gbas";
		func9_DDgui_set("tx_B", "READONLY", CAST2STRING(1));
		__debugInfo = "4043:\ddgui.gbas";
		func9_DDgui_set("tx_B", "STEP", CAST2STRING(16));
		__debugInfo = "4044:\ddgui.gbas";
		func12_DDgui_spacer(10000, 0);
		__debugInfo = "4045:\ddgui.gbas";
		func12_DDgui_widget("", "H", 0, 0);
		__debugInfo = "4046:\ddgui.gbas";
		func12_DDgui_slider("sl_H", local1_h_2232, 0, 0);
		__debugInfo = "4047:\ddgui.gbas";
		func16_DDgui_numbertext("tx_H", CAST2STRING(INTEGER(((local1_h_2232) * (100.1)))), ((local2_tx_ref_2224[0]) * (3)));
		__debugInfo = "4048:\ddgui.gbas";
		func9_DDgui_set("tx_H", "READONLY", CAST2STRING(1));
		__debugInfo = "4049:\ddgui.gbas";
		func9_DDgui_set("tx_H", "STEP", CAST2STRING(6.25));
		__debugInfo = "4050:\ddgui.gbas";
		func14_DDgui_frameend();
		__debugInfo = "4052:\ddgui.gbas";
		func12_DDgui_button("bt_col", (("SPR_C") + (CAST2STRING(param5_color))), 32, 128);
		__debugInfo = "4053:\ddgui.gbas";
		func9_DDgui_set("bt_col", "WIDTH", CAST2STRING(32));
		__debugInfo = "4054:\ddgui.gbas";
		func9_DDgui_set("bt_col", "READONLY", CAST2STRING(1));
		__debugInfo = "4056:\ddgui.gbas";
		func12_DDgui_spacer(10000, 0);
		__debugInfo = "4058:\ddgui.gbas";
		func16_DDgui_framestart("fr_center", "", 0);
		__debugInfo = "4059:\ddgui.gbas";
		func12_DDgui_button("bt_ok", "OK", 64, 32);
		__debugInfo = "4060:\ddgui.gbas";
		func12_DDgui_button("bt_cancel", "Cancel", 128, 32);
		__debugInfo = "4061:\ddgui.gbas";
		func14_DDgui_frameend();
		__debugInfo = "4062:\ddgui.gbas";
		func9_DDgui_set("fr_center", "ALIGN", CAST2STRING(0));
		__debugInfo = "4107:\ddgui.gbas";
		while (1) {
			__debugInfo = "4065:\ddgui.gbas";
			func10_DDgui_show(0);
			__debugInfo = "4088:\ddgui.gbas";
			if ((((((((((func9_DDgui_get("sl_R", "CLICKED")) || (func9_DDgui_get("sl_G", "CLICKED"))) ? 1 : 0)) || (func9_DDgui_get("sl_B", "CLICKED"))) ? 1 : 0)) || (func9_DDgui_get("sl_H", "CLICKED"))) ? 1 : 0)) {
				__debugInfo = "4067:\ddgui.gbas";
				local1_r_2229 = func9_DDgui_get("sl_R", "TEXT");
				__debugInfo = "4068:\ddgui.gbas";
				local1_g_2230 = func9_DDgui_get("sl_G", "TEXT");
				__debugInfo = "4069:\ddgui.gbas";
				local1_b_2231 = func9_DDgui_get("sl_B", "TEXT");
				__debugInfo = "4070:\ddgui.gbas";
				local1_h_2232 = ((2) * (func9_DDgui_get("sl_H", "TEXT")));
				__debugInfo = "4081:\ddgui.gbas";
				if ((((local1_h_2232) <= (1)) ? 1 : 0)) {
					__debugInfo = "4073:\ddgui.gbas";
					local1_r_2229 = ((local1_h_2232) * (local1_r_2229));
					__debugInfo = "4074:\ddgui.gbas";
					local1_g_2230 = ((local1_h_2232) * (local1_g_2230));
					__debugInfo = "4075:\ddgui.gbas";
					local1_b_2231 = ((local1_h_2232) * (local1_b_2231));
					__debugInfo = "4073:\ddgui.gbas";
				} else {
					__debugInfo = "4077:\ddgui.gbas";
					local1_h_2232 = ((local1_h_2232) - (1));
					__debugInfo = "4078:\ddgui.gbas";
					local1_r_2229 = MIN(1, MAX(0, ((((local1_h_2232) * (((1) - (local1_r_2229))))) + (local1_r_2229))));
					__debugInfo = "4079:\ddgui.gbas";
					local1_g_2230 = MIN(1, MAX(0, ((((local1_h_2232) * (((1) - (local1_g_2230))))) + (local1_g_2230))));
					__debugInfo = "4080:\ddgui.gbas";
					local1_b_2231 = MIN(1, MAX(0, ((((local1_h_2232) * (((1) - (local1_b_2231))))) + (local1_b_2231))));
					__debugInfo = "4077:\ddgui.gbas";
				};
				__debugInfo = "4082:\ddgui.gbas";
				param5_color = RGB(~~(((local1_r_2229) * (255))), ~~(((local1_g_2230) * (255))), ~~(((local1_b_2231) * (255))));
				__debugInfo = "4083:\ddgui.gbas";
				func9_DDgui_set("tx_R", "TEXT", CAST2STRING(INTEGER(((local1_r_2229) * (255.1)))));
				__debugInfo = "4084:\ddgui.gbas";
				func9_DDgui_set("tx_G", "TEXT", CAST2STRING(INTEGER(((local1_g_2230) * (255.1)))));
				__debugInfo = "4085:\ddgui.gbas";
				func9_DDgui_set("tx_B", "TEXT", CAST2STRING(INTEGER(((local1_b_2231) * (255.1)))));
				__debugInfo = "4086:\ddgui.gbas";
				func9_DDgui_set("tx_H", "TEXT", CAST2STRING(INTEGER(((local1_h_2232) * (100.1)))));
				__debugInfo = "4087:\ddgui.gbas";
				func9_DDgui_set("bt_col", "TEXT", (("SPR_C") + (CAST2STRING(param5_color))));
				__debugInfo = "4067:\ddgui.gbas";
			};
			__debugInfo = "4090:\ddgui.gbas";
			local1_x_2226 = ((global11_ddgui_stack_ref[0].arrAccess(-(1)).values[tmpPositionCache][0].attr4_xpos) + (((local2_tx_ref_2224[0]) * (2))));
			__debugInfo = "4091:\ddgui.gbas";
			local1_y_2227 = ((global11_ddgui_stack_ref[0].arrAccess(-(1)).values[tmpPositionCache][0].attr4_ypos) + (((local2_ty_ref_2225[0]) * (2))));
			__debugInfo = "4092:\ddgui.gbas";
			local1_w_2228 = 128;
			__debugInfo = "4093:\ddgui.gbas";
			local1_h_2232 = 48;
			__debugInfo = "4098:\ddgui.gbas";
			SHOWSCREEN();
			__debugInfo = "4100:\ddgui.gbas";
			if (func9_DDgui_get("bt_ok", "CLICKED")) {
				__debugInfo = "4100:\ddgui.gbas";
				break;
				__debugInfo = "4100:\ddgui.gbas";
			};
			__debugInfo = "4104:\ddgui.gbas";
			if (func9_DDgui_get("bt_cancel", "CLICKED")) {
				__debugInfo = "4102:\ddgui.gbas";
				param5_color = local8_oldcolor_2233;
				__debugInfo = "4103:\ddgui.gbas";
				break;
				__debugInfo = "4102:\ddgui.gbas";
			};
			__debugInfo = "4106:\ddgui.gbas";
			HIBERNATE();
			__debugInfo = "4065:\ddgui.gbas";
		};
		__debugInfo = "4109:\ddgui.gbas";
		func15_DDgui_popdialog();
		__debugInfo = "4110:\ddgui.gbas";
		return tryClone(param5_color);
		__debugInfo = "4111:\ddgui.gbas";
		return 0;
		__debugInfo = "4013:\ddgui.gbas";
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
window['func18_DDgui_CenterDialog'] = function() {
	stackPush("function: DDgui_CenterDialog", __debugInfo);
	try {
		var local3_scx_ref_2234 = [0], local3_scy_ref_2235 = [0], local1_w_2236 = 0, local1_h_2237 = 0;
		__debugInfo = "4115:\ddgui.gbas";
		GETSCREENSIZE(local3_scx_ref_2234, local3_scy_ref_2235);
		__debugInfo = "4117:\ddgui.gbas";
		local1_w_2236 = ~~(func9_DDgui_get("", "WIDTH"));
		__debugInfo = "4118:\ddgui.gbas";
		local1_h_2237 = ~~(func9_DDgui_get("", "HEIGHT"));
		__debugInfo = "4119:\ddgui.gbas";
		func9_DDgui_set("", "XPOS", CAST2STRING(CAST2INT(((((local3_scx_ref_2234[0]) - (local1_w_2236))) / (2)))));
		__debugInfo = "4120:\ddgui.gbas";
		func9_DDgui_set("", "YPOS", CAST2STRING(CAST2INT(((((local3_scy_ref_2235[0]) - (local1_h_2237))) / (2)))));
		__debugInfo = "4121:\ddgui.gbas";
		return 0;
		__debugInfo = "4115:\ddgui.gbas";
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
window['method13_type7_TObject_12_ToString_Str'] = function(param4_self) {
	stackPush("method: ToString_Str", __debugInfo);
	try {
		__debugInfo = "4133:\ddgui.gbas";
		return "Object";
		__debugInfo = "4134:\ddgui.gbas";
		return "";
		__debugInfo = "4133:\ddgui.gbas";
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
window['method13_type7_TObject_6_Equals'] = function(param3_Obj, param4_self) {
	stackPush("method: Equals", __debugInfo);
	try {
		__debugInfo = "4140:\ddgui.gbas";
		if ((((param3_Obj) == (param4_self)) ? 1 : 0)) {
			__debugInfo = "4137:\ddgui.gbas";
			return 1;
			__debugInfo = "4137:\ddgui.gbas";
		} else {
			__debugInfo = "4139:\ddgui.gbas";
			return tryClone(0);
			__debugInfo = "4139:\ddgui.gbas";
		};
		__debugInfo = "4141:\ddgui.gbas";
		return 0;
		__debugInfo = "4140:\ddgui.gbas";
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
window['method13_type7_TObject_10_ToHashCode'] = function(param4_self) {
	stackPush("method: ToHashCode", __debugInfo);
	try {
		__debugInfo = "4143:\ddgui.gbas";
		return 0;
		__debugInfo = "4144:\ddgui.gbas";
		return 0;
		__debugInfo = "4143:\ddgui.gbas";
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
window['DDgui_userfunction'] = function() {
	return function() { throwError("NullPrototypeException"); };
};
var vtbl_type11_DDGUI_ENTRY = {
	ToString_Str: method13_type7_TObject_12_ToString_Str, 
	Equals: method13_type7_TObject_6_Equals, 
	ToHashCode: method13_type7_TObject_10_ToHashCode
};
window ['type11_DDGUI_ENTRY'] = function() {
	this.attr7_key_Str = "";
	this.attr7_val_Str = "";
	this.vtbl = vtbl_type11_DDGUI_ENTRY;
	return this;
	
};
window['type11_DDGUI_ENTRY'].prototype.clone = function() {
	var other = new type11_DDGUI_ENTRY();
	other.attr7_key_Str = this.attr7_key_Str;
	other.attr7_val_Str = this.attr7_val_Str;
	other.vtbl = this.vtbl;
	return other;
};
type11_DDGUI_ENTRY.prototype.ToString_Str = function() {
	 return this.vtbl.ToString_Str(this);
};
type11_DDGUI_ENTRY.prototype.Equals = function() {
	 return this.vtbl.Equals(arguments[0], this);
};
type11_DDGUI_ENTRY.prototype.ToHashCode = function() {
	 return this.vtbl.ToHashCode(this);
};
var vtbl_type9_DDGUI_WDG = {
	ToString_Str: method13_type7_TObject_12_ToString_Str, 
	Equals: method13_type7_TObject_6_Equals, 
	ToHashCode: method13_type7_TObject_10_ToHashCode
};
window ['type9_DDGUI_WDG'] = function() {
	this.attr7_wid_Str = "";
	this.attr9_wtype_Str = "";
	this.attr9_wtext_Str_ref = [""];
	this.attr5_wxpos = 0;
	this.attr5_wypos = 0;
	this.attr6_wwidth = 0;
	this.attr7_wheight = 0;
	this.attr6_whover = 0;
	this.attr5_whide = 0;
	this.attr11_wfilter_Str = "";
	this.attr11_tiptext_Str_ref = [""];
	this.attr8_wclicked = 0;
	this.attr7_wselect = 0;
	this.attr6_wcount = 0;
	this.attr9_wreadonly = 0;
	this.attr9_wselstart = 0;
	this.attr7_wselend = 0;
	this.attr7_wminval = 0.0;
	this.attr7_wmaxval = 0.0;
	this.attr5_wstep = 0.0;
	this.attr7_wscroll = 0;
	this.attr10_wscrollmax = 0;
	this.attr7_wcaretx = 0;
	this.attr7_wcarety = 0;
	this.attr6_wframe = 0;
	this.attr6_walign = 0;
	this.attr8_wuserfoo_ref = [DDgui_userfunction];
	this.vtbl = vtbl_type9_DDGUI_WDG;
	this.attr5_whide = 0;
	this.attr7_wminval = 0;
	this.attr7_wmaxval = 1;
	this.attr5_wstep = 0.1;
	this.attr6_wframe = 0;
	this.attr6_walign = -(1);
	return this;
	
};
window['type9_DDGUI_WDG'].prototype.clone = function() {
	var other = new type9_DDGUI_WDG();
	other.attr7_wid_Str = this.attr7_wid_Str;
	other.attr9_wtype_Str = this.attr9_wtype_Str;
	other.attr9_wtext_Str_ref = tryClone(this.attr9_wtext_Str_ref);
	other.attr5_wxpos = this.attr5_wxpos;
	other.attr5_wypos = this.attr5_wypos;
	other.attr6_wwidth = this.attr6_wwidth;
	other.attr7_wheight = this.attr7_wheight;
	other.attr6_whover = this.attr6_whover;
	other.attr5_whide = this.attr5_whide;
	other.attr11_wfilter_Str = this.attr11_wfilter_Str;
	other.attr11_tiptext_Str_ref = tryClone(this.attr11_tiptext_Str_ref);
	other.attr8_wclicked = this.attr8_wclicked;
	other.attr7_wselect = this.attr7_wselect;
	other.attr6_wcount = this.attr6_wcount;
	other.attr9_wreadonly = this.attr9_wreadonly;
	other.attr9_wselstart = this.attr9_wselstart;
	other.attr7_wselend = this.attr7_wselend;
	other.attr7_wminval = this.attr7_wminval;
	other.attr7_wmaxval = this.attr7_wmaxval;
	other.attr5_wstep = this.attr5_wstep;
	other.attr7_wscroll = this.attr7_wscroll;
	other.attr10_wscrollmax = this.attr10_wscrollmax;
	other.attr7_wcaretx = this.attr7_wcaretx;
	other.attr7_wcarety = this.attr7_wcarety;
	other.attr6_wframe = this.attr6_wframe;
	other.attr6_walign = this.attr6_walign;
	other.attr8_wuserfoo_ref = tryClone(this.attr8_wuserfoo_ref);
	other.vtbl = this.vtbl;
	return other;
};
type9_DDGUI_WDG.prototype.ToString_Str = function() {
	 return this.vtbl.ToString_Str(this);
};
type9_DDGUI_WDG.prototype.Equals = function() {
	 return this.vtbl.Equals(arguments[0], this);
};
type9_DDGUI_WDG.prototype.ToHashCode = function() {
	 return this.vtbl.ToHashCode(this);
};
var vtbl_type11_DDGUI_ORDER = {
	ToString_Str: method13_type7_TObject_12_ToString_Str, 
	Equals: method13_type7_TObject_6_Equals, 
	ToHashCode: method13_type7_TObject_10_ToHashCode
};
window ['type11_DDGUI_ORDER'] = function() {
	this.attr6_id_Str_ref = [""];
	this.attr5_index = 0;
	this.vtbl = vtbl_type11_DDGUI_ORDER;
	return this;
	
};
window['type11_DDGUI_ORDER'].prototype.clone = function() {
	var other = new type11_DDGUI_ORDER();
	other.attr6_id_Str_ref = tryClone(this.attr6_id_Str_ref);
	other.attr5_index = this.attr5_index;
	other.vtbl = this.vtbl;
	return other;
};
type11_DDGUI_ORDER.prototype.ToString_Str = function() {
	 return this.vtbl.ToString_Str(this);
};
type11_DDGUI_ORDER.prototype.Equals = function() {
	 return this.vtbl.Equals(arguments[0], this);
};
type11_DDGUI_ORDER.prototype.ToHashCode = function() {
	 return this.vtbl.ToHashCode(this);
};
var vtbl_type10_DDGUI_AUTO = {
	ToString_Str: method13_type7_TObject_12_ToString_Str, 
	Equals: method13_type7_TObject_6_Equals, 
	ToHashCode: method13_type7_TObject_10_ToHashCode
};
window ['type10_DDGUI_AUTO'] = function() {
	this.attr10_idfrom_Str = "";
	this.attr8_idto_Str = "";
	this.attr11_objfrom_Str = "";
	this.attr9_objto_Str = "";
	this.vtbl = vtbl_type10_DDGUI_AUTO;
	return this;
	
};
window['type10_DDGUI_AUTO'].prototype.clone = function() {
	var other = new type10_DDGUI_AUTO();
	other.attr10_idfrom_Str = this.attr10_idfrom_Str;
	other.attr8_idto_Str = this.attr8_idto_Str;
	other.attr11_objfrom_Str = this.attr11_objfrom_Str;
	other.attr9_objto_Str = this.attr9_objto_Str;
	other.vtbl = this.vtbl;
	return other;
};
type10_DDGUI_AUTO.prototype.ToString_Str = function() {
	 return this.vtbl.ToString_Str(this);
};
type10_DDGUI_AUTO.prototype.Equals = function() {
	 return this.vtbl.Equals(arguments[0], this);
};
type10_DDGUI_AUTO.prototype.ToHashCode = function() {
	 return this.vtbl.ToHashCode(this);
};
var vtbl_type9_DDGUI_DLG = {
	ToString_Str: method13_type7_TObject_12_ToString_Str, 
	Equals: method13_type7_TObject_6_Equals, 
	ToHashCode: method13_type7_TObject_10_ToHashCode
};
window ['type9_DDGUI_DLG'] = function() {
	this.attr9_focus_Str = "";
	this.attr8_moveable = 0;
	this.attr6_moving = 0;
	this.attr9_scaleable = 0;
	this.attr8_scaleing = 0;
	this.attr10_col_bright = 0;
	this.attr8_col_norm = 0;
	this.attr16_col_hover_bright = 0;
	this.attr14_col_hover_norm = 0;
	this.attr13_dlg_inkey_Str = "";
	this.attr4_xpos = 0;
	this.attr4_ypos = 0;
	this.attr5_rectx = 0;
	this.attr5_recty = 0;
	this.attr5_rectw = 0;
	this.attr5_recth = 0;
	this.attr10_realheight = 0;
	this.attr15_kick_intern_dlg = 0;
	this.attr18_kick_intern_id_Str = "";
	this.attr4_main = new type9_DDGUI_WDG();
	this.attr5_autos = new OTTArray(new type10_DDGUI_AUTO());
	this.attr7_widgets_ref = [new OTTArray([new type9_DDGUI_WDG()])];
	this.attr9_draworder = new OTTArray(new type11_DDGUI_ORDER());
	this.vtbl = vtbl_type9_DDGUI_DLG;
	return this;
	
};
window['type9_DDGUI_DLG'].prototype.clone = function() {
	var other = new type9_DDGUI_DLG();
	other.attr9_focus_Str = this.attr9_focus_Str;
	other.attr8_moveable = this.attr8_moveable;
	other.attr6_moving = this.attr6_moving;
	other.attr9_scaleable = this.attr9_scaleable;
	other.attr8_scaleing = this.attr8_scaleing;
	other.attr10_col_bright = this.attr10_col_bright;
	other.attr8_col_norm = this.attr8_col_norm;
	other.attr16_col_hover_bright = this.attr16_col_hover_bright;
	other.attr14_col_hover_norm = this.attr14_col_hover_norm;
	other.attr13_dlg_inkey_Str = this.attr13_dlg_inkey_Str;
	other.attr4_xpos = this.attr4_xpos;
	other.attr4_ypos = this.attr4_ypos;
	other.attr5_rectx = this.attr5_rectx;
	other.attr5_recty = this.attr5_recty;
	other.attr5_rectw = this.attr5_rectw;
	other.attr5_recth = this.attr5_recth;
	other.attr10_realheight = this.attr10_realheight;
	other.attr15_kick_intern_dlg = this.attr15_kick_intern_dlg;
	other.attr18_kick_intern_id_Str = this.attr18_kick_intern_id_Str;
	other.attr4_main = tryClone(this.attr4_main);
	other.attr5_autos = tryClone(this.attr5_autos);
	other.attr7_widgets_ref = tryClone(this.attr7_widgets_ref);
	other.attr9_draworder = tryClone(this.attr9_draworder);
	other.vtbl = this.vtbl;
	return other;
};
type9_DDGUI_DLG.prototype.ToString_Str = function() {
	 return this.vtbl.ToString_Str(this);
};
type9_DDGUI_DLG.prototype.Equals = function() {
	 return this.vtbl.Equals(arguments[0], this);
};
type9_DDGUI_DLG.prototype.ToHashCode = function() {
	 return this.vtbl.ToHashCode(this);
};
var vtbl_type10_DDGUI_FONT = {
	ToString_Str: method13_type7_TObject_12_ToString_Str, 
	Equals: method13_type7_TObject_6_Equals, 
	ToHashCode: method13_type7_TObject_10_ToHashCode
};
window ['type10_DDGUI_FONT'] = function() {
	this.attr4_left = new OTTArray(0);
	this.attr5_width = new OTTArray(0);
	this.attr11_bHasKerning = 0;
	this.vtbl = vtbl_type10_DDGUI_FONT;
	this.attr11_bHasKerning = 1;
	return this;
	
};
window['type10_DDGUI_FONT'].prototype.clone = function() {
	var other = new type10_DDGUI_FONT();
	other.attr4_left = tryClone(this.attr4_left);
	other.attr5_width = tryClone(this.attr5_width);
	other.attr11_bHasKerning = this.attr11_bHasKerning;
	other.vtbl = this.vtbl;
	return other;
};
type10_DDGUI_FONT.prototype.ToString_Str = function() {
	 return this.vtbl.ToString_Str(this);
};
type10_DDGUI_FONT.prototype.Equals = function() {
	 return this.vtbl.Equals(arguments[0], this);
};
type10_DDGUI_FONT.prototype.ToHashCode = function() {
	 return this.vtbl.ToHashCode(this);
};
var vtbl_type7_TObject = {
	ToString_Str: method13_type7_TObject_12_ToString_Str, 
	Equals: method13_type7_TObject_6_Equals, 
	ToHashCode: method13_type7_TObject_10_ToHashCode
};
window ['type7_TObject'] = function() {
	this.vtbl = vtbl_type7_TObject;
	return this;
	
};
window['type7_TObject'].prototype.clone = function() {
	var other = new type7_TObject();
	other.vtbl = this.vtbl;
	return other;
};
type7_TObject.prototype.ToString_Str = function() {
	 return this.vtbl.ToString_Str(this);
};
type7_TObject.prototype.Equals = function() {
	 return this.vtbl.Equals(arguments[0], this);
};
type7_TObject.prototype.ToHashCode = function() {
	 return this.vtbl.ToHashCode(this);
};
var vtbl_type6_TObj3D = {
	ToString_Str: method13_type7_TObject_12_ToString_Str, 
	Equals: method13_type7_TObject_6_Equals, 
	ToHashCode: method13_type7_TObject_10_ToHashCode
};
window ['type6_TObj3D'] = function() {
	this.vtbl = vtbl_type6_TObj3D;
	return this;
	
};
window['type6_TObj3D'].prototype.clone = function() {
	var other = new type6_TObj3D();
	other.vtbl = this.vtbl;
	return other;
};
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
window ['type10_DataBuffer'] = function() {
	this.vtbl = vtbl_type10_DataBuffer;
	return this;
	
};
window['type10_DataBuffer'].prototype.clone = function() {
	var other = new type10_DataBuffer();
	other.vtbl = this.vtbl;
	return other;
};
type10_DataBuffer.prototype.ToString_Str = function() {
	 return this.vtbl.ToString_Str(this);
};
type10_DataBuffer.prototype.Equals = function() {
	 return this.vtbl.Equals(arguments[0], this);
};
type10_DataBuffer.prototype.ToHashCode = function() {
	 return this.vtbl.ToHashCode(this);
};
var const19_GL_DEPTH_BUFFER_BIT = 256, const21_GL_STENCIL_BUFFER_BIT = 1024, const19_GL_COLOR_BUFFER_BIT = 16384, const8_GL_FALSE = 0, const7_GL_TRUE = 1, const9_GL_POINTS = 0, const8_GL_LINES = 1, const12_GL_LINE_LOOP = 2, const13_GL_LINE_STRIP = 3, const12_GL_TRIANGLES = 4, const17_GL_TRIANGLE_STRIP = 5, const15_GL_TRIANGLE_FAN = 6, const7_GL_ZERO = 0, const6_GL_ONE = 1, const12_GL_SRC_COLOR = 768, const22_GL_ONE_MINUS_SRC_COLOR = 769, const12_GL_SRC_ALPHA = 770, const22_GL_ONE_MINUS_SRC_ALPHA = 771, const12_GL_DST_ALPHA = 772, const22_GL_ONE_MINUS_DST_ALPHA = 773, const12_GL_DST_COLOR = 774, const22_GL_ONE_MINUS_DST_COLOR = 775, const21_GL_SRC_ALPHA_SATURATE = 776, const11_GL_FUNC_ADD = 32774, const17_GL_BLEND_EQUATION = 32777, const21_GL_BLEND_EQUATION_RGB = 32777, const23_GL_BLEND_EQUATION_ALPHA = 34877, const16_GL_FUNC_SUBTRACT = 32778, const24_GL_FUNC_REVERSE_SUBTRACT = 32779, const16_GL_BLEND_DST_RGB = 32968, const16_GL_BLEND_SRC_RGB = 32969, const18_GL_BLEND_DST_ALPHA = 32970, const18_GL_BLEND_SRC_ALPHA = 32971, const17_GL_CONSTANT_COLOR = 32769, const27_GL_ONE_MINUS_CONSTANT_COLOR = 32770, const17_GL_CONSTANT_ALPHA = 32771, const27_GL_ONE_MINUS_CONSTANT_ALPHA = 32772, const14_GL_BLEND_COLOR = 32773, const15_GL_ARRAY_BUFFER = 34962, const23_GL_ELEMENT_ARRAY_BUFFER = 34963, const23_GL_ARRAY_BUFFER_BINDING = 34964, const31_GL_ELEMENT_ARRAY_BUFFER_BINDING = 34965, const14_GL_STREAM_DRAW = 35040, const14_GL_STATIC_DRAW = 35044, const15_GL_DYNAMIC_DRAW = 35048, const14_GL_BUFFER_SIZE = 34660, const15_GL_BUFFER_USAGE = 34661, const24_GL_CURRENT_VERTEX_ATTRIB = 34342, const8_GL_FRONT = 1028, const7_GL_BACK = 1029, const17_GL_FRONT_AND_BACK = 1032, const13_GL_TEXTURE_2D = 3553, const12_GL_CULL_FACE = 2884, const8_GL_BLEND = 3042, const9_GL_DITHER = 3024, const15_GL_STENCIL_TEST = 2960, const13_GL_DEPTH_TEST = 2929, const15_GL_SCISSOR_TEST = 3089, const22_GL_POLYGON_OFFSET_FILL = 32823, const27_GL_SAMPLE_ALPHA_TO_COVERAGE = 32926, const18_GL_SAMPLE_COVERAGE = 32928, const11_GL_NO_ERROR = 0, const15_GL_INVALID_ENUM = 1280, const16_GL_INVALID_VALUE = 1281, const20_GL_INVALID_OPERATION = 1282, const16_GL_OUT_OF_MEMORY = 1285, const5_GL_CW = 2304, const6_GL_CCW = 2305, const13_GL_LINE_WIDTH = 2849, const27_GL_ALIASED_POINT_SIZE_RANGE = 33901, const27_GL_ALIASED_LINE_WIDTH_RANGE = 33902, const17_GL_CULL_FACE_MODE = 2885, const13_GL_FRONT_FACE = 2886, const14_GL_DEPTH_RANGE = 2928, const18_GL_DEPTH_WRITEMASK = 2930, const20_GL_DEPTH_CLEAR_VALUE = 2931, const13_GL_DEPTH_FUNC = 2932, const22_GL_STENCIL_CLEAR_VALUE = 2961, const15_GL_STENCIL_FUNC = 2962, const15_GL_STENCIL_FAIL = 2964, const26_GL_STENCIL_PASS_DEPTH_FAIL = 2965, const26_GL_STENCIL_PASS_DEPTH_PASS = 2966, const14_GL_STENCIL_REF = 2967, const21_GL_STENCIL_VALUE_MASK = 2963, const20_GL_STENCIL_WRITEMASK = 2968, const20_GL_STENCIL_BACK_FUNC = 34816, const20_GL_STENCIL_BACK_FAIL = 34817, const31_GL_STENCIL_BACK_PASS_DEPTH_FAIL = 34818, const31_GL_STENCIL_BACK_PASS_DEPTH_PASS = 34819, const19_GL_STENCIL_BACK_REF = 36003, const26_GL_STENCIL_BACK_VALUE_MASK = 36004, const25_GL_STENCIL_BACK_WRITEMASK = 36005, const11_GL_VIEWPORT = 2978, const14_GL_SCISSOR_BOX = 3088, const20_GL_COLOR_CLEAR_VALUE = 3106, const18_GL_COLOR_WRITEMASK = 3107, const19_GL_UNPACK_ALIGNMENT = 3317, const17_GL_PACK_ALIGNMENT = 3333, const19_GL_MAX_TEXTURE_SIZE = 3379, const20_GL_MAX_VIEWPORT_DIMS = 3386, const16_GL_SUBPIXEL_BITS = 3408, const11_GL_RED_BITS = 3410, const13_GL_GREEN_BITS = 3411, const12_GL_BLUE_BITS = 3412, const13_GL_ALPHA_BITS = 3413, const13_GL_DEPTH_BITS = 3414, const15_GL_STENCIL_BITS = 3415, const23_GL_POLYGON_OFFSET_UNITS = 10752, const24_GL_POLYGON_OFFSET_FACTOR = 32824, const21_GL_TEXTURE_BINDING_2D = 32873, const17_GL_SAMPLE_BUFFERS = 32936, const10_GL_SAMPLES = 32937, const24_GL_SAMPLE_COVERAGE_VALUE = 32938, const25_GL_SAMPLE_COVERAGE_INVERT = 32939, const33_GL_NUM_COMPRESSED_TEXTURE_FORMATS = 34466, const29_GL_COMPRESSED_TEXTURE_FORMATS = 34467, const12_GL_DONT_CARE = 4352, const10_GL_FASTEST = 4353, const9_GL_NICEST = 4354, const23_GL_GENERATE_MIPMAP_HINT = 33170, const7_GL_BYTE = 5120, const16_GL_UNSIGNED_BYTE = 5121, const8_GL_SHORT = 5122, const17_GL_UNSIGNED_SHORT = 5123, const6_GL_INT = 5124, const15_GL_UNSIGNED_INT = 5125, const8_GL_FLOAT = 5126, const8_GL_FIXED = 5132, const18_GL_DEPTH_COMPONENT = 6402, const8_GL_ALPHA = 6406, const6_GL_RGB = 6407, const7_GL_RGBA = 6408, const12_GL_LUMINANCE = 6409, const18_GL_LUMINANCE_ALPHA = 6410, const25_GL_UNSIGNED_SHORT_4_4_4_4 = 32819, const25_GL_UNSIGNED_SHORT_5_5_5_1 = 32820, const23_GL_UNSIGNED_SHORT_5_6_5 = 33635, const18_GL_FRAGMENT_SHADER = 35632, const16_GL_VERTEX_SHADER = 35633, const21_GL_MAX_VERTEX_ATTRIBS = 34921, const29_GL_MAX_VERTEX_UNIFORM_VECTORS = 36347, const22_GL_MAX_VARYING_VECTORS = 36348, const35_GL_MAX_COMBINED_TEXTURE_IMAGE_UNITS = 35661, const33_GL_MAX_VERTEX_TEXTURE_IMAGE_UNITS = 35660, const26_GL_MAX_TEXTURE_IMAGE_UNITS = 34930, const31_GL_MAX_FRAGMENT_UNIFORM_VECTORS = 36349, const14_GL_SHADER_TYPE = 35663, const16_GL_DELETE_STATUS = 35712, const14_GL_LINK_STATUS = 35714, const18_GL_VALIDATE_STATUS = 35715, const19_GL_ATTACHED_SHADERS = 35717, const18_GL_ACTIVE_UNIFORMS = 35718, const28_GL_ACTIVE_UNIFORM_MAX_LENGTH = 35719, const20_GL_ACTIVE_ATTRIBUTES = 35721, const30_GL_ACTIVE_ATTRIBUTE_MAX_LENGTH = 35722, const27_GL_SHADING_LANGUAGE_VERSION = 35724, const18_GL_CURRENT_PROGRAM = 35725, const8_GL_NEVER = 512, const7_GL_LESS = 513, const8_GL_EQUAL = 514, const9_GL_LEQUAL = 515, const10_GL_GREATER = 516, const11_GL_NOTEQUAL = 517, const9_GL_GEQUAL = 518, const9_GL_ALWAYS = 519, const7_GL_KEEP = 7680, const10_GL_REPLACE = 7681, const7_GL_INCR = 7682, const7_GL_DECR = 7683, const9_GL_INVERT = 5386, const12_GL_INCR_WRAP = 34055, const12_GL_DECR_WRAP = 34056, const9_GL_VENDOR = 7936, const11_GL_RENDERER = 7937, const10_GL_VERSION = 7938, const13_GL_EXTENSIONS = 7939, const10_GL_NEAREST = 9728, const9_GL_LINEAR = 9729, const25_GL_NEAREST_MIPMAP_NEAREST = 9984, const24_GL_LINEAR_MIPMAP_NEAREST = 9985, const24_GL_NEAREST_MIPMAP_LINEAR = 9986, const23_GL_LINEAR_MIPMAP_LINEAR = 9987, const21_GL_TEXTURE_MAG_FILTER = 10240, const21_GL_TEXTURE_MIN_FILTER = 10241, const17_GL_TEXTURE_WRAP_S = 10242, const17_GL_TEXTURE_WRAP_T = 10243, const10_GL_TEXTURE = 5890, const19_GL_TEXTURE_CUBE_MAP = 34067, const27_GL_TEXTURE_BINDING_CUBE_MAP = 34068, const30_GL_TEXTURE_CUBE_MAP_POSITIVE_X = 34069, const30_GL_TEXTURE_CUBE_MAP_NEGATIVE_X = 34070, const30_GL_TEXTURE_CUBE_MAP_POSITIVE_Y = 34071, const30_GL_TEXTURE_CUBE_MAP_NEGATIVE_Y = 34072, const30_GL_TEXTURE_CUBE_MAP_POSITIVE_Z = 34073, const30_GL_TEXTURE_CUBE_MAP_NEGATIVE_Z = 34074, const28_GL_MAX_CUBE_MAP_TEXTURE_SIZE = 34076, const11_GL_TEXTURE0 = 33984, const11_GL_TEXTURE1 = 33985, const11_GL_TEXTURE2 = 33986, const11_GL_TEXTURE3 = 33987, const11_GL_TEXTURE4 = 33988, const11_GL_TEXTURE5 = 33989, const11_GL_TEXTURE6 = 33990, const11_GL_TEXTURE7 = 33991, const11_GL_TEXTURE8 = 33992, const11_GL_TEXTURE9 = 33993, const12_GL_TEXTURE10 = 33994, const12_GL_TEXTURE11 = 33995, const12_GL_TEXTURE12 = 33996, const12_GL_TEXTURE13 = 33997, const12_GL_TEXTURE14 = 33998, const12_GL_TEXTURE15 = 33999, const12_GL_TEXTURE16 = 34000, const12_GL_TEXTURE17 = 34001, const12_GL_TEXTURE18 = 34002, const12_GL_TEXTURE19 = 34003, const12_GL_TEXTURE20 = 34004, const12_GL_TEXTURE21 = 34005, const12_GL_TEXTURE22 = 34006, const12_GL_TEXTURE23 = 34007, const12_GL_TEXTURE24 = 34008, const12_GL_TEXTURE25 = 34009, const12_GL_TEXTURE26 = 34010, const12_GL_TEXTURE27 = 34011, const12_GL_TEXTURE28 = 34012, const12_GL_TEXTURE29 = 34013, const12_GL_TEXTURE30 = 34014, const12_GL_TEXTURE31 = 34015, const17_GL_ACTIVE_TEXTURE = 34016, const9_GL_REPEAT = 10497, const16_GL_CLAMP_TO_EDGE = 33071, const18_GL_MIRRORED_REPEAT = 33648, const13_GL_FLOAT_VEC2 = 35664, const13_GL_FLOAT_VEC3 = 35665, const13_GL_FLOAT_VEC4 = 35666, const11_GL_INT_VEC2 = 35667, const11_GL_INT_VEC3 = 35668, const11_GL_INT_VEC4 = 35669, const7_GL_BOOL = 35670, const12_GL_BOOL_VEC2 = 35671, const12_GL_BOOL_VEC3 = 35672, const12_GL_BOOL_VEC4 = 35673, const13_GL_FLOAT_MAT2 = 35674, const13_GL_FLOAT_MAT3 = 35675, const13_GL_FLOAT_MAT4 = 35676, const13_GL_SAMPLER_2D = 35678, const15_GL_SAMPLER_CUBE = 35680, const30_GL_VERTEX_ATTRIB_ARRAY_ENABLED = 34338, const27_GL_VERTEX_ATTRIB_ARRAY_SIZE = 34339, const29_GL_VERTEX_ATTRIB_ARRAY_STRIDE = 34340, const27_GL_VERTEX_ATTRIB_ARRAY_TYPE = 34341, const33_GL_VERTEX_ATTRIB_ARRAY_NORMALIZED = 34922, const30_GL_VERTEX_ATTRIB_ARRAY_POINTER = 34373, const37_GL_VERTEX_ATTRIB_ARRAY_BUFFER_BINDING = 34975, const33_GL_IMPLEMENTATION_COLOR_READ_TYPE = 35738, const35_GL_IMPLEMENTATION_COLOR_READ_FORMAT = 35739, const17_GL_COMPILE_STATUS = 35713, const18_GL_INFO_LOG_LENGTH = 35716, const23_GL_SHADER_SOURCE_LENGTH = 35720, const18_GL_SHADER_COMPILER = 36346, const24_GL_SHADER_BINARY_FORMATS = 36344, const28_GL_NUM_SHADER_BINARY_FORMATS = 36345, const12_GL_LOW_FLOAT = 36336, const15_GL_MEDIUM_FLOAT = 36337, const13_GL_HIGH_FLOAT = 36338, const10_GL_LOW_INT = 36339, const13_GL_MEDIUM_INT = 36340, const11_GL_HIGH_INT = 36341, const14_GL_FRAMEBUFFER = 36160, const15_GL_RENDERBUFFER = 36161, const8_GL_RGBA4 = 32854, const10_GL_RGB5_A1 = 32855, const9_GL_RGB565 = 36194, const20_GL_DEPTH_COMPONENT16 = 33189, const16_GL_STENCIL_INDEX = 6401, const17_GL_STENCIL_INDEX8 = 36168, const21_GL_RENDERBUFFER_WIDTH = 36162, const22_GL_RENDERBUFFER_HEIGHT = 36163, const31_GL_RENDERBUFFER_INTERNAL_FORMAT = 36164, const24_GL_RENDERBUFFER_RED_SIZE = 36176, const26_GL_RENDERBUFFER_GREEN_SIZE = 36177, const25_GL_RENDERBUFFER_BLUE_SIZE = 36178, const26_GL_RENDERBUFFER_ALPHA_SIZE = 36179, const26_GL_RENDERBUFFER_DEPTH_SIZE = 36180, const28_GL_RENDERBUFFER_STENCIL_SIZE = 36181, const37_GL_FRAMEBUFFER_ATTACHMENT_OBJECT_TYPE = 36048, const37_GL_FRAMEBUFFER_ATTACHMENT_OBJECT_NAME = 36049, const39_GL_FRAMEBUFFER_ATTACHMENT_TEXTURE_LEVEL = 36050, const47_GL_FRAMEBUFFER_ATTACHMENT_TEXTURE_CUBE_MAP_FACE = 36051, const20_GL_COLOR_ATTACHMENT0 = 36064, const19_GL_DEPTH_ATTACHMENT = 36096, const21_GL_STENCIL_ATTACHMENT = 36128, const7_GL_NONE = 0, const23_GL_FRAMEBUFFER_COMPLETE = 36053, const36_GL_FRAMEBUFFER_INCOMPLETE_ATTACHMENT = 36054, const44_GL_FRAMEBUFFER_INCOMPLETE_MISSING_ATTACHMENT = 36055, const36_GL_FRAMEBUFFER_INCOMPLETE_DIMENSIONS = 36057, const26_GL_FRAMEBUFFER_UNSUPPORTED = 36061, const22_GL_FRAMEBUFFER_BINDING = 36006, const23_GL_RENDERBUFFER_BINDING = 36007, const24_GL_MAX_RENDERBUFFER_SIZE = 34024, const32_GL_INVALID_FRAMEBUFFER_OPERATION = 1286, global5_delta = 0.0, global2_nt = 0, global3_old = 0, global3_fps = 0, global5_flips = 0, global17_gDDguiCaretColour = 0, global25_gDDguiMinControlDimension = 0, global20_gDDguiScrollbarWidth = 0, global11_ddgui_stack_ref = [new OTTArray([new type9_DDGUI_DLG()])], global18_ddgui_font_kerning = new type10_DDGUI_FONT(), global20_DDGUI_AUTO_INPUT_DLG = 0.0, global18_DDGUI_IN_INPUT_DLG = 0.0, global17_buttonlist_retval = 0.0, global6_Objs3D = new OTTArray(new type6_TObj3D());
// set default statics:
window['initStatics'] = function() {
	static10_DDgui_show_intern_mouse_down = 0, static10_DDgui_show_intern_movemousex = 0, static10_DDgui_show_intern_movemousey = 0, static12_DDgui_show_intern_ToolTipDelay = 0, static9_DDgui_show_intern_ToolTipMx = 0, static9_DDgui_show_intern_ToolTipMy = 0;
static9_DDgui_draw_widget_intern_lines_Str = new OTTArray("");
static7_DDgui_backgnd_QuickGL = -(1);
static9_DDgui_drawwidget_dummy_Str_ref = [""];
static9_DDgui_handlewidget_dummy_Str_ref = [""];
static7_DDgui_radio_opt_Str = new OTTArray("");
static7_DDgui_handleradio_txt_Str = new OTTArray("");
static7_DDgui_list_opt_Str = new OTTArray("");
static7_DDgui_drawlist_opt_Str_ref = [new OTTArray([""])];
static11_ddgui_handletext_st_lasttime = 0, static10_ddgui_handletext_st_lastkey = 0;
static7_DDgui_drawtab_str_Str = new OTTArray(""), static8_DDgui_drawtab_str2_Str_ref = [new OTTArray([""])];
static7_DDgui_handletab_str_Str = new OTTArray(""), static8_DDgui_handletab_str2_Str_ref = [new OTTArray([""])];
static7_DDgui_selecttab_str_Str = new OTTArray(""), static8_DDgui_selecttab_str2_Str_ref = [new OTTArray([""])];

}
for (var __init = 0; __init < preInitFuncs.length; __init++) preInitFuncs[__init]();
