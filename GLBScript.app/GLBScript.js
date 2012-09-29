if (typeof preInitFuncs == 'undefined') preInitFuncs = [];
preInitFuncs.push(function() {
	if (viewMode == 'console' && (typeof inEditorPreview == 'undefined')) {
		if (document) {
			window.onload=function( e ){
				var e = document.createElement('textarea');
				e.style.width = '100%';
				e.style.height = '480px';
				e.id = "GLBCONSOLE";
				
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
function GLBException(text, file, line) {
	this.text = text;
	this.line = line;
	this.file = file;
}

/**
* @constructor
*/
function GLBExitException() {
	//exit
}

GLBExitException.prototype.toString = function() {
	return "GLB Exit";
}

GLBException.prototype.toString = function() {
	return "Unhandled exception '"+text+"' in file '"+this.file+"' in line'"+this.line+"'";
}

GLBException.prototype.getText = function() {
	return this.text;
}

GLBException.prototype.toString = function() {
	return "Uncought GLBException '"+this.text+"' stacktrace: "+STACKTRACE_Str();
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
		consoleOutput = document ? document.getElementById("GLBCONSOLE") : null;
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
	throw new GLBExitException();
}


//------------------------------------------------------------
//Info Stuff
//------------------------------------------------------------

function GETTIMERALL() {
	return new Date().getTime() - startTime;
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
	var ret = 1;
	return eval("if (window['"+name+"']) window."+name+"(); else ret = 0;");
}

//------------------------------------------------------------
//Runtime stuff
//------------------------------------------------------------

var callStack = []
/**
* @constructor
*/
function StackFrame(name, info, dbg) {
	this.name = name;
	this.info = info;
	this.dbg  = dbg;
}

function stackPush(name, info) {
	callStack.push(new StackFrame(name, info, __debugInfo));
}

function stackPop() {
	var obj = callStack.pop();
	__debugInfo = obj.dbg;
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
	if (msg.indexOf("GLBERR") == 0) msg = msg.substring("GLBERR".length);
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
		return true;
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
	return ex instanceof GLBExitException || ex instanceof GLBException;
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

			if (typeof(GLB_ON_INIT) == 'function') GLB_ON_INIT(); //call the GLBasic defined initialization function
		} else {
			window.requestAnimFrame(updateConsole, 100);
		}
	} catch(ex) {
		if (ex instanceof GLBExitException) alert(formatError(ex));
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
	window.location = url;
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
* Ein GLBArray ist ein Array, welches versucht die GLBArrays unter GLBasic so gut wie möglich zu simulieren.
* @constructor
*/
function GLBArray() {
	this.values = [];
	this.dimensions = [0];
	this.defval = 0;
	return this;
}

//Klonen!
GLBArray.prototype.clone = function() {
	var other = new GLBArray();
	
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
GLBArray.prototype.arrAccess = function() {
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
		
		return split.length;
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
						var text = loadText(file.path+".GLBSCRIPT_DATA");
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
			kv = new INIKeyValue(key, "");
			this.keys.push(kv);
		}
		return kv.value;
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
			c.id = "GLBCANVAS";
			
			document.body.appendChild(c);
			
			init2D('GLBCANVAS');
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

var waitForFont = false;


//------------------------------------------------------------
// Basic 2D stuff
//------------------------------------------------------------

var doCurrentFunction = function() {
	if (!waitload) {
		loopFunc(); //mainloop
	} else if (GLB_ON_LOADING) {
		GLB_ON_LOADING();
	}
	
	//Nun wieder auf normal
	
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
		if (!(ex instanceof GLBExitException)) alert(formatError(ex));
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
	
	if (typeof GLB_ON_LOADING == 'undefined') GLB_ON_LOADING = null;
	
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
	
	//mouse listener
	if (!touchable) {
		canvas.onmousemove = function(ev) {
			if(!ev) ev = window.event();
			
			touches[0].x = ev.clientX - canvas.offsetLeft;
			touches[0].y = ev.clientY - canvas.offsetTop;
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
			updateTouches(event.touches, 'move');
			
			finishEvent(event);
		}, false);
		
		
		canvas.addEventListener('touchstart', function(event) {
			//Beginn...
			updateTouches(event.touches, 'start');
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
	
	USESCREEN(-1);
	CLEARSCREEN(RGB(0,0,0)); //black background color
	SHOWSCREEN();
	
	try {
		if (window['GLB_ON_LOOP']) {
			PUSHLOOP("GLB_ON_LOOP");
		} else {
			PUSHLOOP("GLB_MAIN_LOOP");
		}
	} catch(ex) {}
	
	SYSTEMPOINTER(0);
	
	if (DOESFILEEXIST("/Media/smalfont.png")) {
		LOADFONT("/Media/smalfont.png", 0);
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
	/*if (mode < 0) {
		context.globalCompositeOperation = 'lighter';
		mode = (1 - mode) - 1;
	} else if (mode > 0) {
		context.globalCompositeOperation = 'lighter';
	} else {
		context.globalCompositeOperation = 'source-over';
		mode = 1;
	}
	canvas.globalAlpha = mode;*/
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
	//throwError("TODO: SETTRANS");
	transCol = rgb;
	transFontCol = rgb;
}

function SMOOTHSHADING(mode) {
	// Do nothing...
}

function SETSCREEN(width, height) {
	canvas.width = width;
	canvas.height = height;
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
	path = path.toLowerCase();
	
	if (!!window.assets) {
		for (var i = 0; i < window.assets.length; i++) {
			if (window.assets[i].name.toLowerCase() == path) {
				return window.assets[i].path;
			}
		}
	}
	return path;
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
				
				var blue = RGB(0,0,255);
				var yellow = RGB(255,255,0);
				
				var data = imageData.data;
				var fx = 0, fy = 0;
				var sizing = true;
				
				var getCol = function(x, y) {
					return RGB(data[(y*width + x)*4], data[(y*width + x)*4 + 1], data[(y*width + x)*4 + 2]);
				}
				
				var charwidth = null, charheight = null;
				
				var i = 0;
				while (sizing) {
					var x = fx + 1, y = fy + 1;
					var col = getCol(x, y);
					if (col == blue || col == yellow) {
						var startx = x, starty = y;
						for (;getCol(x, starty) == blue || getCol(x, starty) == yellow;x++) {}
						for (;getCol(startx, y) == blue || getCol(startx, y) == yellow;y++) {}
						//throwError("width: "+(x - startx)+" height: "+(y - starty));
						if (!charwidth || charwidth > (x - startx)) charwidth = (x - startx);
						if (!charheight || charheight > (y - starty)) charheight = (y - starty);
						
						fx += charwidth + 2;
						
						if (fx >= width) {
							fx = 0;
							fy += charheight + 2;
						}
						
						i++;
					} else {
						//console.log("fx: "+fx+" fy: "+fy);
						sizing = false;
					}
				}
				
				font.charwidth = charwidth;
				font.charheight = charheight;
				
				for (var y = fy + 1; y < height; y += charheight + 2) {
					for (var x = fx + 1; x < width; x += charwidth + 2) {
						var realwidth = charwidth;
						
						var startx, endx;
						//DO KERNING STUFF \o/
						
						for (var leftx = x + 1; leftx < x + charwidth; leftx++) {
							var pixel = false;
							for (var tmpy = y+1; tmpy < y + charheight-2; tmpy++) {
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
						
						for (var rightx = x + charwidth; rightx > x; rightx--) {
							var pixel = false;
							for (var tmpy = y+1; tmpy < y + charheight-2; tmpy++) {
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
							//console.log("posi: end "+endx+", start "+startx);
							realwidth = endx - startx;
						} else {
							realwidth= 14;
						}
						
						font.chars[i] = {
							x: x + 1, y: y + 1,
							
							//kerning data
							width: realwidth+2
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
			
			var pos;
			if (kerning) {
				pos = x-font.charwidth/2+c.width/2;
			} else {
				pos = x;
			}
			
			context.drawImage(font.img, c.x, c.y, font.charwidth, font.charheight, pos, y, font.charwidth, font.charheight);
			
			
			if (kerning) {
				x += c.width;
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
			
			if (len) {
				w+=c.width;
			} else {
				w+=font.charwidth;
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
var sounds = [];
var soundChannels = [];
var noSound 	= false;

function genSoundChannel() {
	for (var i = 1; i < soundChannels.length; i++) {
		if (!soundChannels[i]) return i;
	}
	return soundChannels.length+1;
}

/**
* @constructor
*/
function Sound(file, num, buffer) {
	this.num = num;
	this.file = file;
	this.loaded = false;
	this.buffers = [];
	this.buffers.length = buffer;
	
	this.sound = new Audio(file);
	this.sound.load();
	// Add the audio element to the DOM, because otherwise a certain 
	// retarded Browser from Redmond will refuse to properly clone it
	
	//document.body.appendChild( this.sound );
	
	waitload++;
	
	var snd = this;
	this.sound.addEventListener("onerror", function() {
		waitload--;
		if (file != "" && file != "0") {
			throwError("Sound '"+num+"' '"+file+"' not found!");
		}
	}, false);
	this.sound.addEventListener("canplaythrough", function() {
		if (!snd.loaded) {
			waitload--;
			
			//buffer erstellen
			for (var i = 0; i < snd.buffers.length; i++) { 
				snd.buffers[i] = new SoundChannel(this);
			}
		}
		snd.loaded = true;
	}, false);
}

/**
* @constructor
*/
function SoundChannel(sound) {
	this.sound = sound.cloneNode(true);
	this.sound.load();
	
	this.num = genSoundChannel();
	this.loaded = false;
	this.playing = false;
	this.playTime = 0;
	
	this.play = function() {
		if (this.playing) this.stop();
		
		this.sound.currentTime = 0;
		this.playing = true;
		this.playTime = GETTIMERALL();
		this.sound.play();
	}
	
	this.stop = function() {
		this.sound.pause();
		this.sound.currentTime = 0;
		this.playing = false;
		this.playTime = 0;
	}
	
	var sndchn = this;
	this.sound.addEventListener( 'canplaythrough', function() {
		if (!sndchn.loaded) {
			waitload--;
		}
		sndchn.loaded = true;
	}, false );
	this.sound.addEventListener("ended", function() {
		sndchn.stop();
	}, false);
	
	waitload++;
}

function LOADSOUND(file, num, buffer) {
	if (noSound) return;
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
	
	var sound = new Sound(file, num, buffer);
	
	register(sound);
	
	return sound;
}

function PLAYSOUND(num, pan, volume) {
	if (noSound) return;
	
	var s = sounds[num];
	if (!s) {
		return 0;
	} else {
		//suche den mit dem niedrigsten playTime
		var curChn = null, lowestPlaytime = GETTIMERALL() + 1;
		for (var i = 0; i < s.buffers.length && lowestPlaytime != 0; i++) {
			if (s.buffers[i].playTime < lowestPlaytime) {
				lowestPlaytime = s.buffers[i].playTime;
				curChn = s.buffers[i];
			}
		}
		if (!!curChn) {
			curChn.play();
		} else {
			throwError("No channel available...");
		}
		return curChn.num;
	}
}

function HUSH() {
	if (noSound) return;
	
	for (var i = 0; i < soundChannels.length; i++) {
		if (!!soundChannels[i] && soundChannels[i].playing) soundChannels[i].stop();
	}
}

function SOUNDPLAYING(chn) {
	if (noSound) return false;
	
	return (!!soundChannels[chn] && soundChannels[chn].playing ) ? 0 : 1;
}
function PLAYMUSIC(file, loop) {
	if (noSound) return;
	return;
	
	var s = LOADSOUND(file, 0, 1);
	s.loop = loop;
	s.music = true;
}

function STOPMUSIC() {
	if (noSound) return;
	
	if (SOUNDPLAYING(0)) {
		soundChannels[0].stop();
	}
}

function ISMUSICPLAYING() {
	if (noSound) return false;
	
	return SOUNDPLAYING(0);
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
}

function updateTouches(t, state) {
	anyMousePress = false;
	if (t) {
		switch(state) {
			case 'start':
				//falls neue tasten => draufhauen
				for (var i = touches.length; i < t.length-1; i++) {
					var tmp = t[i];
					touches[tmp.identifier].left = true; //letzten true setzen!
				}
				touches.length = t.length;
				break;
			case 'end':
				//Alle Tasten zurücksetzen
				for (var i = 0; i < t.length; i++) {
					var tmp = t[i];
					touches[tmp.identifier].left  = false;
				}
				break;
			case 'move':
				//Nun die gedrückten Tasten setzen
				for (var i = 0; i < t.length; i++) {
					var tmp = t[i];
					touches[tmp.identifier].left  = true
					touches[tmp.identifier].x = tmp.clientX - canvas.offsetLeft;
					touches[tmp.identifier].y = tmp.clientY - canvas.offsetTop;
				}
				break;
		}
	} else {
		globalSpeedX = 0;
		globalSpeedY = 0;
		
		for (var i = 0; i <touches.length;i++) {
			var touch = touches[i];
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
	key = glb2jsKeyCode(key);
	return keyInput[key] ? 1 : 0;
}

function glb2jsKeyCode(key) {
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

function getSprite(num) {
	if (!!sprites[num]) {
		if (!sprites[num].loaded) throwError("Image not yet loaded '"+num+"'");
		return sprites[num];
	} else {
		throwError("Image not available '"+num+"'");
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
		var data = scrn.context.getImageData(0,0,width, height);
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
				data[pos]   = r
				data[pos+1] = g
				data[pos+2] = b
				data[pos+3] = a
			}
		}
		scrn.context.putImageData(data, 0, 0);
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
				var v = bOR(RGB(r,g,b), ASL(a, 24));
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
			//Zeichnen
			if (mode == 1) {
				//context.save();
				//context.fillStyle = '#FF0000';
				if ((polyStack.length % 3) != 0) throwError("Polyvector cannot draw non power of 3 triangles");
				var spr = getSprite(num);
				for (var i = 0; i < polyStack.length; i+=3) {
					/*context.beginPath()
					context.moveTo(polyStack[i].x, polyStack[i].y)
					context.lineTo(polyStack[i+1].x, polyStack[i+1].y)
					context.lineTo(polyStack[i+2].x, polyStack[i+2].y)
					context.closePath()
					context.fill()*/
					tmpPolyStack[0] = polyStack[i];
					tmpPolyStack[1] = polyStack[i+1];
					tmpPolyStack[2] = polyStack[i+2];
					drawPolygon(false, simpletris, tmpPolyStack, spr); //TODO: plzTint Parameter
				}
				context.restore();
			}else {
				throwError("Missing ENDPOLY function.");
			}
		}
		polyStack.length = 0;
	}
	
	inPoly = false;
}

var simpletris = [[0, 1, 2]];
var tris2 = [[0, 1, 2], [2, 3, 1]];
var tris1 = [[0, 1, 2], [2, 3, 0]];

function POLYNEWSTRIP() {
	if (!inPoly) throwError("POLYNEWSTRIP has to be in STARTPOLY - ENDPOLY ");
	
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
		var tmpAlpha = context.globalAlpha;
		var tmpOperation = context.globalCompositeOperation;
		
		drawPolygon(plzTint, tris, polyStack, spr);
	}
	
	if (plzTint) {
		//Drawing mode wieder zurücksetzen
		context.globalAlpha = tmpAlpha;
		context.globalCompositeOperation = tmpOperation;
	}
	
	polyStack.length = 0; //anstatt = []
}

function drawPolygon(plzTint, tris, polyStack, spr) {
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
			if (polyStack[0].col == polyStack[1].col && polyStack[1].col == polyStack[2].col && (polyStacj.length > 2 && polyStack[2].col == polyStack[3].col)) {
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
		context.translate(x, y);
		context.rotate(phi * Math.PI / 180); //convert into RAD
		var spr = getSprite(num);
		DRAWSPRITE(num, -spr.img.width/2, -spr.img.height/2);
		context.restore();
	}
}

function ZOOMSPRITE(num, x, y, sx, sy) {
	if (sx == 1 && sy == 1) {
		DRAWSPRITE(num, x, y);
	} else if (sx != 0 && sy != 0){
		context.save();
		context.translate(x, y);
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
		//context.drawImage(spr.img, CAST2INT(x), CAST2INT(y), CAST2INT(width), CAST2INT(height));
		context.restore();
	}
}

function ROTOZOOMSPRITE(num, x, y,phi, scale) {
	context.save();
	context.translate(x, y)
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
		var spr = getSprite(num);
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
	context.save();
	context.fillStyle = formatColor(col);
	context.fillRect(0,0,canvas.width, canvas.height);
	clrColor = col;
	context.restore();
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
var static12_Factor_DIMASEXPRErr = 0;
var static12_Keyword_SelectHelper = 0.0, static7_Keyword_GOTOErr = 0;
var debugMode = false;
window['main'] = function(){
	var local1_G_1755 = new type10_TGenerator();
	DIM(global10_Generators, [0], new type10_TGenerator());
	local1_G_1755.attr8_Name_Str = "JS";
	local1_G_1755.attr8_genProto = func16_JS_Generator_Str;
	DIMPUSH(global10_Generators, local1_G_1755);
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
	global11_APPNAME_Str = "GLBasic Program";
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
	global10_Target_Str = "";
	global8_Lang_Str = "";
	
}
main = window['main'];
window['GetIdentifierByPart'] = function(param8_Text_Str) {
	var local10_Result_Str_1757 = "", local11_tmpCompiler_1758 = new type9_TCompiler();
	local10_Result_Str_1757 = "";
	local11_tmpCompiler_1758 = global8_Compiler.clone(/* In Assign */);
	global8_Compiler.attr8_Code_Str = ((param8_Text_Str) + ("\n"));
	func5_Lexer();
	func8_Analyser();
	global8_Compiler.attr8_GetIdent = 1;
	func6_Parser();
	global8_Compiler = local11_tmpCompiler_1758.clone(/* In Assign */);
	return tryClone(local10_Result_Str_1757);
	return "";
	
};
GetIdentifierByPart = window['GetIdentifierByPart'];
window['func8_Analyser'] = function() {
	var local6_CurTyp_1764 = 0;
	func5_Start();
	while (func8_EOFParse()) {
		{
			var Err_Str = "";
			try {
				{
					var local16___SelectHelper1__1759 = "";
					local16___SelectHelper1__1759 = func14_GetCurrent_Str();
					if ((((local16___SelectHelper1__1759) == ("TYPE")) ? 1 : 0)) {
						var local3_typ_ref_1760 = [new type14_IdentifierType()];
						func5_Match("TYPE", 16, "Analyser.gbas");
						local3_typ_ref_1760[0].attr8_Name_Str = func14_GetCurrent_Str();
						local3_typ_ref_1760[0].attr12_RealName_Str = local3_typ_ref_1760[0].attr8_Name_Str;
						local3_typ_ref_1760[0].attr2_ID = BOUNDS(global8_Compiler.attr5_Types_ref[0], 0);
						DIMPUSH(global8_Compiler.attr5_Types_ref[0], local3_typ_ref_1760);
						func7_GetNext();
						
					} else if ((((local16___SelectHelper1__1759) == ("PROTOTYPE")) ? 1 : 0)) {
						var local4_func_1761 = new type14_IdentifierFunc();
						func5_Match("PROTOTYPE", 25, "Analyser.gbas");
						local4_func_1761.attr8_Name_Str = func14_GetCurrent_Str();
						local4_func_1761.attr3_Typ = ~~(4);
						func11_AddFunction(local4_func_1761);
						func7_GetNext();
						
					} else if ((((local16___SelectHelper1__1759) == ("CONSTANT")) ? 1 : 0)) {
						do {
							var local4_Vari_1762 = new type14_IdentifierVari();
							if (func7_IsToken("CONSTANT")) {
								func5_Match("CONSTANT", 44, "Analyser.gbas");
								
							} else {
								func5_Match(",", 46, "Analyser.gbas");
								
							};
							local4_Vari_1762 = func7_VariDef(0).clone(/* In Assign */);
							local4_Vari_1762.attr3_Typ = ~~(6);
							func11_AddVariable(local4_Vari_1762, 0);
							DIMPUSH(global8_Compiler.attr7_Globals, ((BOUNDS(global8_Compiler.attr5_Varis_ref[0], 0)) - (1)));
							
						} while (!((((func7_IsToken(",")) == (0)) ? 1 : 0)));
						
					};
					
				};
				func7_GetNext();
				
			} catch (Err_Str) {
				if (Err_Str instanceof GLBException) Err_Str = Err_Str.getText(); else throwError(Err_Str);{
					func8_FixError();
					
				}
			};
			
		};
		
	};
	local6_CurTyp_1764 = -(1);
	func5_Start();
	while (func8_EOFParse()) {
		{
			var Err_Str = "";
			try {
				var local10_IsCallback_1765 = 0, local8_IsNative_1766 = 0, local10_IsAbstract_1767 = 0;
				local10_IsCallback_1765 = 0;
				local8_IsNative_1766 = 0;
				local10_IsAbstract_1767 = 0;
				if (func7_IsToken("CALLBACK")) {
					func5_Match("CALLBACK", 72, "Analyser.gbas");
					local10_IsCallback_1765 = 1;
					if ((((func7_IsToken("FUNCTION")) == (0)) ? 1 : 0)) {
						func5_Match("FUNCTION", 74, "Analyser.gbas");
						
					};
					
				};
				if (func7_IsToken("NATIVE")) {
					func5_Match("NATIVE", 77, "Analyser.gbas");
					local8_IsNative_1766 = 1;
					if ((((func7_IsToken("FUNCTION")) == (0)) ? 1 : 0)) {
						func5_Match("FUNCTION", 79, "Analyser.gbas");
						
					};
					
				};
				if (func7_IsToken("ABSTRACT")) {
					func5_Match("ABSTRACT", 82, "Analyser.gbas");
					local10_IsAbstract_1767 = 1;
					if ((((func7_IsToken("FUNCTION")) == (0)) ? 1 : 0)) {
						func5_Match("FUNCTION", 84, "Analyser.gbas");
						
					};
					
				};
				{
					var local16___SelectHelper2__1768 = "";
					local16___SelectHelper2__1768 = func14_GetCurrent_Str();
					if ((((local16___SelectHelper2__1768) == ("PROTOTYPE")) ? 1 : 0)) {
						var local3_var_1769 = new type14_IdentifierVari(), local5_Found_1770 = 0;
						func5_Match("PROTOTYPE", 89, "Analyser.gbas");
						local3_var_1769 = func7_VariDef(0).clone(/* In Assign */);
						local5_Found_1770 = 0;
						var forEachSaver2390 = global8_Compiler.attr5_Funcs_ref[0];
						for(var forEachCounter2390 = 0 ; forEachCounter2390 < forEachSaver2390.values.length ; forEachCounter2390++) {
							var local4_func_ref_1771 = forEachSaver2390.values[forEachCounter2390];
						{
								if ((((local4_func_ref_1771[0].attr8_Name_Str) == (local3_var_1769.attr8_Name_Str)) ? 1 : 0)) {
									local4_func_ref_1771[0].attr8_datatype = local3_var_1769.attr8_datatype.clone(/* In Assign */);
									local5_Found_1770 = 1;
									break;
									
								};
								
							}
							forEachSaver2390.values[forEachCounter2390] = local4_func_ref_1771;
						
						};
						if ((((local5_Found_1770) == (0)) ? 1 : 0)) {
							func5_Error((("Internal error (prototype not found: ") + (local3_var_1769.attr8_Name_Str)), 100, "Analyser.gbas");
							
						};
						if ((((local6_CurTyp_1764) != (-(1))) ? 1 : 0)) {
							func5_Error("PROTOTYPE definition not in Type allowed.", 101, "Analyser.gbas");
							
						};
						
					} else if ((((local16___SelectHelper2__1768) == ("FUNCTION")) ? 1 : 0)) {
						var local3_var_1772 = new type14_IdentifierVari(), local4_func_1773 = new type14_IdentifierFunc();
						func5_Match("FUNCTION", 103, "Analyser.gbas");
						local3_var_1772 = func7_VariDef(0).clone(/* In Assign */);
						local4_func_1773.attr8_Name_Str = local3_var_1772.attr8_Name_Str;
						local4_func_1773.attr8_datatype = local3_var_1772.attr8_datatype.clone(/* In Assign */);
						local4_func_1773.attr10_IsCallback = local10_IsCallback_1765;
						local4_func_1773.attr10_IsAbstract = local10_IsAbstract_1767;
						if ((((local6_CurTyp_1764) != (-(1))) ? 1 : 0)) {
							local4_func_1773.attr3_Typ = ~~(3);
							DIMPUSH(global8_Compiler.attr5_Types_ref[0].arrAccess(local6_CurTyp_1764).values[tmpPositionCache][0].attr7_Methods, BOUNDS(global8_Compiler.attr5_Funcs_ref[0], 0));
							local4_func_1773.attr6_MyType = local6_CurTyp_1764;
							
						} else {
							local4_func_1773.attr3_Typ = ~~(1);
							
						};
						func11_AddFunction(local4_func_1773);
						if (((((((local8_IsNative_1766) == (0)) ? 1 : 0)) && ((((local10_IsAbstract_1767) == (0)) ? 1 : 0))) ? 1 : 0)) {
							func10_SkipTokens("FUNCTION", "ENDFUNCTION", local4_func_1773.attr8_Name_Str);
							
						};
						
					} else if ((((local16___SelectHelper2__1768) == ("SUB")) ? 1 : 0)) {
						var local4_func_1774 = new type14_IdentifierFunc();
						func5_Match("SUB", 125, "Analyser.gbas");
						local4_func_1774.attr8_Name_Str = func14_GetCurrent_Str();
						local4_func_1774.attr8_datatype = global12_voidDatatype.clone(/* In Assign */);
						local4_func_1774.attr3_Typ = ~~(2);
						func11_AddFunction(local4_func_1774);
						func10_SkipTokens("SUB", "ENDSUB", local4_func_1774.attr8_Name_Str);
						
					} else if ((((local16___SelectHelper2__1768) == ("TYPE")) ? 1 : 0)) {
						func5_Match("TYPE", 133, "Analyser.gbas");
						if ((((func6_IsType("")) == (0)) ? 1 : 0)) {
							func5_Error((((("Internal error (unrecognized type: ") + (func14_GetCurrent_Str()))) + (")")), 134, "Analyser.gbas");
							
						};
						local6_CurTyp_1764 = global8_LastType.attr2_ID;
						
					} else if ((((local16___SelectHelper2__1768) == ("ENDTYPE")) ? 1 : 0)) {
						local6_CurTyp_1764 = -(1);
						
					};
					
				};
				func7_GetNext();
				
			} catch (Err_Str) {
				if (Err_Str instanceof GLBException) Err_Str = Err_Str.getText(); else throwError(Err_Str);{
					func8_FixError();
					
				}
			};
			
		};
		
	};
	if ((((local6_CurTyp_1764) != (-(1))) ? 1 : 0)) {
		func5_Error((((("Type '") + (global8_Compiler.attr5_Types_ref[0].arrAccess(local6_CurTyp_1764).values[tmpPositionCache][0].attr8_Name_Str))) + (" not closed with 'ENDTYPE'")), 147, "Analyser.gbas");
		
	};
	local6_CurTyp_1764 = -(1);
	var forEachSaver2673 = global8_Compiler.attr5_Funcs_ref[0];
	for(var forEachCounter2673 = 0 ; forEachCounter2673 < forEachSaver2673.values.length ; forEachCounter2673++) {
		var local1_F_ref_1776 = forEachSaver2673.values[forEachCounter2673];
	{
			if (local1_F_ref_1776[0].attr10_IsCallback) {
				var local12_alreadyExist_1777 = 0;
				local12_alreadyExist_1777 = 0;
				var forEachSaver2658 = global8_Compiler.attr5_Funcs_ref[0];
				for(var forEachCounter2658 = 0 ; forEachCounter2658 < forEachSaver2658.values.length ; forEachCounter2658++) {
					var local2_F2_ref_1778 = forEachSaver2658.values[forEachCounter2658];
				{
						if (((((((local2_F2_ref_1778[0].attr8_Name_Str) == (local1_F_ref_1776[0].attr8_Name_Str)) ? 1 : 0)) && ((((local2_F2_ref_1778[0].attr10_IsCallback) == (0)) ? 1 : 0))) ? 1 : 0)) {
							local12_alreadyExist_1777 = 1;
							break;
							
						};
						
					}
					forEachSaver2658.values[forEachCounter2658] = local2_F2_ref_1778;
				
				};
				if (local12_alreadyExist_1777) {
					local1_F_ref_1776[0].attr8_Name_Str = (("Overwritten Callback method (screw them!): ") + (local1_F_ref_1776[0].attr8_Name_Str));
					
				};
				
			};
			
		}
		forEachSaver2673.values[forEachCounter2673] = local1_F_ref_1776;
	
	};
	var forEachSaver2712 = global8_Compiler.attr5_Funcs_ref[0];
	for(var forEachCounter2712 = 0 ; forEachCounter2712 < forEachSaver2712.values.length ; forEachCounter2712++) {
		var local1_F_ref_1779 = forEachSaver2712.values[forEachCounter2712];
	{
			if ((((((((((local1_F_ref_1779[0].attr3_Typ) != (3)) ? 1 : 0)) && ((((local1_F_ref_1779[0].attr3_Typ) != (2)) ? 1 : 0))) ? 1 : 0)) && (((local1_F_ref_1779[0].attr10_IsCallback) ? 0 : 1))) ? 1 : 0)) {
				(global8_Compiler.attr11_GlobalFuncs).Put(local1_F_ref_1779[0].attr8_Name_Str, local1_F_ref_1779[0].attr2_ID);
				
			};
			
		}
		forEachSaver2712.values[forEachCounter2712] = local1_F_ref_1779;
	
	};
	func5_Start();
	while (func8_EOFParse()) {
		{
			var Err_Str = "";
			try {
				{
					var local16___SelectHelper3__1780 = "";
					local16___SelectHelper3__1780 = func14_GetCurrent_Str();
					if ((((local16___SelectHelper3__1780) == ("GLOBAL")) ? 1 : 0)) {
						do {
							var local4_Vari_1781 = new type14_IdentifierVari();
							if (func7_IsToken("GLOBAL")) {
								func5_Match("GLOBAL", 193, "Analyser.gbas");
								
							} else {
								func5_Match(",", 195, "Analyser.gbas");
								
							};
							local4_Vari_1781 = func7_VariDef(0).clone(/* In Assign */);
							local4_Vari_1781.attr3_Typ = ~~(2);
							func11_AddVariable(local4_Vari_1781, 1);
							DIMPUSH(global8_Compiler.attr7_Globals, ((BOUNDS(global8_Compiler.attr5_Varis_ref[0], 0)) - (1)));
							
						} while (!((((func7_IsToken(",")) == (0)) ? 1 : 0)));
						
					};
					
				};
				func7_GetNext();
				
			} catch (Err_Str) {
				if (Err_Str instanceof GLBException) Err_Str = Err_Str.getText(); else throwError(Err_Str);{
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
					var local16___SelectHelper4__1783 = "";
					local16___SelectHelper4__1783 = func14_GetCurrent_Str();
					if ((((local16___SelectHelper4__1783) == ("TYPE")) ? 1 : 0)) {
						func8_TypeDefi();
						
					};
					
				};
				func7_GetNext();
				
			} catch (Err_Str) {
				if (Err_Str instanceof GLBException) Err_Str = Err_Str.getText(); else throwError(Err_Str);{
					func8_FixError();
					
				}
			};
			
		};
		
	};
	local6_CurTyp_1764 = -(1);
	var forEachSaver2813 = global8_Compiler.attr5_Types_ref[0];
	for(var forEachCounter2813 = 0 ; forEachCounter2813 < forEachSaver2813.values.length ; forEachCounter2813++) {
		var local3_typ_ref_1785 = forEachSaver2813.values[forEachCounter2813];
	{
			func10_ExtendType(unref(local3_typ_ref_1785[0]));
			
		}
		forEachSaver2813.values[forEachCounter2813] = local3_typ_ref_1785;
	
	};
	var forEachSaver2826 = global8_Compiler.attr5_Types_ref[0];
	for(var forEachCounter2826 = 0 ; forEachCounter2826 < forEachSaver2826.values.length ; forEachCounter2826++) {
		var local3_typ_ref_1786 = forEachSaver2826.values[forEachCounter2826];
	{
			func11_CheckCyclic(local3_typ_ref_1786[0].attr8_Name_Str, unref(local3_typ_ref_1786[0]));
			
		}
		forEachSaver2826.values[forEachCounter2826] = local3_typ_ref_1786;
	
	};
	func5_Start();
	while (func8_EOFParse()) {
		{
			var Err_Str = "";
			try {
				var local8_isNative_1787 = 0, local10_isCallBack_1788 = 0;
				local8_isNative_1787 = 0;
				local10_isCallBack_1788 = 0;
				{
					var local16___SelectHelper5__1789 = "";
					local16___SelectHelper5__1789 = func14_GetCurrent_Str();
					if ((((local16___SelectHelper5__1789) == ("NATIVE")) ? 1 : 0)) {
						local8_isNative_1787 = 1;
						func7_GetNext();
						
					} else if ((((local16___SelectHelper5__1789) == ("CALLBACK")) ? 1 : 0)) {
						local10_isCallBack_1788 = 1;
						func7_GetNext();
						
					} else if ((((local16___SelectHelper5__1789) == ("ABSTRACT")) ? 1 : 0)) {
						func7_GetNext();
						
					};
					
				};
				{
					var local16___SelectHelper6__1790 = "";
					local16___SelectHelper6__1790 = func14_GetCurrent_Str();
					if ((((local16___SelectHelper6__1790) == ("FUNCTION")) ? 1 : 0)) {
						var local3_Typ_1791 = 0.0;
						if ((((local6_CurTyp_1764) == (-(1))) ? 1 : 0)) {
							local3_Typ_1791 = 1;
							
						} else {
							local3_Typ_1791 = 3;
							
						};
						func7_FuncDef(local8_isNative_1787, local10_isCallBack_1788, ~~(local3_Typ_1791), local6_CurTyp_1764);
						
					} else if ((((local16___SelectHelper6__1790) == ("PROTOTYPE")) ? 1 : 0)) {
						func7_FuncDef(0, 0, ~~(4), -(1));
						
					} else if ((((local16___SelectHelper6__1790) == ("SUB")) ? 1 : 0)) {
						func6_SubDef();
						
					} else if ((((local16___SelectHelper6__1790) == ("TYPE")) ? 1 : 0)) {
						func5_Match("TYPE", 268, "Analyser.gbas");
						if ((((func6_IsType("")) == (0)) ? 1 : 0)) {
							func5_Error((((("Internal error (unrecognized type: ") + (func14_GetCurrent_Str()))) + (")")), 269, "Analyser.gbas");
							
						};
						local6_CurTyp_1764 = global8_LastType.attr2_ID;
						
					} else if ((((local16___SelectHelper6__1790) == ("ENDTYPE")) ? 1 : 0)) {
						local6_CurTyp_1764 = -(1);
						
					} else if ((((local16___SelectHelper6__1790) == ("STARTDATA")) ? 1 : 0)) {
						var local8_Name_Str_1792 = "", local5_Datas_1793 = new GLBArray(), local5_dataB_1797 = new type9_DataBlock();
						func5_Match("STARTDATA", 274, "Analyser.gbas");
						local8_Name_Str_1792 = func14_GetCurrent_Str();
						if ((((func14_IsValidVarName()) == (0)) ? 1 : 0)) {
							func5_Error("Invalid DATA name", 276, "Analyser.gbas");
							
						};
						func5_Match(local8_Name_Str_1792, 277, "Analyser.gbas");
						func5_Match(":", 278, "Analyser.gbas");
						func5_Match("\n", 279, "Analyser.gbas");
						while (func7_IsToken("DATA")) {
							var local4_Done_1794 = 0;
							func5_Match("DATA", 282, "Analyser.gbas");
							local4_Done_1794 = 0;
							while ((((func7_IsToken("\n")) == (0)) ? 1 : 0)) {
								var local1_e_1795 = 0.0, local7_tmpData_1796 = new type8_Datatype();
								if ((((local4_Done_1794) == (1)) ? 1 : 0)) {
									func5_Match(",", 285, "Analyser.gbas");
									
								};
								local1_e_1795 = func10_Expression(0);
								local7_tmpData_1796 = global5_Exprs_ref[0].arrAccess(~~(local1_e_1795)).values[tmpPositionCache][0].attr8_datatype.clone(/* In Assign */);
								local7_tmpData_1796.attr7_IsArray_ref[0] = 0;
								func14_EnsureDatatype(~~(local1_e_1795), local7_tmpData_1796, 0, 0);
								if ((((((((((global5_Exprs_ref[0].arrAccess(~~(local1_e_1795)).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str_ref[0]) == ("int")) ? 1 : 0)) || ((((global5_Exprs_ref[0].arrAccess(~~(local1_e_1795)).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str_ref[0]) == ("float")) ? 1 : 0))) ? 1 : 0)) || ((((global5_Exprs_ref[0].arrAccess(~~(local1_e_1795)).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str_ref[0]) == ("string")) ? 1 : 0))) ? 1 : 0)) {
									
								} else {
									func5_Error((((("Must be primitive datatype (int, float or string), got '") + (global5_Exprs_ref[0].arrAccess(~~(local1_e_1795)).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str_ref[0]))) + ("'")), 293, "Analyser.gbas");
									
								};
								DIMPUSH(local5_Datas_1793, ~~(local1_e_1795));
								local4_Done_1794 = 1;
								
							};
							func5_Match("\n", 298, "Analyser.gbas");
							
						};
						func5_Match("ENDDATA", 300, "Analyser.gbas");
						local5_dataB_1797.attr8_Name_Str = local8_Name_Str_1792;
						local5_dataB_1797.attr5_Datas = local5_Datas_1793.clone(/* In Assign */);
						DIMPUSH(global8_Compiler.attr10_DataBlocks, local5_dataB_1797);
						
					};
					
				};
				func7_GetNext();
				
			} catch (Err_Str) {
				if (Err_Str instanceof GLBException) Err_Str = Err_Str.getText(); else throwError(Err_Str);{
					func8_FixError();
					
				}
			};
			
		};
		
	};
	return 0;
	
};
func8_Analyser = window['func8_Analyser'];
window['func11_CheckCyclic'] = function(param8_Name_Str, param3_typ) {
	var forEachSaver3180 = param3_typ.attr10_Attributes;
	for(var forEachCounter3180 = 0 ; forEachCounter3180 < forEachSaver3180.values.length ; forEachCounter3180++) {
		var local1_t_1801 = forEachSaver3180.values[forEachCounter3180];
	{
			if ((((global8_Compiler.attr5_Varis_ref[0].arrAccess(local1_t_1801).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str_ref[0]) == (param8_Name_Str)) ? 1 : 0)) {
				func5_Error((((((((("Cyclic reference '") + (global8_Compiler.attr5_Varis_ref[0].arrAccess(local1_t_1801).values[tmpPositionCache][0].attr8_Name_Str))) + ("' to type '"))) + (param8_Name_Str))) + ("'")), 320, "Analyser.gbas");
				
			} else if (func6_IsType(unref(global8_Compiler.attr5_Varis_ref[0].arrAccess(local1_t_1801).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str_ref[0]))) {
				func11_CheckCyclic(param8_Name_Str, global8_LastType);
				
			} else {
				
			};
			
		}
		forEachSaver3180.values[forEachCounter3180] = local1_t_1801;
	
	};
	return 0;
	
};
func11_CheckCyclic = window['func11_CheckCyclic'];
window['func10_ExtendType'] = function(param3_typ) {
	if ((((param3_typ.attr9_Extending) != (-(1))) ? 1 : 0)) {
		var alias6_ExtTyp_ref_1803 = [new type14_IdentifierType()], local6_tmpTyp_1804 = 0, local9_Abstracts_1805 = new GLBArray();
		func10_ExtendType(unref(global8_Compiler.attr5_Types_ref[0].arrAccess(param3_typ.attr9_Extending).values[tmpPositionCache][0]));
		alias6_ExtTyp_ref_1803 = global8_Compiler.attr5_Types_ref[0].arrAccess(param3_typ.attr9_Extending).values[tmpPositionCache] /* ALIAS */;
		local6_tmpTyp_1804 = alias6_ExtTyp_ref_1803[0].attr2_ID;
		while ((((local6_tmpTyp_1804) != (-(1))) ? 1 : 0)) {
			var forEachSaver3248 = global8_Compiler.attr5_Types_ref[0].arrAccess(local6_tmpTyp_1804).values[tmpPositionCache][0].attr7_Methods;
			for(var forEachCounter3248 = 0 ; forEachCounter3248 < forEachSaver3248.values.length ; forEachCounter3248++) {
				var local1_M_1806 = forEachSaver3248.values[forEachCounter3248];
			{
					if (global8_Compiler.attr5_Funcs_ref[0].arrAccess(local1_M_1806).values[tmpPositionCache][0].attr10_IsAbstract) {
						DIMPUSH(local9_Abstracts_1805, local1_M_1806);
						
					};
					
				}
				forEachSaver3248.values[forEachCounter3248] = local1_M_1806;
			
			};
			local6_tmpTyp_1804 = global8_Compiler.attr5_Types_ref[0].arrAccess(local6_tmpTyp_1804).values[tmpPositionCache][0].attr9_Extending;
			
		};
		var forEachSaver3352 = local9_Abstracts_1805;
		for(var forEachCounter3352 = 0 ; forEachCounter3352 < forEachSaver3352.values.length ; forEachCounter3352++) {
			var local2_Ab_1807 = forEachSaver3352.values[forEachCounter3352];
		{
				var local5_Found_1808 = 0;
				local5_Found_1808 = 0;
				local6_tmpTyp_1804 = alias6_ExtTyp_ref_1803[0].attr2_ID;
				while ((((local6_tmpTyp_1804) != (-(1))) ? 1 : 0)) {
					var forEachSaver3325 = global8_Compiler.attr5_Types_ref[0].arrAccess(local6_tmpTyp_1804).values[tmpPositionCache][0].attr7_Methods;
					for(var forEachCounter3325 = 0 ; forEachCounter3325 < forEachSaver3325.values.length ; forEachCounter3325++) {
						var local1_M_1809 = forEachSaver3325.values[forEachCounter3325];
					{
							if (((((((global8_Compiler.attr5_Funcs_ref[0].arrAccess(local1_M_1809).values[tmpPositionCache][0].attr8_Name_Str) == (global8_Compiler.attr5_Funcs_ref[0].arrAccess(local2_Ab_1807).values[tmpPositionCache][0].attr8_Name_Str)) ? 1 : 0)) && (((global8_Compiler.attr5_Funcs_ref[0].arrAccess(local1_M_1809).values[tmpPositionCache][0].attr10_IsAbstract) ? 0 : 1))) ? 1 : 0)) {
								local5_Found_1808 = 1;
								break;
								
							};
							
						}
						forEachSaver3325.values[forEachCounter3325] = local1_M_1809;
					
					};
					if (local5_Found_1808) {
						break;
						
					};
					local6_tmpTyp_1804 = global8_Compiler.attr5_Types_ref[0].arrAccess(local6_tmpTyp_1804).values[tmpPositionCache][0].attr9_Extending;
					
				};
				if (((local5_Found_1808) ? 0 : 1)) {
					alias6_ExtTyp_ref_1803[0].attr10_Createable = 0;
					
				};
				
			}
			forEachSaver3352.values[forEachCounter3352] = local2_Ab_1807;
		
		};
		var forEachSaver3410 = alias6_ExtTyp_ref_1803[0].attr10_Attributes;
		for(var forEachCounter3410 = 0 ; forEachCounter3410 < forEachSaver3410.values.length ; forEachCounter3410++) {
			var local1_A_1810 = forEachSaver3410.values[forEachCounter3410];
		{
				var alias3_Att_ref_1811 = [new type14_IdentifierVari()], local6_Exists_1812 = 0;
				alias3_Att_ref_1811 = global8_Compiler.attr5_Varis_ref[0].arrAccess(local1_A_1810).values[tmpPositionCache] /* ALIAS */;
				local6_Exists_1812 = 0;
				var forEachSaver3398 = param3_typ.attr10_Attributes;
				for(var forEachCounter3398 = 0 ; forEachCounter3398 < forEachSaver3398.values.length ; forEachCounter3398++) {
					var local2_A2_1813 = forEachSaver3398.values[forEachCounter3398];
				{
						var alias4_Att2_ref_1814 = [new type14_IdentifierVari()];
						alias4_Att2_ref_1814 = global8_Compiler.attr5_Varis_ref[0].arrAccess(local2_A2_1813).values[tmpPositionCache] /* ALIAS */;
						if ((((alias3_Att_ref_1811[0].attr8_Name_Str) == (alias4_Att2_ref_1814[0].attr8_Name_Str)) ? 1 : 0)) {
							local6_Exists_1812 = 1;
							break;
							
						};
						
					}
					forEachSaver3398.values[forEachCounter3398] = local2_A2_1813;
				
				};
				if (((local6_Exists_1812) ? 0 : 1)) {
					DIMPUSH(param3_typ.attr10_Attributes, local1_A_1810);
					
				};
				
			}
			forEachSaver3410.values[forEachCounter3410] = local1_A_1810;
		
		};
		
	};
	return 0;
	
};
func10_ExtendType = window['func10_ExtendType'];
window['method21_type14_IdentifierFunc_4_Save'] = function(param1_F, param4_self) {
	WRITEUWORD(param1_F, ~~(1000));
	func11_WriteString(param1_F, param4_self.attr9_OName_Str);
	func11_WriteString(param1_F, param4_self.attr8_Name_Str);
	WRITEUWORD(param1_F, BOUNDS(param4_self.attr6_Params, 0));
	var forEachSaver3460 = param4_self.attr6_Params;
	for(var forEachCounter3460 = 0 ; forEachCounter3460 < forEachSaver3460.values.length ; forEachCounter3460++) {
		var local1_P_1818 = forEachSaver3460.values[forEachCounter3460];
	{
			WRITELONG(param1_F, local1_P_1818);
			if ((((local1_P_1818) != (-(1))) ? 1 : 0)) {
				(global8_Compiler.attr5_Varis_ref[0].arrAccess(local1_P_1818).values[tmpPositionCache][0]).Save(param1_F);
				
			};
			
		}
		forEachSaver3460.values[forEachCounter3460] = local1_P_1818;
	
	};
	WRITEUWORD(param1_F, BOUNDS(param4_self.attr10_CopyParams, 0));
	var forEachSaver3494 = param4_self.attr10_CopyParams;
	for(var forEachCounter3494 = 0 ; forEachCounter3494 < forEachSaver3494.values.length ; forEachCounter3494++) {
		var local1_P_1819 = forEachSaver3494.values[forEachCounter3494];
	{
			WRITELONG(param1_F, local1_P_1819);
			if ((((local1_P_1819) != (-(1))) ? 1 : 0)) {
				(global8_Compiler.attr5_Varis_ref[0].arrAccess(local1_P_1819).values[tmpPositionCache][0]).Save(param1_F);
				
			};
			
		}
		forEachSaver3494.values[forEachCounter3494] = local1_P_1819;
	
	};
	WRITEUWORD(param1_F, BOUNDS(param4_self.attr7_Statics, 0));
	var forEachSaver3528 = param4_self.attr7_Statics;
	for(var forEachCounter3528 = 0 ; forEachCounter3528 < forEachSaver3528.values.length ; forEachCounter3528++) {
		var local1_P_1820 = forEachSaver3528.values[forEachCounter3528];
	{
			WRITELONG(param1_F, local1_P_1820);
			if ((((local1_P_1820) != (-(1))) ? 1 : 0)) {
				(global8_Compiler.attr5_Varis_ref[0].arrAccess(local1_P_1820).values[tmpPositionCache][0]).Save(param1_F);
				
			};
			
		}
		forEachSaver3528.values[forEachCounter3528] = local1_P_1820;
	
	};
	WRITELONG(param1_F, param4_self.attr6_Native);
	WRITELONG(param1_F, param4_self.attr3_Scp);
	WRITELONG(param1_F, param4_self.attr2_ID);
	WRITELONG(param1_F, param4_self.attr3_Typ);
	WRITELONG(param1_F, param4_self.attr3_Tok);
	WRITELONG(param1_F, param4_self.attr10_PlzCompile);
	WRITELONG(param1_F, param4_self.attr6_HasRef);
	WRITELONG(param1_F, param4_self.attr6_MyType);
	WRITELONG(param1_F, param4_self.attr7_SelfVar);
	WRITELONG(param1_F, param4_self.attr10_IsAbstract);
	WRITELONG(param1_F, param4_self.attr10_IsCallback);
	if ((((param4_self.attr3_Tok) != (-(1))) ? 1 : 0)) {
		(global8_Compiler.attr6_Tokens.arrAccess(param4_self.attr3_Tok).values[tmpPositionCache]).Save(param1_F);
		
	};
	(param4_self.attr8_datatype).Save(param1_F);
	if ((((param4_self.attr6_MyType) != (-(1))) ? 1 : 0)) {
		(global8_Compiler.attr5_Types_ref[0].arrAccess(param4_self.attr6_MyType).values[tmpPositionCache][0]).Save(param1_F);
		
	};
	if ((((param4_self.attr3_Scp) != (-(1))) ? 1 : 0)) {
		(global5_Exprs_ref[0].arrAccess(param4_self.attr3_Scp).values[tmpPositionCache][0]).Save(param1_F);
		
	};
	WRITEUWORD(param1_F, ~~(1000));
	return 0;
	
};
method21_type14_IdentifierFunc_4_Save = window['method21_type14_IdentifierFunc_4_Save'];
window['method21_type14_IdentifierFunc_4_Load'] = function(param1_F, param4_self) {
	return 0;
	
};
method21_type14_IdentifierFunc_4_Load = window['method21_type14_IdentifierFunc_4_Load'];
window['method21_type14_IdentifierVari_4_Save'] = function(param1_F, param4_self) {
	WRITEUWORD(param1_F, ~~(2000));
	func11_WriteString(param1_F, param4_self.attr8_Name_Str);
	(param4_self.attr8_datatype).Save(param1_F);
	WRITELONG(param1_F, param4_self.attr3_Typ);
	WRITELONG(param1_F, param4_self.attr2_ID);
	WRITELONG(param1_F, param4_self.attr6_PreDef);
	WRITELONG(param1_F, param4_self.attr3_ref);
	WRITELONG(param1_F, param4_self.attr9_OwnerVari);
	WRITELONG(param1_F, param4_self.attr4_func);
	if (param4_self.attr4_func) {
		(global8_Compiler.attr5_Funcs_ref[0].arrAccess(param4_self.attr4_func).values[tmpPositionCache][0]).Save(param1_F);
		
	};
	if (param4_self.attr9_OwnerVari) {
		(global8_Compiler.attr5_Varis_ref[0].arrAccess(param4_self.attr9_OwnerVari).values[tmpPositionCache][0]).Save(param1_F);
		
	};
	if ((((param4_self.attr6_PreDef) == (-(1))) ? 1 : 0)) {
		(global5_Exprs_ref[0].arrAccess(param4_self.attr6_PreDef).values[tmpPositionCache][0]).Save(param1_F);
		
	};
	WRITEUWORD(param1_F, ~~(2000));
	return 0;
	
};
method21_type14_IdentifierVari_4_Save = window['method21_type14_IdentifierVari_4_Save'];
window['method21_type14_IdentifierVari_4_Load'] = function(param1_F, param4_self) {
	return 0;
	
};
method21_type14_IdentifierVari_4_Load = window['method21_type14_IdentifierVari_4_Load'];
window['method21_type14_IdentifierType_4_Save'] = function(param1_F, param4_self) {
	WRITEUWORD(param1_F, ~~(3000));
	func11_WriteString(param1_F, param4_self.attr8_Name_Str);
	func11_WriteString(param1_F, param4_self.attr12_RealName_Str);
	WRITEUWORD(param1_F, param4_self.attr2_ID);
	WRITELONG(param1_F, param4_self.attr9_Extending);
	WRITEUWORD(param1_F, BOUNDS(param4_self.attr10_Attributes, 0));
	var forEachSaver3804 = param4_self.attr10_Attributes;
	for(var forEachCounter3804 = 0 ; forEachCounter3804 < forEachSaver3804.values.length ; forEachCounter3804++) {
		var local1_P_1833 = forEachSaver3804.values[forEachCounter3804];
	{
			WRITELONG(param1_F, local1_P_1833);
			if ((((local1_P_1833) != (-(1))) ? 1 : 0)) {
				(global8_Compiler.attr5_Varis_ref[0].arrAccess(local1_P_1833).values[tmpPositionCache][0]).Save(param1_F);
				
			};
			
		}
		forEachSaver3804.values[forEachCounter3804] = local1_P_1833;
	
	};
	WRITEUWORD(param1_F, BOUNDS(param4_self.attr7_Methods, 0));
	var forEachSaver3838 = param4_self.attr7_Methods;
	for(var forEachCounter3838 = 0 ; forEachCounter3838 < forEachSaver3838.values.length ; forEachCounter3838++) {
		var local1_P_1834 = forEachSaver3838.values[forEachCounter3838];
	{
			WRITELONG(param1_F, local1_P_1834);
			if ((((local1_P_1834) != (-(1))) ? 1 : 0)) {
				(global8_Compiler.attr5_Funcs_ref[0].arrAccess(local1_P_1834).values[tmpPositionCache][0]).Save(param1_F);
				
			};
			
		}
		forEachSaver3838.values[forEachCounter3838] = local1_P_1834;
	
	};
	WRITEUWORD(param1_F, BOUNDS(param4_self.attr7_PreSize, 0));
	var forEachSaver3870 = param4_self.attr7_PreSize;
	for(var forEachCounter3870 = 0 ; forEachCounter3870 < forEachSaver3870.values.length ; forEachCounter3870++) {
		var local1_P_1835 = forEachSaver3870.values[forEachCounter3870];
	{
			WRITELONG(param1_F, local1_P_1835);
			if ((((local1_P_1835) != (-(1))) ? 1 : 0)) {
				(global5_Exprs_ref[0].arrAccess(local1_P_1835).values[tmpPositionCache][0]).Save(param1_F);
				
			};
			
		}
		forEachSaver3870.values[forEachCounter3870] = local1_P_1835;
	
	};
	WRITEUWORD(param1_F, ~~(3000));
	return 0;
	
};
method21_type14_IdentifierType_4_Save = window['method21_type14_IdentifierType_4_Save'];
window['method21_type14_IdentifierType_4_Load'] = function(param1_F, param4_self) {
	var local3_tmp_ref_1839 = [0];
	READUWORD(param1_F, local3_tmp_ref_1839);
	if ((((local3_tmp_ref_1839[0]) != (3000)) ? 1 : 0)) {
		return tryClone(0);
		
	};
	READUWORD(param1_F, local3_tmp_ref_1839);
	if ((((local3_tmp_ref_1839[0]) != (3000)) ? 1 : 0)) {
		return tryClone(0);
		
	};
	return tryClone(0);
	return 0;
	
};
method21_type14_IdentifierType_4_Load = window['method21_type14_IdentifierType_4_Load'];
window['method14_type8_Datatype_4_Save'] = function(param1_F, param4_self) {
	WRITEUWORD(param1_F, ~~(4000));
	func11_WriteString(param1_F, unref(param4_self.attr8_Name_Str_ref[0]));
	WRITELONG(param1_F, unref(param4_self.attr7_IsArray_ref[0]));
	WRITEUWORD(param1_F, ~~(4000));
	return 0;
	
};
method14_type8_Datatype_4_Save = window['method14_type8_Datatype_4_Save'];
window['method14_type8_Datatype_4_Load'] = function(param1_F, param4_self) {
	var local3_tmp_ref_1846 = [0];
	READUWORD(param1_F, local3_tmp_ref_1846);
	if ((((local3_tmp_ref_1846[0]) != (4000)) ? 1 : 0)) {
		return tryClone(0);
		
	};
	func10_ReadString(param1_F, param4_self.attr8_Name_Str_ref);
	READLONG(param1_F, param4_self.attr7_IsArray_ref);
	READUWORD(param1_F, local3_tmp_ref_1846);
	if ((((local3_tmp_ref_1846[0]) != (4000)) ? 1 : 0)) {
		return tryClone(0);
		
	};
	return 1;
	return 0;
	
};
method14_type8_Datatype_4_Load = window['method14_type8_Datatype_4_Load'];
window['method11_type5_Token_4_Load'] = function(param1_F, param4_self) {
	var local3_tmp_ref_1850 = [0];
	READUWORD(param1_F, local3_tmp_ref_1850);
	if ((((local3_tmp_ref_1850[0]) != (5000)) ? 1 : 0)) {
		return tryClone(0);
		
	};
	READLONG(param1_F, param4_self.attr4_Line_ref);
	READLONG(param1_F, param4_self.attr9_Character_ref);
	func10_ReadString(param1_F, param4_self.attr15_LineContent_Str_ref);
	func10_ReadString(param1_F, param4_self.attr8_Path_Str_ref);
	func10_ReadString(param1_F, param4_self.attr8_Text_Str_ref);
	READUWORD(param1_F, local3_tmp_ref_1850);
	if ((((local3_tmp_ref_1850[0]) != (5000)) ? 1 : 0)) {
		return tryClone(0);
		
	};
	return 1;
	return 0;
	
};
method11_type5_Token_4_Load = window['method11_type5_Token_4_Load'];
window['method11_type5_Token_4_Save'] = function(param1_F, param4_self) {
	WRITEUWORD(param1_F, ~~(5000));
	WRITELONG(param1_F, unref(param4_self.attr4_Line_ref[0]));
	WRITELONG(param1_F, unref(param4_self.attr9_Character_ref[0]));
	func11_WriteString(param1_F, unref(param4_self.attr15_LineContent_Str_ref[0]));
	func11_WriteString(param1_F, unref(param4_self.attr8_Path_Str_ref[0]));
	func11_WriteString(param1_F, unref(param4_self.attr8_Text_Str_ref[0]));
	WRITEUWORD(param1_F, ~~(5000));
	return 0;
	
};
method11_type5_Token_4_Save = window['method11_type5_Token_4_Save'];
window['method10_type4_Expr_4_Load'] = function(param4_self) {
	return 0;
	
};
method10_type4_Expr_4_Load = window['method10_type4_Expr_4_Load'];
window['method10_type4_Expr_4_Save'] = function(param1_F, param4_self) {
	WRITEUWORD(param1_F, ~~(1));
	return 0;
	
};
method10_type4_Expr_4_Save = window['method10_type4_Expr_4_Save'];
window['func12_LoadFile_Str'] = function(param8_Path_Str) {
	var local8_Text_Str_2554 = "", local4_File_2555 = 0;
	local4_File_2555 = GENFILE();
	if (OPENFILE(local4_File_2555, param8_Path_Str, 1)) {
		while ((((ENDOFFILE(local4_File_2555)) == (0)) ? 1 : 0)) {
			var local8_Line_Str_ref_2556 = [""];
			READLINE(local4_File_2555, local8_Line_Str_ref_2556);
			local8_Text_Str_2554 = ((((local8_Text_Str_2554) + (local8_Line_Str_ref_2556[0]))) + ("\n"));
			
		};
		CLOSEFILE(local4_File_2555);
		
	} else {
		func5_Error((("Cannot find file: ") + (param8_Path_Str)), 613, "Compiler.gbas");
		
	};
	return tryClone(local8_Text_Str_2554);
	return "";
	
};
func12_LoadFile_Str = window['func12_LoadFile_Str'];
window['func5_Error'] = function(param7_Msg_Str, param4_Line, param8_File_Str) {
	var local3_tok_1862 = new type5_Token();
	local3_tok_1862 = func15_GetCurrentToken().clone(/* In Assign */);
	param7_Msg_Str = (((((("Error: '") + (REPLACE_Str(param7_Msg_Str, "\n", "NEWLINE")))) + (global8_Compiler.attr14_errorState_Str))) + ("'\n"));
	param7_Msg_Str = ((((((((((((((param7_Msg_Str) + ("in line '"))) + (CAST2STRING(local3_tok_1862.attr4_Line_ref[0])))) + ("' at character '"))) + (CAST2STRING(local3_tok_1862.attr9_Character_ref[0])))) + ("' near '"))) + (REPLACE_Str(unref(local3_tok_1862.attr8_Text_Str_ref[0]), "\n", "NEWLINE")))) + ("'\n"));
	param7_Msg_Str = ((((((param7_Msg_Str) + ("in file '"))) + (local3_tok_1862.attr8_Path_Str_ref[0]))) + ("'\n"));
	param7_Msg_Str = ((((((param7_Msg_Str) + ("\t '"))) + (local3_tok_1862.attr15_LineContent_Str_ref[0]))) + ("'\n"));
	param7_Msg_Str = ((param7_Msg_Str) + ("-----------------------------------\n"));
	param7_Msg_Str = (("\n-----------------------------------\n") + (param7_Msg_Str));
	STDERR(param7_Msg_Str);
	global8_Compiler.attr8_WasError = 1;
	END();
	throw new GLBException((((("syntaxerror '") + (param7_Msg_Str))) + ("'")), "\Compiler.gbas", 642);
	return 0;
	
};
func5_Error = window['func5_Error'];
window['func7_Warning'] = function(param7_Msg_Str) {
	var local3_tok_2558 = new type5_Token();
	local3_tok_2558 = func15_GetCurrentToken().clone(/* In Assign */);
	param7_Msg_Str = (((("Warning: '") + (REPLACE_Str(param7_Msg_Str, "\n", "NEWLINE")))) + ("'\n"));
	param7_Msg_Str = ((((((((((((((param7_Msg_Str) + ("in line '"))) + (CAST2STRING(local3_tok_2558.attr4_Line_ref[0])))) + ("' at character '"))) + (CAST2STRING(local3_tok_2558.attr9_Character_ref[0])))) + ("' near '"))) + (REPLACE_Str(unref(local3_tok_2558.attr8_Text_Str_ref[0]), "\n", "NEWLINE")))) + ("'\n"));
	param7_Msg_Str = ((((((param7_Msg_Str) + ("in file '"))) + (local3_tok_2558.attr8_Path_Str_ref[0]))) + ("'\n"));
	param7_Msg_Str = ((((((param7_Msg_Str) + ("\t '"))) + (local3_tok_2558.attr15_LineContent_Str_ref[0]))) + ("'\n"));
	param7_Msg_Str = ((param7_Msg_Str) + ("-----------------------------------\n"));
	param7_Msg_Str = (("\n-----------------------------------\n") + (param7_Msg_Str));
	STDOUT(param7_Msg_Str);
	return 0;
	
};
func7_Warning = window['func7_Warning'];
window['func11_CreateToken'] = function(param8_Text_Str, param15_LineContent_Str, param4_Line, param9_Character, param8_Path_Str) {
	if (((((((((((((param8_Text_Str) != ("\n")) ? 1 : 0)) && ((((TRIM_Str(param8_Text_Str, " \t\r\n\v\f")) == ("")) ? 1 : 0))) ? 1 : 0)) || ((((param8_Text_Str) == ("\t")) ? 1 : 0))) ? 1 : 0)) || ((((param8_Text_Str) == ("\r")) ? 1 : 0))) ? 1 : 0)) {
		
	} else {
		var local6_ascval_2564 = 0, local3_pos_2565 = 0.0;
		local6_ascval_2564 = ASC(param8_Text_Str, 0);
		if ((((((((((local6_ascval_2564) == (8)) ? 1 : 0)) || ((((local6_ascval_2564) == (12)) ? 1 : 0))) ? 1 : 0)) || ((((CAST2STRING(local6_ascval_2564)) == (global11_SHLASHF_Str)) ? 1 : 0))) ? 1 : 0)) {
			param8_Text_Str = "\n";
			
		};
		local3_pos_2565 = global8_Compiler.attr11_LastTokenID;
		global8_Compiler.attr11_LastTokenID = ((global8_Compiler.attr11_LastTokenID) + (1));
		if ((((global8_Compiler.attr11_LastTokenID) >= (((BOUNDS(global8_Compiler.attr6_Tokens, 0)) - (10)))) ? 1 : 0)) {
			REDIM(global8_Compiler.attr6_Tokens, [((global8_Compiler.attr11_LastTokenID) + (50))], new type5_Token() );
			
		};
		global8_Compiler.attr6_Tokens.arrAccess(~~(local3_pos_2565)).values[tmpPositionCache].attr4_Line_ref[0] = param4_Line;
		global8_Compiler.attr6_Tokens.arrAccess(~~(local3_pos_2565)).values[tmpPositionCache].attr9_Character_ref[0] = param9_Character;
		global8_Compiler.attr6_Tokens.arrAccess(~~(local3_pos_2565)).values[tmpPositionCache].attr15_LineContent_Str_ref[0] = param15_LineContent_Str;
		global8_Compiler.attr6_Tokens.arrAccess(~~(local3_pos_2565)).values[tmpPositionCache].attr8_Path_Str_ref[0] = param8_Path_Str;
		global8_Compiler.attr6_Tokens.arrAccess(~~(local3_pos_2565)).values[tmpPositionCache].attr8_Text_Str_ref[0] = param8_Text_Str;
		if ((((LEFT_Str(unref(global8_Compiler.attr6_Tokens.arrAccess(~~(local3_pos_2565)).values[tmpPositionCache].attr8_Text_Str_ref[0]), 1)) == ("@")) ? 1 : 0)) {
			global8_Compiler.attr6_Tokens.arrAccess(~~(local3_pos_2565)).values[tmpPositionCache].attr8_Text_Str_ref[0] = MID_Str(unref(global8_Compiler.attr6_Tokens.arrAccess(~~(local3_pos_2565)).values[tmpPositionCache].attr8_Text_Str_ref[0]), 1, -(1));
			
		};
		
	};
	return tryClone(unref(new type5_Token()));
	
};
func11_CreateToken = window['func11_CreateToken'];
window['func15_GetCurrentToken'] = function() {
	if ((((global8_Compiler.attr11_currentPosi) < (global8_Compiler.attr11_LastTokenID)) ? 1 : 0)) {
		return tryClone(global8_Compiler.attr6_Tokens.arrAccess(global8_Compiler.attr11_currentPosi).values[tmpPositionCache]);
		
	} else {
		var local1_t_1863 = new type5_Token();
		return tryClone(local1_t_1863);
		
	};
	return tryClone(unref(new type5_Token()));
	
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
			func5_Error("Unexpected end of line", 714, "Compiler.gbas");
			
		};
		
	} while (!(((global8_Compiler.attr6_Tokens.arrAccess(global8_Compiler.attr11_currentPosi).values[tmpPositionCache].attr5_IsDel) ? 0 : 1)));
	return 0;
	
};
func7_GetNext = window['func7_GetNext'];
window['func5_Match'] = function(param8_Text_Str, param4_Line, param8_File_Str) {
	if ((((global8_Compiler.attr6_Tokens.arrAccess(global8_Compiler.attr11_currentPosi).values[tmpPositionCache].attr8_Text_Str_ref[0]) != (param8_Text_Str)) ? 1 : 0)) {
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
	return tryClone(unref(global8_Compiler.attr6_Tokens.arrAccess(global8_Compiler.attr11_currentPosi).values[tmpPositionCache].attr8_Text_Str_ref[0]));
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
	if ((((func14_GetCurrent_Str()) != (param8_Text_Str)) ? 1 : 0)) {
		func5_Error((((("Unexpected token, expecting: '") + (param8_Text_Str))) + ("'")), ~~(param4_Line), param8_File_Str);
		
	};
	func13_RemoveCurrent();
	return 0;
	
};
func14_MatchAndRemove = window['func14_MatchAndRemove'];
window['func14_CreateDatatype'] = function(param8_Name_Str, param7_IsArray) {
	var local8_datatype_2571 = new type8_Datatype();
	local8_datatype_2571.attr8_Name_Str_ref[0] = param8_Name_Str;
	local8_datatype_2571.attr7_IsArray_ref[0] = param7_IsArray;
	return tryClone(local8_datatype_2571);
	return tryClone(unref(new type8_Datatype()));
	
};
func14_CreateDatatype = window['func14_CreateDatatype'];
window['func7_IsToken'] = function(param8_Text_Str) {
	if ((((func14_GetCurrent_Str()) == (param8_Text_Str)) ? 1 : 0)) {
		return 1;
		
	} else {
		return tryClone(0);
		
	};
	return 0;
	
};
func7_IsToken = window['func7_IsToken'];
window['func14_CreateOperator'] = function(param8_Name_Str, param7_Sym_Str, param4_Prio, param3_Typ) {
	var local2_Op_ref_2576 = [new type8_Operator()];
	local2_Op_ref_2576[0].attr8_Name_Str = param8_Name_Str;
	local2_Op_ref_2576[0].attr7_Sym_Str = param7_Sym_Str;
	local2_Op_ref_2576[0].attr4_Prio = param4_Prio;
	local2_Op_ref_2576[0].attr3_Typ = param3_Typ;
	local2_Op_ref_2576[0].attr2_ID = BOUNDS(global9_Operators_ref[0], 0);
	DIMPUSH(global9_Operators_ref[0], local2_Op_ref_2576);
	return 0;
	
};
func14_CreateOperator = window['func14_CreateOperator'];
window['func11_WriteString'] = function(param1_F, param8_Text_Str) {
	WRITEULONG(param1_F, INT2STR(param8_Text_Str));
	WRITESTR(param1_F, param8_Text_Str);
	return 0;
	
};
func11_WriteString = window['func11_WriteString'];
window['func10_ReadString'] = function(param1_F, param8_Text_Str_ref) {
	var local1_l_ref_1872 = [0];
	READULONG(param1_F, local1_l_ref_1872);
	READSTR(param1_F, param8_Text_Str_ref, unref(local1_l_ref_1872[0]));
	return 0;
	
};
func10_ReadString = window['func10_ReadString'];
window['func11_AddVariable'] = function(param4_Vari, param6_Ignore) {
	var local4_Vari_ref_1873 = [param4_Vari]; /* NEWCODEHERE */
	if (((((((param6_Ignore) == (0)) ? 1 : 0)) && (func13_IsVarExisting(local4_Vari_ref_1873[0].attr8_Name_Str))) ? 1 : 0)) {
		func5_Error((((("Variable already exists, is a keyword or a type: '") + (local4_Vari_ref_1873[0].attr8_Name_Str))) + ("'")), 787, "Compiler.gbas");
		
	};
	local4_Vari_ref_1873[0].attr2_ID = BOUNDS(global8_Compiler.attr5_Varis_ref[0], 0);
	DIMPUSH(global8_Compiler.attr5_Varis_ref[0], local4_Vari_ref_1873);
	return 0;
	
};
func11_AddVariable = window['func11_AddVariable'];
window['func11_AddFunction'] = function(param4_Func) {
	var local4_Func_ref_1875 = [param4_Func]; /* NEWCODEHERE */
	if (((((((local4_Func_ref_1875[0].attr3_Typ) != (3)) ? 1 : 0)) && (func14_IsFuncExisting(local4_Func_ref_1875[0].attr8_Name_Str, local4_Func_ref_1875[0].attr10_IsCallback))) ? 1 : 0)) {
		func5_Error((((("Function already exists, is a keyword or a type: '") + (local4_Func_ref_1875[0].attr8_Name_Str))) + ("'")), 794, "Compiler.gbas");
		
	};
	local4_Func_ref_1875[0].attr2_ID = BOUNDS(global8_Compiler.attr5_Funcs_ref[0], 0);
	DIMPUSH(global8_Compiler.attr5_Funcs_ref[0], local4_Func_ref_1875);
	return 0;
	
};
func11_AddFunction = window['func11_AddFunction'];
window['InitCompiler'] = function() {
	var local12_Keywords_Str_1876 = new GLBArray();
	REDIM(global7_Defines, [0], new type7_TDefine() );
	global12_voidDatatype = func14_CreateDatatype("void", 0).clone(/* In Assign */);
	global11_intDatatype = func14_CreateDatatype("int", 0).clone(/* In Assign */);
	global13_floatDatatype = func14_CreateDatatype("float", 0).clone(/* In Assign */);
	global11_strDatatype = func14_CreateDatatype("string", 0).clone(/* In Assign */);
	global11_SHLASHF_Str = CHR_Str(INT2STR("\f"));
	REDIM(unref(global9_Operators_ref[0]), [0], [new type8_Operator()] );
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
	DIMDATA(local12_Keywords_Str_1876, ["CALLBACK", "FUNCTION", "ENDFUNCTION", "SUB", "ENDSUB", "GOSUB", "IF", "ELSE", "ELSEIF", "THEN", "ENDIF", "WHILE", "WEND", "BREAK", "CONTINUE", "FOR", "FOREACH", "IN", "TO", "STEP", "NEXT", "REPEAT", "UNTIL", "TYPE", "ENDTYPE", "RETURN", "NATIVE", "LOCAL", "GLOBAL", "STATIC", "DIM", "REDIM", "INLINE", "ENDINLINE", "PROTOTYPE", "REQUIRE", "BREAK", "CONTINUE", "TRY", "CATCH", "FINALLY", "THROW", "SELECT", "CASE", "DEFAULT", "ENDSELECT", "STARTDATA", "ENDDATA", "DATA", "RESTORE", "READ", "GOTO", "ALIAS", "AS", "CONSTANT", "INC", "DEC", "DIMPUSH", "LEN", "DIMDATA", "DELETE", "DIMDEL", "DEBUG", "ASSERT", "ABSTRACT", "EXPORT"]);
	(global10_KeywordMap).SetSize(((BOUNDS(local12_Keywords_Str_1876, 0)) * (8)));
	var forEachSaver4565 = local12_Keywords_Str_1876;
	for(var forEachCounter4565 = 0 ; forEachCounter4565 < forEachSaver4565.values.length ; forEachCounter4565++) {
		var local7_key_Str_1877 = forEachSaver4565.values[forEachCounter4565];
	{
			(global10_KeywordMap).Put(local7_key_Str_1877, 1);
			
		}
		forEachSaver4565.values[forEachCounter4565] = local7_key_Str_1877;
	
	};
	RegisterDefine("GLB_VERSION", "1");
	RegisterDefine("GLBSCRIPT", CAST2STRING(1));
	RegisterDefine("ADDON_2D", CAST2STRING(1));
	RegisterDefine("ADDON_3D", CAST2STRING(1));
	RegisterDefine("ADDON_NET", CAST2STRING(1));
	RegisterDefine("ADDON_INPUT", CAST2STRING(1));
	RegisterDefine("ADDON_CONSOLE", CAST2STRING(1));
	RegisterDefine("ADDON_SOUND", CAST2STRING(1));
	RegisterDefine("ADDON_NET", CAST2STRING(1));
	func16_ResetExpressions();
	return 0;
	
};
InitCompiler = window['InitCompiler'];
window['Compile_Str'] = function(param8_Text_Str, param10_Target_Str) {
	var local1_c_1880 = new type9_TCompiler(), local11_tmpPath_Str_1881 = "", local10_Output_Str_1882 = "";
	global8_Compiler = local1_c_1880.clone(/* In Assign */);
	InitCompiler();
	func16_ResetExpressions();
	func9_PushTimer();
	param8_Text_Str = ((param8_Text_Str) + ("\n"));
	param8_Text_Str = ((param8_Text_Str) + (func12_LoadFile_Str("Target/Header.gbas")));
	param8_Text_Str = ((param8_Text_Str) + ("\n"));
	func11_SetupTarget(param10_Target_Str);
	PassSuccessfull();
	func8_PopTimer("Header load & setup target!");
	global8_Compiler.attr8_Code_Str = ((param8_Text_Str) + ("\n"));
	func9_PushTimer();
	func5_Lexer();
	func8_PopTimer("Lexer!");
	PassSuccessfull();
	STDOUT("Lexing successful! \n");
	global8_Compiler.attr14_errorState_Str = " (precompiler error)";
	func9_PushTimer();
	func11_Precompiler();
	func8_PopTimer("Precompiler");
	PassSuccessfull();
	STDOUT("Preprocessing successful! \n");
	global8_Compiler.attr13_LastMaxTokens = global8_Compiler.attr11_LastTokenID;
	func16_ResetExpressions();
	global8_Compiler.attr14_errorState_Str = " (analyse error)";
	func9_PushTimer();
	func8_Analyser();
	func8_PopTimer("Analyser");
	PassSuccessfull();
	if (global8_Compiler.attr8_WasError) {
		STDOUT("Analysing failed :( \n");
		return "";
		
	} else {
		STDOUT("Analysing successful! \n");
		
	};
	local11_tmpPath_Str_1881 = GETCURRENTDIR_Str();
	SETCURRENTDIR(global12_GbapPath_Str);
	global8_Compiler.attr14_errorState_Str = " (parse error)";
	func9_PushTimer();
	func6_Parser();
	func8_PopTimer("Parser");
	PassSuccessfull();
	if (global8_Compiler.attr8_WasError) {
		STDOUT("Parsing failed :( \n");
		return "";
		
	} else {
		STDOUT("Parsing successful! \n");
		
	};
	global8_Compiler.attr14_errorState_Str = " (generate error)";
	SETCURRENTDIR(local11_tmpPath_Str_1881);
	func9_PushTimer();
	local10_Output_Str_1882 = func12_DoTarget_Str(param10_Target_Str);
	func8_PopTimer("Target stuff");
	PassSuccessfull();
	if (global8_Compiler.attr8_WasError) {
		STDOUT("Generating failed :( \n");
		return "";
		
	} else {
		STDOUT((((("Generating successful to target ") + (param10_Target_Str))) + ("! \n")));
		
	};
	return tryClone(local10_Output_Str_1882);
	return "";
	
};
Compile_Str = window['Compile_Str'];
window['func16_ResetExpressions'] = function() {
	DIM(unref(global5_Exprs_ref[0]), [0], [new type4_Expr()]);
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
	var local3_Def_1886 = new type7_TDefine();
	local3_Def_1886.attr7_Key_Str = param7_Key_Str;
	local3_Def_1886.attr9_Value_Str = param9_Value_Str;
	DIMPUSH(global7_Defines, local3_Def_1886);
	return 0;
	
};
RegisterDefine = window['RegisterDefine'];
window['func16_CreateExpression'] = function(param3_Typ, param8_datatype) {
	var local4_tmpD_2579 = new type8_Datatype(), local3_pos_2580 = 0.0, local1_d_2581 = new type8_Datatype();
	local4_tmpD_2579 = param8_datatype.clone(/* In Assign */);
	local3_pos_2580 = global10_LastExprID;
	global10_LastExprID = ((global10_LastExprID) + (1));
	if ((((global10_LastExprID) >= (((BOUNDS(global5_Exprs_ref[0], 0)) - (10)))) ? 1 : 0)) {
		REDIM(unref(global5_Exprs_ref[0]), [~~(((global10_LastExprID) + (50)))], [new type4_Expr()] );
		
	};
	global5_Exprs_ref[0].arrAccess(~~(local3_pos_2580)).values[tmpPositionCache][0].attr3_Typ = param3_Typ;
	local1_d_2581.attr8_Name_Str_ref[0] = local4_tmpD_2579.attr8_Name_Str_ref[0];
	local1_d_2581.attr7_IsArray_ref[0] = local4_tmpD_2579.attr7_IsArray_ref[0];
	global5_Exprs_ref[0].arrAccess(~~(local3_pos_2580)).values[tmpPositionCache][0].attr8_datatype = local1_d_2581.clone(/* In Assign */);
	global5_Exprs_ref[0].arrAccess(~~(local3_pos_2580)).values[tmpPositionCache][0].attr2_ID = ~~(local3_pos_2580);
	global5_Exprs_ref[0].arrAccess(~~(local3_pos_2580)).values[tmpPositionCache][0].attr5_tokID = global8_Compiler.attr11_currentPosi;
	return tryClone(~~(local3_pos_2580));
	return 0;
	
};
func16_CreateExpression = window['func16_CreateExpression'];
window['func24_CreateOperatorExpression'] = function(param2_Op, param4_Left, param5_Right) {
	var local4_expr_2585 = 0, local8_datatype_2586 = new type8_Datatype();
	var local4_Left_ref_2583 = [param4_Left]; /* NEWCODEHERE */
	var local5_Right_ref_2584 = [param5_Right]; /* NEWCODEHERE */
	local8_datatype_2586 = func12_CastDatatype(local4_Left_ref_2583, local5_Right_ref_2584).clone(/* In Assign */);
	if ((((param2_Op.attr3_Typ) == (3)) ? 1 : 0)) {
		local8_datatype_2586 = global11_intDatatype.clone(/* In Assign */);
		
	};
	local4_expr_2585 = func16_CreateExpression(~~(1), local8_datatype_2586);
	global5_Exprs_ref[0].arrAccess(local4_expr_2585).values[tmpPositionCache][0].attr4_Left = local4_Left_ref_2583[0];
	global5_Exprs_ref[0].arrAccess(local4_expr_2585).values[tmpPositionCache][0].attr5_Right = local5_Right_ref_2584[0];
	global5_Exprs_ref[0].arrAccess(local4_expr_2585).values[tmpPositionCache][0].attr2_Op = param2_Op.attr2_ID;
	return tryClone(local4_expr_2585);
	return 0;
	
};
func24_CreateOperatorExpression = window['func24_CreateOperatorExpression'];
window['func19_CreateIntExpression'] = function(param3_Num) {
	var local4_expr_2588 = 0;
	local4_expr_2588 = func16_CreateExpression(~~(3), global11_intDatatype);
	global5_Exprs_ref[0].arrAccess(local4_expr_2588).values[tmpPositionCache][0].attr6_intval = param3_Num;
	return tryClone(local4_expr_2588);
	return 0;
	
};
func19_CreateIntExpression = window['func19_CreateIntExpression'];
window['func21_CreateFloatExpression'] = function(param3_Num) {
	var local4_expr_2590 = 0;
	local4_expr_2590 = func16_CreateExpression(~~(4), global13_floatDatatype);
	global5_Exprs_ref[0].arrAccess(local4_expr_2590).values[tmpPositionCache][0].attr8_floatval = param3_Num;
	return tryClone(local4_expr_2590);
	return 0;
	
};
func21_CreateFloatExpression = window['func21_CreateFloatExpression'];
window['func19_CreateStrExpression'] = function(param7_Str_Str) {
	var local4_expr_2592 = 0;
	local4_expr_2592 = func16_CreateExpression(~~(5), global11_strDatatype);
	global5_Exprs_ref[0].arrAccess(local4_expr_2592).values[tmpPositionCache][0].attr10_strval_Str = param7_Str_Str;
	return tryClone(local4_expr_2592);
	return 0;
	
};
func19_CreateStrExpression = window['func19_CreateStrExpression'];
window['func21_CreateScopeExpression'] = function(param6_ScpTyp) {
	var local3_Scp_2594 = 0;
	local3_Scp_2594 = func16_CreateExpression(~~(2), global12_voidDatatype);
	global5_Exprs_ref[0].arrAccess(local3_Scp_2594).values[tmpPositionCache][0].attr10_SuperScope = global8_Compiler.attr12_CurrentScope;
	global5_Exprs_ref[0].arrAccess(local3_Scp_2594).values[tmpPositionCache][0].attr6_ScpTyp = param6_ScpTyp;
	return tryClone(local3_Scp_2594);
	return 0;
	
};
func21_CreateScopeExpression = window['func21_CreateScopeExpression'];
window['func24_CreateFuncCallExpression'] = function(param4_func, param6_Params) {
	var local4_expr_2597 = 0;
	local4_expr_2597 = func16_CreateExpression(~~(6), global8_Compiler.attr5_Funcs_ref[0].arrAccess(param4_func).values[tmpPositionCache][0].attr8_datatype);
	global5_Exprs_ref[0].arrAccess(local4_expr_2597).values[tmpPositionCache][0].attr6_Params = param6_Params.clone(/* In Assign */);
	global5_Exprs_ref[0].arrAccess(local4_expr_2597).values[tmpPositionCache][0].attr4_func = param4_func;
	return tryClone(local4_expr_2597);
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
	if ((((global8_Compiler.attr5_Varis_ref[0].arrAccess(param4_vari).values[tmpPositionCache][0].attr3_Typ) == (6)) ? 1 : 0)) {
		return tryClone(global8_Compiler.attr5_Varis_ref[0].arrAccess(param4_vari).values[tmpPositionCache][0].attr6_PreDef);
		
	} else {
		var local4_expr_2599 = 0;
		local4_expr_2599 = func16_CreateExpression(~~(9), global8_Compiler.attr5_Varis_ref[0].arrAccess(param4_vari).values[tmpPositionCache][0].attr8_datatype);
		global5_Exprs_ref[0].arrAccess(local4_expr_2599).values[tmpPositionCache][0].attr4_vari = param4_vari;
		return tryClone(local4_expr_2599);
		
	};
	return 0;
	
};
func24_CreateVariableExpression = window['func24_CreateVariableExpression'];
window['func22_CreateAssignExpression'] = function(param4_Vari, param5_Right) {
	var local4_Expr_2602 = 0;
	local4_Expr_2602 = func16_CreateExpression(~~(10), global12_voidDatatype);
	global5_Exprs_ref[0].arrAccess(local4_Expr_2602).values[tmpPositionCache][0].attr4_vari = param4_Vari;
	global5_Exprs_ref[0].arrAccess(local4_Expr_2602).values[tmpPositionCache][0].attr5_Right = param5_Right;
	return tryClone(local4_Expr_2602);
	return 0;
	
};
func22_CreateAssignExpression = window['func22_CreateAssignExpression'];
window['func19_CreateDimExpression'] = function(param5_Array, param4_Dims) {
	var local4_Expr_2605 = 0;
	local4_Expr_2605 = func16_CreateExpression(~~(11), global5_Exprs_ref[0].arrAccess(param5_Array).values[tmpPositionCache][0].attr8_datatype);
	global5_Exprs_ref[0].arrAccess(local4_Expr_2605).values[tmpPositionCache][0].attr5_array = param5_Array;
	global5_Exprs_ref[0].arrAccess(local4_Expr_2605).values[tmpPositionCache][0].attr4_dims = param4_Dims.clone(/* In Assign */);
	return tryClone(local4_Expr_2605);
	return 0;
	
};
func19_CreateDimExpression = window['func19_CreateDimExpression'];
window['func21_CreateReDimExpression'] = function(param5_Array, param4_Dims) {
	var local4_Expr_2608 = 0;
	local4_Expr_2608 = func16_CreateExpression(~~(12), global5_Exprs_ref[0].arrAccess(param5_Array).values[tmpPositionCache][0].attr8_datatype);
	global5_Exprs_ref[0].arrAccess(local4_Expr_2608).values[tmpPositionCache][0].attr5_array = param5_Array;
	global5_Exprs_ref[0].arrAccess(local4_Expr_2608).values[tmpPositionCache][0].attr4_dims = param4_Dims.clone(/* In Assign */);
	return tryClone(local4_Expr_2608);
	return 0;
	
};
func21_CreateReDimExpression = window['func21_CreateReDimExpression'];
window['func21_CreateArrayExpression'] = function(param5_Array, param4_Dims) {
	var local7_tmpData_2611 = new type8_Datatype(), local4_Expr_2612 = 0;
	local7_tmpData_2611 = global5_Exprs_ref[0].arrAccess(param5_Array).values[tmpPositionCache][0].attr8_datatype.clone(/* In Assign */);
	if (((((((global5_Exprs_ref[0].arrAccess(param5_Array).values[tmpPositionCache][0].attr8_datatype.attr7_IsArray_ref[0]) && (global8_Compiler.attr5_Varis_ref[0].arrAccess(func11_GetVariable(param5_Array, 1)).values[tmpPositionCache][0].attr8_datatype.attr7_IsArray_ref[0])) ? 1 : 0)) && (BOUNDS(param4_Dims, 0))) ? 1 : 0)) {
		local7_tmpData_2611.attr7_IsArray_ref[0] = 0;
		
	};
	local4_Expr_2612 = func16_CreateExpression(~~(13), local7_tmpData_2611);
	global5_Exprs_ref[0].arrAccess(local4_Expr_2612).values[tmpPositionCache][0].attr5_array = param5_Array;
	global5_Exprs_ref[0].arrAccess(local4_Expr_2612).values[tmpPositionCache][0].attr4_dims = param4_Dims.clone(/* In Assign */);
	return tryClone(local4_Expr_2612);
	return 0;
	
};
func21_CreateArrayExpression = window['func21_CreateArrayExpression'];
window['func24_CreateCast2IntExpression'] = function(param4_expr) {
	var local4_Expr_2614 = 0;
	local4_Expr_2614 = func16_CreateExpression(~~(15), global11_intDatatype);
	global5_Exprs_ref[0].arrAccess(local4_Expr_2614).values[tmpPositionCache][0].attr4_expr = param4_expr;
	return tryClone(local4_Expr_2614);
	return 0;
	
};
func24_CreateCast2IntExpression = window['func24_CreateCast2IntExpression'];
window['func26_CreateCast2FloatExpression'] = function(param4_expr) {
	var local4_Expr_2616 = 0;
	local4_Expr_2616 = func16_CreateExpression(~~(16), global13_floatDatatype);
	global5_Exprs_ref[0].arrAccess(local4_Expr_2616).values[tmpPositionCache][0].attr4_expr = param4_expr;
	return tryClone(local4_Expr_2616);
	return 0;
	
};
func26_CreateCast2FloatExpression = window['func26_CreateCast2FloatExpression'];
window['func27_CreateCast2StringExpression'] = function(param4_expr) {
	var local4_Expr_2618 = 0;
	local4_Expr_2618 = func16_CreateExpression(~~(17), global11_strDatatype);
	global5_Exprs_ref[0].arrAccess(local4_Expr_2618).values[tmpPositionCache][0].attr4_expr = param4_expr;
	return tryClone(local4_Expr_2618);
	return 0;
	
};
func27_CreateCast2StringExpression = window['func27_CreateCast2StringExpression'];
window['func22_CreateAccessExpression'] = function(param4_expr, param8_NextExpr) {
	if (((((((param4_expr) == (param8_NextExpr)) ? 1 : 0)) && ((((param4_expr) == (-(1))) ? 1 : 0))) ? 1 : 0)) {
		func5_Error("Internal error (expr and nextexpr = -1)", 236, "Expression.gbas");
		
	};
	if ((((param4_expr) == (-(1))) ? 1 : 0)) {
		return tryClone(param8_NextExpr);
		
	} else if ((((param8_NextExpr) == (-(1))) ? 1 : 0)) {
		return tryClone(param4_expr);
		
	} else {
		var local9_ONextExpr_2621 = 0;
		local9_ONextExpr_2621 = param8_NextExpr;
		if ((((global5_Exprs_ref[0].arrAccess(param8_NextExpr).values[tmpPositionCache][0].attr3_Typ) == (13)) ? 1 : 0)) {
			param8_NextExpr = global5_Exprs_ref[0].arrAccess(param8_NextExpr).values[tmpPositionCache][0].attr5_array;
			
		};
		if ((((global5_Exprs_ref[0].arrAccess(param8_NextExpr).values[tmpPositionCache][0].attr3_Typ) == (6)) ? 1 : 0)) {
			DIMPUSH(global5_Exprs_ref[0].arrAccess(param8_NextExpr).values[tmpPositionCache][0].attr6_Params, param4_expr);
			return tryClone(local9_ONextExpr_2621);
			
		} else {
			var local4_Expr_2622 = 0;
			param8_NextExpr = local9_ONextExpr_2621;
			local4_Expr_2622 = func16_CreateExpression(~~(18), global5_Exprs_ref[0].arrAccess(param8_NextExpr).values[tmpPositionCache][0].attr8_datatype);
			global5_Exprs_ref[0].arrAccess(local4_Expr_2622).values[tmpPositionCache][0].attr4_expr = param4_expr;
			global5_Exprs_ref[0].arrAccess(local4_Expr_2622).values[tmpPositionCache][0].attr8_nextExpr = param8_NextExpr;
			return tryClone(local4_Expr_2622);
			
		};
		
	};
	return 0;
	
};
func22_CreateAccessExpression = window['func22_CreateAccessExpression'];
window['func22_CreateReturnExpression'] = function(param4_expr) {
	var local4_Expr_2624 = 0;
	local4_Expr_2624 = func16_CreateExpression(~~(19), global12_voidDatatype);
	global5_Exprs_ref[0].arrAccess(local4_Expr_2624).values[tmpPositionCache][0].attr4_expr = param4_expr;
	return tryClone(local4_Expr_2624);
	return 0;
	
};
func22_CreateReturnExpression = window['func22_CreateReturnExpression'];
window['func20_CreateGotoExpression'] = function(param8_Name_Str) {
	var local4_Expr_2626 = 0;
	local4_Expr_2626 = func16_CreateExpression(~~(20), global12_voidDatatype);
	global5_Exprs_ref[0].arrAccess(local4_Expr_2626).values[tmpPositionCache][0].attr8_Name_Str = param8_Name_Str;
	global5_Exprs_ref[0].arrAccess(local4_Expr_2626).values[tmpPositionCache][0].attr3_Scp = global8_Compiler.attr12_CurrentScope;
	return tryClone(local4_Expr_2626);
	return 0;
	
};
func20_CreateGotoExpression = window['func20_CreateGotoExpression'];
window['func21_CreateLabelExpression'] = function(param8_Name_Str) {
	var local4_Expr_2628 = 0;
	local4_Expr_2628 = func16_CreateExpression(~~(21), global12_voidDatatype);
	global5_Exprs_ref[0].arrAccess(local4_Expr_2628).values[tmpPositionCache][0].attr8_Name_Str = param8_Name_Str;
	return tryClone(local4_Expr_2628);
	return 0;
	
};
func21_CreateLabelExpression = window['func21_CreateLabelExpression'];
window['func24_CreateFuncDataExpression'] = function(param1_d) {
	return tryClone(func16_CreateExpression(~~(22), param1_d));
	return 0;
	
};
func24_CreateFuncDataExpression = window['func24_CreateFuncDataExpression'];
window['func25_CreateProtoCallExpression'] = function(param4_expr, param6_Params) {
	var local4_Func_2632 = 0, local4_Expr_2633 = 0;
	local4_Func_2632 = func14_SearchPrototyp(unref(global5_Exprs_ref[0].arrAccess(param4_expr).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str_ref[0]));
	if ((((local4_Func_2632) == (-(1))) ? 1 : 0)) {
		func5_Error((((("Internal error (could not find prototype: ") + (global5_Exprs_ref[0].arrAccess(param4_expr).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str_ref[0]))) + (")")), 288, "Expression.gbas");
		
	};
	local4_Expr_2633 = func16_CreateExpression(~~(23), global5_Exprs_ref[0].arrAccess(param4_expr).values[tmpPositionCache][0].attr8_datatype);
	global5_Exprs_ref[0].arrAccess(local4_Expr_2633).values[tmpPositionCache][0].attr4_expr = param4_expr;
	global5_Exprs_ref[0].arrAccess(local4_Expr_2633).values[tmpPositionCache][0].attr6_Params = param6_Params.clone(/* In Assign */);
	global5_Exprs_ref[0].arrAccess(local4_Expr_2633).values[tmpPositionCache][0].attr4_func = local4_Func_2632;
	return tryClone(local4_Expr_2633);
	return 0;
	
};
func25_CreateProtoCallExpression = window['func25_CreateProtoCallExpression'];
window['func18_CreateIfExpression'] = function(param5_Conds, param4_Scps, param7_elseScp) {
	var local4_Expr_2637 = 0;
	local4_Expr_2637 = func16_CreateExpression(~~(24), global12_voidDatatype);
	global5_Exprs_ref[0].arrAccess(local4_Expr_2637).values[tmpPositionCache][0].attr10_Conditions = param5_Conds.clone(/* In Assign */);
	global5_Exprs_ref[0].arrAccess(local4_Expr_2637).values[tmpPositionCache][0].attr6_Scopes = param4_Scps.clone(/* In Assign */);
	global5_Exprs_ref[0].arrAccess(local4_Expr_2637).values[tmpPositionCache][0].attr9_elseScope = param7_elseScp;
	global5_Exprs_ref[0].arrAccess(local4_Expr_2637).values[tmpPositionCache][0].attr5_dummy = func21_CreateDummyExpression();
	return tryClone(local4_Expr_2637);
	return 0;
	
};
func18_CreateIfExpression = window['func18_CreateIfExpression'];
window['func21_CreateWhileExpression'] = function(param4_expr, param3_Scp) {
	var local4_Expr_2640 = 0;
	local4_Expr_2640 = func16_CreateExpression(~~(25), global12_voidDatatype);
	global5_Exprs_ref[0].arrAccess(local4_Expr_2640).values[tmpPositionCache][0].attr4_expr = param4_expr;
	global5_Exprs_ref[0].arrAccess(local4_Expr_2640).values[tmpPositionCache][0].attr3_Scp = param3_Scp;
	global5_Exprs_ref[0].arrAccess(local4_Expr_2640).values[tmpPositionCache][0].attr5_dummy = func21_CreateDummyExpression();
	return tryClone(local4_Expr_2640);
	return 0;
	
};
func21_CreateWhileExpression = window['func21_CreateWhileExpression'];
window['func22_CreateRepeatExpression'] = function(param4_expr, param3_Scp) {
	var local4_Expr_2643 = 0;
	local4_Expr_2643 = func16_CreateExpression(~~(26), global12_voidDatatype);
	global5_Exprs_ref[0].arrAccess(local4_Expr_2643).values[tmpPositionCache][0].attr4_expr = param4_expr;
	global5_Exprs_ref[0].arrAccess(local4_Expr_2643).values[tmpPositionCache][0].attr3_Scp = param3_Scp;
	global5_Exprs_ref[0].arrAccess(local4_Expr_2643).values[tmpPositionCache][0].attr5_dummy = func21_CreateDummyExpression();
	return tryClone(local4_Expr_2643);
	return 0;
	
};
func22_CreateRepeatExpression = window['func22_CreateRepeatExpression'];
window['func19_CreateForExpression'] = function(param7_varExpr, param6_toExpr, param8_stepExpr, param5_hasTo, param3_Scp) {
	var local4_Expr_2649 = 0;
	local4_Expr_2649 = func16_CreateExpression(~~(27), global12_voidDatatype);
	global5_Exprs_ref[0].arrAccess(local4_Expr_2649).values[tmpPositionCache][0].attr7_varExpr = param7_varExpr;
	global5_Exprs_ref[0].arrAccess(local4_Expr_2649).values[tmpPositionCache][0].attr6_toExpr = param6_toExpr;
	global5_Exprs_ref[0].arrAccess(local4_Expr_2649).values[tmpPositionCache][0].attr8_stepExpr = param8_stepExpr;
	global5_Exprs_ref[0].arrAccess(local4_Expr_2649).values[tmpPositionCache][0].attr3_Scp = param3_Scp;
	global5_Exprs_ref[0].arrAccess(local4_Expr_2649).values[tmpPositionCache][0].attr5_hasTo = param5_hasTo;
	global5_Exprs_ref[0].arrAccess(local4_Expr_2649).values[tmpPositionCache][0].attr5_dummy = func21_CreateDummyExpression();
	return tryClone(local4_Expr_2649);
	return 0;
	
};
func19_CreateForExpression = window['func19_CreateForExpression'];
window['func23_CreateForEachExpression'] = function(param7_varExpr, param6_inExpr, param3_Scp) {
	var local4_Expr_2653 = 0;
	local4_Expr_2653 = func16_CreateExpression(~~(38), global12_voidDatatype);
	global5_Exprs_ref[0].arrAccess(local4_Expr_2653).values[tmpPositionCache][0].attr7_varExpr = param7_varExpr;
	global5_Exprs_ref[0].arrAccess(local4_Expr_2653).values[tmpPositionCache][0].attr6_inExpr = param6_inExpr;
	global5_Exprs_ref[0].arrAccess(local4_Expr_2653).values[tmpPositionCache][0].attr3_Scp = param3_Scp;
	global5_Exprs_ref[0].arrAccess(local4_Expr_2653).values[tmpPositionCache][0].attr5_dummy = func21_CreateDummyExpression();
	return tryClone(local4_Expr_2653);
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
	var local4_Expr_2657 = 0;
	local4_Expr_2657 = func16_CreateExpression(~~(31), global12_voidDatatype);
	global5_Exprs_ref[0].arrAccess(local4_Expr_2657).values[tmpPositionCache][0].attr3_Scp = param6_tryScp;
	global5_Exprs_ref[0].arrAccess(local4_Expr_2657).values[tmpPositionCache][0].attr8_catchScp = param7_ctchScp;
	global5_Exprs_ref[0].arrAccess(local4_Expr_2657).values[tmpPositionCache][0].attr4_vari = param4_vari;
	return tryClone(local4_Expr_2657);
	return 0;
	
};
func19_CreateTryExpression = window['func19_CreateTryExpression'];
window['func21_CreateThrowExpression'] = function(param5_value) {
	var local4_Expr_2659 = 0;
	local4_Expr_2659 = func16_CreateExpression(~~(32), global12_voidDatatype);
	global5_Exprs_ref[0].arrAccess(local4_Expr_2659).values[tmpPositionCache][0].attr4_expr = param5_value;
	return tryClone(local4_Expr_2659);
	return 0;
	
};
func21_CreateThrowExpression = window['func21_CreateThrowExpression'];
window['func23_CreateRestoreExpression'] = function(param8_Name_Str) {
	var local4_Expr_2661 = 0;
	local4_Expr_2661 = func16_CreateExpression(~~(33), global12_voidDatatype);
	global5_Exprs_ref[0].arrAccess(local4_Expr_2661).values[tmpPositionCache][0].attr8_Name_Str = param8_Name_Str;
	return tryClone(local4_Expr_2661);
	return 0;
	
};
func23_CreateRestoreExpression = window['func23_CreateRestoreExpression'];
window['func20_CreateReadExpression'] = function(param5_Reads) {
	var local4_Expr_2663 = 0;
	local4_Expr_2663 = func16_CreateExpression(~~(34), global12_voidDatatype);
	global5_Exprs_ref[0].arrAccess(local4_Expr_2663).values[tmpPositionCache][0].attr5_Reads = param5_Reads.clone(/* In Assign */);
	return tryClone(local4_Expr_2663);
	return 0;
	
};
func20_CreateReadExpression = window['func20_CreateReadExpression'];
window['func28_CreateDefaultValueExpression'] = function(param8_datatype) {
	if (param8_datatype.attr7_IsArray_ref[0]) {
		return tryClone(func16_CreateExpression(~~(35), param8_datatype));
		
	} else {
		{
			var local17___SelectHelper40__2665 = "";
			local17___SelectHelper40__2665 = param8_datatype.attr8_Name_Str_ref[0];
			if ((((local17___SelectHelper40__2665) == ("int")) ? 1 : 0)) {
				return tryClone(func19_CreateIntExpression(0));
				
			} else if ((((local17___SelectHelper40__2665) == ("float")) ? 1 : 0)) {
				return tryClone(func21_CreateFloatExpression(0));
				
			} else if ((((local17___SelectHelper40__2665) == ("string")) ? 1 : 0)) {
				return tryClone(func19_CreateStrExpression("\"\""));
				
			} else if ((((local17___SelectHelper40__2665) == ("void")) ? 1 : 0)) {
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
	var local4_Expr_2668 = 0;
	local4_Expr_2668 = func16_CreateExpression(~~(36), param8_datatype);
	global5_Exprs_ref[0].arrAccess(local4_Expr_2668).values[tmpPositionCache][0].attr4_dims = param4_dims.clone(/* In Assign */);
	return tryClone(local4_Expr_2668);
	return 0;
	
};
func25_CreateDimAsExprExpression = window['func25_CreateDimAsExprExpression'];
window['func21_CreateAliasExpression'] = function(param4_vari, param4_expr) {
	var local4_Expr_2671 = 0;
	local4_Expr_2671 = func16_CreateExpression(~~(37), global12_voidDatatype);
	global5_Exprs_ref[0].arrAccess(local4_Expr_2671).values[tmpPositionCache][0].attr4_vari = param4_vari;
	global5_Exprs_ref[0].arrAccess(local4_Expr_2671).values[tmpPositionCache][0].attr4_expr = param4_expr;
	return tryClone(local4_Expr_2671);
	return 0;
	
};
func21_CreateAliasExpression = window['func21_CreateAliasExpression'];
window['func19_CreateIncExpression'] = function(param4_Vari, param7_AddExpr) {
	var local4_Expr_2674 = 0;
	local4_Expr_2674 = func16_CreateExpression(~~(39), global12_voidDatatype);
	global5_Exprs_ref[0].arrAccess(local4_Expr_2674).values[tmpPositionCache][0].attr4_vari = param4_Vari;
	global5_Exprs_ref[0].arrAccess(local4_Expr_2674).values[tmpPositionCache][0].attr4_expr = param7_AddExpr;
	return tryClone(local4_Expr_2674);
	return 0;
	
};
func19_CreateIncExpression = window['func19_CreateIncExpression'];
window['func23_CreateDimpushExpression'] = function(param4_vari, param4_expr) {
	var local4_Expr_2677 = 0;
	local4_Expr_2677 = func16_CreateExpression(~~(40), global12_voidDatatype);
	global5_Exprs_ref[0].arrAccess(local4_Expr_2677).values[tmpPositionCache][0].attr4_vari = param4_vari;
	global5_Exprs_ref[0].arrAccess(local4_Expr_2677).values[tmpPositionCache][0].attr4_expr = param4_expr;
	return tryClone(local4_Expr_2677);
	return 0;
	
};
func23_CreateDimpushExpression = window['func23_CreateDimpushExpression'];
window['func19_CreateLenExpression'] = function(param4_expr, param4_kern) {
	var local4_Expr_2680 = 0;
	local4_Expr_2680 = func16_CreateExpression(~~(41), global11_intDatatype);
	global5_Exprs_ref[0].arrAccess(local4_Expr_2680).values[tmpPositionCache][0].attr4_expr = param4_expr;
	global5_Exprs_ref[0].arrAccess(local4_Expr_2680).values[tmpPositionCache][0].attr4_kern = param4_kern;
	return tryClone(local4_Expr_2680);
	return 0;
	
};
func19_CreateLenExpression = window['func19_CreateLenExpression'];
window['func23_CreateDimDataExpression'] = function(param5_array, param5_exprs) {
	var local4_Expr_2683 = 0;
	local4_Expr_2683 = func16_CreateExpression(~~(42), global12_voidDatatype);
	global5_Exprs_ref[0].arrAccess(local4_Expr_2683).values[tmpPositionCache][0].attr5_array = param5_array;
	global5_Exprs_ref[0].arrAccess(local4_Expr_2683).values[tmpPositionCache][0].attr5_Exprs = param5_exprs.clone(/* In Assign */);
	return tryClone(local4_Expr_2683);
	return 0;
	
};
func23_CreateDimDataExpression = window['func23_CreateDimDataExpression'];
window['func22_CreateDeleteExpression'] = function() {
	return tryClone(func16_CreateExpression(~~(43), global12_voidDatatype));
	return 0;
	
};
func22_CreateDeleteExpression = window['func22_CreateDeleteExpression'];
window['func22_CreateDimDelExpression'] = function(param5_array, param8_position) {
	var local4_Expr_2686 = 0;
	local4_Expr_2686 = func16_CreateExpression(~~(44), global12_voidDatatype);
	global5_Exprs_ref[0].arrAccess(local4_Expr_2686).values[tmpPositionCache][0].attr5_array = param5_array;
	global5_Exprs_ref[0].arrAccess(local4_Expr_2686).values[tmpPositionCache][0].attr8_position = param8_position;
	return tryClone(local4_Expr_2686);
	return 0;
	
};
func22_CreateDimDelExpression = window['func22_CreateDimDelExpression'];
window['func21_CreateBoundExpression'] = function(param4_expr, param8_position) {
	var local4_Expr_2689 = 0;
	local4_Expr_2689 = func16_CreateExpression(~~(45), global11_intDatatype);
	global5_Exprs_ref[0].arrAccess(local4_Expr_2689).values[tmpPositionCache][0].attr5_array = param4_expr;
	global5_Exprs_ref[0].arrAccess(local4_Expr_2689).values[tmpPositionCache][0].attr8_position = param8_position;
	return tryClone(local4_Expr_2689);
	return 0;
	
};
func21_CreateBoundExpression = window['func21_CreateBoundExpression'];
window['func19_CreateNotExpression'] = function(param4_expr) {
	var local4_Expr_2691 = 0;
	local4_Expr_2691 = func16_CreateExpression(~~(46), global13_floatDatatype);
	global5_Exprs_ref[0].arrAccess(local4_Expr_2691).values[tmpPositionCache][0].attr4_expr = param4_expr;
	return tryClone(local4_Expr_2691);
	return 0;
	
};
func19_CreateNotExpression = window['func19_CreateNotExpression'];
window['func21_CreateDummyExpression'] = function() {
	return 0;
	return 0;
	
};
func21_CreateDummyExpression = window['func21_CreateDummyExpression'];
window['func25_CreateAddressOfExpression'] = function(param4_func) {
	var local4_Expr_2693 = 0;
	local4_Expr_2693 = func16_CreateExpression(~~(48), global11_intDatatype);
	global5_Exprs_ref[0].arrAccess(local4_Expr_2693).values[tmpPositionCache][0].attr4_func = param4_func;
	return tryClone(local4_Expr_2693);
	return 0;
	
};
func25_CreateAddressOfExpression = window['func25_CreateAddressOfExpression'];
window['func22_CreateAssertExpression'] = function(param4_expr) {
	var local4_Expr_2695 = 0;
	local4_Expr_2695 = func16_CreateExpression(~~(49), global12_voidDatatype);
	global5_Exprs_ref[0].arrAccess(local4_Expr_2695).values[tmpPositionCache][0].attr4_expr = param4_expr;
	return tryClone(local4_Expr_2695);
	return 0;
	
};
func22_CreateAssertExpression = window['func22_CreateAssertExpression'];
window['func27_CreateDebugOutputExpression'] = function(param4_expr) {
	var local4_Expr_2697 = 0;
	local4_Expr_2697 = func16_CreateExpression(~~(50), global12_voidDatatype);
	global5_Exprs_ref[0].arrAccess(local4_Expr_2697).values[tmpPositionCache][0].attr4_expr = param4_expr;
	return tryClone(local4_Expr_2697);
	return 0;
	
};
func27_CreateDebugOutputExpression = window['func27_CreateDebugOutputExpression'];
window['func19_CreateIIFExpression'] = function(param4_Cond, param6_onTrue, param7_onFalse) {
	var local4_Expr_2701 = 0;
	local4_Expr_2701 = func16_CreateExpression(~~(51), global5_Exprs_ref[0].arrAccess(param6_onTrue).values[tmpPositionCache][0].attr8_datatype);
	DIMDATA(global5_Exprs_ref[0].arrAccess(local4_Expr_2701).values[tmpPositionCache][0].attr10_Conditions, [param4_Cond]);
	DIMDATA(global5_Exprs_ref[0].arrAccess(local4_Expr_2701).values[tmpPositionCache][0].attr6_Scopes, [param6_onTrue]);
	global5_Exprs_ref[0].arrAccess(local4_Expr_2701).values[tmpPositionCache][0].attr9_elseScope = param7_onFalse;
	return tryClone(local4_Expr_2701);
	return 0;
	
};
func19_CreateIIFExpression = window['func19_CreateIIFExpression'];
window['func23_CreateRequireExpression'] = function(param8_Path_Str) {
	var local4_Expr_2703 = 0;
	local4_Expr_2703 = func16_CreateExpression(~~(52), global12_voidDatatype);
	if ((((REVINSTR(param8_Path_Str, ".", -(1))) != (-(1))) ? 1 : 0)) {
		{
			var local17___SelectHelper41__2704 = "";
			local17___SelectHelper41__2704 = MID_Str(param8_Path_Str, ((REVINSTR(param8_Path_Str, ".", -(1))) + (1)), -(1));
			if ((((local17___SelectHelper41__2704) == ("js")) ? 1 : 0)) {
				
			} else {
				func5_Error("Cannot not REQUIRE non javascript files...", 532, "Expression.gbas");
				
			};
			
		};
		
	};
	global5_Exprs_ref[0].arrAccess(local4_Expr_2703).values[tmpPositionCache][0].attr8_Name_Str = param8_Path_Str;
	global5_Exprs_ref[0].arrAccess(local4_Expr_2703).values[tmpPositionCache][0].attr11_Content_Str = func12_LoadFile_Str(param8_Path_Str);
	return tryClone(local4_Expr_2703);
	return 0;
	
};
func23_CreateRequireExpression = window['func23_CreateRequireExpression'];
window['func21_CreateSuperExpression'] = function(param3_typ) {
	var local1_d_2706 = new type8_Datatype();
	local1_d_2706.attr7_IsArray_ref[0] = 0;
	local1_d_2706.attr8_Name_Str_ref[0] = global8_Compiler.attr5_Types_ref[0].arrAccess(param3_typ).values[tmpPositionCache][0].attr8_Name_Str;
	return tryClone(func16_CreateExpression(~~(53), local1_d_2706));
	return 0;
	
};
func21_CreateSuperExpression = window['func21_CreateSuperExpression'];
window['func14_CreateCast2Obj'] = function(param7_Obj_Str, param4_expr) {
	var local1_d_2709 = new type8_Datatype(), local4_Expr_2710 = 0;
	local1_d_2709.attr7_IsArray_ref[0] = 0;
	local1_d_2709.attr8_Name_Str_ref[0] = param7_Obj_Str;
	local4_Expr_2710 = func16_CreateExpression(~~(54), local1_d_2709);
	global5_Exprs_ref[0].arrAccess(local4_Expr_2710).values[tmpPositionCache][0].attr4_expr = param4_expr;
	return tryClone(local4_Expr_2710);
	return 0;
	
};
func14_CreateCast2Obj = window['func14_CreateCast2Obj'];
window['method13_type7_HashMap_3_Put'] = function(param7_Key_Str, param5_Value, param4_self) {
	var local2_KV_1891 = new type8_KeyValue(), local4_hash_1892 = 0, alias6_Bucket_ref_1893 = [new type6_Bucket()];
	if ((((param7_Key_Str) == ("")) ? 1 : 0)) {
		func5_Error("Cannot insert empty key you son of a bitch.", 19, "Hashmap.gbas");
		
	};
	if ((((BOUNDS(param4_self.attr7_Buckets_ref[0], 0)) == (0)) ? 1 : 0)) {
		(param4_self).SetSize(4096);
		
	};
	if ((((param4_self).DoesKeyExist(param7_Key_Str)) ? 0 : 1)) {
		param4_self.attr8_Elements+=1;
		
	};
	if ((((param4_self.attr8_Elements) > (((CAST2INT(((BOUNDS(param4_self.attr7_Buckets_ref[0], 0)) / (3)))) * (2)))) ? 1 : 0)) {
		(param4_self).SetSize(((BOUNDS(param4_self.attr7_Buckets_ref[0], 0)) * (4)));
		
	};
	local2_KV_1891.attr7_Key_Str = param7_Key_Str;
	local2_KV_1891.attr5_Value = param5_Value;
	local4_hash_1892 = func7_HashStr(param7_Key_Str, ((BOUNDS(param4_self.attr7_Buckets_ref[0], 0)) - (1)));
	alias6_Bucket_ref_1893 = param4_self.attr7_Buckets_ref[0].arrAccess(local4_hash_1892).values[tmpPositionCache] /* ALIAS */;
	if (alias6_Bucket_ref_1893[0].attr3_Set) {
		if ((((BOUNDS(alias6_Bucket_ref_1893[0].attr8_Elements, 0)) == (0)) ? 1 : 0)) {
			DIMPUSH(alias6_Bucket_ref_1893[0].attr8_Elements, alias6_Bucket_ref_1893[0].attr7_Element);
			
		};
		DIMPUSH(alias6_Bucket_ref_1893[0].attr8_Elements, local2_KV_1891);
		
	} else {
		alias6_Bucket_ref_1893[0].attr3_Set = 1;
		alias6_Bucket_ref_1893[0].attr7_Element = local2_KV_1891.clone(/* In Assign */);
		
	};
	return 0;
	
};
method13_type7_HashMap_3_Put = window['method13_type7_HashMap_3_Put'];
window['method13_type7_HashMap_12_DoesKeyExist'] = function(param7_Key_Str, param4_self) {
	var local5_Value_ref_1897 = [0];
	return tryClone((param4_self).GetValue(param7_Key_Str, local5_Value_ref_1897));
	return 0;
	
};
method13_type7_HashMap_12_DoesKeyExist = window['method13_type7_HashMap_12_DoesKeyExist'];
window['method13_type7_HashMap_8_GetValue'] = function(param7_Key_Str, param5_Value_ref, param4_self) {
	var local4_hash_1902 = 0, alias6_Bucket_ref_1903 = [new type6_Bucket()];
	local4_hash_1902 = func7_HashStr(param7_Key_Str, ((BOUNDS(param4_self.attr7_Buckets_ref[0], 0)) - (1)));
	if ((((local4_hash_1902) >= (BOUNDS(param4_self.attr7_Buckets_ref[0], 0))) ? 1 : 0)) {
		return tryClone(0);
		
	};
	alias6_Bucket_ref_1903 = param4_self.attr7_Buckets_ref[0].arrAccess(local4_hash_1902).values[tmpPositionCache] /* ALIAS */;
	if (alias6_Bucket_ref_1903[0].attr3_Set) {
		if ((((BOUNDS(alias6_Bucket_ref_1903[0].attr8_Elements, 0)) == (0)) ? 1 : 0)) {
			if ((((alias6_Bucket_ref_1903[0].attr7_Element.attr7_Key_Str) != (param7_Key_Str)) ? 1 : 0)) {
				param5_Value_ref[0] = 0;
				return tryClone(0);
				
			} else {
				param5_Value_ref[0] = alias6_Bucket_ref_1903[0].attr7_Element.attr5_Value;
				return 1;
				
			};
			
		} else {
			{
				var local1_i_1904 = 0.0;
				for (local1_i_1904 = 0;toCheck(local1_i_1904, ((BOUNDS(alias6_Bucket_ref_1903[0].attr8_Elements, 0)) - (1)), 1);local1_i_1904 += 1) {
					if ((((alias6_Bucket_ref_1903[0].attr8_Elements.arrAccess(~~(local1_i_1904)).values[tmpPositionCache].attr7_Key_Str) == (param7_Key_Str)) ? 1 : 0)) {
						param5_Value_ref[0] = alias6_Bucket_ref_1903[0].attr8_Elements.arrAccess(~~(local1_i_1904)).values[tmpPositionCache].attr5_Value;
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
	var local4_hash_1908 = 0, alias6_Bucket_ref_1909 = [new type6_Bucket()];
	local4_hash_1908 = func7_HashStr(param7_Key_Str, ((BOUNDS(param4_self.attr7_Buckets_ref[0], 0)) - (1)));
	alias6_Bucket_ref_1909 = param4_self.attr7_Buckets_ref[0].arrAccess(local4_hash_1908).values[tmpPositionCache] /* ALIAS */;
	if (alias6_Bucket_ref_1909[0].attr3_Set) {
		if ((((alias6_Bucket_ref_1909[0].attr7_Element.attr7_Key_Str) == (param7_Key_Str)) ? 1 : 0)) {
			var local1_e_1910 = new type8_KeyValue();
			param4_self.attr8_Elements+=-1;
			alias6_Bucket_ref_1909[0].attr7_Element = local1_e_1910.clone(/* In Assign */);
			alias6_Bucket_ref_1909[0].attr3_Set = 0;
			
		} else {
			var local4_Find_1911 = 0;
			local4_Find_1911 = 0;
			{
				var local1_i_1912 = 0.0;
				for (local1_i_1912 = 0;toCheck(local1_i_1912, ((BOUNDS(alias6_Bucket_ref_1909[0].attr8_Elements, 0)) - (1)), 1);local1_i_1912 += 1) {
					if ((((alias6_Bucket_ref_1909[0].attr8_Elements.arrAccess(~~(local1_i_1912)).values[tmpPositionCache].attr7_Key_Str) == (param7_Key_Str)) ? 1 : 0)) {
						local4_Find_1911 = 1;
						DIMDEL(alias6_Bucket_ref_1909[0].attr8_Elements, ~~(local1_i_1912));
						break;
						
					};
					
				};
				
			};
			if ((((BOUNDS(alias6_Bucket_ref_1909[0].attr8_Elements, 0)) == (1)) ? 1 : 0)) {
				alias6_Bucket_ref_1909[0].attr7_Element = alias6_Bucket_ref_1909[0].attr8_Elements.arrAccess(0).values[tmpPositionCache].clone(/* In Assign */);
				DIMDEL(alias6_Bucket_ref_1909[0].attr8_Elements, 0);
				
			};
			if (local4_Find_1911) {
				param4_self.attr8_Elements+=-1;
				
			};
			return tryClone(local4_Find_1911);
			
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
		var local1_i_1916 = 0.0;
		for (local1_i_1916 = 0;toCheck(local1_i_1916, ((BOUNDS(param4_self.attr7_Buckets_ref[0], 0)) - (1)), 1);local1_i_1916 += 1) {
			var alias1_B_ref_1917 = [new type6_Bucket()];
			alias1_B_ref_1917 = param4_self.attr7_Buckets_ref[0].arrAccess(~~(local1_i_1916)).values[tmpPositionCache] /* ALIAS */;
			if (alias1_B_ref_1917[0].attr3_Set) {
				if (BOUNDS(alias1_B_ref_1917[0].attr8_Elements, 0)) {
					{
						var local1_j_1918 = 0.0;
						for (local1_j_1918 = 0;toCheck(local1_j_1918, ((BOUNDS(alias1_B_ref_1917[0].attr8_Elements, 0)) - (1)), 1);local1_j_1918 += 1) {
							DIMPUSH(param5_Array, alias1_B_ref_1917[0].attr8_Elements.arrAccess(~~(local1_j_1918)).values[tmpPositionCache]);
							
						};
						
					};
					
				} else {
					DIMPUSH(param5_Array, alias1_B_ref_1917[0].attr7_Element);
					
				};
				
			};
			
		};
		
	};
	return 0;
	
};
method13_type7_HashMap_7_ToArray = window['method13_type7_HashMap_7_ToArray'];
window['method13_type7_HashMap_7_SetSize'] = function(param4_Size, param4_self) {
	var local3_Arr_1922 = new GLBArray();
	(param4_self).ToArray(unref(local3_Arr_1922));
	param4_self.attr8_Elements = 0;
	REDIM(unref(param4_self.attr7_Buckets_ref[0]), [param4_Size], [new type6_Bucket()] );
	var forEachSaver5317 = local3_Arr_1922;
	for(var forEachCounter5317 = 0 ; forEachCounter5317 < forEachSaver5317.values.length ; forEachCounter5317++) {
		var local1_E_1923 = forEachSaver5317.values[forEachCounter5317];
	{
			(param4_self).Put(local1_E_1923.attr7_Key_Str, local1_E_1923.attr5_Value);
			
		}
		forEachSaver5317.values[forEachCounter5317] = local1_E_1923;
	
	};
	return 0;
	
};
method13_type7_HashMap_7_SetSize = window['method13_type7_HashMap_7_SetSize'];
window['func7_HashStr'] = function(param7_Str_Str, param6_MaxLen) {
	var local4_Hash_1926 = 0;
	{
		var local1_i_1927 = 0.0;
		for (local1_i_1927 = 0;toCheck(local1_i_1927, (((param7_Str_Str).length) - (1)), 1);local1_i_1927 += 1) {
			local4_Hash_1926+=~~(((ASC(param7_Str_Str, ~~(local1_i_1927))) + (((local1_i_1927) * (26)))));
			
		};
		
	};
	local4_Hash_1926 = MOD(local4_Hash_1926, param6_MaxLen);
	return tryClone(local4_Hash_1926);
	return 0;
	
};
func7_HashStr = window['func7_HashStr'];
window['func16_JS_Generator_Str'] = function() {
	{
		var Err_Str = "";
		try {
			var local11_InWebWorker_1928 = 0, local8_Text_Str_1929 = "", local14_StaticText_Str_1930 = "", local17_StaticDefText_Str_1931 = "";
			local11_InWebWorker_1928 = func8_IsDefine("HTML5_WEBWORKER");
			func23_ManageFuncParamOverlaps();
			global14_StaticText_Str = "";
			local8_Text_Str_1929 = "";
			if (global9_DEBUGMODE) {
				local8_Text_Str_1929 = ((((local8_Text_Str_1929) + ("var __debugInfo = \"\";"))) + (func11_NewLine_Str()));
				local8_Text_Str_1929 = ((((local8_Text_Str_1929) + ("var debugMode = true;"))) + (func11_NewLine_Str()));
				
			} else {
				local8_Text_Str_1929 = ((((local8_Text_Str_1929) + ("var debugMode = false;"))) + (func11_NewLine_Str()));
				
			};
			global11_LastDummyID = ~~(((global10_LastExprID) + (1337)));
			local8_Text_Str_1929 = ((local8_Text_Str_1929) + ("window['main'] = function()"));
			local8_Text_Str_1929 = ((((local8_Text_Str_1929) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(global8_Compiler.attr9_MainScope).values[tmpPositionCache][0]))))) + (func11_NewLine_Str()));
			if (local11_InWebWorker_1928) {
				local8_Text_Str_1929 = ((((local8_Text_Str_1929) + ("main = window['main'];"))) + (func11_NewLine_Str()));
				
			};
			local14_StaticText_Str_1930 = "";
			local17_StaticDefText_Str_1931 = "";
			var forEachSaver5622 = global8_Compiler.attr5_Funcs_ref[0];
			for(var forEachCounter5622 = 0 ; forEachCounter5622 < forEachSaver5622.values.length ; forEachCounter5622++) {
				var local4_Func_ref_1932 = forEachSaver5622.values[forEachCounter5622];
			{
					if (((((((local4_Func_ref_1932[0].attr6_Native) == (0)) ? 1 : 0)) && ((((local4_Func_ref_1932[0].attr3_Scp) != (-(1))) ? 1 : 0))) ? 1 : 0)) {
						var local4_Find_1933 = 0.0;
						if ((((BOUNDS(local4_Func_ref_1932[0].attr7_Statics, 0)) > (0)) ? 1 : 0)) {
							local17_StaticDefText_Str_1931 = ((((((((local17_StaticDefText_Str_1931) + ("var "))) + (func13_JSVariDef_Str(unref(local4_Func_ref_1932[0].attr7_Statics), 1, 0)))) + (";"))) + (func11_NewLine_Str()));
							local14_StaticText_Str_1930 = ((((((local14_StaticText_Str_1930) + (func13_JSVariDef_Str(unref(local4_Func_ref_1932[0].attr7_Statics), 0, 0)))) + (";"))) + (func11_NewLine_Str()));
							
						};
						local8_Text_Str_1929 = ((((((local8_Text_Str_1929) + ("window['"))) + (local4_Func_ref_1932[0].attr8_Name_Str))) + ("'] = function("));
						local4_Find_1933 = 0;
						var forEachSaver5548 = local4_Func_ref_1932[0].attr6_Params;
						for(var forEachCounter5548 = 0 ; forEachCounter5548 < forEachSaver5548.values.length ; forEachCounter5548++) {
							var local1_P_1934 = forEachSaver5548.values[forEachCounter5548];
						{
								if (local4_Find_1933) {
									local8_Text_Str_1929 = ((local8_Text_Str_1929) + (", "));
									
								};
								local8_Text_Str_1929 = ((local8_Text_Str_1929) + (global8_Compiler.attr5_Varis_ref[0].arrAccess(local1_P_1934).values[tmpPositionCache][0].attr8_Name_Str));
								local4_Find_1933 = 1;
								
							}
							forEachSaver5548.values[forEachCounter5548] = local1_P_1934;
						
						};
						local8_Text_Str_1929 = ((local8_Text_Str_1929) + (") "));
						local8_Text_Str_1929 = ((((((local8_Text_Str_1929) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(local4_Func_ref_1932[0].attr3_Scp).values[tmpPositionCache][0]))))) + (";"))) + (func11_NewLine_Str()));
						if (((((((global9_DEBUGMODE) == (0)) ? 1 : 0)) && ((((local4_Func_ref_1932[0].attr3_Typ) == (2)) ? 1 : 0))) ? 1 : 0)) {
							local8_Text_Str_1929 = ((((((((((((local8_Text_Str_1929) + ("window['"))) + (local4_Func_ref_1932[0].attr8_Name_Str))) + ("'] = "))) + (local4_Func_ref_1932[0].attr8_Name_Str))) + (";"))) + (func11_NewLine_Str()));
							
						};
						if (local11_InWebWorker_1928) {
							local8_Text_Str_1929 = ((((((((((local8_Text_Str_1929) + (local4_Func_ref_1932[0].attr8_Name_Str))) + (" = window['"))) + (local4_Func_ref_1932[0].attr8_Name_Str))) + ("'];"))) + (func11_NewLine_Str()));
							
						};
						
					};
					
				}
				forEachSaver5622.values[forEachCounter5622] = local4_Func_ref_1932;
			
			};
			var forEachSaver5688 = global8_Compiler.attr5_Funcs_ref[0];
			for(var forEachCounter5688 = 0 ; forEachCounter5688 < forEachSaver5688.values.length ; forEachCounter5688++) {
				var local4_Func_ref_1935 = forEachSaver5688.values[forEachCounter5688];
			{
					if ((((local4_Func_ref_1935[0].attr3_Typ) == (4)) ? 1 : 0)) {
						func8_IndentUp();
						local8_Text_Str_1929 = ((((((((local8_Text_Str_1929) + ("window['"))) + (local4_Func_ref_1935[0].attr9_OName_Str))) + ("'] = function() {"))) + (func11_NewLine_Str()));
						local8_Text_Str_1929 = ((local8_Text_Str_1929) + ("return function() { throwError(\"NullPrototypeException\"); };"));
						func10_IndentDown();
						local8_Text_Str_1929 = ((((((local8_Text_Str_1929) + (func11_NewLine_Str()))) + ("};"))) + (func11_NewLine_Str()));
						if (local11_InWebWorker_1928) {
							local8_Text_Str_1929 = ((((((((((local8_Text_Str_1929) + (local4_Func_ref_1935[0].attr9_OName_Str))) + (" = window['"))) + (local4_Func_ref_1935[0].attr9_OName_Str))) + ("'];"))) + (func11_NewLine_Str()));
							
						};
						
					};
					
				}
				forEachSaver5688.values[forEachCounter5688] = local4_Func_ref_1935;
			
			};
			var forEachSaver6400 = global8_Compiler.attr5_Types_ref[0];
			for(var forEachCounter6400 = 0 ; forEachCounter6400 < forEachSaver6400.values.length ; forEachCounter6400++) {
				var local3_Typ_ref_1936 = forEachSaver6400.values[forEachCounter6400];
			{
					var local5_typId_1937 = 0, local3_map_1938 = new type7_HashMap(), local5_First_1939 = 0, local4_map2_1948 = new type7_HashMap();
					local5_typId_1937 = local3_Typ_ref_1936[0].attr2_ID;
					func8_IndentUp();
					local8_Text_Str_1929 = ((((((((local8_Text_Str_1929) + ("var vtbl_"))) + (local3_Typ_ref_1936[0].attr8_Name_Str))) + (" = {"))) + (func11_NewLine_Str()));
					local5_First_1939 = 0;
					while ((((local5_typId_1937) != (-(1))) ? 1 : 0)) {
						var forEachSaver5812 = global8_Compiler.attr5_Types_ref[0].arrAccess(local5_typId_1937).values[tmpPositionCache][0].attr7_Methods;
						for(var forEachCounter5812 = 0 ; forEachCounter5812 < forEachSaver5812.values.length ; forEachCounter5812++) {
							var local3_Mth_1940 = forEachSaver5812.values[forEachCounter5812];
						{
								if (((((((local3_map_1938).DoesKeyExist(global8_Compiler.attr5_Funcs_ref[0].arrAccess(local3_Mth_1940).values[tmpPositionCache][0].attr9_OName_Str)) ? 0 : 1)) && ((((global8_Compiler.attr5_Funcs_ref[0].arrAccess(local3_Mth_1940).values[tmpPositionCache][0].attr3_Scp) != (-(1))) ? 1 : 0))) ? 1 : 0)) {
									if (local5_First_1939) {
										local8_Text_Str_1929 = ((((local8_Text_Str_1929) + (", "))) + (func11_NewLine_Str()));
										
									};
									local8_Text_Str_1929 = ((((((local8_Text_Str_1929) + (global8_Compiler.attr5_Funcs_ref[0].arrAccess(local3_Mth_1940).values[tmpPositionCache][0].attr9_OName_Str))) + (": "))) + (global8_Compiler.attr5_Funcs_ref[0].arrAccess(local3_Mth_1940).values[tmpPositionCache][0].attr8_Name_Str));
									(local3_map_1938).Put(global8_Compiler.attr5_Funcs_ref[0].arrAccess(local3_Mth_1940).values[tmpPositionCache][0].attr9_OName_Str, local3_Mth_1940);
									local5_First_1939 = 1;
									
								};
								
							}
							forEachSaver5812.values[forEachCounter5812] = local3_Mth_1940;
						
						};
						local5_typId_1937 = global8_Compiler.attr5_Types_ref[0].arrAccess(local5_typId_1937).values[tmpPositionCache][0].attr9_Extending;
						
					};
					func10_IndentDown();
					local8_Text_Str_1929 = ((((((local8_Text_Str_1929) + (func11_NewLine_Str()))) + ("};"))) + (func11_NewLine_Str()));
					if ((((global9_DEBUGMODE) == (0)) ? 1 : 0)) {
						local8_Text_Str_1929 = ((((local8_Text_Str_1929) + ("/**"))) + (func11_NewLine_Str()));
						local8_Text_Str_1929 = ((((local8_Text_Str_1929) + ("* @constructor"))) + (func11_NewLine_Str()));
						local8_Text_Str_1929 = ((((local8_Text_Str_1929) + ("*/"))) + (func11_NewLine_Str()));
						
					};
					func8_IndentUp();
					local8_Text_Str_1929 = ((((((((local8_Text_Str_1929) + ("window ['"))) + (local3_Typ_ref_1936[0].attr8_Name_Str))) + ("'] = function() {"))) + (func11_NewLine_Str()));
					var forEachSaver5921 = local3_Typ_ref_1936[0].attr10_Attributes;
					for(var forEachCounter5921 = 0 ; forEachCounter5921 < forEachSaver5921.values.length ; forEachCounter5921++) {
						var local4_Attr_1941 = forEachSaver5921.values[forEachCounter5921];
					{
							var alias8_variable_ref_1942 = [new type14_IdentifierVari()];
							alias8_variable_ref_1942 = global8_Compiler.attr5_Varis_ref[0].arrAccess(local4_Attr_1941).values[tmpPositionCache] /* ALIAS */;
							local8_Text_Str_1929 = ((((local8_Text_Str_1929) + ("this."))) + (alias8_variable_ref_1942[0].attr8_Name_Str));
							local8_Text_Str_1929 = ((local8_Text_Str_1929) + (" = "));
							local8_Text_Str_1929 = ((local8_Text_Str_1929) + (func21_JSGetDefaultValue_Str(alias8_variable_ref_1942[0].attr8_datatype, alias8_variable_ref_1942[0].attr3_ref, 0)));
							local8_Text_Str_1929 = ((((local8_Text_Str_1929) + (";"))) + (func11_NewLine_Str()));
							
						}
						forEachSaver5921.values[forEachCounter5921] = local4_Attr_1941;
					
					};
					local8_Text_Str_1929 = ((((((((local8_Text_Str_1929) + ("this.vtbl = vtbl_"))) + (local3_Typ_ref_1936[0].attr8_Name_Str))) + (";"))) + (func11_NewLine_Str()));
					var forEachSaver6011 = local3_Typ_ref_1936[0].attr10_Attributes;
					for(var forEachCounter6011 = 0 ; forEachCounter6011 < forEachSaver6011.values.length ; forEachCounter6011++) {
						var local4_Attr_1943 = forEachSaver6011.values[forEachCounter6011];
					{
							var alias8_variable_ref_1944 = [new type14_IdentifierVari()];
							alias8_variable_ref_1944 = global8_Compiler.attr5_Varis_ref[0].arrAccess(local4_Attr_1943).values[tmpPositionCache] /* ALIAS */;
							if ((((alias8_variable_ref_1944[0].attr6_PreDef) != (-(1))) ? 1 : 0)) {
								local8_Text_Str_1929 = ((((local8_Text_Str_1929) + ("this."))) + (alias8_variable_ref_1944[0].attr8_Name_Str));
								local8_Text_Str_1929 = ((local8_Text_Str_1929) + (" = "));
								if (alias8_variable_ref_1944[0].attr3_ref) {
									local8_Text_Str_1929 = ((local8_Text_Str_1929) + ("["));
									
								};
								local8_Text_Str_1929 = ((local8_Text_Str_1929) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(alias8_variable_ref_1944[0].attr6_PreDef).values[tmpPositionCache][0]))));
								if (alias8_variable_ref_1944[0].attr3_ref) {
									local8_Text_Str_1929 = ((local8_Text_Str_1929) + ("]"));
									
								};
								local8_Text_Str_1929 = ((((local8_Text_Str_1929) + (";"))) + (func11_NewLine_Str()));
								
							};
							
						}
						forEachSaver6011.values[forEachCounter6011] = local4_Attr_1943;
					
					};
					local8_Text_Str_1929 = ((((local8_Text_Str_1929) + ("return this;"))) + (func11_NewLine_Str()));
					func10_IndentDown();
					local8_Text_Str_1929 = ((((((local8_Text_Str_1929) + (func11_NewLine_Str()))) + ("};"))) + (func11_NewLine_Str()));
					func8_IndentUp();
					local8_Text_Str_1929 = ((((((((local8_Text_Str_1929) + ("window['"))) + (local3_Typ_ref_1936[0].attr8_Name_Str))) + ("'].prototype.clone = function() {"))) + (func11_NewLine_Str()));
					local8_Text_Str_1929 = ((((((((local8_Text_Str_1929) + ("var other = new "))) + (local3_Typ_ref_1936[0].attr8_Name_Str))) + ("();"))) + (func11_NewLine_Str()));
					var forEachSaver6190 = local3_Typ_ref_1936[0].attr10_Attributes;
					for(var forEachCounter6190 = 0 ; forEachCounter6190 < forEachSaver6190.values.length ; forEachCounter6190++) {
						var local4_Attr_1945 = forEachSaver6190.values[forEachCounter6190];
					{
							var alias8_variable_ref_1946 = [new type14_IdentifierVari()], local8_plzclone_1947 = 0;
							alias8_variable_ref_1946 = global8_Compiler.attr5_Varis_ref[0].arrAccess(local4_Attr_1945).values[tmpPositionCache] /* ALIAS */;
							local8_plzclone_1947 = 0;
							if (((((((global8_Compiler.attr5_Varis_ref[0].arrAccess(local4_Attr_1945).values[tmpPositionCache][0].attr8_datatype.attr7_IsArray_ref[0]) == (0)) ? 1 : 0)) && ((((((((((global8_Compiler.attr5_Varis_ref[0].arrAccess(local4_Attr_1945).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str_ref[0]) == ("int")) ? 1 : 0)) || ((((global8_Compiler.attr5_Varis_ref[0].arrAccess(local4_Attr_1945).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str_ref[0]) == ("float")) ? 1 : 0))) ? 1 : 0)) || ((((global8_Compiler.attr5_Varis_ref[0].arrAccess(local4_Attr_1945).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str_ref[0]) == ("string")) ? 1 : 0))) ? 1 : 0))) ? 1 : 0)) {
								local8_plzclone_1947 = 0;
								
							} else {
								local8_plzclone_1947 = 1;
								
							};
							if (global8_Compiler.attr5_Varis_ref[0].arrAccess(local4_Attr_1945).values[tmpPositionCache][0].attr3_ref) {
								local8_plzclone_1947 = 1;
								
							};
							local8_Text_Str_1929 = ((((((local8_Text_Str_1929) + ("other."))) + (alias8_variable_ref_1946[0].attr8_Name_Str))) + (" = "));
							if (local8_plzclone_1947) {
								local8_Text_Str_1929 = ((local8_Text_Str_1929) + ("tryClone("));
								
							};
							local8_Text_Str_1929 = ((((local8_Text_Str_1929) + ("this."))) + (alias8_variable_ref_1946[0].attr8_Name_Str));
							if (local8_plzclone_1947) {
								local8_Text_Str_1929 = ((local8_Text_Str_1929) + (")"));
								
							};
							local8_Text_Str_1929 = ((((local8_Text_Str_1929) + (";"))) + (func11_NewLine_Str()));
							
						}
						forEachSaver6190.values[forEachCounter6190] = local4_Attr_1945;
					
					};
					local8_Text_Str_1929 = ((((local8_Text_Str_1929) + ("other.vtbl = this.vtbl;"))) + (func11_NewLine_Str()));
					func10_IndentDown();
					local8_Text_Str_1929 = ((((local8_Text_Str_1929) + ("return other;"))) + (func11_NewLine_Str()));
					local8_Text_Str_1929 = ((((local8_Text_Str_1929) + ("};"))) + (func11_NewLine_Str()));
					if (local11_InWebWorker_1928) {
						local8_Text_Str_1929 = ((((((((((local8_Text_Str_1929) + (local3_Typ_ref_1936[0].attr8_Name_Str))) + (" = window['"))) + (local3_Typ_ref_1936[0].attr8_Name_Str))) + ("'];"))) + (func11_NewLine_Str()));
						
					};
					local5_typId_1937 = local3_Typ_ref_1936[0].attr2_ID;
					local5_First_1939 = 0;
					while ((((local5_typId_1937) != (-(1))) ? 1 : 0)) {
						var forEachSaver6389 = global8_Compiler.attr5_Types_ref[0].arrAccess(local5_typId_1937).values[tmpPositionCache][0].attr7_Methods;
						for(var forEachCounter6389 = 0 ; forEachCounter6389 < forEachSaver6389.values.length ; forEachCounter6389++) {
							var local3_Mth_1949 = forEachSaver6389.values[forEachCounter6389];
						{
								if (((((((local4_map2_1948).DoesKeyExist(global8_Compiler.attr5_Funcs_ref[0].arrAccess(local3_Mth_1949).values[tmpPositionCache][0].attr9_OName_Str)) ? 0 : 1)) && ((((global8_Compiler.attr5_Funcs_ref[0].arrAccess(local3_Mth_1949).values[tmpPositionCache][0].attr3_Scp) != (-(1))) ? 1 : 0))) ? 1 : 0)) {
									func8_IndentUp();
									local8_Text_Str_1929 = ((((((((((((local8_Text_Str_1929) + (local3_Typ_ref_1936[0].attr8_Name_Str))) + (".prototype."))) + (global8_Compiler.attr5_Funcs_ref[0].arrAccess(local3_Mth_1949).values[tmpPositionCache][0].attr9_OName_Str))) + (" = function() {"))) + (func11_NewLine_Str()))) + (" return "));
									local8_Text_Str_1929 = ((((((local8_Text_Str_1929) + ("this.vtbl."))) + (global8_Compiler.attr5_Funcs_ref[0].arrAccess(local3_Mth_1949).values[tmpPositionCache][0].attr9_OName_Str))) + ("("));
									{
										var local1_i_1950 = 0.0;
										for (local1_i_1950 = 0;toCheck(local1_i_1950, ((BOUNDS(global8_Compiler.attr5_Funcs_ref[0].arrAccess(local3_Mth_1949).values[tmpPositionCache][0].attr6_Params, 0)) - (2)), 1);local1_i_1950 += 1) {
											local8_Text_Str_1929 = ((((((local8_Text_Str_1929) + ("arguments["))) + (CAST2STRING(local1_i_1950)))) + ("], "));
											
										};
										
									};
									local8_Text_Str_1929 = ((local8_Text_Str_1929) + ("this"));
									func10_IndentDown();
									local8_Text_Str_1929 = ((((((((local8_Text_Str_1929) + (");"))) + (func11_NewLine_Str()))) + ("};"))) + (func11_NewLine_Str()));
									(local4_map2_1948).Put(global8_Compiler.attr5_Funcs_ref[0].arrAccess(local3_Mth_1949).values[tmpPositionCache][0].attr9_OName_Str, local3_Mth_1949);
									
								};
								
							}
							forEachSaver6389.values[forEachCounter6389] = local3_Mth_1949;
						
						};
						local5_typId_1937 = global8_Compiler.attr5_Types_ref[0].arrAccess(local5_typId_1937).values[tmpPositionCache][0].attr9_Extending;
						
					};
					
				}
				forEachSaver6400.values[forEachCounter6400] = local3_Typ_ref_1936;
			
			};
			var forEachSaver6459 = global8_Compiler.attr10_DataBlocks;
			for(var forEachCounter6459 = 0 ; forEachCounter6459 < forEachSaver6459.values.length ; forEachCounter6459++) {
				var local5_block_1951 = forEachSaver6459.values[forEachCounter6459];
			{
					var local4_Done_1952 = 0;
					local8_Text_Str_1929 = ((((((local8_Text_Str_1929) + ("var datablock_"))) + (local5_block_1951.attr8_Name_Str))) + (" = [ "));
					local4_Done_1952 = 0;
					var forEachSaver6451 = local5_block_1951.attr5_Datas;
					for(var forEachCounter6451 = 0 ; forEachCounter6451 < forEachSaver6451.values.length ; forEachCounter6451++) {
						var local1_d_1953 = forEachSaver6451.values[forEachCounter6451];
					{
							if (local4_Done_1952) {
								local8_Text_Str_1929 = ((local8_Text_Str_1929) + (", "));
								
							};
							local8_Text_Str_1929 = ((local8_Text_Str_1929) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(local1_d_1953).values[tmpPositionCache][0]))));
							local4_Done_1952 = 1;
							
						}
						forEachSaver6451.values[forEachCounter6451] = local1_d_1953;
					
					};
					local8_Text_Str_1929 = ((((local8_Text_Str_1929) + (" ];"))) + (func11_NewLine_Str()));
					
				}
				forEachSaver6459.values[forEachCounter6459] = local5_block_1951;
			
			};
			if ((((BOUNDS(global8_Compiler.attr7_Globals, 0)) > (0)) ? 1 : 0)) {
				local8_Text_Str_1929 = ((local8_Text_Str_1929) + ("var "));
				local8_Text_Str_1929 = ((local8_Text_Str_1929) + (func13_JSVariDef_Str(unref(global8_Compiler.attr7_Globals), 1, 0)));
				local8_Text_Str_1929 = ((((local8_Text_Str_1929) + (";"))) + (func11_NewLine_Str()));
				
			};
			if ((((TRIM_Str(local14_StaticText_Str_1930, " \t\r\n\v\f")) != ("")) ? 1 : 0)) {
				local8_Text_Str_1929 = ((((local8_Text_Str_1929) + ("// set default statics:"))) + (func11_NewLine_Str()));
				local8_Text_Str_1929 = ((local17_StaticDefText_Str_1931) + (local8_Text_Str_1929));
				func8_IndentUp();
				local8_Text_Str_1929 = ((((local8_Text_Str_1929) + ("window['initStatics'] = function() {"))) + (func11_NewLine_Str()));
				func10_IndentDown();
				local8_Text_Str_1929 = ((((local8_Text_Str_1929) + (local14_StaticText_Str_1930))) + (func11_NewLine_Str()));
				local8_Text_Str_1929 = ((((local8_Text_Str_1929) + ("}"))) + (func11_NewLine_Str()));
				
			} else {
				local8_Text_Str_1929 = ((((local8_Text_Str_1929) + ("window['initStatics'] = function() {}"))) + (func11_NewLine_Str()));
				
			};
			if (local11_InWebWorker_1928) {
				local8_Text_Str_1929 = ((((local8_Text_Str_1929) + ("initStatics = window['initStatics'];"))) + (func11_NewLine_Str()));
				
			};
			local8_Text_Str_1929 = ((((local8_Text_Str_1929) + ("for (var __init = 0; __init < preInitFuncs.length; __init++) preInitFuncs[__init]();"))) + (func11_NewLine_Str()));
			local8_Text_Str_1929 = ((((local8_Text_Str_1929) + ("delete preInitFuncs;"))) + (func11_NewLine_Str()));
			return tryClone(local8_Text_Str_1929);
			
		} catch (Err_Str) {
			if (Err_Str instanceof GLBException) Err_Str = Err_Str.getText(); else throwError(Err_Str);{
				
			}
		};
		
	};
	return "";
	
};
func16_JS_Generator_Str = window['func16_JS_Generator_Str'];
window['func14_JSGenerate_Str'] = function(param4_expr) {
	var __labels = {"Exit": 7818};
	
	var local8_Text_Str_1956 = "";
	var __pc = 6582;
	while(__pc >= 0) {
		switch(__pc) {
			case 6582:
				global8_Compiler.attr11_currentPosi = param4_expr.attr5_tokID;
				
			local8_Text_Str_1956 = "";
			
				var local16___SelectHelper7__1957 = 0;
				case 6592:
					local16___SelectHelper7__1957 = param4_expr.attr3_Typ;
					
				case 10840:
					if (!((((local16___SelectHelper7__1957) == (~~(2))) ? 1 : 0))) { __pc = 6594; break; }
				
				var local4_oScp_1958 = 0.0, local5_oFunc_1959 = 0.0, local13_oLabelDef_Str_1960 = "", local9_oIsInGoto_1961 = 0, local6_IsFunc_1962 = 0, local7_mngGoto_1963 = 0, local13_IsStackPusher_1964 = 0, local7_Def_Str_1968 = "", local8_ERes_Str_1971 = new GLBArray(), local13_FirstText_Str_1974 = "";
				case 6599:
					local4_oScp_1958 = global12_CurrentScope;
					
				local5_oFunc_1959 = global11_CurrentFunc;
				local13_oLabelDef_Str_1960 = global12_LabelDef_Str;
				local9_oIsInGoto_1961 = global8_IsInGoto;
				local6_IsFunc_1962 = 0;
				local7_mngGoto_1963 = 0;
				local13_IsStackPusher_1964 = 0;
				case 6645:
					if (!(((((((param4_expr.attr6_ScpTyp) == (2)) ? 1 : 0)) || ((((param4_expr.attr6_ScpTyp) == (4)) ? 1 : 0))) ? 1 : 0))) { __pc = 6640; break; }
				
				case 6644:
					local13_IsStackPusher_1964 = 1;
					
				
				
			case 6640: //dummy jumper1
				;
					
				case 6658:
					if (!((((func12_ScopeHasGoto(param4_expr)) && (local13_IsStackPusher_1964)) ? 1 : 0))) { __pc = 6650; break; }
				
				case 6654:
					local7_mngGoto_1963 = 1;
					
				global8_IsInGoto = 1;
				
				
			case 6650: //dummy jumper1
				;
					
				case 6695:
					if (!((((param4_expr.attr6_ScpTyp) == (2)) ? 1 : 0))) { __pc = 6664; break; }
				
				var local1_i_1965 = 0;
				case 6694:
					var forEachSaver6694 = global8_Compiler.attr5_Funcs_ref[0];
				var forEachCounter6694 = 0
				
			case 6672: //dummy for1
				if (!(forEachCounter6694 < forEachSaver6694.values.length)) {__pc = 6668; break;}
				var local4_Func_ref_1966 = forEachSaver6694.values[forEachCounter6694];
				
				
				case 6690:
					if (!((((local4_Func_ref_1966[0].attr3_Scp) == (param4_expr.attr2_ID)) ? 1 : 0))) { __pc = 6681; break; }
				
				case 6685:
					global11_CurrentFunc = local1_i_1965;
					
				local6_IsFunc_1962 = 1;
				case 6689:
					__pc = 6668; break;
					
				
				
			case 6681: //dummy jumper1
				;
					
				local1_i_1965+=1;
				
				forEachSaver6694.values[forEachCounter6694] = local4_Func_ref_1966;
				
				forEachCounter6694++
				__pc = 6672; break; //back jump
				
			case 6668: //dummy for
				;
					
				
				
			case 6664: //dummy jumper1
				;
					
				global12_CurrentScope = param4_expr.attr2_ID;
				case 6711:
					if (!((((((global8_IsInGoto) ? 0 : 1)) || (local7_mngGoto_1963)) ? 1 : 0))) { __pc = 6707; break; }
				
				case 6709:
					func8_IndentUp();
					
				
				__pc = 28677;
				break;
				
			case 6707: //dummy jumper1
				
				
				
			case 28677: //dummy jumper2
				;
					
				local8_Text_Str_1956 = ((local8_Text_Str_1956) + (func11_NewLine_Str()));
				case 6742:
					if (!((((global9_DEBUGMODE) && (local13_IsStackPusher_1964)) ? 1 : 0))) { __pc = 6720; break; }
				
				case 6733:
					local8_Text_Str_1956 = ((((((((local8_Text_Str_1956) + ("stackPush(\""))) + (func13_ScopeName_Str(param4_expr)))) + ("\", __debugInfo);"))) + (func11_NewLine_Str()));
					
				func8_IndentUp();
				local8_Text_Str_1956 = ((((local8_Text_Str_1956) + ("try {"))) + (func11_NewLine_Str()));
				
				
			case 6720: //dummy jumper1
				;
					
				case 6805:
					if (!((((local6_IsFunc_1962) && (global8_Compiler.attr5_Funcs_ref[0].arrAccess(global11_CurrentFunc).values[tmpPositionCache][0].attr15_UsedAsPrototype)) ? 1 : 0))) { __pc = 6752; break; }
				
				case 6804:
					var forEachSaver6804 = global8_Compiler.attr5_Funcs_ref[0].arrAccess(global11_CurrentFunc).values[tmpPositionCache][0].attr6_Params;
				var forEachCounter6804 = 0
				
			case 6763: //dummy for1
				if (!(forEachCounter6804 < forEachSaver6804.values.length)) {__pc = 6755; break;}
				var local1_P_1967 = forEachSaver6804.values[forEachCounter6804];
				
				
				case 6803:
					if (!((((global8_Compiler.attr5_Varis_ref[0].arrAccess(local1_P_1967).values[tmpPositionCache][0].attr3_ref) == (0)) ? 1 : 0))) { __pc = 6775; break; }
				
				case 6801:
					local8_Text_Str_1956 = ((((((((((local8_Text_Str_1956) + (global8_Compiler.attr5_Varis_ref[0].arrAccess(local1_P_1967).values[tmpPositionCache][0].attr8_Name_Str))) + (" = unref("))) + (global8_Compiler.attr5_Varis_ref[0].arrAccess(local1_P_1967).values[tmpPositionCache][0].attr8_Name_Str))) + (");"))) + (func11_NewLine_Str()));
					
				
				__pc = 28680;
				break;
				
			case 6775: //dummy jumper1
				
				
				
			case 28680: //dummy jumper2
				;
					
				
				forEachSaver6804.values[forEachCounter6804] = local1_P_1967;
				
				forEachCounter6804++
				__pc = 6763; break; //back jump
				
			case 6755: //dummy for
				;
					
				
				
			case 6752: //dummy jumper1
				;
					
				local7_Def_Str_1968 = func13_JSVariDef_Str(unref(param4_expr.attr5_Varis), 0, 1);
				case 6839:
					if (!((((TRIM_Str(local7_Def_Str_1968, " \t\r\n\v\f")) != ("")) ? 1 : 0))) { __pc = 6820; break; }
				
				case 6826:
					local8_Text_Str_1956 = ((local8_Text_Str_1956) + ("var "));
					
				local8_Text_Str_1956 = ((local8_Text_Str_1956) + (local7_Def_Str_1968));
				local8_Text_Str_1956 = ((((local8_Text_Str_1956) + (";"))) + (func11_NewLine_Str()));
				
				
			case 6820: //dummy jumper1
				;
					
				case 6917:
					if (!(((((((global11_CurrentFunc) != (-(1))) ? 1 : 0)) && ((((local5_oFunc_1959) == (-(1))) ? 1 : 0))) ? 1 : 0))) { __pc = 6852; break; }
				
				var local1_i_1969 = 0;
				case 6916:
					var forEachSaver6916 = global8_Compiler.attr5_Funcs_ref[0].arrAccess(global11_CurrentFunc).values[tmpPositionCache][0].attr6_Params;
				var forEachCounter6916 = 0
				
			case 6864: //dummy for1
				if (!(forEachCounter6916 < forEachSaver6916.values.length)) {__pc = 6856; break;}
				var local5_Param_1970 = forEachSaver6916.values[forEachCounter6916];
				
				
				case 6915:
					if (!((((global8_Compiler.attr5_Varis_ref[0].arrAccess(local5_Param_1970).values[tmpPositionCache][0].attr9_OwnerVari) != (-(1))) ? 1 : 0))) { __pc = 6877; break; }
				
				case 6911:
					local8_Text_Str_1956 = ((((((((((((local8_Text_Str_1956) + ("var "))) + (global8_Compiler.attr5_Varis_ref[0].arrAccess(global8_Compiler.attr5_Varis_ref[0].arrAccess(local5_Param_1970).values[tmpPositionCache][0].attr9_OwnerVari).values[tmpPositionCache][0].attr8_Name_Str))) + (" = ["))) + (global8_Compiler.attr5_Varis_ref[0].arrAccess(local5_Param_1970).values[tmpPositionCache][0].attr8_Name_Str))) + ("]; /* NEWCODEHERE */"))) + (func11_NewLine_Str()));
					
				local1_i_1969+=1;
				
				
			case 6877: //dummy jumper1
				;
					
				
				forEachSaver6916.values[forEachCounter6916] = local5_Param_1970;
				
				forEachCounter6916++
				__pc = 6864; break; //back jump
				
			case 6856: //dummy for
				;
					
				
				
			case 6852: //dummy jumper1
				;
					
				case 6924:
					if (!(local7_mngGoto_1963)) { __pc = 6919; break; }
				
				case 6921:
					func8_IndentUp();
					
				func8_IndentUp();
				func8_IndentUp();
				
				
			case 6919: //dummy jumper1
				;
					
				case 6956:
					var forEachSaver6956 = param4_expr.attr5_Exprs;
				var forEachCounter6956 = 0
				
			case 6931: //dummy for1
				if (!(forEachCounter6956 < forEachSaver6956.values.length)) {__pc = 6927; break;}
				var local2_Ex_1972 = forEachSaver6956.values[forEachCounter6956];
				
				
				var local7_add_Str_1973 = "";
				case 6938:
					local7_add_Str_1973 = func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(local2_Ex_1972).values[tmpPositionCache][0]));
					
				case 6955:
					if (!((((TRIM_Str(local7_add_Str_1973, " \t\r\n\v\f")) != ("")) ? 1 : 0))) { __pc = 6944; break; }
				
				case 6950:
					DIMPUSH(local8_ERes_Str_1971, CAST2STRING(local2_Ex_1972));
					
				DIMPUSH(local8_ERes_Str_1971, local7_add_Str_1973);
				
				
			case 6944: //dummy jumper1
				;
					
				
				forEachSaver6956.values[forEachCounter6956] = local2_Ex_1972;
				
				forEachCounter6956++
				__pc = 6931; break; //back jump
				
			case 6927: //dummy for
				;
					
				case 7013:
					if (!(local7_mngGoto_1963)) { __pc = 6958; break; }
				
				case 6960:
					func10_IndentDown();
					
				func10_IndentDown();
				func10_IndentDown();
				local8_Text_Str_1956 = ((local8_Text_Str_1956) + ("var __pc = "));
				case 6989:
					if (!((((BOUNDS(local8_ERes_Str_1971, 0)) > (0)) ? 1 : 0))) { __pc = 6974; break; }
				
				case 6982:
					local8_Text_Str_1956 = ((local8_Text_Str_1956) + (local8_ERes_Str_1971.arrAccess(0).values[tmpPositionCache]));
					
				
				__pc = 28687;
				break;
				
			case 6974: //dummy jumper1
				
				case 6988:
					local8_Text_Str_1956 = ((local8_Text_Str_1956) + ("0"));
					
				
				
			case 28687: //dummy jumper2
				;
					
				local8_Text_Str_1956 = ((((local8_Text_Str_1956) + (";"))) + (func11_NewLine_Str()));
				func8_IndentUp();
				local8_Text_Str_1956 = ((((local8_Text_Str_1956) + ("while(__pc >= 0) {"))) + (func11_NewLine_Str()));
				func8_IndentUp();
				local8_Text_Str_1956 = ((((local8_Text_Str_1956) + ("switch(__pc) {"))) + (func11_NewLine_Str()));
				
				
			case 6958: //dummy jumper1
				;
					
				local13_FirstText_Str_1974 = "";
				
				var local1_i_1975 = 0.0;
				case 7228:
					local1_i_1975 = 0
				
			case 7022: //dummy for1
				if (!toCheck(local1_i_1975, ((BOUNDS(local8_ERes_Str_1971, 0)) - (1)), 2)) {__pc = 7033; break;}
				
				var local7_add_Str_1976 = "", local2_Ex_1977 = 0, alias4_ExEx_ref_1978 = [new type4_Expr()], local7_HasCase_1979 = 0;
				case 7043:
					local7_add_Str_1976 = local8_ERes_Str_1971.arrAccess(~~(((local1_i_1975) + (1)))).values[tmpPositionCache];
					
				local2_Ex_1977 = INT2STR(local8_ERes_Str_1971.arrAccess(~~(local1_i_1975)).values[tmpPositionCache]);
				alias4_ExEx_ref_1978 = global5_Exprs_ref[0].arrAccess(local2_Ex_1977).values[tmpPositionCache] /* ALIAS */;
				local7_HasCase_1979 = 0;
				case 7152:
					if (!(((((((local7_mngGoto_1963) || (global8_IsInGoto)) ? 1 : 0)) && ((((((((((((((((((((((((((((((((((local1_i_1975) == (0)) ? 1 : 0)) || ((((alias4_ExEx_ref_1978[0].attr3_Typ) == (20)) ? 1 : 0))) ? 1 : 0)) || ((((alias4_ExEx_ref_1978[0].attr3_Typ) == (21)) ? 1 : 0))) ? 1 : 0)) || ((((alias4_ExEx_ref_1978[0].attr3_Typ) == (24)) ? 1 : 0))) ? 1 : 0)) || ((((alias4_ExEx_ref_1978[0].attr3_Typ) == (25)) ? 1 : 0))) ? 1 : 0)) || ((((alias4_ExEx_ref_1978[0].attr3_Typ) == (27)) ? 1 : 0))) ? 1 : 0)) || ((((alias4_ExEx_ref_1978[0].attr3_Typ) == (38)) ? 1 : 0))) ? 1 : 0)) || ((((alias4_ExEx_ref_1978[0].attr3_Typ) == (26)) ? 1 : 0))) ? 1 : 0)) || ((((alias4_ExEx_ref_1978[0].attr3_Typ) == (29)) ? 1 : 0))) ? 1 : 0)) || ((((alias4_ExEx_ref_1978[0].attr3_Typ) == (30)) ? 1 : 0))) ? 1 : 0)) || ((((local1_i_1975) == (((BOUNDS(local8_ERes_Str_1971, 0)) - (1)))) ? 1 : 0))) ? 1 : 0))) ? 1 : 0))) { __pc = 7134; break; }
				
				case 7136:
					func8_IndentUp();
					
				local7_HasCase_1979 = 1;
				local8_Text_Str_1956 = ((((((((local8_Text_Str_1956) + ("case "))) + (CAST2STRING(local2_Ex_1977)))) + (":"))) + (func11_NewLine_Str()));
				
				
			case 7134: //dummy jumper1
				;
					
				case 7205:
					if (!(global9_DEBUGMODE)) { __pc = 7154; break; }
				
				var local7_Add_Str_1980 = "";
				case 7187:
					local7_Add_Str_1980 = (((((((("__debugInfo = \"") + (CAST2STRING(global8_Compiler.attr6_Tokens.arrAccess(global5_Exprs_ref[0].arrAccess(local2_Ex_1977).values[tmpPositionCache][0].attr5_tokID).values[tmpPositionCache].attr4_Line_ref[0])))) + (":"))) + (global8_Compiler.attr6_Tokens.arrAccess(global5_Exprs_ref[0].arrAccess(local2_Ex_1977).values[tmpPositionCache][0].attr5_tokID).values[tmpPositionCache].attr8_Path_Str_ref[0]))) + ("\";"));
					
				local8_Text_Str_1956 = ((((local8_Text_Str_1956) + (local7_Add_Str_1980))) + (func11_NewLine_Str()));
				case 7204:
					if (!((((local13_FirstText_Str_1974) == ("")) ? 1 : 0))) { __pc = 7199; break; }
				
				case 7203:
					local13_FirstText_Str_1974 = local7_Add_Str_1980;
					
				
				
			case 7199: //dummy jumper1
				;
					
				
				
			case 7154: //dummy jumper1
				;
					
				local8_Text_Str_1956 = ((local8_Text_Str_1956) + (local7_add_Str_1976));
				local8_Text_Str_1956 = ((((local8_Text_Str_1956) + (";"))) + (func11_NewLine_Str()));
				case 7227:
					if (!(local7_HasCase_1979)) { __pc = 7219; break; }
				
				case 7221:
					func10_IndentDown();
					
				local8_Text_Str_1956 = ((local8_Text_Str_1956) + (func11_NewLine_Str()));
				
				
			case 7219: //dummy jumper1
				;
					
				
				local1_i_1975 += 2;
				__pc = 7022; break; //back jump
				
			case 7033: //dummy for
				;
					
				
				;
				case 7239:
					if (!((((local13_FirstText_Str_1974) != ("")) ? 1 : 0))) { __pc = 7232; break; }
				
				case 7238:
					local8_Text_Str_1956 = ((local8_Text_Str_1956) + (local13_FirstText_Str_1974));
					
				
				
			case 7232: //dummy jumper1
				;
					
				case 7300:
					if (!(local7_mngGoto_1963)) { __pc = 7241; break; }
				
				case 7249:
					local8_Text_Str_1956 = ((((local8_Text_Str_1956) + ("__pc = -1; break;"))) + (func11_NewLine_Str()));
					
				func8_IndentUp();
				local8_Text_Str_1956 = ((((local8_Text_Str_1956) + ("default:"))) + (func11_NewLine_Str()));
				func10_IndentDown();
				local8_Text_Str_1956 = ((((local8_Text_Str_1956) + ("throwError(\"Gotocounter exception pc: \"+__pc);"))) + (func11_NewLine_Str()));
				func10_IndentDown();
				local8_Text_Str_1956 = ((((local8_Text_Str_1956) + (func11_NewLine_Str()))) + ("}"));
				func10_IndentDown();
				local8_Text_Str_1956 = ((((local8_Text_Str_1956) + (func11_NewLine_Str()))) + ("}"));
				local8_Text_Str_1956 = (((((((("var __labels = {") + (func16_JSRemoveLast_Str(global12_LabelDef_Str, ", ")))) + ("};"))) + (func11_NewLine_Str()))) + (local8_Text_Str_1956));
				local8_Text_Str_1956 = ((func11_NewLine_Str()) + (local8_Text_Str_1956));
				
				
			case 7241: //dummy jumper1
				;
					
				case 7314:
					if (!((((((global8_IsInGoto) ? 0 : 1)) || (local7_mngGoto_1963)) ? 1 : 0))) { __pc = 7307; break; }
				
				case 7313:
					local8_Text_Str_1956 = (("{") + (local8_Text_Str_1956));
					
				
				
			case 7307: //dummy jumper1
				;
					
				case 7376:
					if (!((((global9_DEBUGMODE) && (local13_IsStackPusher_1964)) ? 1 : 0))) { __pc = 7318; break; }
				
				case 7320:
					func10_IndentDown();
					
				local8_Text_Str_1956 = ((((local8_Text_Str_1956) + (func11_NewLine_Str()))) + ("} catch(ex) {"));
				func8_IndentUp();
				local8_Text_Str_1956 = ((((local8_Text_Str_1956) + (func11_NewLine_Str()))) + ("if (isKnownException(ex)) throw ex;"));
				local8_Text_Str_1956 = ((((local8_Text_Str_1956) + (func11_NewLine_Str()))) + ("alert(formatError(ex));"));
				local8_Text_Str_1956 = ((((local8_Text_Str_1956) + (func11_NewLine_Str()))) + ("END();"));
				func10_IndentDown();
				local8_Text_Str_1956 = ((((local8_Text_Str_1956) + (func11_NewLine_Str()))) + ("} finally {"));
				func8_IndentUp();
				local8_Text_Str_1956 = ((((local8_Text_Str_1956) + (func11_NewLine_Str()))) + ("stackPop();"));
				func10_IndentDown();
				local8_Text_Str_1956 = ((((((local8_Text_Str_1956) + (func11_NewLine_Str()))) + ("}"))) + (func11_NewLine_Str()));
				
				
			case 7318: //dummy jumper1
				;
					
				case 7402:
					if (!((((((global8_IsInGoto) ? 0 : 1)) || (local7_mngGoto_1963)) ? 1 : 0))) { __pc = 7383; break; }
				
				case 7385:
					func10_IndentDown();
					
				local8_Text_Str_1956 = ((local8_Text_Str_1956) + (func11_NewLine_Str()));
				local8_Text_Str_1956 = ((local8_Text_Str_1956) + ("}"));
				
				__pc = 28696;
				break;
				
			case 7383: //dummy jumper1
				
				case 7401:
					local8_Text_Str_1956 = ((local8_Text_Str_1956) + (func11_NewLine_Str()));
					
				
				
			case 28696: //dummy jumper2
				;
					
				global12_CurrentScope = ~~(local4_oScp_1958);
				global11_CurrentFunc = ~~(local5_oFunc_1959);
				case 7420:
					if (!(local7_mngGoto_1963)) { __pc = 7412; break; }
				
				case 7416:
					global12_LabelDef_Str = local13_oLabelDef_Str_1960;
					
				global8_IsInGoto = local9_oIsInGoto_1961;
				
				
			case 7412: //dummy jumper1
				;
					
				
				__pc = 28672;
				break;
				
			case 6594: //dummy jumper1
				if (!((((local16___SelectHelper7__1957) == (~~(1))) ? 1 : 0))) { __pc = 7422; break; }
				
				var local7_Sym_Str_1981 = "", local10_HasToBeInt_1982 = 0.0;
				case 7432:
					local7_Sym_Str_1981 = global9_Operators_ref[0].arrAccess(param4_expr.attr2_Op).values[tmpPositionCache][0].attr7_Sym_Str;
					
				local10_HasToBeInt_1982 = 0;
				
				var local16___SelectHelper8__1983 = "";
				case 7441:
					local16___SelectHelper8__1983 = local7_Sym_Str_1981;
					
				case 7510:
					if (!((((local16___SelectHelper8__1983) == ("=")) ? 1 : 0))) { __pc = 7443; break; }
				
				case 7447:
					local7_Sym_Str_1981 = "==";
					
				local10_HasToBeInt_1982 = 1;
				
				
			case 7443: //dummy jumper1
				if (!((((local16___SelectHelper8__1983) == ("<>")) ? 1 : 0))) { __pc = 7453; break; }
				
				case 7457:
					local7_Sym_Str_1981 = "!=";
					
				local10_HasToBeInt_1982 = 1;
				
				
			case 7453: //dummy jumper1
				if (!((((local16___SelectHelper8__1983) == ("OR")) ? 1 : 0))) { __pc = 7463; break; }
				
				case 7467:
					local7_Sym_Str_1981 = "||";
					
				local10_HasToBeInt_1982 = 1;
				
				
			case 7463: //dummy jumper1
				if (!((((local16___SelectHelper8__1983) == ("AND")) ? 1 : 0))) { __pc = 7473; break; }
				
				case 7477:
					local7_Sym_Str_1981 = "&&";
					
				local10_HasToBeInt_1982 = 1;
				
				
			case 7473: //dummy jumper1
				if (!((((local16___SelectHelper8__1983) == ("<")) ? 1 : 0))) { __pc = 7483; break; }
				
				case 7488:
					local10_HasToBeInt_1982 = 1;
					
				
				
			case 7483: //dummy jumper1
				if (!((((local16___SelectHelper8__1983) == (">")) ? 1 : 0))) { __pc = 7490; break; }
				
				case 7495:
					local10_HasToBeInt_1982 = 1;
					
				
				
			case 7490: //dummy jumper1
				if (!((((local16___SelectHelper8__1983) == (">=")) ? 1 : 0))) { __pc = 7497; break; }
				
				case 7502:
					local10_HasToBeInt_1982 = 1;
					
				
				
			case 7497: //dummy jumper1
				if (!((((local16___SelectHelper8__1983) == ("<=")) ? 1 : 0))) { __pc = 7504; break; }
				
				case 7509:
					local10_HasToBeInt_1982 = 1;
					
				
				
			case 7504: //dummy jumper1
				;
					
				
				;
				case 7597:
					if (!(local10_HasToBeInt_1982)) { __pc = 7511; break; }
				
				case 7539:
					local8_Text_Str_1956 = ((((((((((((((local8_Text_Str_1956) + ("((("))) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr4_Left).values[tmpPositionCache][0]))))) + (") "))) + (local7_Sym_Str_1981))) + (" ("))) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr5_Right).values[tmpPositionCache][0]))))) + (")) ? 1 : 0)"));
					
				
				__pc = 28699;
				break;
				
			case 7511: //dummy jumper1
				
				var local5_l_Str_1984 = "";
				case 7548:
					local5_l_Str_1984 = func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr4_Left).values[tmpPositionCache][0]));
					
				case 7596:
					if (!(((((((local7_Sym_Str_1981) == ("-")) ? 1 : 0)) && ((((local5_l_Str_1984) == ("0")) ? 1 : 0))) ? 1 : 0))) { __pc = 7557; break; }
				
				case 7572:
					local8_Text_Str_1956 = ((((((local8_Text_Str_1956) + ("-("))) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr5_Right).values[tmpPositionCache][0]))))) + (")"));
					
				
				__pc = 28700;
				break;
				
			case 7557: //dummy jumper1
				
				case 7595:
					local8_Text_Str_1956 = ((((((((((((((local8_Text_Str_1956) + ("(("))) + (local5_l_Str_1984))) + (") "))) + (local7_Sym_Str_1981))) + (" ("))) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr5_Right).values[tmpPositionCache][0]))))) + ("))"));
					
				
				
			case 28700: //dummy jumper2
				;
					
				
				
			case 28699: //dummy jumper2
				;
					
				case 7634:
					if (!((((((((((local7_Sym_Str_1981) == ("/")) ? 1 : 0)) && ((((global5_Exprs_ref[0].arrAccess(param4_expr.attr4_Left).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str_ref[0]) == ("int")) ? 1 : 0))) ? 1 : 0)) && ((((global5_Exprs_ref[0].arrAccess(param4_expr.attr5_Right).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str_ref[0]) == ("int")) ? 1 : 0))) ? 1 : 0))) { __pc = 7625; break; }
				
				case 7633:
					local8_Text_Str_1956 = (((("CAST2INT(") + (local8_Text_Str_1956))) + (")"));
					
				
				
			case 7625: //dummy jumper1
				;
					
				
				__pc = 28672;
				break;
				
			case 7422: //dummy jumper1
				if (!((((local16___SelectHelper7__1957) == (~~(3))) ? 1 : 0))) { __pc = 7636; break; }
				
				case 7643:
					local8_Text_Str_1956 = CAST2STRING(param4_expr.attr6_intval);
					
				
				__pc = 28672;
				break;
				
			case 7636: //dummy jumper1
				if (!((((local16___SelectHelper7__1957) == (~~(4))) ? 1 : 0))) { __pc = 7645; break; }
				
				case 7652:
					local8_Text_Str_1956 = CAST2STRING(param4_expr.attr8_floatval);
					
				
				__pc = 28672;
				break;
				
			case 7645: //dummy jumper1
				if (!((((local16___SelectHelper7__1957) == (~~(5))) ? 1 : 0))) { __pc = 7654; break; }
				
				case 7660:
					local8_Text_Str_1956 = param4_expr.attr10_strval_Str;
					
				
				__pc = 28672;
				break;
				
			case 7654: //dummy jumper1
				if (!((((local16___SelectHelper7__1957) == (~~(6))) ? 1 : 0))) { __pc = 7662; break; }
				
				case 7869:
					if (!((((global8_Compiler.attr5_Funcs_ref[0].arrAccess(param4_expr.attr4_func).values[tmpPositionCache][0].attr3_Typ) == (3)) ? 1 : 0))) { __pc = 7675; break; }
				
				var local1_P_1985 = 0, alias2_Ex_ref_1986 = [new type4_Expr()];
				case 7685:
					local1_P_1985 = param4_expr.attr6_Params.arrAccess(-(1)).values[tmpPositionCache];
					
				alias2_Ex_ref_1986 = global5_Exprs_ref[0].arrAccess(local1_P_1985).values[tmpPositionCache] /* ALIAS */;
				case 7848:
					if (!((((alias2_Ex_ref_1986[0].attr3_Typ) == (53)) ? 1 : 0))) { __pc = 7696; break; }
				
				var local5_Found_1987 = 0, local5_typId_1988 = 0;
				case 7719:
					if (!(((func6_IsType(unref(alias2_Ex_ref_1986[0].attr8_datatype.attr8_Name_Str_ref[0]))) ? 0 : 1))) { __pc = 7705; break; }
				
				case 7718:
					func5_Error((((("Internal error (Unable to find '") + (alias2_Ex_ref_1986[0].attr8_datatype.attr8_Name_Str_ref[0]))) + ("')")), 522, "JSGenerator.gbas");
					
				
				
			case 7705: //dummy jumper1
				;
					
				local5_Found_1987 = 0;
				local5_typId_1988 = global8_LastType.attr2_ID;
				case 7817:
					if (!((((local5_typId_1988) != (-(1))) ? 1 : 0))) {__pc = 28705; break;}
				
				case 7807:
					var forEachSaver7807 = global8_Compiler.attr5_Types_ref[0].arrAccess(local5_typId_1988).values[tmpPositionCache][0].attr7_Methods;
				var forEachCounter7807 = 0
				
			case 7747: //dummy for1
				if (!(forEachCounter7807 < forEachSaver7807.values.length)) {__pc = 7739; break;}
				var local3_Mth_1989 = forEachSaver7807.values[forEachCounter7807];
				
				
				case 7806:
					if (!((((global8_Compiler.attr5_Funcs_ref[0].arrAccess(local3_Mth_1989).values[tmpPositionCache][0].attr9_OName_Str) == (global8_Compiler.attr5_Funcs_ref[0].arrAccess(param4_expr.attr4_func).values[tmpPositionCache][0].attr9_OName_Str)) ? 1 : 0))) { __pc = 7766; break; }
				
				var local10_Params_Str_1990 = "";
				case 7775:
					local10_Params_Str_1990 = func17_JSDoParameter_Str(param4_expr, param4_expr.attr4_func, 0);
					
				case 7787:
					if (!((((local10_Params_Str_1990) != ("")) ? 1 : 0))) { __pc = 7780; break; }
				
				case 7786:
					local10_Params_Str_1990 = ((local10_Params_Str_1990) + (", "));
					
				
				
			case 7780: //dummy jumper1
				;
					
				local8_Text_Str_1956 = ((((((((local8_Text_Str_1956) + (global8_Compiler.attr5_Funcs_ref[0].arrAccess(local3_Mth_1989).values[tmpPositionCache][0].attr8_Name_Str))) + ("("))) + (local10_Params_Str_1990))) + ("param4_self)"));
				case 7805:
					__pc = __labels["Exit"]; break;
					
				
				
			case 7766: //dummy jumper1
				;
					
				
				forEachSaver7807.values[forEachCounter7807] = local3_Mth_1989;
				
				forEachCounter7807++
				__pc = 7747; break; //back jump
				
			case 7739: //dummy for
				;
					
				local5_typId_1988 = global8_Compiler.attr5_Types_ref[0].arrAccess(local5_typId_1988).values[tmpPositionCache][0].attr9_Extending;
				
				__pc = 7817; break; //back jump
				
			case 28705:
				;
					
				case 7818:
					//label: Exit;
					
				
				__pc = 28703;
				break;
				
			case 7696: //dummy jumper1
				
				case 7847:
					local8_Text_Str_1956 = ((((((((((local8_Text_Str_1956) + ("("))) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(local1_P_1985).values[tmpPositionCache][0]))))) + (")."))) + (global8_Compiler.attr5_Funcs_ref[0].arrAccess(param4_expr.attr4_func).values[tmpPositionCache][0].attr9_OName_Str))) + (func17_JSDoParameter_Str(param4_expr, param4_expr.attr4_func, 1)));
					
				
				
			case 28703: //dummy jumper2
				;
					
				
				__pc = 28702;
				break;
				
			case 7675: //dummy jumper1
				
				case 7868:
					local8_Text_Str_1956 = ((((local8_Text_Str_1956) + (global8_Compiler.attr5_Funcs_ref[0].arrAccess(param4_expr.attr4_func).values[tmpPositionCache][0].attr8_Name_Str))) + (func17_JSDoParameter_Str(param4_expr, param4_expr.attr4_func, 1)));
					
				
				
			case 28702: //dummy jumper2
				;
					
				
				__pc = 28672;
				break;
				
			case 7662: //dummy jumper1
				if (!((((local16___SelectHelper7__1957) == (~~(23))) ? 1 : 0))) { __pc = 7871; break; }
				
				case 7888:
					local8_Text_Str_1956 = ((((local8_Text_Str_1956) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr4_expr).values[tmpPositionCache][0]))))) + (func17_JSDoParameter_Str(param4_expr, -(1), 1)));
					
				
				__pc = 28672;
				break;
				
			case 7871: //dummy jumper1
				if (!((((local16___SelectHelper7__1957) == (~~(9))) ? 1 : 0))) { __pc = 7890; break; }
				
				case 7904:
					local8_Text_Str_1956 = ((local8_Text_Str_1956) + (global8_Compiler.attr5_Varis_ref[0].arrAccess(param4_expr.attr4_vari).values[tmpPositionCache][0].attr8_Name_Str));
					
				case 7921:
					if (!(global8_Compiler.attr5_Varis_ref[0].arrAccess(param4_expr.attr4_vari).values[tmpPositionCache][0].attr3_ref)) { __pc = 7914; break; }
				
				case 7920:
					local8_Text_Str_1956 = ((local8_Text_Str_1956) + ("[0]"));
					
				
				
			case 7914: //dummy jumper1
				;
					
				
				__pc = 28672;
				break;
				
			case 7890: //dummy jumper1
				if (!((((local16___SelectHelper7__1957) == (~~(13))) ? 1 : 0))) { __pc = 7923; break; }
				
				case 7934:
					local8_Text_Str_1956 = ((local8_Text_Str_1956) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr5_array).values[tmpPositionCache][0]))));
					
				case 8021:
					if (!((((BOUNDS(param4_expr.attr4_dims, 0)) != (0)) ? 1 : 0))) { __pc = 7943; break; }
				
				var local1_s_1991 = 0, local7_Add_Str_1992 = "";
				case 7949:
					local8_Text_Str_1956 = ((local8_Text_Str_1956) + (".arrAccess("));
					
				local1_s_1991 = 0;
				local7_Add_Str_1992 = "";
				case 8013:
					var forEachSaver8013 = param4_expr.attr4_dims;
				var forEachCounter8013 = 0
				
			case 7964: //dummy for1
				if (!(forEachCounter8013 < forEachSaver8013.values.length)) {__pc = 7960; break;}
				var local1_d_1993 = forEachSaver8013.values[forEachCounter8013];
				
				
				var local1_v_1994 = 0;
				case 7974:
					if (!(local1_s_1991)) { __pc = 7967; break; }
				
				case 7973:
					local8_Text_Str_1956 = ((local8_Text_Str_1956) + (", "));
					
				
				
			case 7967: //dummy jumper1
				;
					
				local8_Text_Str_1956 = ((local8_Text_Str_1956) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(local1_d_1993).values[tmpPositionCache][0]))));
				local1_s_1991 = 1;
				local1_v_1994 = func11_GetVariable(param4_expr.attr5_array, 0);
				case 8012:
					if (!(((((((local1_v_1994) != (-(1))) ? 1 : 0)) && (global8_Compiler.attr5_Varis_ref[0].arrAccess(local1_v_1994).values[tmpPositionCache][0].attr3_ref)) ? 1 : 0))) { __pc = 8007; break; }
				
				case 8011:
					local7_Add_Str_1992 = "[0]";
					
				
				
			case 8007: //dummy jumper1
				;
					
				
				forEachSaver8013.values[forEachCounter8013] = local1_d_1993;
				
				forEachCounter8013++
				__pc = 7964; break; //back jump
				
			case 7960: //dummy for
				;
					
				local8_Text_Str_1956 = ((((local8_Text_Str_1956) + (").values[tmpPositionCache]"))) + (local7_Add_Str_1992));
				
				
			case 7943: //dummy jumper1
				;
					
				
				__pc = 28672;
				break;
				
			case 7923: //dummy jumper1
				if (!((((local16___SelectHelper7__1957) == (~~(10))) ? 1 : 0))) { __pc = 8023; break; }
				
				case 8036:
					local8_Text_Str_1956 = ((((local8_Text_Str_1956) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr4_vari).values[tmpPositionCache][0]))))) + (" = "));
					
				local8_Text_Str_1956 = ((local8_Text_Str_1956) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr5_Right).values[tmpPositionCache][0]))));
				case 8096:
					if (!((((global5_Exprs_ref[0].arrAccess(param4_expr.attr4_vari).values[tmpPositionCache][0].attr8_datatype.attr7_IsArray_ref[0]) || (func6_IsType(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr4_vari).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str_ref[0])))) ? 1 : 0))) { __pc = 8067; break; }
				
				case 8095:
					if (!(((((((global5_Exprs_ref[0].arrAccess(param4_expr.attr5_Right).values[tmpPositionCache][0].attr3_Typ) != (35)) ? 1 : 0)) && ((((global5_Exprs_ref[0].arrAccess(param4_expr.attr5_Right).values[tmpPositionCache][0].attr3_Typ) != (36)) ? 1 : 0))) ? 1 : 0))) { __pc = 8088; break; }
				
				case 8094:
					local8_Text_Str_1956 = ((local8_Text_Str_1956) + (".clone(/* In Assign */)"));
					
				
				
			case 8088: //dummy jumper1
				;
					
				
				
			case 8067: //dummy jumper1
				;
					
				
				__pc = 28672;
				break;
				
			case 8023: //dummy jumper1
				if (!((((local16___SelectHelper7__1957) == (~~(11))) ? 1 : 0))) { __pc = 8098; break; }
				
				var local1_v_1995 = 0, local6_hasRef_1996 = 0, local4_Find_1997 = 0;
				case 8106:
					local1_v_1995 = func11_GetVariable(param4_expr.attr5_array, 0);
					
				local6_hasRef_1996 = 0;
				case 8131:
					if (!(((((((local1_v_1995) == (-(1))) ? 1 : 0)) || (global8_Compiler.attr5_Varis_ref[0].arrAccess(local1_v_1995).values[tmpPositionCache][0].attr3_ref)) ? 1 : 0))) { __pc = 8126; break; }
				
				case 8130:
					local6_hasRef_1996 = 1;
					
				
				
			case 8126: //dummy jumper1
				;
					
				local8_Text_Str_1956 = ((((((local8_Text_Str_1956) + ("DIM("))) + (func14_JSTryUnref_Str(param4_expr.attr5_array)))) + (", ["));
				local4_Find_1997 = 0;
				case 8178:
					var forEachSaver8178 = param4_expr.attr4_dims;
				var forEachCounter8178 = 0
				
			case 8154: //dummy for1
				if (!(forEachCounter8178 < forEachSaver8178.values.length)) {__pc = 8150; break;}
				var local1_D_1998 = forEachSaver8178.values[forEachCounter8178];
				
				
				case 8166:
					if (!((((local4_Find_1997) == (1)) ? 1 : 0))) { __pc = 8159; break; }
				
				case 8165:
					local8_Text_Str_1956 = ((local8_Text_Str_1956) + (", "));
					
				
				
			case 8159: //dummy jumper1
				;
					
				local8_Text_Str_1956 = ((local8_Text_Str_1956) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(local1_D_1998).values[tmpPositionCache][0]))));
				local4_Find_1997 = 1;
				
				forEachSaver8178.values[forEachCounter8178] = local1_D_1998;
				
				forEachCounter8178++
				__pc = 8154; break; //back jump
				
			case 8150: //dummy for
				;
					
				local8_Text_Str_1956 = ((((((local8_Text_Str_1956) + ("], "))) + (func21_JSGetDefaultValue_Str(global5_Exprs_ref[0].arrAccess(param4_expr.attr5_array).values[tmpPositionCache][0].attr8_datatype, local6_hasRef_1996, 1)))) + (")"));
				
				__pc = 28672;
				break;
				
			case 8098: //dummy jumper1
				if (!((((local16___SelectHelper7__1957) == (~~(12))) ? 1 : 0))) { __pc = 8198; break; }
				
				var local1_v_1999 = 0, local6_hasRef_2000 = 0, local4_Find_2001 = 0;
				case 8206:
					local1_v_1999 = func11_GetVariable(param4_expr.attr5_array, 0);
					
				local6_hasRef_2000 = 0;
				case 8231:
					if (!(((((((local1_v_1999) == (-(1))) ? 1 : 0)) || (global8_Compiler.attr5_Varis_ref[0].arrAccess(local1_v_1999).values[tmpPositionCache][0].attr3_ref)) ? 1 : 0))) { __pc = 8226; break; }
				
				case 8230:
					local6_hasRef_2000 = 1;
					
				
				
			case 8226: //dummy jumper1
				;
					
				local8_Text_Str_1956 = ((((((local8_Text_Str_1956) + ("REDIM("))) + (func14_JSTryUnref_Str(param4_expr.attr5_array)))) + (", ["));
				local4_Find_2001 = 0;
				case 8278:
					var forEachSaver8278 = param4_expr.attr4_dims;
				var forEachCounter8278 = 0
				
			case 8254: //dummy for1
				if (!(forEachCounter8278 < forEachSaver8278.values.length)) {__pc = 8250; break;}
				var local1_D_2002 = forEachSaver8278.values[forEachCounter8278];
				
				
				case 8266:
					if (!((((local4_Find_2001) == (1)) ? 1 : 0))) { __pc = 8259; break; }
				
				case 8265:
					local8_Text_Str_1956 = ((local8_Text_Str_1956) + (", "));
					
				
				
			case 8259: //dummy jumper1
				;
					
				local8_Text_Str_1956 = ((local8_Text_Str_1956) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(local1_D_2002).values[tmpPositionCache][0]))));
				local4_Find_2001 = 1;
				
				forEachSaver8278.values[forEachCounter8278] = local1_D_2002;
				
				forEachCounter8278++
				__pc = 8254; break; //back jump
				
			case 8250: //dummy for
				;
					
				local8_Text_Str_1956 = ((((((local8_Text_Str_1956) + ("], "))) + (func21_JSGetDefaultValue_Str(global5_Exprs_ref[0].arrAccess(param4_expr.attr5_array).values[tmpPositionCache][0].attr8_datatype, local6_hasRef_2000, 1)))) + (" )"));
				
				__pc = 28672;
				break;
				
			case 8198: //dummy jumper1
				if (!((((local16___SelectHelper7__1957) == (~~(15))) ? 1 : 0))) { __pc = 8298; break; }
				
				var local4_cast_2003 = 0;
				case 8302:
					local4_cast_2003 = 1;
					
				case 8360:
					if (!((((global5_Exprs_ref[0].arrAccess(param4_expr.attr4_expr).values[tmpPositionCache][0].attr3_Typ) == (4)) ? 1 : 0))) { __pc = 8313; break; }
				
				var local5_f_Str_2004 = "";
				case 8318:
					local4_cast_2003 = 0;
					
				local5_f_Str_2004 = ((CAST2STRING(global5_Exprs_ref[0].arrAccess(param4_expr.attr4_expr).values[tmpPositionCache][0].attr8_floatval)) + (""));
				
				var local1_i_2005 = 0.0;
				case 8359:
					local1_i_2005 = 0
				
			case 8336: //dummy for1
				if (!toCheck(local1_i_2005, (((local5_f_Str_2004).length) - (1)), 1)) {__pc = 8343; break;}
				
				case 8358:
					if (!((((CAST2STRING(ASC(local5_f_Str_2004, ~~(local1_i_2005)))) == (CHR_Str(INT2STR(".")))) ? 1 : 0))) { __pc = 8352; break; }
				
				case 8356:
					local4_cast_2003 = 1;
					
				case 8357:
					__pc = 8343; break;
					
				
				
			case 8352: //dummy jumper1
				;
					
				
				local1_i_2005 += 1;
				__pc = 8336; break; //back jump
				
			case 8343: //dummy for
				;
					
				
				;
				
				
			case 8313: //dummy jumper1
				;
					
				case 8450:
					if (!(local4_cast_2003)) { __pc = 8362; break; }
				
				case 8373:
					
				var local16___SelectHelper9__2006 = "";
				case 8375:
					local16___SelectHelper9__2006 = global5_Exprs_ref[0].arrAccess(param4_expr.attr4_expr).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str_ref[0];
					
				case 8438:
					if (!((((local16___SelectHelper9__2006) == ("int")) ? 1 : 0))) { __pc = 8377; break; }
				
				case 8388:
					local8_Text_Str_1956 = ((local8_Text_Str_1956) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr4_expr).values[tmpPositionCache][0]))));
					
				
				__pc = 28721;
				break;
				
			case 8377: //dummy jumper1
				if (!((((local16___SelectHelper9__2006) == ("float")) ? 1 : 0))) { __pc = 8390; break; }
				
				case 8405:
					local8_Text_Str_1956 = ((((((local8_Text_Str_1956) + ("~~("))) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr4_expr).values[tmpPositionCache][0]))))) + (")"));
					
				
				__pc = 28721;
				break;
				
			case 8390: //dummy jumper1
				if (!((((local16___SelectHelper9__2006) == ("string")) ? 1 : 0))) { __pc = 8407; break; }
				
				case 8422:
					local8_Text_Str_1956 = ((((((local8_Text_Str_1956) + ("INT2STR("))) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr4_expr).values[tmpPositionCache][0]))))) + (")"));
					
				
				__pc = 28721;
				break;
				
			case 8407: //dummy jumper1
				
				case 8437:
					local8_Text_Str_1956 = ((((((local8_Text_Str_1956) + ("CAST2INT("))) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr4_expr).values[tmpPositionCache][0]))))) + (")"));
					
				
				
			case 28721: //dummy jumper2
				;
					
				
				;
					
				
				__pc = 28720;
				break;
				
			case 8362: //dummy jumper1
				
				case 8449:
					local8_Text_Str_1956 = ((local8_Text_Str_1956) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr4_expr).values[tmpPositionCache][0]))));
					
				
				
			case 28720: //dummy jumper2
				;
					
				
				__pc = 28672;
				break;
				
			case 8298: //dummy jumper1
				if (!((((local16___SelectHelper7__1957) == (~~(16))) ? 1 : 0))) { __pc = 8452; break; }
				
				case 8547:
					if (!((((global5_Exprs_ref[0].arrAccess(param4_expr.attr4_expr).values[tmpPositionCache][0].attr3_Typ) == (3)) ? 1 : 0))) { __pc = 8463; break; }
				
				case 8474:
					local8_Text_Str_1956 = ((local8_Text_Str_1956) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr4_expr).values[tmpPositionCache][0]))));
					
				
				__pc = 28722;
				break;
				
			case 8463: //dummy jumper1
				
				case 8485:
					
				var local17___SelectHelper10__2007 = "";
				case 8487:
					local17___SelectHelper10__2007 = global5_Exprs_ref[0].arrAccess(param4_expr.attr4_expr).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str_ref[0];
					
				case 8546:
					if (!((((local17___SelectHelper10__2007) == ("int")) ? 1 : 0))) { __pc = 8489; break; }
				
				case 8500:
					local8_Text_Str_1956 = ((local8_Text_Str_1956) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr4_expr).values[tmpPositionCache][0]))));
					
				
				__pc = 28723;
				break;
				
			case 8489: //dummy jumper1
				if (!((((local17___SelectHelper10__2007) == ("float")) ? 1 : 0))) { __pc = 8502; break; }
				
				case 8513:
					local8_Text_Str_1956 = ((local8_Text_Str_1956) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr4_expr).values[tmpPositionCache][0]))));
					
				
				__pc = 28723;
				break;
				
			case 8502: //dummy jumper1
				if (!((((local17___SelectHelper10__2007) == ("string")) ? 1 : 0))) { __pc = 8515; break; }
				
				case 8530:
					local8_Text_Str_1956 = ((((((local8_Text_Str_1956) + ("FLOAT2STR("))) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr4_expr).values[tmpPositionCache][0]))))) + (")"));
					
				
				__pc = 28723;
				break;
				
			case 8515: //dummy jumper1
				
				case 8545:
					local8_Text_Str_1956 = ((((((local8_Text_Str_1956) + ("CAST2FLOAT("))) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr4_expr).values[tmpPositionCache][0]))))) + (")"));
					
				
				
			case 28723: //dummy jumper2
				;
					
				
				;
					
				
				
			case 28722: //dummy jumper2
				;
					
				
				__pc = 28672;
				break;
				
			case 8452: //dummy jumper1
				if (!((((local16___SelectHelper7__1957) == (~~(17))) ? 1 : 0))) { __pc = 8549; break; }
				
				case 8564:
					local8_Text_Str_1956 = ((((((local8_Text_Str_1956) + ("CAST2STRING("))) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr4_expr).values[tmpPositionCache][0]))))) + (")"));
					
				
				__pc = 28672;
				break;
				
			case 8549: //dummy jumper1
				if (!((((local16___SelectHelper7__1957) == (~~(18))) ? 1 : 0))) { __pc = 8566; break; }
				
				case 8586:
					local8_Text_Str_1956 = ((((((local8_Text_Str_1956) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr4_expr).values[tmpPositionCache][0]))))) + ("."))) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr8_nextExpr).values[tmpPositionCache][0]))));
					
				
				__pc = 28672;
				break;
				
			case 8566: //dummy jumper1
				if (!((((local16___SelectHelper7__1957) == (~~(19))) ? 1 : 0))) { __pc = 8588; break; }
				
				var local1_F_2008 = 0;
				case 8593:
					local1_F_2008 = 0;
					
				
				var local17___SelectHelper11__2009 = 0;
				case 8604:
					local17___SelectHelper11__2009 = global5_Exprs_ref[0].arrAccess(param4_expr.attr4_expr).values[tmpPositionCache][0].attr3_Typ;
					
				case 8623:
					if (!((((local17___SelectHelper11__2009) == (~~(3))) ? 1 : 0))) { __pc = 8606; break; }
				
				case 8610:
					local1_F_2008 = 1;
					
				
				
			case 8606: //dummy jumper1
				if (!((((local17___SelectHelper11__2009) == (~~(4))) ? 1 : 0))) { __pc = 8612; break; }
				
				case 8616:
					local1_F_2008 = 1;
					
				
				
			case 8612: //dummy jumper1
				if (!((((local17___SelectHelper11__2009) == (~~(5))) ? 1 : 0))) { __pc = 8618; break; }
				
				case 8622:
					local1_F_2008 = 1;
					
				
				
			case 8618: //dummy jumper1
				;
					
				
				;
				case 8650:
					if (!(local1_F_2008)) { __pc = 8625; break; }
				
				case 8636:
					local8_Text_Str_1956 = ((((local8_Text_Str_1956) + ("return "))) + (func14_JSTryUnref_Str(param4_expr.attr4_expr)));
					
				
				__pc = 28725;
				break;
				
			case 8625: //dummy jumper1
				
				case 8649:
					local8_Text_Str_1956 = ((((((local8_Text_Str_1956) + ("return tryClone("))) + (func14_JSTryUnref_Str(param4_expr.attr4_expr)))) + (")"));
					
				
				
			case 28725: //dummy jumper2
				;
					
				
				__pc = 28672;
				break;
				
			case 8588: //dummy jumper1
				if (!((((local16___SelectHelper7__1957) == (~~(22))) ? 1 : 0))) { __pc = 8652; break; }
				
				var local8_Name_Str_2010 = "", local5_Found_2011 = 0;
				case 8663:
					local8_Name_Str_2010 = REPLACE_Str(unref(param4_expr.attr8_datatype.attr8_Name_Str_ref[0]), "$", "_Str");
					
				case 8692:
					var forEachSaver8692 = global8_Compiler.attr5_Funcs_ref[0];
				var forEachCounter8692 = 0
				
			case 8671: //dummy for1
				if (!(forEachCounter8692 < forEachSaver8692.values.length)) {__pc = 8667; break;}
				var local4_Func_ref_2012 = forEachSaver8692.values[forEachCounter8692];
				
				
				case 8691:
					if (!((((local4_Func_ref_2012[0].attr9_OName_Str) == (local8_Name_Str_2010)) ? 1 : 0))) { __pc = 8678; break; }
				
				case 8686:
					local8_Text_Str_1956 = ((local8_Text_Str_1956) + (local4_Func_ref_2012[0].attr8_Name_Str));
					
				local5_Found_2011 = 1;
				case 8690:
					__pc = 8667; break;
					
				
				
			case 8678: //dummy jumper1
				;
					
				
				forEachSaver8692.values[forEachCounter8692] = local4_Func_ref_2012;
				
				forEachCounter8692++
				__pc = 8671; break; //back jump
				
			case 8667: //dummy for
				;
					
				case 8702:
					if (!(((local5_Found_2011) ? 0 : 1))) { __pc = 8695; break; }
				
				case 8701:
					local8_Text_Str_1956 = ((local8_Text_Str_1956) + (local8_Name_Str_2010));
					
				
				
			case 8695: //dummy jumper1
				;
					
				
				__pc = 28672;
				break;
				
			case 8652: //dummy jumper1
				if (!((((local16___SelectHelper7__1957) == (~~(24))) ? 1 : 0))) { __pc = 8704; break; }
				
				case 8967:
					if (!(global8_IsInGoto)) { __pc = 8707; break; }
				
				var local5_dummy_2013 = 0;
				case 8711:
					local5_dummy_2013 = global11_LastDummyID;
					
				global11_LastDummyID+=1;
				
				var local1_i_2014 = 0.0;
				case 8828:
					local1_i_2014 = 0
				
			case 8720: //dummy for1
				if (!toCheck(local1_i_2014, ((BOUNDS(param4_expr.attr10_Conditions, 0)) - (1)), 1)) {__pc = 8731; break;}
				
				case 8761:
					local8_Text_Str_1956 = ((((((((((((local8_Text_Str_1956) + ("if (!("))) + (func23_ConditionJSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr10_Conditions.arrAccess(~~(local1_i_2014)).values[tmpPositionCache]).values[tmpPositionCache][0]))))) + (")) { __pc = "))) + (CAST2STRING(param4_expr.attr10_Conditions.arrAccess(~~(local1_i_2014)).values[tmpPositionCache])))) + ("; break; }"))) + (func11_NewLine_Str()));
					
				local8_Text_Str_1956 = ((local8_Text_Str_1956) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr6_Scopes.arrAccess(~~(local1_i_2014)).values[tmpPositionCache]).values[tmpPositionCache][0]))));
				case 8803:
					if (!((((param4_expr.attr9_elseScope) != (-(1))) ? 1 : 0))) { __pc = 8782; break; }
				
				case 8795:
					local8_Text_Str_1956 = ((((((((local8_Text_Str_1956) + ("__pc = "))) + (CAST2STRING(local5_dummy_2013)))) + (";"))) + (func11_NewLine_Str()));
					
				local8_Text_Str_1956 = ((((local8_Text_Str_1956) + ("break;"))) + (func11_NewLine_Str()));
				
				
			case 8782: //dummy jumper1
				;
					
				func10_IndentDown();
				local8_Text_Str_1956 = ((local8_Text_Str_1956) + (func11_NewLine_Str()));
				func8_IndentUp();
				local8_Text_Str_1956 = ((((((((local8_Text_Str_1956) + ("case "))) + (CAST2STRING(param4_expr.attr10_Conditions.arrAccess(~~(local1_i_2014)).values[tmpPositionCache])))) + (": //dummy jumper1"))) + (func11_NewLine_Str()));
				
				local1_i_2014 += 1;
				__pc = 8720; break; //back jump
				
			case 8731: //dummy for
				;
					
				
				;
				case 8867:
					if (!((((param4_expr.attr9_elseScope) != (-(1))) ? 1 : 0))) { __pc = 8836; break; }
				
				case 8847:
					local8_Text_Str_1956 = ((local8_Text_Str_1956) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr9_elseScope).values[tmpPositionCache][0]))));
					
				func10_IndentDown();
				local8_Text_Str_1956 = ((local8_Text_Str_1956) + (func11_NewLine_Str()));
				func8_IndentUp();
				local8_Text_Str_1956 = ((((((((local8_Text_Str_1956) + ("case "))) + (CAST2STRING(local5_dummy_2013)))) + (": //dummy jumper2"))) + (func11_NewLine_Str()));
				
				
			case 8836: //dummy jumper1
				;
					
				
				__pc = 28728;
				break;
				
			case 8707: //dummy jumper1
				
				var local8_IsSwitch_2015 = 0;
				case 8872:
					local8_IsSwitch_2015 = 0;
					
				case 8966:
					if (!(local8_IsSwitch_2015)) { __pc = 8875; break; }
				
				
				__pc = 28731;
				break;
				
			case 8875: //dummy jumper1
				
				case 8878:
					
				var local1_i_2016 = 0.0;
				case 8943:
					local1_i_2016 = 0
				
			case 8882: //dummy for1
				if (!toCheck(local1_i_2016, ((BOUNDS(param4_expr.attr10_Conditions, 0)) - (1)), 1)) {__pc = 8893; break;}
				
				case 8912:
					if (!((((local1_i_2016) == (0)) ? 1 : 0))) { __pc = 8899; break; }
				
				case 8905:
					local8_Text_Str_1956 = ((local8_Text_Str_1956) + ("if"));
					
				
				__pc = 28732;
				break;
				
			case 8899: //dummy jumper1
				
				case 8911:
					local8_Text_Str_1956 = ((local8_Text_Str_1956) + (" else if"));
					
				
				
			case 28732: //dummy jumper2
				;
					
				local8_Text_Str_1956 = ((((((local8_Text_Str_1956) + (" ("))) + (func23_ConditionJSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr10_Conditions.arrAccess(~~(local1_i_2016)).values[tmpPositionCache]).values[tmpPositionCache][0]))))) + (") "));
				local8_Text_Str_1956 = ((local8_Text_Str_1956) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr6_Scopes.arrAccess(~~(local1_i_2016)).values[tmpPositionCache]).values[tmpPositionCache][0]))));
				
				local1_i_2016 += 1;
				__pc = 8882; break; //back jump
				
			case 8893: //dummy for
				;
					
				
				;
					
				case 8965:
					if (!((((param4_expr.attr9_elseScope) != (-(1))) ? 1 : 0))) { __pc = 8951; break; }
				
				case 8964:
					local8_Text_Str_1956 = ((((local8_Text_Str_1956) + (" else "))) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr9_elseScope).values[tmpPositionCache][0]))));
					
				
				
			case 8951: //dummy jumper1
				;
					
				
				
			case 28731: //dummy jumper2
				;
					
				
				
			case 28728: //dummy jumper2
				;
					
				
				__pc = 28672;
				break;
				
			case 8704: //dummy jumper1
				if (!((((local16___SelectHelper7__1957) == (~~(25))) ? 1 : 0))) { __pc = 8969; break; }
				
				case 9088:
					if (!(global8_IsInGoto)) { __pc = 8972; break; }
				
				var local6_TmpBID_2017 = 0, local6_TmpCID_2018 = 0;
				case 8976:
					local6_TmpBID_2017 = global11_LoopBreakID;
					
				local6_TmpCID_2018 = global14_LoopContinueID;
				global11_LoopBreakID = global11_LastDummyID;
				global14_LoopContinueID = param4_expr.attr2_ID;
				global11_LastDummyID+=1;
				local8_Text_Str_1956 = ((((((((((((local8_Text_Str_1956) + ("if (!("))) + (func23_ConditionJSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr4_expr).values[tmpPositionCache][0]))))) + (")) {__pc = "))) + (CAST2STRING(global11_LoopBreakID)))) + ("; break;}"))) + (func11_NewLine_Str()));
				local8_Text_Str_1956 = ((local8_Text_Str_1956) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr3_Scp).values[tmpPositionCache][0]))));
				local8_Text_Str_1956 = ((((((((local8_Text_Str_1956) + ("__pc = "))) + (CAST2STRING(param4_expr.attr2_ID)))) + ("; break; //back jump"))) + (func11_NewLine_Str()));
				func10_IndentDown();
				local8_Text_Str_1956 = ((local8_Text_Str_1956) + (func11_NewLine_Str()));
				func8_IndentUp();
				local8_Text_Str_1956 = ((((((((local8_Text_Str_1956) + ("case "))) + (CAST2STRING(global11_LoopBreakID)))) + (":"))) + (func11_NewLine_Str()));
				global11_LoopBreakID = local6_TmpBID_2017;
				global14_LoopContinueID = local6_TmpCID_2018;
				
				__pc = 28734;
				break;
				
			case 8972: //dummy jumper1
				
				case 9077:
					local8_Text_Str_1956 = ((((((local8_Text_Str_1956) + ("while ("))) + (func23_ConditionJSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr4_expr).values[tmpPositionCache][0]))))) + (") "));
					
				local8_Text_Str_1956 = ((local8_Text_Str_1956) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr3_Scp).values[tmpPositionCache][0]))));
				
				
			case 28734: //dummy jumper2
				;
					
				
				__pc = 28672;
				break;
				
			case 8969: //dummy jumper1
				if (!((((local16___SelectHelper7__1957) == (~~(26))) ? 1 : 0))) { __pc = 9090; break; }
				
				case 9214:
					if (!(global8_IsInGoto)) { __pc = 9093; break; }
				
				var local6_TmpBID_2019 = 0, local6_TmpCID_2020 = 0;
				case 9097:
					local6_TmpBID_2019 = global11_LoopBreakID;
					
				local6_TmpCID_2020 = global14_LoopContinueID;
				global11_LoopBreakID = global11_LastDummyID;
				global14_LoopContinueID = param4_expr.attr2_ID;
				global11_LastDummyID+=1;
				local8_Text_Str_1956 = ((local8_Text_Str_1956) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr3_Scp).values[tmpPositionCache][0]))));
				local8_Text_Str_1956 = ((((((((((((local8_Text_Str_1956) + ("if ("))) + (func23_ConditionJSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr4_expr).values[tmpPositionCache][0]))))) + (") {__pc = "))) + (CAST2STRING(global11_LoopBreakID)))) + ("; break;}"))) + (func11_NewLine_Str()));
				local8_Text_Str_1956 = ((((((((local8_Text_Str_1956) + ("__pc = "))) + (CAST2STRING(param4_expr.attr2_ID)))) + ("; break; //back jump"))) + (func11_NewLine_Str()));
				func10_IndentDown();
				local8_Text_Str_1956 = ((local8_Text_Str_1956) + (func11_NewLine_Str()));
				func8_IndentUp();
				local8_Text_Str_1956 = ((((((((local8_Text_Str_1956) + ("case "))) + (CAST2STRING(global11_LoopBreakID)))) + (": //dummy repeat"))) + (func11_NewLine_Str()));
				global11_LoopBreakID = local6_TmpBID_2019;
				global14_LoopContinueID = local6_TmpCID_2020;
				
				__pc = 28735;
				break;
				
			case 9093: //dummy jumper1
				
				case 9189:
					local8_Text_Str_1956 = ((local8_Text_Str_1956) + ("do "));
					
				local8_Text_Str_1956 = ((local8_Text_Str_1956) + (func23_ConditionJSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr3_Scp).values[tmpPositionCache][0]))));
				local8_Text_Str_1956 = ((((((local8_Text_Str_1956) + (" while (!("))) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr4_expr).values[tmpPositionCache][0]))))) + ("))"));
				
				
			case 28735: //dummy jumper2
				;
					
				
				__pc = 28672;
				break;
				
			case 9090: //dummy jumper1
				if (!((((local16___SelectHelper7__1957) == (~~(27))) ? 1 : 0))) { __pc = 9216; break; }
				
				var local13_CheckComm_Str_2021 = "";
				case 9231:
					if (!(param4_expr.attr5_hasTo)) { __pc = 9222; break; }
				
				case 9226:
					local13_CheckComm_Str_2021 = "toCheck";
					
				
				__pc = 28736;
				break;
				
			case 9222: //dummy jumper1
				
				case 9230:
					local13_CheckComm_Str_2021 = "untilCheck";
					
				
				
			case 28736: //dummy jumper2
				;
					
				case 9495:
					if (!(global8_IsInGoto)) { __pc = 9233; break; }
				
				var local6_TmpBID_2022 = 0, local6_TmpCID_2023 = 0;
				case 9237:
					local6_TmpBID_2022 = global11_LoopBreakID;
					
				local6_TmpCID_2023 = global14_LoopContinueID;
				global11_LoopBreakID = param4_expr.attr8_stepExpr;
				global14_LoopContinueID = param4_expr.attr7_varExpr;
				local8_Text_Str_1956 = ((((local8_Text_Str_1956) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr7_varExpr).values[tmpPositionCache][0]))))) + (func11_NewLine_Str()));
				func10_IndentDown();
				local8_Text_Str_1956 = ((local8_Text_Str_1956) + (func11_NewLine_Str()));
				func8_IndentUp();
				local8_Text_Str_1956 = ((((((((local8_Text_Str_1956) + ("case "))) + (CAST2STRING(param4_expr.attr7_varExpr)))) + (": //dummy for1"))) + (func11_NewLine_Str()));
				local8_Text_Str_1956 = ((((((((((((((((((((((((local8_Text_Str_1956) + ("if (!"))) + (local13_CheckComm_Str_2021))) + ("("))) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(global5_Exprs_ref[0].arrAccess(param4_expr.attr7_varExpr).values[tmpPositionCache][0].attr4_vari).values[tmpPositionCache][0]))))) + (", "))) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr6_toExpr).values[tmpPositionCache][0]))))) + (", "))) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr8_stepExpr).values[tmpPositionCache][0]))))) + (")) {__pc = "))) + (CAST2STRING(param4_expr.attr8_stepExpr)))) + ("; break;}"))) + (func11_NewLine_Str()));
				local8_Text_Str_1956 = ((local8_Text_Str_1956) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr3_Scp).values[tmpPositionCache][0]))));
				local8_Text_Str_1956 = ((((((((((local8_Text_Str_1956) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(global5_Exprs_ref[0].arrAccess(param4_expr.attr7_varExpr).values[tmpPositionCache][0].attr4_vari).values[tmpPositionCache][0]))))) + (" += "))) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr8_stepExpr).values[tmpPositionCache][0]))))) + (";"))) + (func11_NewLine_Str()));
				local8_Text_Str_1956 = ((((((((local8_Text_Str_1956) + ("__pc = "))) + (CAST2STRING(param4_expr.attr7_varExpr)))) + ("; break; //back jump"))) + (func11_NewLine_Str()));
				func10_IndentDown();
				local8_Text_Str_1956 = ((local8_Text_Str_1956) + (func11_NewLine_Str()));
				func8_IndentUp();
				local8_Text_Str_1956 = ((((((((local8_Text_Str_1956) + ("case "))) + (CAST2STRING(param4_expr.attr8_stepExpr)))) + (": //dummy for"))) + (func11_NewLine_Str()));
				global11_LoopBreakID = local6_TmpBID_2022;
				global14_LoopContinueID = local6_TmpCID_2023;
				
				__pc = 28737;
				break;
				
			case 9233: //dummy jumper1
				
				case 9484:
					local8_Text_Str_1956 = ((((((((((((((((((((((((((((((local8_Text_Str_1956) + ("for ("))) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr7_varExpr).values[tmpPositionCache][0]))))) + (";"))) + (local13_CheckComm_Str_2021))) + ("("))) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(global5_Exprs_ref[0].arrAccess(param4_expr.attr7_varExpr).values[tmpPositionCache][0].attr4_vari).values[tmpPositionCache][0]))))) + (", "))) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr6_toExpr).values[tmpPositionCache][0]))))) + (", "))) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr8_stepExpr).values[tmpPositionCache][0]))))) + (");"))) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(global5_Exprs_ref[0].arrAccess(param4_expr.attr7_varExpr).values[tmpPositionCache][0].attr4_vari).values[tmpPositionCache][0]))))) + (" += "))) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr8_stepExpr).values[tmpPositionCache][0]))))) + (") "));
					
				local8_Text_Str_1956 = ((local8_Text_Str_1956) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr3_Scp).values[tmpPositionCache][0]))));
				
				
			case 28737: //dummy jumper2
				;
					
				
				__pc = 28672;
				break;
				
			case 9216: //dummy jumper1
				if (!((((local16___SelectHelper7__1957) == (~~(38))) ? 1 : 0))) { __pc = 9497; break; }
				
				var local1_c_2024 = 0, local11_varName_Str_2025 = "", local13_StartText_Str_2026 = "", local12_CondText_Str_2027 = "", local11_IncText_Str_2028 = "", local13_EachBegin_Str_2029 = "", local11_EachEnd_Str_2030 = "";
				case 9503:
					global14_ForEachCounter = param4_expr.attr2_ID;
					
				local1_c_2024 = global14_ForEachCounter;
				local8_Text_Str_1956 = ((((((((((((local8_Text_Str_1956) + ("var forEachSaver"))) + (CAST2STRING(local1_c_2024)))) + (" = "))) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr6_inExpr).values[tmpPositionCache][0]))))) + (";"))) + (func11_NewLine_Str()));
				local11_varName_Str_2025 = func16_JSRemoveLast_Str(func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr7_varExpr).values[tmpPositionCache][0])), "[0]");
				local13_StartText_Str_2026 = (((("var forEachCounter") + (CAST2STRING(local1_c_2024)))) + (" = 0"));
				local12_CondText_Str_2027 = (((((((("forEachCounter") + (CAST2STRING(local1_c_2024)))) + (" < forEachSaver"))) + (CAST2STRING(local1_c_2024)))) + (".values.length"));
				local11_IncText_Str_2028 = (((("forEachCounter") + (CAST2STRING(local1_c_2024)))) + ("++"));
				local13_EachBegin_Str_2029 = (((((((((((((("var ") + (local11_varName_Str_2025))) + (" = forEachSaver"))) + (CAST2STRING(local1_c_2024)))) + (".values[forEachCounter"))) + (CAST2STRING(local1_c_2024)))) + ("];"))) + (func11_NewLine_Str()));
				local11_EachEnd_Str_2030 = (((((((((((((("forEachSaver") + (CAST2STRING(local1_c_2024)))) + (".values[forEachCounter"))) + (CAST2STRING(local1_c_2024)))) + ("] = "))) + (local11_varName_Str_2025))) + (";"))) + (func11_NewLine_Str()));
				case 9801:
					if (!(global8_IsInGoto)) { __pc = 9612; break; }
				
				var local6_TmpBID_2031 = 0, local6_TmpCID_2032 = 0;
				case 9616:
					local6_TmpBID_2031 = global11_LoopBreakID;
					
				local6_TmpCID_2032 = global14_LoopContinueID;
				global11_LoopBreakID = param4_expr.attr7_varExpr;
				global14_LoopContinueID = param4_expr.attr6_inExpr;
				local8_Text_Str_1956 = ((((local8_Text_Str_1956) + (local13_StartText_Str_2026))) + (func11_NewLine_Str()));
				func10_IndentDown();
				local8_Text_Str_1956 = ((local8_Text_Str_1956) + (func11_NewLine_Str()));
				func8_IndentUp();
				local8_Text_Str_1956 = ((((((((local8_Text_Str_1956) + ("case "))) + (CAST2STRING(param4_expr.attr6_inExpr)))) + (": //dummy for1"))) + (func11_NewLine_Str()));
				local8_Text_Str_1956 = ((((((((((((local8_Text_Str_1956) + ("if (!("))) + (local12_CondText_Str_2027))) + (")) {__pc = "))) + (CAST2STRING(param4_expr.attr7_varExpr)))) + ("; break;}"))) + (func11_NewLine_Str()));
				local8_Text_Str_1956 = ((((local8_Text_Str_1956) + (local13_EachBegin_Str_2029))) + (func11_NewLine_Str()));
				local8_Text_Str_1956 = ((local8_Text_Str_1956) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr3_Scp).values[tmpPositionCache][0]))));
				local8_Text_Str_1956 = ((((local8_Text_Str_1956) + (local11_EachEnd_Str_2030))) + (func11_NewLine_Str()));
				local8_Text_Str_1956 = ((((local8_Text_Str_1956) + (local11_IncText_Str_2028))) + (func11_NewLine_Str()));
				local8_Text_Str_1956 = ((((((((local8_Text_Str_1956) + ("__pc = "))) + (CAST2STRING(param4_expr.attr6_inExpr)))) + ("; break; //back jump"))) + (func11_NewLine_Str()));
				func10_IndentDown();
				local8_Text_Str_1956 = ((local8_Text_Str_1956) + (func11_NewLine_Str()));
				func8_IndentUp();
				local8_Text_Str_1956 = ((((((((local8_Text_Str_1956) + ("case "))) + (CAST2STRING(param4_expr.attr7_varExpr)))) + (": //dummy for"))) + (func11_NewLine_Str()));
				global11_LoopBreakID = local6_TmpBID_2031;
				global14_LoopContinueID = local6_TmpCID_2032;
				
				__pc = 28738;
				break;
				
			case 9612: //dummy jumper1
				
				case 9751:
					func8_IndentUp();
					
				local8_Text_Str_1956 = ((((((((((((((((local8_Text_Str_1956) + ("for("))) + (local13_StartText_Str_2026))) + (" ; "))) + (local12_CondText_Str_2027))) + (" ; "))) + (local11_IncText_Str_2028))) + (") {"))) + (func11_NewLine_Str()));
				local8_Text_Str_1956 = ((local8_Text_Str_1956) + (local13_EachBegin_Str_2029));
				local8_Text_Str_1956 = ((((local8_Text_Str_1956) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr3_Scp).values[tmpPositionCache][0]))))) + (func11_NewLine_Str()));
				local8_Text_Str_1956 = ((local8_Text_Str_1956) + (local11_EachEnd_Str_2030));
				func10_IndentDown();
				local8_Text_Str_1956 = ((((local8_Text_Str_1956) + (func11_NewLine_Str()))) + ("}"));
				
				
			case 28738: //dummy jumper2
				;
					
				
				__pc = 28672;
				break;
				
			case 9497: //dummy jumper1
				if (!((((local16___SelectHelper7__1957) == (~~(30))) ? 1 : 0))) { __pc = 9803; break; }
				
				case 9824:
					if (!(global8_IsInGoto)) { __pc = 9806; break; }
				
				case 9817:
					local8_Text_Str_1956 = ((((((local8_Text_Str_1956) + ("__pc = "))) + (CAST2STRING(global14_LoopContinueID)))) + ("; break"));
					
				
				__pc = 28739;
				break;
				
			case 9806: //dummy jumper1
				
				case 9823:
					local8_Text_Str_1956 = ((local8_Text_Str_1956) + ("continue"));
					
				
				
			case 28739: //dummy jumper2
				;
					
				
				__pc = 28672;
				break;
				
			case 9803: //dummy jumper1
				if (!((((local16___SelectHelper7__1957) == (~~(29))) ? 1 : 0))) { __pc = 9826; break; }
				
				case 9847:
					if (!(global8_IsInGoto)) { __pc = 9829; break; }
				
				case 9840:
					local8_Text_Str_1956 = ((((((local8_Text_Str_1956) + ("__pc = "))) + (CAST2STRING(global11_LoopBreakID)))) + ("; break"));
					
				
				__pc = 28740;
				break;
				
			case 9829: //dummy jumper1
				
				case 9846:
					local8_Text_Str_1956 = ((local8_Text_Str_1956) + ("break"));
					
				
				
			case 28740: //dummy jumper2
				;
					
				
				__pc = 28672;
				break;
				
			case 9826: //dummy jumper1
				if (!((((local16___SelectHelper7__1957) == (~~(31))) ? 1 : 0))) { __pc = 9849; break; }
				
				var local9_oIsInGoto_2033 = 0;
				case 9853:
					local9_oIsInGoto_2033 = global8_IsInGoto;
					
				global8_IsInGoto = 0;
				local8_Text_Str_1956 = ((local8_Text_Str_1956) + ("try "));
				local8_Text_Str_1956 = ((local8_Text_Str_1956) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr3_Scp).values[tmpPositionCache][0]))));
				func8_IndentUp();
				local8_Text_Str_1956 = ((((((((local8_Text_Str_1956) + (" catch ("))) + (global8_Compiler.attr5_Varis_ref[0].arrAccess(param4_expr.attr4_vari).values[tmpPositionCache][0].attr8_Name_Str))) + (") {"))) + (func11_NewLine_Str()));
				local8_Text_Str_1956 = ((((((((((((((((((local8_Text_Str_1956) + ("if ("))) + (global8_Compiler.attr5_Varis_ref[0].arrAccess(param4_expr.attr4_vari).values[tmpPositionCache][0].attr8_Name_Str))) + (" instanceof GLBException) "))) + (global8_Compiler.attr5_Varis_ref[0].arrAccess(param4_expr.attr4_vari).values[tmpPositionCache][0].attr8_Name_Str))) + (" = "))) + (global8_Compiler.attr5_Varis_ref[0].arrAccess(param4_expr.attr4_vari).values[tmpPositionCache][0].attr8_Name_Str))) + (".getText(); else throwError("))) + (global8_Compiler.attr5_Varis_ref[0].arrAccess(param4_expr.attr4_vari).values[tmpPositionCache][0].attr8_Name_Str))) + (");"));
				local8_Text_Str_1956 = ((local8_Text_Str_1956) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr8_catchScp).values[tmpPositionCache][0]))));
				func10_IndentDown();
				local8_Text_Str_1956 = ((((local8_Text_Str_1956) + (func11_NewLine_Str()))) + ("}"));
				global8_IsInGoto = local9_oIsInGoto_2033;
				
				__pc = 28672;
				break;
				
			case 9849: //dummy jumper1
				if (!((((local16___SelectHelper7__1957) == (~~(32))) ? 1 : 0))) { __pc = 9969; break; }
				
				case 10009:
					local8_Text_Str_1956 = ((((((((((((((local8_Text_Str_1956) + ("throw new GLBException("))) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr4_expr).values[tmpPositionCache][0]))))) + (", \""))) + (global8_Compiler.attr6_Tokens.arrAccess(param4_expr.attr5_tokID).values[tmpPositionCache].attr8_Path_Str_ref[0]))) + ("\", "))) + (CAST2STRING(global8_Compiler.attr6_Tokens.arrAccess(param4_expr.attr5_tokID).values[tmpPositionCache].attr4_Line_ref[0])))) + (")"));
					
				
				__pc = 28672;
				break;
				
			case 9969: //dummy jumper1
				if (!((((local16___SelectHelper7__1957) == (~~(33))) ? 1 : 0))) { __pc = 10011; break; }
				
				case 10023:
					local8_Text_Str_1956 = ((((((local8_Text_Str_1956) + ("RESTORE(datablock_"))) + (param4_expr.attr8_Name_Str))) + (")"));
					
				
				__pc = 28672;
				break;
				
			case 10011: //dummy jumper1
				if (!((((local16___SelectHelper7__1957) == (~~(34))) ? 1 : 0))) { __pc = 10025; break; }
				
				var local1_i_2034 = 0.0;
				case 10030:
					local1_i_2034 = 0;
					
				case 10073:
					var forEachSaver10073 = param4_expr.attr5_Reads;
				var forEachCounter10073 = 0
				
			case 10037: //dummy for1
				if (!(forEachCounter10073 < forEachSaver10073.values.length)) {__pc = 10033; break;}
				var local1_R_2035 = forEachSaver10073.values[forEachCounter10073];
				
				
				case 10048:
					local8_Text_Str_1956 = ((((local8_Text_Str_1956) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(local1_R_2035).values[tmpPositionCache][0]))))) + (" = READ()"));
					
				case 10069:
					if (!((((local1_i_2034) < (((BOUNDS(param4_expr.attr5_Reads, 0)) - (1)))) ? 1 : 0))) { __pc = 10060; break; }
				
				case 10068:
					local8_Text_Str_1956 = ((((local8_Text_Str_1956) + (";"))) + (func11_NewLine_Str()));
					
				
				
			case 10060: //dummy jumper1
				;
					
				local1_i_2034+=1;
				
				forEachSaver10073.values[forEachCounter10073] = local1_R_2035;
				
				forEachCounter10073++
				__pc = 10037; break; //back jump
				
			case 10033: //dummy for
				;
					
				
				__pc = 28672;
				break;
				
			case 10025: //dummy jumper1
				if (!((((local16___SelectHelper7__1957) == (~~(35))) ? 1 : 0))) { __pc = 10075; break; }
				
				case 10086:
					local8_Text_Str_1956 = ((local8_Text_Str_1956) + (func21_JSGetDefaultValue_Str(param4_expr.attr8_datatype, 0, 0)));
					
				
				__pc = 28672;
				break;
				
			case 10075: //dummy jumper1
				if (!((((local16___SelectHelper7__1957) == (~~(36))) ? 1 : 0))) { __pc = 10088; break; }
				
				var local4_Find_2036 = 0;
				case 10094:
					local8_Text_Str_1956 = ((local8_Text_Str_1956) + ("DIM(new GLBArray(), ["));
					
				local4_Find_2036 = 0;
				case 10129:
					var forEachSaver10129 = param4_expr.attr4_dims;
				var forEachCounter10129 = 0
				
			case 10105: //dummy for1
				if (!(forEachCounter10129 < forEachSaver10129.values.length)) {__pc = 10101; break;}
				var local1_D_2037 = forEachSaver10129.values[forEachCounter10129];
				
				
				case 10117:
					if (!((((local4_Find_2036) == (1)) ? 1 : 0))) { __pc = 10110; break; }
				
				case 10116:
					local8_Text_Str_1956 = ((local8_Text_Str_1956) + (", "));
					
				
				
			case 10110: //dummy jumper1
				;
					
				local8_Text_Str_1956 = ((local8_Text_Str_1956) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(local1_D_2037).values[tmpPositionCache][0]))));
				local4_Find_2036 = 1;
				
				forEachSaver10129.values[forEachCounter10129] = local1_D_2037;
				
				forEachCounter10129++
				__pc = 10105; break; //back jump
				
			case 10101: //dummy for
				;
					
				local8_Text_Str_1956 = ((((((local8_Text_Str_1956) + ("], "))) + (func21_JSGetDefaultValue_Str(param4_expr.attr8_datatype, 1, 1)))) + (")"));
				
				__pc = 28672;
				break;
				
			case 10088: //dummy jumper1
				if (!((((local16___SelectHelper7__1957) == (~~(37))) ? 1 : 0))) { __pc = 10145; break; }
				
				case 10161:
					local8_Text_Str_1956 = ((((local8_Text_Str_1956) + (global8_Compiler.attr5_Varis_ref[0].arrAccess(param4_expr.attr4_vari).values[tmpPositionCache][0].attr8_Name_Str))) + (" = "));
					
				case 10217:
					if (!((((global5_Exprs_ref[0].arrAccess(param4_expr.attr4_expr).values[tmpPositionCache][0].attr3_Typ) == (54)) ? 1 : 0))) { __pc = 10171; break; }
				
				case 10204:
					local8_Text_Str_1956 = ((((((((((local8_Text_Str_1956) + ("castobj("))) + (func16_JSRemoveLast_Str(func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(global5_Exprs_ref[0].arrAccess(param4_expr.attr4_expr).values[tmpPositionCache][0].attr4_expr).values[tmpPositionCache][0])), "[0]")))) + (", "))) + (func18_ChangeTypeName_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr4_expr).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str_ref[0]))))) + (")"));
					
				
				__pc = 28743;
				break;
				
			case 10171: //dummy jumper1
				
				case 10216:
					local8_Text_Str_1956 = ((local8_Text_Str_1956) + (func16_JSRemoveLast_Str(func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr4_expr).values[tmpPositionCache][0])), "[0]")));
					
				
				
			case 28743: //dummy jumper2
				;
					
				local8_Text_Str_1956 = ((local8_Text_Str_1956) + (" /* ALIAS */"));
				
				__pc = 28672;
				break;
				
			case 10145: //dummy jumper1
				if (!((((local16___SelectHelper7__1957) == (~~(20))) ? 1 : 0))) { __pc = 10224; break; }
				
				case 10236:
					local8_Text_Str_1956 = ((((((local8_Text_Str_1956) + ("__pc = __labels[\""))) + (param4_expr.attr8_Name_Str))) + ("\"]; break"));
					
				
				__pc = 28672;
				break;
				
			case 10224: //dummy jumper1
				if (!((((local16___SelectHelper7__1957) == (~~(21))) ? 1 : 0))) { __pc = 10238; break; }
				
				case 10257:
					global12_LabelDef_Str = ((((((((((global12_LabelDef_Str) + ("\""))) + (param4_expr.attr8_Name_Str))) + ("\": "))) + (CAST2STRING(param4_expr.attr2_ID)))) + (", "));
					
				local8_Text_Str_1956 = ((((local8_Text_Str_1956) + ("//label: "))) + (param4_expr.attr8_Name_Str));
				
				__pc = 28672;
				break;
				
			case 10238: //dummy jumper1
				if (!((((local16___SelectHelper7__1957) == (~~(39))) ? 1 : 0))) { __pc = 10268; break; }
				
				case 10288:
					local8_Text_Str_1956 = ((((((local8_Text_Str_1956) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr4_vari).values[tmpPositionCache][0]))))) + ("+="))) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr4_expr).values[tmpPositionCache][0]))));
					
				
				__pc = 28672;
				break;
				
			case 10268: //dummy jumper1
				if (!((((local16___SelectHelper7__1957) == (~~(40))) ? 1 : 0))) { __pc = 10290; break; }
				
				case 10315:
					local8_Text_Str_1956 = ((((((((((local8_Text_Str_1956) + ("DIMPUSH("))) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr4_vari).values[tmpPositionCache][0]))))) + (", "))) + (func16_JSRemoveLast_Str(func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr4_expr).values[tmpPositionCache][0])), "[0]")))) + (")"));
					
				
				__pc = 28672;
				break;
				
			case 10290: //dummy jumper1
				if (!((((local16___SelectHelper7__1957) == (~~(41))) ? 1 : 0))) { __pc = 10317; break; }
				
				case 10366:
					if (!((((param4_expr.attr4_kern) != (-(1))) ? 1 : 0))) { __pc = 10326; break; }
				
				case 10350:
					local8_Text_Str_1956 = ((((((((((local8_Text_Str_1956) + ("KERNLEN("))) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr4_expr).values[tmpPositionCache][0]))))) + (", "))) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr4_kern).values[tmpPositionCache][0]))))) + (")"));
					
				
				__pc = 28744;
				break;
				
			case 10326: //dummy jumper1
				
				case 10365:
					local8_Text_Str_1956 = ((((((local8_Text_Str_1956) + ("("))) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr4_expr).values[tmpPositionCache][0]))))) + (").length"));
					
				
				
			case 28744: //dummy jumper2
				;
					
				
				__pc = 28672;
				break;
				
			case 10317: //dummy jumper1
				if (!((((local16___SelectHelper7__1957) == (~~(45))) ? 1 : 0))) { __pc = 10368; break; }
				
				case 10392:
					local8_Text_Str_1956 = ((((((((((local8_Text_Str_1956) + ("BOUNDS("))) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr5_array).values[tmpPositionCache][0]))))) + (", "))) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr8_position).values[tmpPositionCache][0]))))) + (")"));
					
				
				__pc = 28672;
				break;
				
			case 10368: //dummy jumper1
				if (!((((local16___SelectHelper7__1957) == (~~(42))) ? 1 : 0))) { __pc = 10394; break; }
				
				var local4_Find_2038 = 0;
				case 10409:
					local8_Text_Str_1956 = ((((((local8_Text_Str_1956) + ("DIMDATA("))) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr5_array).values[tmpPositionCache][0]))))) + (", ["));
					
				case 10438:
					var forEachSaver10438 = param4_expr.attr5_Exprs;
				var forEachCounter10438 = 0
				
			case 10416: //dummy for1
				if (!(forEachCounter10438 < forEachSaver10438.values.length)) {__pc = 10412; break;}
				var local4_Elem_2039 = forEachSaver10438.values[forEachCounter10438];
				
				
				case 10426:
					if (!(local4_Find_2038)) { __pc = 10419; break; }
				
				case 10425:
					local8_Text_Str_1956 = ((local8_Text_Str_1956) + (", "));
					
				
				
			case 10419: //dummy jumper1
				;
					
				local8_Text_Str_1956 = ((local8_Text_Str_1956) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(local4_Elem_2039).values[tmpPositionCache][0]))));
				local4_Find_2038 = 1;
				
				forEachSaver10438.values[forEachCounter10438] = local4_Elem_2039;
				
				forEachCounter10438++
				__pc = 10416; break; //back jump
				
			case 10412: //dummy for
				;
					
				local8_Text_Str_1956 = ((local8_Text_Str_1956) + ("])"));
				
				__pc = 28672;
				break;
				
			case 10394: //dummy jumper1
				if (!((((local16___SelectHelper7__1957) == (~~(43))) ? 1 : 0))) { __pc = 10445; break; }
				
				case 10453:
					local8_Text_Str_1956 = ((((local8_Text_Str_1956) + ("//DELETE!!111"))) + (func11_NewLine_Str()));
					
				local8_Text_Str_1956 = ((((((((((((((((local8_Text_Str_1956) + ("forEachSaver"))) + (CAST2STRING(global14_ForEachCounter)))) + (".values[forEachCounter"))) + (CAST2STRING(global14_ForEachCounter)))) + ("] = "))) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(global5_Exprs_ref[0].arrAccess(global14_ForEachCounter).values[tmpPositionCache][0].attr7_varExpr).values[tmpPositionCache][0]))))) + (";"))) + (func11_NewLine_Str()));
				local8_Text_Str_1956 = ((((((((((((local8_Text_Str_1956) + ("DIMDEL(forEachSaver"))) + (CAST2STRING(global14_ForEachCounter)))) + (", forEachCounter"))) + (CAST2STRING(global14_ForEachCounter)))) + (");"))) + (func11_NewLine_Str()));
				local8_Text_Str_1956 = ((((((((local8_Text_Str_1956) + ("forEachCounter"))) + (CAST2STRING(global14_ForEachCounter)))) + ("--;"))) + (func11_NewLine_Str()));
				local8_Text_Str_1956 = ((local8_Text_Str_1956) + ("continue"));
				
				__pc = 28672;
				break;
				
			case 10445: //dummy jumper1
				if (!((((local16___SelectHelper7__1957) == (~~(44))) ? 1 : 0))) { __pc = 10517; break; }
				
				case 10541:
					local8_Text_Str_1956 = ((((((((((local8_Text_Str_1956) + ("DIMDEL("))) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr5_array).values[tmpPositionCache][0]))))) + (", "))) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr8_position).values[tmpPositionCache][0]))))) + (")"));
					
				
				__pc = 28672;
				break;
				
			case 10517: //dummy jumper1
				if (!((((local16___SelectHelper7__1957) == (~~(46))) ? 1 : 0))) { __pc = 10543; break; }
				
				case 10558:
					local8_Text_Str_1956 = ((((((local8_Text_Str_1956) + ("(("))) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr4_expr).values[tmpPositionCache][0]))))) + (") ? 0 : 1)"));
					
				
				__pc = 28672;
				break;
				
			case 10543: //dummy jumper1
				if (!((((local16___SelectHelper7__1957) == (~~(48))) ? 1 : 0))) { __pc = 10560; break; }
				
				case 10574:
					local8_Text_Str_1956 = ((local8_Text_Str_1956) + (global8_Compiler.attr5_Funcs_ref[0].arrAccess(param4_expr.attr4_func).values[tmpPositionCache][0].attr8_Name_Str));
					
				
				__pc = 28672;
				break;
				
			case 10560: //dummy jumper1
				if (!((((local16___SelectHelper7__1957) == (~~(49))) ? 1 : 0))) { __pc = 10576; break; }
				
				var local8_Cond_Str_2040 = "";
				case 10585:
					local8_Cond_Str_2040 = func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr4_expr).values[tmpPositionCache][0]));
					
				local8_Text_Str_1956 = ((((((((((local8_Text_Str_1956) + ("if (!("))) + (local8_Cond_Str_2040))) + (")) throwError(\"AssertException "))) + (REPLACE_Str(local8_Cond_Str_2040, "\"", "'")))) + ("\")"));
				
				__pc = 28672;
				break;
				
			case 10576: //dummy jumper1
				if (!((((local16___SelectHelper7__1957) == (~~(50))) ? 1 : 0))) { __pc = 10604; break; }
				
				case 10619:
					local8_Text_Str_1956 = ((((((local8_Text_Str_1956) + ("DEBUG("))) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr4_expr).values[tmpPositionCache][0]))))) + (")"));
					
				
				__pc = 28672;
				break;
				
			case 10604: //dummy jumper1
				if (!((((local16___SelectHelper7__1957) == (~~(51))) ? 1 : 0))) { __pc = 10621; break; }
				
				case 10658:
					local8_Text_Str_1956 = ((((((((((((((local8_Text_Str_1956) + ("(("))) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr10_Conditions.arrAccess(0).values[tmpPositionCache]).values[tmpPositionCache][0]))))) + (") ? ("))) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr6_Scopes.arrAccess(0).values[tmpPositionCache]).values[tmpPositionCache][0]))))) + (") : ("))) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr9_elseScope).values[tmpPositionCache][0]))))) + ("))"));
					
				
				__pc = 28672;
				break;
				
			case 10621: //dummy jumper1
				if (!((((local16___SelectHelper7__1957) == (~~(52))) ? 1 : 0))) { __pc = 10660; break; }
				
				case 10672:
					local8_Text_Str_1956 = ((((((local8_Text_Str_1956) + ("//REQUIRE: "))) + (param4_expr.attr8_Name_Str))) + ("\n"));
					
				local8_Text_Str_1956 = ((((local8_Text_Str_1956) + (param4_expr.attr11_Content_Str))) + (func11_NewLine_Str()));
				local8_Text_Str_1956 = ((((((local8_Text_Str_1956) + ("//ENDREQUIRE: "))) + (param4_expr.attr8_Name_Str))) + (func11_NewLine_Str()));
				
				__pc = 28672;
				break;
				
			case 10660: //dummy jumper1
				if (!((((local16___SelectHelper7__1957) == (~~(53))) ? 1 : 0))) { __pc = 10694; break; }
				
				var local5_Found_2041 = 0, local3_Scp_2042 = 0;
				case 10699:
					local5_Found_2041 = 0;
					
				local3_Scp_2042 = global12_CurrentScope;
				case 10784:
					if (!((((((((((local3_Scp_2042) != (-(1))) ? 1 : 0)) && (((((((((global5_Exprs_ref[0].arrAccess(local3_Scp_2042).values[tmpPositionCache][0].attr6_ScpTyp) == (2)) ? 1 : 0)) || ((((global5_Exprs_ref[0].arrAccess(local3_Scp_2042).values[tmpPositionCache][0].attr6_ScpTyp) == (4)) ? 1 : 0))) ? 1 : 0)) ? 0 : 1))) ? 1 : 0)) && (((local5_Found_2041) ? 0 : 1))) ? 1 : 0))) {__pc = 28746; break;}
				
				var local5_Varis_2043 = new GLBArray();
				case 10740:
					func8_GetVaris(unref(local5_Varis_2043), local3_Scp_2042, 0);
					
				case 10776:
					var forEachSaver10776 = local5_Varis_2043;
				var forEachCounter10776 = 0
				
			case 10744: //dummy for1
				if (!(forEachCounter10776 < forEachSaver10776.values.length)) {__pc = 10742; break;}
				var local1_V_2044 = forEachSaver10776.values[forEachCounter10776];
				
				
				var alias3_Var_ref_2045 = [new type14_IdentifierVari()];
				case 10751:
					alias3_Var_ref_2045 = global8_Compiler.attr5_Varis_ref[0].arrAccess(local1_V_2044).values[tmpPositionCache] /* ALIAS */;
					
				case 10775:
					if (!((((alias3_Var_ref_2045[0].attr8_Name_Str) == ((("param4_self_") + (CAST2STRING(alias3_Var_ref_2045[0].attr2_ID))))) ? 1 : 0))) { __pc = 10762; break; }
				
				case 10770:
					local8_Text_Str_1956 = ((local8_Text_Str_1956) + (alias3_Var_ref_2045[0].attr8_Name_Str));
					
				local5_Found_2041 = 1;
				case 10774:
					__pc = 10742; break;
					
				
				
			case 10762: //dummy jumper1
				;
					
				
				forEachSaver10776.values[forEachCounter10776] = local1_V_2044;
				
				forEachCounter10776++
				__pc = 10744; break; //back jump
				
			case 10742: //dummy for
				;
					
				local3_Scp_2042 = global5_Exprs_ref[0].arrAccess(local3_Scp_2042).values[tmpPositionCache][0].attr10_SuperScope;
				
				__pc = 10784; break; //back jump
				
			case 28746:
				;
					
				case 10793:
					if (!(((local5_Found_2041) ? 0 : 1))) { __pc = 10787; break; }
				
				case 10792:
					func5_Error("Self not found for super", 1049, "JSGenerator.gbas");
					
				
				
			case 10787: //dummy jumper1
				;
					
				
				__pc = 28672;
				break;
				
			case 10694: //dummy jumper1
				if (!((((local16___SelectHelper7__1957) == (~~(54))) ? 1 : 0))) { __pc = 10795; break; }
				
				case 10819:
					local8_Text_Str_1956 = ((((((((((local8_Text_Str_1956) + ("castobj("))) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr4_expr).values[tmpPositionCache][0]))))) + (", "))) + (func18_ChangeTypeName_Str(unref(param4_expr.attr8_datatype.attr8_Name_Str_ref[0]))))) + (")"));
					
				
				__pc = 28672;
				break;
				
			case 10795: //dummy jumper1
				if (!((((local16___SelectHelper7__1957) == (~~(7))) ? 1 : 0))) { __pc = 10821; break; }
				
				
				__pc = 28672;
				break;
				
			case 10821: //dummy jumper1
				if (!((((local16___SelectHelper7__1957) == (~~(8))) ? 1 : 0))) { __pc = 10824; break; }
				
				case 10829:
					func5_Error("Invalid Expression", 1055, "JSGenerator.gbas");
					
				
				__pc = 28672;
				break;
				
			case 10824: //dummy jumper1
				
				case 10839:
					func5_Error((("Unknown expression type: ") + (CAST2STRING(param4_expr.attr3_Typ))), 1057, "JSGenerator.gbas");
					
				
				
			case 28672: //dummy jumper2
				;
					
				
				;
			return tryClone(local8_Text_Str_1956);
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
	var local5_unref_2048 = 0;
	local5_unref_2048 = 1;
	if (((global5_Exprs_ref[0].arrAccess(param4_Expr).values[tmpPositionCache][0].attr8_datatype.attr7_IsArray_ref[0]) ? 0 : 1)) {
		{
			var local17___SelectHelper12__2049 = 0;
			local17___SelectHelper12__2049 = global5_Exprs_ref[0].arrAccess(param4_Expr).values[tmpPositionCache][0].attr3_Typ;
			if ((((local17___SelectHelper12__2049) == (~~(3))) ? 1 : 0)) {
				local5_unref_2048 = 0;
				
			} else if ((((local17___SelectHelper12__2049) == (~~(4))) ? 1 : 0)) {
				local5_unref_2048 = 0;
				
			} else if ((((local17___SelectHelper12__2049) == (~~(5))) ? 1 : 0)) {
				local5_unref_2048 = 0;
				
			} else if ((((local17___SelectHelper12__2049) == (~~(15))) ? 1 : 0)) {
				local5_unref_2048 = func11_JSDoesUnref(global5_Exprs_ref[0].arrAccess(param4_Expr).values[tmpPositionCache][0].attr4_expr);
				
			} else if ((((local17___SelectHelper12__2049) == (~~(16))) ? 1 : 0)) {
				local5_unref_2048 = func11_JSDoesUnref(global5_Exprs_ref[0].arrAccess(param4_Expr).values[tmpPositionCache][0].attr4_expr);
				
			} else if ((((local17___SelectHelper12__2049) == (~~(17))) ? 1 : 0)) {
				local5_unref_2048 = func11_JSDoesUnref(global5_Exprs_ref[0].arrAccess(param4_Expr).values[tmpPositionCache][0].attr4_expr);
				
			} else if ((((local17___SelectHelper12__2049) == (~~(1))) ? 1 : 0)) {
				local5_unref_2048 = 0;
				
			} else if ((((local17___SelectHelper12__2049) == (~~(6))) ? 1 : 0)) {
				local5_unref_2048 = 0;
				
			} else if ((((local17___SelectHelper12__2049) == (~~(23))) ? 1 : 0)) {
				local5_unref_2048 = 0;
				
			} else if ((((local17___SelectHelper12__2049) == (~~(45))) ? 1 : 0)) {
				local5_unref_2048 = 0;
				
			} else if ((((local17___SelectHelper12__2049) == (~~(41))) ? 1 : 0)) {
				local5_unref_2048 = 0;
				
			} else {
				var local1_v_2050 = 0;
				local1_v_2050 = func11_GetVariable(param4_Expr, 0);
				if ((((local1_v_2050) != (-(1))) ? 1 : 0)) {
					if (((global8_Compiler.attr5_Varis_ref[0].arrAccess(local1_v_2050).values[tmpPositionCache][0].attr3_ref) ? 0 : 1)) {
						local5_unref_2048 = 0;
						
					};
					
				};
				
			};
			
		};
		
	};
	return tryClone(local5_unref_2048);
	return 0;
	
};
func11_JSDoesUnref = window['func11_JSDoesUnref'];
window['func17_JSDoParameter_Str'] = function(param4_expr, param4_func, param7_DoParam) {
	var local8_Text_Str_2054 = "", local1_i_2055 = 0.0;
	if (param7_DoParam) {
		local8_Text_Str_2054 = "(";
		
	};
	local1_i_2055 = 0;
	var forEachSaver11134 = param4_expr.attr6_Params;
	for(var forEachCounter11134 = 0 ; forEachCounter11134 < forEachSaver11134.values.length ; forEachCounter11134++) {
		var local5_param_2056 = forEachSaver11134.values[forEachCounter11134];
	{
			if ((((((((((param4_func) != (-(1))) ? 1 : 0)) && ((((global8_Compiler.attr5_Funcs_ref[0].arrAccess(param4_func).values[tmpPositionCache][0].attr3_Typ) == (3)) ? 1 : 0))) ? 1 : 0)) && ((((local1_i_2055) == (((BOUNDS(param4_expr.attr6_Params, 0)) - (1)))) ? 1 : 0))) ? 1 : 0)) {
				break;
				
			};
			if (local1_i_2055) {
				local8_Text_Str_2054 = ((local8_Text_Str_2054) + (", "));
				
			};
			if ((((((((((param4_func) != (-(1))) ? 1 : 0)) && (((global8_Compiler.attr5_Funcs_ref[0].arrAccess(param4_func).values[tmpPositionCache][0].attr15_UsedAsPrototype) ? 0 : 1))) ? 1 : 0)) && ((((global8_Compiler.attr5_Varis_ref[0].arrAccess(global8_Compiler.attr5_Funcs_ref[0].arrAccess(param4_func).values[tmpPositionCache][0].attr6_Params.arrAccess(~~(local1_i_2055)).values[tmpPositionCache]).values[tmpPositionCache][0].attr3_ref) == (0)) ? 1 : 0))) ? 1 : 0)) {
				local8_Text_Str_2054 = ((local8_Text_Str_2054) + (func14_JSTryUnref_Str(local5_param_2056)));
				
			} else {
				local8_Text_Str_2054 = ((local8_Text_Str_2054) + (func16_JSRemoveLast_Str(func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(local5_param_2056).values[tmpPositionCache][0])), "[0]")));
				
			};
			local1_i_2055+=1;
			
		}
		forEachSaver11134.values[forEachCounter11134] = local5_param_2056;
	
	};
	if (param7_DoParam) {
		local8_Text_Str_2054 = ((local8_Text_Str_2054) + (")"));
		
	};
	return tryClone(local8_Text_Str_2054);
	return "";
	
};
func17_JSDoParameter_Str = window['func17_JSDoParameter_Str'];
window['func13_JSVariDef_Str'] = function(param5_Varis, param12_ForceDefault, param8_NoStatic) {
	var local8_Text_Str_2060 = "", local4_Find_2061 = 0.0;
	local8_Text_Str_2060 = "";
	local4_Find_2061 = 0;
	var forEachSaver11281 = param5_Varis;
	for(var forEachCounter11281 = 0 ; forEachCounter11281 < forEachSaver11281.values.length ; forEachCounter11281++) {
		var local3_Var_2062 = forEachSaver11281.values[forEachCounter11281];
	{
			if ((((((((((global8_Compiler.attr5_Varis_ref[0].arrAccess(local3_Var_2062).values[tmpPositionCache][0].attr3_Typ) != (5)) ? 1 : 0)) && (((((((param8_NoStatic) == (0)) ? 1 : 0)) || ((((global8_Compiler.attr5_Varis_ref[0].arrAccess(local3_Var_2062).values[tmpPositionCache][0].attr3_Typ) != (4)) ? 1 : 0))) ? 1 : 0))) ? 1 : 0)) && (func17_JSShouldRedeclare(local3_Var_2062))) ? 1 : 0)) {
				if (local4_Find_2061) {
					local8_Text_Str_2060 = ((local8_Text_Str_2060) + (", "));
					
				};
				local8_Text_Str_2060 = ((((local8_Text_Str_2060) + (global8_Compiler.attr5_Varis_ref[0].arrAccess(local3_Var_2062).values[tmpPositionCache][0].attr8_Name_Str))) + (" = "));
				if (((((((global8_Compiler.attr5_Varis_ref[0].arrAccess(local3_Var_2062).values[tmpPositionCache][0].attr6_PreDef) != (-(1))) ? 1 : 0)) && (((((((param12_ForceDefault) == (0)) ? 1 : 0)) || ((((global8_Compiler.attr5_Varis_ref[0].arrAccess(local3_Var_2062).values[tmpPositionCache][0].attr3_Typ) == (6)) ? 1 : 0))) ? 1 : 0))) ? 1 : 0)) {
					local8_Text_Str_2060 = ((local8_Text_Str_2060) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(global8_Compiler.attr5_Varis_ref[0].arrAccess(local3_Var_2062).values[tmpPositionCache][0].attr6_PreDef).values[tmpPositionCache][0]))));
					
				} else {
					local8_Text_Str_2060 = ((local8_Text_Str_2060) + (func21_JSGetDefaultValue_Str(global8_Compiler.attr5_Varis_ref[0].arrAccess(local3_Var_2062).values[tmpPositionCache][0].attr8_datatype, global8_Compiler.attr5_Varis_ref[0].arrAccess(local3_Var_2062).values[tmpPositionCache][0].attr3_ref, 0)));
					
				};
				local4_Find_2061 = 1;
				
			};
			
		}
		forEachSaver11281.values[forEachCounter11281] = local3_Var_2062;
	
	};
	return tryClone(local8_Text_Str_2060);
	return "";
	
};
func13_JSVariDef_Str = window['func13_JSVariDef_Str'];
window['func23_ConditionJSGenerate_Str'] = function(param4_expr) {
	if ((((param4_expr.attr3_Typ) == (16)) ? 1 : 0)) {
		return tryClone(func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr4_expr).values[tmpPositionCache][0])));
		
	} else {
		return tryClone(func14_JSGenerate_Str(param4_expr));
		
	};
	return "";
	
};
func23_ConditionJSGenerate_Str = window['func23_ConditionJSGenerate_Str'];
window['func17_JSShouldRedeclare'] = function(param3_Var) {
	if ((((global11_CurrentFunc) != (-(1))) ? 1 : 0)) {
		var forEachSaver11336 = global8_Compiler.attr5_Funcs_ref[0].arrAccess(global11_CurrentFunc).values[tmpPositionCache][0].attr10_CopyParams;
		for(var forEachCounter11336 = 0 ; forEachCounter11336 < forEachSaver11336.values.length ; forEachCounter11336++) {
			var local1_P_2065 = forEachSaver11336.values[forEachCounter11336];
		{
				if ((((local1_P_2065) == (param3_Var)) ? 1 : 0)) {
					return tryClone(0);
					
				};
				
			}
			forEachSaver11336.values[forEachCounter11336] = local1_P_2065;
		
		};
		
	};
	return 1;
	return 0;
	
};
func17_JSShouldRedeclare = window['func17_JSShouldRedeclare'];
window['func21_JSGetDefaultValue_Str'] = function(param8_datatype, param3_Ref, param11_IgnoreArray) {
	var local10_RetVal_Str_2069 = "";
	local10_RetVal_Str_2069 = "";
	if ((((param8_datatype.attr7_IsArray_ref[0]) && ((((param11_IgnoreArray) == (0)) ? 1 : 0))) ? 1 : 0)) {
		local10_RetVal_Str_2069 = "new GLBArray()";
		
	} else {
		{
			var local17___SelectHelper13__2070 = "";
			local17___SelectHelper13__2070 = param8_datatype.attr8_Name_Str_ref[0];
			if ((((local17___SelectHelper13__2070) == ("int")) ? 1 : 0)) {
				local10_RetVal_Str_2069 = "0";
				
			} else if ((((local17___SelectHelper13__2070) == ("float")) ? 1 : 0)) {
				local10_RetVal_Str_2069 = "0.0";
				
			} else if ((((local17___SelectHelper13__2070) == ("string")) ? 1 : 0)) {
				local10_RetVal_Str_2069 = "\"\"";
				
			} else {
				if (func6_IsType(unref(param8_datatype.attr8_Name_Str_ref[0]))) {
					local10_RetVal_Str_2069 = (((("new ") + (global8_LastType.attr8_Name_Str))) + ("()"));
					
				} else {
					local10_RetVal_Str_2069 = REPLACE_Str(unref(param8_datatype.attr8_Name_Str_ref[0]), "$", "_Str");
					
				};
				
			};
			
		};
		
	};
	if (param3_Ref) {
		local10_RetVal_Str_2069 = (((("[") + (local10_RetVal_Str_2069))) + ("]"));
		
	};
	return tryClone(local10_RetVal_Str_2069);
	return "";
	
};
func21_JSGetDefaultValue_Str = window['func21_JSGetDefaultValue_Str'];
window['func16_JSRemoveLast_Str'] = function(param8_Text_Str, param5_L_Str) {
	if ((((((((param8_Text_Str).length) > ((param5_L_Str).length)) ? 1 : 0)) && ((((RIGHT_Str(param8_Text_Str, (param5_L_Str).length)) == (param5_L_Str)) ? 1 : 0))) ? 1 : 0)) {
		param8_Text_Str = LEFT_Str(param8_Text_Str, (((param8_Text_Str).length) - ((param5_L_Str).length)));
		
	};
	return tryClone(param8_Text_Str);
	return "";
	
};
func16_JSRemoveLast_Str = window['func16_JSRemoveLast_Str'];
window['func5_Lexer'] = function() {
	var local12_Splitter_Str_2073 = new GLBArray(), local11_SplitterMap_2074 = new type7_HashMap(), local9_LastFound_2076 = 0, local4_Line_2077 = 0, local15_LineContent_Str_2078 = "", local18_NewLineContent_Str_2079 = "", local8_Path_Str_2080 = "", local9_Character_2081 = 0, local5_WasNL_2095 = 0, local6_WasRem_2096 = 0, local6_HasDel_2097 = 0, local1_i_2101 = 0.0;
	REDIM(global8_Compiler.attr6_Tokens, [0], new type5_Token() );
	global8_Compiler.attr11_LastTokenID = 0;
	DIMDATA(local12_Splitter_Str_2073, [" ", "\t", "\n", "-", "+", "*", "/", "^", ",", "=", "<", ">", "|", "&", "[", "]", "(", ")", "!", "\"", "?", ";", ".", ":", CHR_Str(8), CHR_Str(12), "\r", "\f"]);
	(local11_SplitterMap_2074).SetSize(((BOUNDS(local12_Splitter_Str_2073, 0)) * (8)));
	var forEachSaver11521 = local12_Splitter_Str_2073;
	for(var forEachCounter11521 = 0 ; forEachCounter11521 < forEachSaver11521.values.length ; forEachCounter11521++) {
		var local9_Split_Str_2075 = forEachSaver11521.values[forEachCounter11521];
	{
			(local11_SplitterMap_2074).Put(local9_Split_Str_2075, 1);
			
		}
		forEachSaver11521.values[forEachCounter11521] = local9_Split_Str_2075;
	
	};
	global8_Compiler.attr8_Code_Str = (("\n") + (global8_Compiler.attr8_Code_Str));
	{
		var local1_i_2082 = 0;
		for (local1_i_2082 = 0;toCheck(local1_i_2082, (((global8_Compiler.attr8_Code_Str).length) - (1)), 1);local1_i_2082 += 1) {
			var local14_DoubleChar_Str_2083 = "", local11_curChar_Str_2086 = "", local15_TmpLineCont_Str_2087 = "";
			local9_Character_2081+=1;
			if ((((local1_i_2082) < ((((global8_Compiler.attr8_Code_Str).length) - (2)))) ? 1 : 0)) {
				local14_DoubleChar_Str_2083 = MID_Str(global8_Compiler.attr8_Code_Str, local1_i_2082, 2);
				
			};
			if ((((local14_DoubleChar_Str_2083) == ("//")) ? 1 : 0)) {
				var local8_Text_Str_2084 = "", local3_Pos_2085 = 0;
				local8_Text_Str_2084 = MID_Str(global8_Compiler.attr8_Code_Str, local9_LastFound_2076, ((local1_i_2082) - (local9_LastFound_2076)));
				if ((((TRIM_Str(local8_Text_Str_2084, " \t\r\n\v\f")) != ("")) ? 1 : 0)) {
					func11_CreateToken(local8_Text_Str_2084, local15_LineContent_Str_2078, local4_Line_2077, local9_Character_2081, local8_Path_Str_2080);
					
				};
				local3_Pos_2085 = local1_i_2082;
				while (((((((MID_Str(global8_Compiler.attr8_Code_Str, local1_i_2082, 1)) != ("\n")) ? 1 : 0)) && ((((MID_Str(global8_Compiler.attr8_Code_Str, local1_i_2082, 1)) != ("\f")) ? 1 : 0))) ? 1 : 0)) {
					local1_i_2082+=1;
					
				};
				local8_Text_Str_2084 = MID_Str(global8_Compiler.attr8_Code_Str, local3_Pos_2085, ((local1_i_2082) - (local3_Pos_2085)));
				if ((((((((local8_Text_Str_2084).length) > (("//$$RESETFILE").length)) ? 1 : 0)) && ((((LEFT_Str(local8_Text_Str_2084, ("//$$RESETFILE").length)) == ("//$$RESETFILE")) ? 1 : 0))) ? 1 : 0)) {
					local8_Text_Str_2084 = MID_Str(local8_Text_Str_2084, ((("//$$RESETFILE").length) + (1)), -(1));
					local8_Path_Str_2080 = local8_Text_Str_2084;
					local4_Line_2077 = 0;
					
				};
				local9_LastFound_2076 = local1_i_2082;
				
			};
			local11_curChar_Str_2086 = MID_Str(global8_Compiler.attr8_Code_Str, local1_i_2082, 1);
			local15_TmpLineCont_Str_2087 = local15_LineContent_Str_2078;
			if ((((local11_curChar_Str_2086) == ("\f")) ? 1 : 0)) {
				local11_curChar_Str_2086 = "\n";
				
			};
			{
				var local17___SelectHelper14__2088 = "";
				local17___SelectHelper14__2088 = local11_curChar_Str_2086;
				if ((((local17___SelectHelper14__2088) == ("\n")) ? 1 : 0)) {
					local9_Character_2081 = 0;
					local4_Line_2077+=1;
					{
						var local1_j_2089 = 0;
						for (local1_j_2089 = ((local1_i_2082) + (1));toCheck(local1_j_2089, (((global8_Compiler.attr8_Code_Str).length) - (1)), 1);local1_j_2089 += 1) {
							if (((((((MID_Str(global8_Compiler.attr8_Code_Str, local1_j_2089, 1)) == ("\n")) ? 1 : 0)) || ((((MID_Str(global8_Compiler.attr8_Code_Str, local1_j_2089, 1)) == ("\f")) ? 1 : 0))) ? 1 : 0)) {
								local15_TmpLineCont_Str_2087 = TRIM_Str(MID_Str(global8_Compiler.attr8_Code_Str, local1_i_2082, ((local1_j_2089) - (local1_i_2082))), " \t\r\n\v\f");
								if ((((RIGHT_Str(local15_TmpLineCont_Str_2087, 1)) == ("\f")) ? 1 : 0)) {
									local15_TmpLineCont_Str_2087 = ((MID_Str(local15_TmpLineCont_Str_2087, 0, (((local15_TmpLineCont_Str_2087).length) - (1)))) + ("\n"));
									
								};
								break;
								
							};
							
						};
						
					};
					
				} else if ((((local17___SelectHelper14__2088) == ("\"")) ? 1 : 0)) {
					var local12_WasBackSlash_2090 = 0, local10_WasWasBack_2091 = 0;
					local12_WasBackSlash_2090 = 0;
					local10_WasWasBack_2091 = 0;
					{
						var local1_j_2092 = 0;
						for (local1_j_2092 = ((local1_i_2082) + (1));toCheck(local1_j_2092, (((global8_Compiler.attr8_Code_Str).length) - (1)), 1);local1_j_2092 += 1) {
							if (((((((MID_Str(global8_Compiler.attr8_Code_Str, local1_j_2092, 1)) == ("\"")) ? 1 : 0)) && (((((((local12_WasBackSlash_2090) == (0)) ? 1 : 0)) || (local10_WasWasBack_2091)) ? 1 : 0))) ? 1 : 0)) {
								local1_i_2082 = local1_j_2092;
								break;
								
							};
							local10_WasWasBack_2091 = local12_WasBackSlash_2090;
							local12_WasBackSlash_2090 = 0;
							if ((((MID_Str(global8_Compiler.attr8_Code_Str, local1_j_2092, 1)) == ("\\")) ? 1 : 0)) {
								local12_WasBackSlash_2090 = 1;
								
							};
							
						};
						
					};
					continue;
					
				};
				
			};
			if ((local11_SplitterMap_2074).DoesKeyExist(local11_curChar_Str_2086)) {
				var local9_Split_Str_2093 = "", local8_Text_Str_2094 = "";
				local9_Split_Str_2093 = local11_curChar_Str_2086;
				local8_Text_Str_2094 = MID_Str(global8_Compiler.attr8_Code_Str, local9_LastFound_2076, ((local1_i_2082) - (local9_LastFound_2076)));
				if ((((local8_Text_Str_2094) == (";")) ? 1 : 0)) {
					local8_Text_Str_2094 = "\n";
					
				};
				func11_CreateToken(local8_Text_Str_2094, local15_LineContent_Str_2078, local4_Line_2077, local9_Character_2081, local8_Path_Str_2080);
				local8_Text_Str_2094 = MID_Str(global8_Compiler.attr8_Code_Str, local1_i_2082, (local9_Split_Str_2093).length);
				if ((((local8_Text_Str_2094) == (";")) ? 1 : 0)) {
					local8_Text_Str_2094 = "\n";
					
				};
				func11_CreateToken(local8_Text_Str_2094, local15_LineContent_Str_2078, local4_Line_2077, local9_Character_2081, local8_Path_Str_2080);
				local9_LastFound_2076 = ((local1_i_2082) + ((local9_Split_Str_2093).length));
				
			};
			local15_LineContent_Str_2078 = local15_TmpLineCont_Str_2087;
			
		};
		
	};
	func11_CreateToken("__EOFFILE__", "__EOFFILE__", local4_Line_2077, 0, local8_Path_Str_2080);
	func11_CreateToken("\n", "__EOFFILE__", local4_Line_2077, 0, local8_Path_Str_2080);
	local5_WasNL_2095 = 0;
	local6_WasRem_2096 = 0;
	local6_HasDel_2097 = 0;
	{
		var local1_i_2098 = 0.0;
		for (local1_i_2098 = 0;toCheck(local1_i_2098, ((global8_Compiler.attr11_LastTokenID) - (1)), 1);local1_i_2098 += 1) {
			var local8_Text_Str_2099 = "";
			if (local6_HasDel_2097) {
				local6_HasDel_2097 = 0;
				global8_Compiler.attr6_Tokens.arrAccess(~~(local1_i_2098)).values[tmpPositionCache].attr5_IsDel = 1;
				continue;
				
			};
			local8_Text_Str_2099 = global8_Compiler.attr6_Tokens.arrAccess(~~(local1_i_2098)).values[tmpPositionCache].attr8_Text_Str_ref[0];
			if ((((global8_Compiler.attr6_Tokens.arrAccess(~~(local1_i_2098)).values[tmpPositionCache].attr8_Text_Str_ref[0]) == ("\n")) ? 1 : 0)) {
				local8_Text_Str_2099 = "NEWLINE";
				if (local5_WasNL_2095) {
					global8_Compiler.attr6_Tokens.arrAccess(~~(local1_i_2098)).values[tmpPositionCache].attr5_IsDel = 1;
					continue;
					
				};
				local5_WasNL_2095 = 1;
				
			} else {
				local5_WasNL_2095 = 0;
				
			};
			if ((((global8_Compiler.attr6_Tokens.arrAccess(~~(local1_i_2098)).values[tmpPositionCache].attr8_Text_Str_ref[0]) == ("REM")) ? 1 : 0)) {
				local6_WasRem_2096 = 1;
				
			};
			if ((((local6_WasRem_2096) && ((((global8_Compiler.attr6_Tokens.arrAccess(~~(local1_i_2098)).values[tmpPositionCache].attr8_Text_Str_ref[0]) == ("ENDREM")) ? 1 : 0))) ? 1 : 0)) {
				local6_WasRem_2096 = 0;
				local6_HasDel_2097 = 1;
				global8_Compiler.attr6_Tokens.arrAccess(~~(local1_i_2098)).values[tmpPositionCache].attr5_IsDel = 1;
				continue;
				
			};
			if (local6_WasRem_2096) {
				global8_Compiler.attr6_Tokens.arrAccess(~~(local1_i_2098)).values[tmpPositionCache].attr5_IsDel = 1;
				continue;
				
			};
			if ((((local1_i_2098) < (((global8_Compiler.attr11_LastTokenID) - (1)))) ? 1 : 0)) {
				{
					var local17___SelectHelper15__2100 = "";
					local17___SelectHelper15__2100 = global8_Compiler.attr6_Tokens.arrAccess(~~(local1_i_2098)).values[tmpPositionCache].attr8_Text_Str_ref[0];
					if ((((local17___SelectHelper15__2100) == ("<")) ? 1 : 0)) {
						if ((((global8_Compiler.attr6_Tokens.arrAccess(~~(((local1_i_2098) + (1)))).values[tmpPositionCache].attr8_Text_Str_ref[0]) == (">")) ? 1 : 0)) {
							global8_Compiler.attr6_Tokens.arrAccess(~~(((local1_i_2098) + (1)))).values[tmpPositionCache].attr5_IsDel = 1;
							global8_Compiler.attr6_Tokens.arrAccess(~~(local1_i_2098)).values[tmpPositionCache].attr8_Text_Str_ref[0] = "<>";
							
						};
						if ((((global8_Compiler.attr6_Tokens.arrAccess(~~(((local1_i_2098) + (1)))).values[tmpPositionCache].attr8_Text_Str_ref[0]) == ("=")) ? 1 : 0)) {
							global8_Compiler.attr6_Tokens.arrAccess(~~(((local1_i_2098) + (1)))).values[tmpPositionCache].attr5_IsDel = 1;
							global8_Compiler.attr6_Tokens.arrAccess(~~(local1_i_2098)).values[tmpPositionCache].attr8_Text_Str_ref[0] = "<=";
							
						};
						
					} else if ((((local17___SelectHelper15__2100) == (">")) ? 1 : 0)) {
						if ((((global8_Compiler.attr6_Tokens.arrAccess(~~(((local1_i_2098) + (1)))).values[tmpPositionCache].attr8_Text_Str_ref[0]) == ("=")) ? 1 : 0)) {
							global8_Compiler.attr6_Tokens.arrAccess(~~(((local1_i_2098) + (1)))).values[tmpPositionCache].attr5_IsDel = 1;
							global8_Compiler.attr6_Tokens.arrAccess(~~(local1_i_2098)).values[tmpPositionCache].attr8_Text_Str_ref[0] = ">=";
							
						};
						
					};
					
				};
				
			};
			
		};
		
	};
	local1_i_2101 = 0;
	return 0;
	
};
func5_Lexer = window['func5_Lexer'];
window['func7_VariDef'] = function(param9_NoDefault) {
	var local8_Name_Str_2103 = "", local12_datatype_Str_2104 = "", local7_IsArray_2105 = 0, local12_RightTok_Str_2106 = "", local11_LeftTok_Str_2107 = "", local6_DefVal_2108 = 0, local4_dims_2109 = new GLBArray(), local4_vari_2112 = new type14_IdentifierVari();
	local8_Name_Str_2103 = func14_GetCurrent_Str();
	func14_IsValidVarName();
	func5_Match(local8_Name_Str_2103, 10, "Parser.gbas");
	local12_datatype_Str_2104 = "float";
	local7_IsArray_2105 = 0;
	local12_RightTok_Str_2106 = RIGHT_Str(local8_Name_Str_2103, 1);
	local11_LeftTok_Str_2107 = LEFT_Str(local8_Name_Str_2103, (((local8_Name_Str_2103).length) - (1)));
	local6_DefVal_2108 = -(1);
	{
		var local17___SelectHelper16__2110 = "";
		local17___SelectHelper16__2110 = local12_RightTok_Str_2106;
		if ((((local17___SelectHelper16__2110) == ("%")) ? 1 : 0)) {
			local12_datatype_Str_2104 = "int";
			local8_Name_Str_2103 = local11_LeftTok_Str_2107;
			
		} else if ((((local17___SelectHelper16__2110) == ("#")) ? 1 : 0)) {
			local12_datatype_Str_2104 = "float";
			local8_Name_Str_2103 = local11_LeftTok_Str_2107;
			
		} else if ((((local17___SelectHelper16__2110) == ("$")) ? 1 : 0)) {
			local12_datatype_Str_2104 = "string";
			
		};
		
	};
	if (func7_IsToken("[")) {
		func5_Match("[", 32, "Parser.gbas");
		if (func7_IsToken("]")) {
			func5_Match("]", 34, "Parser.gbas");
			
		} else {
			var local1_E_2111 = 0;
			local1_E_2111 = func14_EnsureDatatype(func10_Expression(0), global11_intDatatype, 36, 0);
			func5_Match("]", 37, "Parser.gbas");
			DIMPUSH(local4_dims_2109, local1_E_2111);
			while (func7_IsToken("[")) {
				func5_Match("[", 40, "Parser.gbas");
				local1_E_2111 = func14_EnsureDatatype(func10_Expression(0), global11_intDatatype, 41, 0);
				DIMPUSH(local4_dims_2109, local1_E_2111);
				func5_Match("]", 43, "Parser.gbas");
				
			};
			
		};
		local7_IsArray_2105 = 1;
		
	};
	if (func7_IsToken("AS")) {
		if ((((local12_datatype_Str_2104) == ("float")) ? 1 : 0)) {
			func5_Match("AS", 51, "Parser.gbas");
			if (((((((((((((((((((func7_IsToken("int")) || (func7_IsToken("short"))) ? 1 : 0)) || (func7_IsToken("byte"))) ? 1 : 0)) || (func7_IsToken("bool"))) ? 1 : 0)) || (func7_IsToken("boolean"))) ? 1 : 0)) || (func7_IsToken("long"))) ? 1 : 0)) || (func7_IsToken("single"))) ? 1 : 0)) {
				local12_datatype_Str_2104 = "int";
				
			} else if ((((func7_IsToken("float")) || (func7_IsToken("double"))) ? 1 : 0)) {
				local12_datatype_Str_2104 = "float";
				
			} else if (func7_IsToken("void")) {
				local12_datatype_Str_2104 = "void";
				
			} else if (func7_IsToken("string")) {
				local12_datatype_Str_2104 = "string";
				
			} else {
				func15_IsValidDatatype();
				local12_datatype_Str_2104 = func14_GetCurrent_Str();
				
			};
			func7_GetNext();
			
		} else {
			func5_Error("Unexpected AS", 66, "Parser.gbas");
			
		};
		
	};
	local4_vari_2112.attr8_Name_Str = local8_Name_Str_2103;
	local4_vari_2112.attr8_datatype.attr8_Name_Str_ref[0] = local12_datatype_Str_2104;
	local4_vari_2112.attr8_datatype.attr7_IsArray_ref[0] = local7_IsArray_2105;
	if ((((BOUNDS(local4_dims_2109, 0)) > (0)) ? 1 : 0)) {
		local6_DefVal_2108 = func25_CreateDimAsExprExpression(local4_vari_2112.attr8_datatype, unref(local4_dims_2109));
		
	};
	if ((((func7_IsToken("=")) && (((param9_NoDefault) ? 0 : 1))) ? 1 : 0)) {
		func5_Match("=", 80, "Parser.gbas");
		local6_DefVal_2108 = func14_EnsureDatatype(func10_Expression(0), local4_vari_2112.attr8_datatype, 81, 0);
		
	};
	local4_vari_2112.attr6_PreDef = local6_DefVal_2108;
	return tryClone(local4_vari_2112);
	return tryClone(unref(new type14_IdentifierVari()));
	
};
func7_VariDef = window['func7_VariDef'];
window['func7_FuncDef'] = function(param6_Native, param10_IsCallBack, param3_Typ, param6_CurTyp) {
	var local8_Name_Str_2117 = "";
	if ((((param3_Typ) == (4)) ? 1 : 0)) {
		func5_Match("PROTOTYPE", 91, "Parser.gbas");
		
	} else {
		func5_Match("FUNCTION", 93, "Parser.gbas");
		
	};
	local8_Name_Str_2117 = func14_GetCurrent_Str();
	var forEachSaver12775 = global8_Compiler.attr5_Funcs_ref[0];
	for(var forEachCounter12775 = 0 ; forEachCounter12775 < forEachSaver12775.values.length ; forEachCounter12775++) {
		var local4_func_ref_2118 = forEachSaver12775.values[forEachCounter12775];
	{
			if (((((((((((((func7_IsToken(func16_AddDataChars_Str(local4_func_ref_2118[0].attr8_Name_Str, unref(local4_func_ref_2118[0])))) || (func7_IsToken(local4_func_ref_2118[0].attr8_Name_Str))) ? 1 : 0)) && ((((local4_func_ref_2118[0].attr10_IsCallback) == (param10_IsCallBack)) ? 1 : 0))) ? 1 : 0)) && ((((local4_func_ref_2118[0].attr3_Typ) == (param3_Typ)) ? 1 : 0))) ? 1 : 0)) && ((((local4_func_ref_2118[0].attr6_MyType) == (param6_CurTyp)) ? 1 : 0))) ? 1 : 0)) {
				var local7_tmpVari_2119 = new type14_IdentifierVari(), local10_MustDefVal_2120 = 0;
				local7_tmpVari_2119 = func7_VariDef(0).clone(/* In Assign */);
				func5_Match(":", 104, "Parser.gbas");
				local10_MustDefVal_2120 = 0;
				while ((((func7_IsToken("\n")) == (0)) ? 1 : 0)) {
					var local3_ref_2121 = 0, local4_vari_ref_2122 = [new type14_IdentifierVari()];
					local3_ref_2121 = 0;
					if (func7_IsToken("BYREF")) {
						local3_ref_2121 = 1;
						func5_Match("BYREF", 111, "Parser.gbas");
						local4_func_ref_2118[0].attr6_HasRef = 1;
						
					};
					local4_vari_ref_2122[0] = func7_VariDef(0).clone(/* In Assign */);
					if (local10_MustDefVal_2120) {
						if ((((local4_vari_ref_2122[0].attr6_PreDef) == (-(1))) ? 1 : 0)) {
							func5_Error((((("Parameter '") + (local4_vari_ref_2122[0].attr8_Name_Str))) + ("' has to have default value.")), 117, "Parser.gbas");
							
						};
						
					} else {
						if ((((local4_vari_ref_2122[0].attr6_PreDef) != (-(1))) ? 1 : 0)) {
							local10_MustDefVal_2120 = 1;
							
						};
						
					};
					local4_vari_ref_2122[0].attr3_Typ = ~~(5);
					local4_vari_ref_2122[0].attr3_ref = local3_ref_2121;
					local4_vari_ref_2122[0].attr2_ID = BOUNDS(global8_Compiler.attr5_Varis_ref[0], 0);
					DIMPUSH(global8_Compiler.attr5_Varis_ref[0], local4_vari_ref_2122);
					DIMPUSH(local4_func_ref_2118[0].attr6_Params, ((BOUNDS(global8_Compiler.attr5_Varis_ref[0], 0)) - (1)));
					if ((((func7_IsToken("\n")) == (0)) ? 1 : 0)) {
						func5_Match(",", 126, "Parser.gbas");
						
					};
					
				};
				(global8_Compiler.attr11_GlobalFuncs).Put(local4_func_ref_2118[0].attr8_Name_Str, local4_func_ref_2118[0].attr2_ID);
				if ((((param3_Typ) != (4)) ? 1 : 0)) {
					if (((((((param6_Native) == (0)) ? 1 : 0)) && ((((local4_func_ref_2118[0].attr10_IsAbstract) == (0)) ? 1 : 0))) ? 1 : 0)) {
						local4_func_ref_2118[0].attr6_Native = 0;
						func5_Match("\n", 143, "Parser.gbas");
						local4_func_ref_2118[0].attr3_Tok = global8_Compiler.attr11_currentPosi;
						func10_SkipTokens("FUNCTION", "ENDFUNCTION", local4_func_ref_2118[0].attr8_Name_Str);
						
					} else {
						if (((local4_func_ref_2118[0].attr10_IsAbstract) ? 0 : 1)) {
							local4_func_ref_2118[0].attr6_Native = 1;
							
						};
						
					};
					
				};
				return 0;
				
			};
			
		}
		forEachSaver12775.values[forEachCounter12775] = local4_func_ref_2118;
	
	};
	if (param10_IsCallBack) {
		func10_SkipTokens("FUNCTION", "ENDFUNCTION", local8_Name_Str_2117);
		
	} else {
		func5_Error((((("Internal error (func definition for unknown type: ") + (local8_Name_Str_2117))) + (")")), 158, "Parser.gbas");
		
	};
	return 0;
	
};
func7_FuncDef = window['func7_FuncDef'];
window['func6_SubDef'] = function() {
	func5_Match("SUB", 164, "Parser.gbas");
	var forEachSaver12868 = global8_Compiler.attr5_Funcs_ref[0];
	for(var forEachCounter12868 = 0 ; forEachCounter12868 < forEachSaver12868.values.length ; forEachCounter12868++) {
		var local4_func_ref_2123 = forEachSaver12868.values[forEachCounter12868];
	{
			if (func7_IsToken(local4_func_ref_2123[0].attr8_Name_Str)) {
				local4_func_ref_2123[0].attr8_Name_Str = func14_GetCurrent_Str();
				local4_func_ref_2123[0].attr8_datatype = global12_voidDatatype.clone(/* In Assign */);
				local4_func_ref_2123[0].attr3_Typ = ~~(2);
				(global8_Compiler.attr11_GlobalFuncs).Put(local4_func_ref_2123[0].attr8_Name_Str, local4_func_ref_2123[0].attr2_ID);
				func5_Match(local4_func_ref_2123[0].attr8_Name_Str, 173, "Parser.gbas");
				func5_Match(":", 174, "Parser.gbas");
				func5_Match("\n", 175, "Parser.gbas");
				local4_func_ref_2123[0].attr3_Tok = global8_Compiler.attr11_currentPosi;
				func10_SkipTokens("SUB", "ENDSUB", local4_func_ref_2123[0].attr8_Name_Str);
				return 0;
				
			};
			
		}
		forEachSaver12868.values[forEachCounter12868] = local4_func_ref_2123;
	
	};
	func5_Error("Internal error (sub definition for unknown type)", 181, "Parser.gbas");
	return 0;
	
};
func6_SubDef = window['func6_SubDef'];
window['func8_TypeDefi'] = function() {
	func5_Match("TYPE", 186, "Parser.gbas");
	var forEachSaver13123 = global8_Compiler.attr5_Types_ref[0];
	for(var forEachCounter13123 = 0 ; forEachCounter13123 < forEachSaver13123.values.length ; forEachCounter13123++) {
		var local3_typ_ref_2124 = forEachSaver13123.values[forEachCounter13123];
	{
			if (func7_IsToken(local3_typ_ref_2124[0].attr8_Name_Str)) {
				var local11_ExtName_Str_2125 = "";
				local3_typ_ref_2124[0].attr8_Name_Str = func14_GetCurrent_Str();
				func5_Match(local3_typ_ref_2124[0].attr8_Name_Str, 190, "Parser.gbas");
				if (func7_IsToken("EXTENDS")) {
					func5_Match("EXTENDS", 195, "Parser.gbas");
					local11_ExtName_Str_2125 = func14_GetCurrent_Str();
					func7_GetNext();
					
				} else if ((((local3_typ_ref_2124[0].attr8_Name_Str) != ("TObject")) ? 1 : 0)) {
					local11_ExtName_Str_2125 = "TObject";
					
				};
				if ((((local11_ExtName_Str_2125) != ("")) ? 1 : 0)) {
					if ((((local11_ExtName_Str_2125) == (local3_typ_ref_2124[0].attr8_Name_Str)) ? 1 : 0)) {
						func5_Error("Type cannot extend itself!", 202, "Parser.gbas");
						
					};
					var forEachSaver12968 = global8_Compiler.attr5_Types_ref[0];
					for(var forEachCounter12968 = 0 ; forEachCounter12968 < forEachSaver12968.values.length ; forEachCounter12968++) {
						var local1_T_ref_2126 = forEachSaver12968.values[forEachCounter12968];
					{
							if ((((local1_T_ref_2126[0].attr8_Name_Str) == (local11_ExtName_Str_2125)) ? 1 : 0)) {
								local3_typ_ref_2124[0].attr9_Extending = local1_T_ref_2126[0].attr2_ID;
								break;
								
							};
							
						}
						forEachSaver12968.values[forEachCounter12968] = local1_T_ref_2126;
					
					};
					
				};
				if (func7_IsToken(":")) {
					func5_Match(":", 211, "Parser.gbas");
					
				};
				func5_Match("\n", 212, "Parser.gbas");
				var forEachSaver13034 = local3_typ_ref_2124[0].attr7_Methods;
				for(var forEachCounter13034 = 0 ; forEachCounter13034 < forEachSaver13034.values.length ; forEachCounter13034++) {
					var local2_M1_2127 = forEachSaver13034.values[forEachCounter13034];
				{
						var forEachSaver13033 = local3_typ_ref_2124[0].attr7_Methods;
						for(var forEachCounter13033 = 0 ; forEachCounter13033 < forEachSaver13033.values.length ; forEachCounter13033++) {
							var local2_M2_2128 = forEachSaver13033.values[forEachCounter13033];
						{
								if (((((((local2_M1_2127) != (local2_M2_2128)) ? 1 : 0)) && ((((global8_Compiler.attr5_Funcs_ref[0].arrAccess(local2_M2_2128).values[tmpPositionCache][0].attr8_Name_Str) == (global8_Compiler.attr5_Funcs_ref[0].arrAccess(local2_M1_2127).values[tmpPositionCache][0].attr8_Name_Str)) ? 1 : 0))) ? 1 : 0)) {
									func5_Error((((("Method '") + (global8_Compiler.attr5_Funcs_ref[0].arrAccess(local2_M1_2127).values[tmpPositionCache][0].attr8_Name_Str))) + ("' already exists")), 215, "Parser.gbas");
									
								};
								
							}
							forEachSaver13033.values[forEachCounter13033] = local2_M2_2128;
						
						};
						
					}
					forEachSaver13034.values[forEachCounter13034] = local2_M1_2127;
				
				};
				while ((((func7_IsToken("ENDTYPE")) == (0)) ? 1 : 0)) {
					var local10_IsAbstract_2129 = 0;
					local10_IsAbstract_2129 = 0;
					if (func7_IsToken("ABSTRACT")) {
						func5_Match("ABSTRACT", 221, "Parser.gbas");
						local10_IsAbstract_2129 = 1;
						
					};
					if (func7_IsToken("FUNCTION")) {
						if (local10_IsAbstract_2129) {
							func10_SkipTokens("FUNCTION", "\n", "ABSTRACT FUNCTION");
							
						} else {
							func10_SkipTokens("FUNCTION", "ENDFUNCTION", "FUNCTION IN TYPE");
							
						};
						
					} else {
						var local4_Vari_2130 = new type14_IdentifierVari();
						local4_Vari_2130 = func7_VariDef(0).clone(/* In Assign */);
						local4_Vari_2130.attr3_Typ = ~~(3);
						func11_AddVariable(local4_Vari_2130, 1);
						DIMPUSH(local3_typ_ref_2124[0].attr10_Attributes, ((BOUNDS(global8_Compiler.attr5_Varis_ref[0], 0)) - (1)));
						
					};
					if ((((func7_IsToken("ENDTYPE")) == (0)) ? 1 : 0)) {
						func5_Match("\n", 248, "Parser.gbas");
						
					};
					
				};
				func5_Match("ENDTYPE", 251, "Parser.gbas");
				return 0;
				
			};
			
		}
		forEachSaver13123.values[forEachCounter13123] = local3_typ_ref_2124;
	
	};
	func5_Error("Internal error (type definition for unknown type)", 255, "Parser.gbas");
	return 0;
	
};
func8_TypeDefi = window['func8_TypeDefi'];
window['func11_CompileFunc'] = function(param4_func) {
	if ((((((((((param4_func.attr3_Scp) == (-(1))) ? 1 : 0)) && ((((param4_func.attr6_Native) == (0)) ? 1 : 0))) ? 1 : 0)) && ((((param4_func.attr10_PlzCompile) == (1)) ? 1 : 0))) ? 1 : 0)) {
		var local6_TmpScp_2712 = 0.0, local3_Tok_2713 = 0, local7_Curfunc_2714 = 0.0, local3_Scp_2716 = 0;
		if (param4_func.attr10_IsAbstract) {
			
		};
		local6_TmpScp_2712 = global8_Compiler.attr12_CurrentScope;
		global8_Compiler.attr12_CurrentScope = global8_Compiler.attr9_MainScope;
		local3_Tok_2713 = global8_Compiler.attr11_currentPosi;
		local7_Curfunc_2714 = global8_Compiler.attr11_currentFunc;
		global8_Compiler.attr11_currentFunc = param4_func.attr2_ID;
		global8_Compiler.attr11_currentPosi = ((param4_func.attr3_Tok) - (1));
		if (((((((param4_func.attr3_Tok) == (0)) ? 1 : 0)) && (((param4_func.attr10_IsAbstract) ? 0 : 1))) ? 1 : 0)) {
			func5_Error("Internal error (function has no start token)", 270, "Parser.gbas");
			
		};
		if ((((param4_func.attr3_Typ) == (3)) ? 1 : 0)) {
			var local4_Vari_2715 = new type14_IdentifierVari();
			local4_Vari_2715.attr8_Name_Str = "self";
			local4_Vari_2715.attr8_datatype.attr8_Name_Str_ref[0] = global8_Compiler.attr5_Types_ref[0].arrAccess(param4_func.attr6_MyType).values[tmpPositionCache][0].attr8_Name_Str;
			local4_Vari_2715.attr8_datatype.attr7_IsArray_ref[0] = 0;
			local4_Vari_2715.attr3_Typ = ~~(5);
			func11_AddVariable(local4_Vari_2715, 1);
			DIMPUSH(param4_func.attr6_Params, local4_Vari_2715.attr2_ID);
			param4_func.attr7_SelfVar = local4_Vari_2715.attr2_ID;
			
		};
		func7_GetNext();
		{
			var Err_Str = "";
			try {
				if (((param4_func.attr10_IsAbstract) ? 0 : 1)) {
					if ((((param4_func.attr3_Typ) == (2)) ? 1 : 0)) {
						local3_Scp_2716 = func5_Scope("ENDSUB", param4_func.attr2_ID);
						
					} else {
						var local1_e_2717 = 0;
						local3_Scp_2716 = func5_Scope("ENDFUNCTION", param4_func.attr2_ID);
						local1_e_2717 = func22_CreateReturnExpression(func28_CreateDefaultValueExpression(param4_func.attr8_datatype));
						DIMPUSH(global5_Exprs_ref[0].arrAccess(local3_Scp_2716).values[tmpPositionCache][0].attr5_Exprs, local1_e_2717);
						
					};
					
				} else {
					local3_Scp_2716 = func21_CreateScopeExpression(~~(2));
					DIMPUSH(global5_Exprs_ref[0].arrAccess(local3_Scp_2716).values[tmpPositionCache][0].attr5_Exprs, func21_CreateEmptyExpression());
					
				};
				
			} catch (Err_Str) {
				if (Err_Str instanceof GLBException) Err_Str = Err_Str.getText(); else throwError(Err_Str);{
					local3_Scp_2716 = func21_CreateEmptyExpression();
					
				}
			};
			
		};
		param4_func.attr3_Scp = local3_Scp_2716;
		global8_Compiler.attr11_currentPosi = ((local3_Tok_2713) - (1));
		func7_GetNext();
		global8_Compiler.attr11_currentFunc = ~~(local7_Curfunc_2714);
		global8_Compiler.attr12_CurrentScope = ~~(local6_TmpScp_2712);
		return 1;
		
	} else {
		return tryClone(0);
		
	};
	return 0;
	
};
func11_CompileFunc = window['func11_CompileFunc'];
window['func10_Expression'] = function(param4_Prio) {
	if ((((param4_Prio) < (15)) ? 1 : 0)) {
		var local4_Left_2132 = 0, local5_Right_2133 = 0, local5_Found_2134 = 0;
		local4_Left_2132 = func10_Expression(((param4_Prio) + (1)));
		local5_Right_2133 = -(1);
		local5_Found_2134 = 0;
		do {
			local5_Found_2134 = 0;
			var forEachSaver13226 = global9_Operators_ref[0];
			for(var forEachCounter13226 = 0 ; forEachCounter13226 < forEachSaver13226.values.length ; forEachCounter13226++) {
				var local2_Op_ref_2135 = forEachSaver13226.values[forEachCounter13226];
			{
					while (((((((local2_Op_ref_2135[0].attr4_Prio) == (param4_Prio)) ? 1 : 0)) && (func7_IsToken(local2_Op_ref_2135[0].attr7_Sym_Str))) ? 1 : 0)) {
						func5_Match(local2_Op_ref_2135[0].attr7_Sym_Str, 335, "Parser.gbas");
						local5_Right_2133 = func10_Expression(((param4_Prio) + (1)));
						local4_Left_2132 = func24_CreateOperatorExpression(unref(local2_Op_ref_2135[0]), local4_Left_2132, local5_Right_2133);
						{
							var Error_Str = "";
							try {
								var local6_Result_2136 = 0.0;
								local6_Result_2136 = func13_CalculateTree(unref(global5_Exprs_ref[0].arrAccess(local4_Left_2132).values[tmpPositionCache][0]));
								if ((((INTEGER(local6_Result_2136)) == (local6_Result_2136)) ? 1 : 0)) {
									local4_Left_2132 = func19_CreateIntExpression(~~(local6_Result_2136));
									
								} else {
									local5_Right_2133 = func21_CreateFloatExpression(local6_Result_2136);
									
								};
								
							} catch (Error_Str) {
								if (Error_Str instanceof GLBException) Error_Str = Error_Str.getText(); else throwError(Error_Str);{
									
								}
							};
							
						};
						local5_Found_2134 = 1;
						break;
						
					};
					
				}
				forEachSaver13226.values[forEachCounter13226] = local2_Op_ref_2135;
			
			};
			
		} while (!((((local5_Found_2134) == (0)) ? 1 : 0)));
		return tryClone(local4_Left_2132);
		
	} else {
		return tryClone(func6_Factor());
		
	};
	return 0;
	
};
func10_Expression = window['func10_Expression'];
window['func12_CastDatatype'] = function(param8_RetData1_ref, param8_RetData2_ref) {
	var local5_Data1_2721 = 0, local5_Data2_2722 = 0;
	local5_Data1_2721 = param8_RetData1_ref[0];
	local5_Data2_2722 = param8_RetData2_ref[0];
	if ((((global5_Exprs_ref[0].arrAccess(local5_Data1_2721).values[tmpPositionCache][0].attr8_datatype.attr7_IsArray_ref[0]) == (global5_Exprs_ref[0].arrAccess(local5_Data2_2722).values[tmpPositionCache][0].attr8_datatype.attr7_IsArray_ref[0])) ? 1 : 0)) {
		if ((((global5_Exprs_ref[0].arrAccess(local5_Data1_2721).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str_ref[0]) == (global5_Exprs_ref[0].arrAccess(local5_Data2_2722).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str_ref[0])) ? 1 : 0)) {
			param8_RetData1_ref[0] = local5_Data1_2721;
			param8_RetData2_ref[0] = local5_Data2_2722;
			return tryClone(global5_Exprs_ref[0].arrAccess(param8_RetData1_ref[0]).values[tmpPositionCache][0].attr8_datatype);
			
		} else {
			if ((((global5_Exprs_ref[0].arrAccess(local5_Data1_2721).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str_ref[0]) == ("string")) ? 1 : 0)) {
				param8_RetData2_ref[0] = func27_CreateCast2StringExpression(local5_Data2_2722);
				
			} else if ((((global5_Exprs_ref[0].arrAccess(local5_Data2_2722).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str_ref[0]) == ("string")) ? 1 : 0)) {
				param8_RetData1_ref[0] = func27_CreateCast2StringExpression(local5_Data1_2721);
				
			} else if ((((global5_Exprs_ref[0].arrAccess(local5_Data1_2721).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str_ref[0]) == ("float")) ? 1 : 0)) {
				param8_RetData2_ref[0] = func26_CreateCast2FloatExpression(local5_Data2_2722);
				
			} else if ((((global5_Exprs_ref[0].arrAccess(local5_Data2_2722).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str_ref[0]) == ("float")) ? 1 : 0)) {
				param8_RetData1_ref[0] = func26_CreateCast2FloatExpression(local5_Data1_2721);
				
			} else {
				func5_Error((((((((((((("Cannot cast '") + (global5_Exprs_ref[0].arrAccess(local5_Data1_2721).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str_ref[0]))) + (func20_BuildArrBrackets_Str(unref(global5_Exprs_ref[0].arrAccess(local5_Data1_2721).values[tmpPositionCache][0].attr8_datatype.attr7_IsArray_ref[0]))))) + ("' to '"))) + (global5_Exprs_ref[0].arrAccess(local5_Data2_2722).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str_ref[0]))) + (func20_BuildArrBrackets_Str(unref(global5_Exprs_ref[0].arrAccess(local5_Data2_2722).values[tmpPositionCache][0].attr8_datatype.attr7_IsArray_ref[0]))))) + ("'")), 380, "Parser.gbas");
				
			};
			return tryClone(global5_Exprs_ref[0].arrAccess(param8_RetData1_ref[0]).values[tmpPositionCache][0].attr8_datatype);
			
		};
		
	} else {
		func5_Error((((((((((("Dimensions are different: ") + (global5_Exprs_ref[0].arrAccess(local5_Data1_2721).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str_ref[0]))) + (func20_BuildArrBrackets_Str(unref(global5_Exprs_ref[0].arrAccess(local5_Data1_2721).values[tmpPositionCache][0].attr8_datatype.attr7_IsArray_ref[0]))))) + (", "))) + (global5_Exprs_ref[0].arrAccess(local5_Data2_2722).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str_ref[0]))) + (func20_BuildArrBrackets_Str(unref(global5_Exprs_ref[0].arrAccess(local5_Data2_2722).values[tmpPositionCache][0].attr8_datatype.attr7_IsArray_ref[0])))), 386, "Parser.gbas");
		
	};
	return tryClone(unref(new type8_Datatype()));
	
};
func12_CastDatatype = window['func12_CastDatatype'];
window['func14_EnsureDatatype'] = function(param4_Expr, param8_NeedData, param4_Line, param6_Strict) {
	var local6_myData_2142 = new type8_Datatype();
	param6_Strict = 0;
	if ((((param8_NeedData.attr8_Name_Str_ref[0]) == ("")) ? 1 : 0)) {
		func5_Error("Internal error (datatype is empty)", 399, "Parser.gbas");
		
	};
	local6_myData_2142 = global5_Exprs_ref[0].arrAccess(param4_Expr).values[tmpPositionCache][0].attr8_datatype.clone(/* In Assign */);
	if (((((((local6_myData_2142.attr8_Name_Str_ref[0]) == (param8_NeedData.attr8_Name_Str_ref[0])) ? 1 : 0)) && ((((local6_myData_2142.attr7_IsArray_ref[0]) == (param8_NeedData.attr7_IsArray_ref[0])) ? 1 : 0))) ? 1 : 0)) {
		return tryClone(param4_Expr);
		
	} else {
		var local5_func1_2144 = 0, local5_func2_2145 = 0, local7_add_Str_2148 = "";
		if ((((param6_Strict) == (0)) ? 1 : 0)) {
			if ((((local6_myData_2142.attr7_IsArray_ref[0]) == (param8_NeedData.attr7_IsArray_ref[0])) ? 1 : 0)) {
				if ((((((((((local6_myData_2142.attr8_Name_Str_ref[0]) == ("int")) ? 1 : 0)) || ((((local6_myData_2142.attr8_Name_Str_ref[0]) == ("float")) ? 1 : 0))) ? 1 : 0)) || ((((local6_myData_2142.attr8_Name_Str_ref[0]) == ("string")) ? 1 : 0))) ? 1 : 0)) {
					if ((((((((((param8_NeedData.attr8_Name_Str_ref[0]) == ("int")) ? 1 : 0)) || ((((param8_NeedData.attr8_Name_Str_ref[0]) == ("float")) ? 1 : 0))) ? 1 : 0)) || ((((param8_NeedData.attr8_Name_Str_ref[0]) == ("string")) ? 1 : 0))) ? 1 : 0)) {
						{
							var local17___SelectHelper17__2143 = "";
							local17___SelectHelper17__2143 = param8_NeedData.attr8_Name_Str_ref[0];
							if ((((local17___SelectHelper17__2143) == ("int")) ? 1 : 0)) {
								return tryClone(func24_CreateCast2IntExpression(param4_Expr));
								
							} else if ((((local17___SelectHelper17__2143) == ("float")) ? 1 : 0)) {
								return tryClone(func26_CreateCast2FloatExpression(param4_Expr));
								
							} else if ((((local17___SelectHelper17__2143) == ("string")) ? 1 : 0)) {
								return tryClone(func27_CreateCast2StringExpression(param4_Expr));
								
							};
							
						};
						
					};
					
				};
				
			};
			
		};
		local5_func1_2144 = func14_SearchPrototyp(unref(local6_myData_2142.attr8_Name_Str_ref[0]));
		local5_func2_2145 = func14_SearchPrototyp(unref(param8_NeedData.attr8_Name_Str_ref[0]));
		if ((((local5_func1_2144) != (-(1))) ? 1 : 0)) {
			if ((((local5_func2_2145) != (-(1))) ? 1 : 0)) {
				var local7_checker_2146 = new type12_ProtoChecker();
				if ((((local6_myData_2142.attr7_IsArray_ref[0]) || (param8_NeedData.attr7_IsArray_ref[0])) ? 1 : 0)) {
					func5_Error("PROTOTYPE cannot be an array.", 426, "Parser.gbas");
					
				};
				local7_checker_2146.attr8_fromFunc = global8_Compiler.attr5_Funcs_ref[0].arrAccess(local5_func1_2144).values[tmpPositionCache][0].attr2_ID;
				local7_checker_2146.attr6_toFunc = global8_Compiler.attr5_Funcs_ref[0].arrAccess(local5_func2_2145).values[tmpPositionCache][0].attr2_ID;
				local7_checker_2146.attr3_Tok = func15_GetCurrentToken().clone(/* In Assign */);
				DIMPUSH(global8_Compiler.attr13_protoCheckers, local7_checker_2146);
				return tryClone(param4_Expr);
				
			} else {
				if (((((((((((((param8_NeedData.attr8_Name_Str_ref[0]) == ("int")) ? 1 : 0)) || ((((param8_NeedData.attr8_Name_Str_ref[0]) == ("float")) ? 1 : 0))) ? 1 : 0)) || ((((param8_NeedData.attr8_Name_Str_ref[0]) == ("string")) ? 1 : 0))) ? 1 : 0)) && ((((param8_NeedData.attr7_IsArray_ref[0]) == (0)) ? 1 : 0))) ? 1 : 0)) {
					{
						var local17___SelectHelper18__2147 = "";
						local17___SelectHelper18__2147 = param8_NeedData.attr8_Name_Str_ref[0];
						if ((((local17___SelectHelper18__2147) == ("int")) ? 1 : 0)) {
							return tryClone(func24_CreateCast2IntExpression(param4_Expr));
							
						} else if ((((local17___SelectHelper18__2147) == ("float")) ? 1 : 0)) {
							return tryClone(func26_CreateCast2FloatExpression(param4_Expr));
							
						} else if ((((local17___SelectHelper18__2147) == ("string")) ? 1 : 0)) {
							return tryClone(func27_CreateCast2StringExpression(param4_Expr));
							
						};
						
					};
					
				};
				
			};
			
		};
		if ((((func6_IsType(unref(local6_myData_2142.attr8_Name_Str_ref[0]))) && (func6_IsType(unref(param8_NeedData.attr8_Name_Str_ref[0])))) ? 1 : 0)) {
			return tryClone(param4_Expr);
			
		};
		local7_add_Str_2148 = "";
		if (param6_Strict) {
			local7_add_Str_2148 = " , and maybe can't cast, because it is BYREF (screw you BYREF >:O)!!";
			
		};
		func5_Error((((((((((((((("Cannot cast datatypes. Needs '") + (param8_NeedData.attr8_Name_Str_ref[0]))) + (func20_BuildArrBrackets_Str(unref(param8_NeedData.attr7_IsArray_ref[0]))))) + ("', got '"))) + (local6_myData_2142.attr8_Name_Str_ref[0]))) + (func20_BuildArrBrackets_Str(unref(local6_myData_2142.attr7_IsArray_ref[0]))))) + ("'"))) + (local7_add_Str_2148)), param4_Line, "Parser.gbas");
		
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
window['func7_Hex2Dec'] = function(param7_hex_Str) {
	var local1_i_2724 = 0, local1_j_2725 = 0, local4_loop_2726 = 0;
	local1_i_2724 = 0;
	local1_j_2725 = 0;
	{
		for (local4_loop_2726 = 0;toCheck(local4_loop_2726, (((param7_hex_Str).length) - (1)), 1);local4_loop_2726 += 1) {
			local1_i_2724 = ((ASC(MID_Str(param7_hex_Str, local4_loop_2726, 1), 0)) - (48));
			if ((((9) < (local1_i_2724)) ? 1 : 0)) {
				local1_i_2724+=-(7);
				
			};
			local1_j_2725 = ((local1_j_2725) * (16));
			local1_j_2725 = bOR(local1_j_2725, bAND(local1_i_2724, 15));
			
		};
		
	};
	return tryClone(local1_j_2725);
	return 0;
	
};
func7_Hex2Dec = window['func7_Hex2Dec'];
window['func6_Factor'] = function() {
	if (func7_IsToken("(")) {
		var local4_Expr_2150 = 0;
		func5_Match("(", 496, "Parser.gbas");
		local4_Expr_2150 = func10_Expression(0);
		func5_Match(")", 498, "Parser.gbas");
		return tryClone(local4_Expr_2150);
		
	} else if (func12_IsIdentifier(1)) {
		return tryClone(func10_Identifier(0));
		
	} else if (func8_IsString()) {
		var local7_Str_Str_2151 = "";
		local7_Str_Str_2151 = func14_GetCurrent_Str();
		if ((((INSTR(local7_Str_Str_2151, "\n", 0)) != (-(1))) ? 1 : 0)) {
			func5_Error("Expecting '\"'", 506, "Parser.gbas");
			
		};
		func7_GetNext();
		return tryClone(func19_CreateStrExpression(local7_Str_Str_2151));
		
	} else if ((((MID_Str(func14_GetCurrent_Str(), 0, 2)) == ("0x")) ? 1 : 0)) {
		var local7_hex_Str_2152 = "";
		local7_hex_Str_2152 = MID_Str(func14_GetCurrent_Str(), 2, -(1));
		func7_GetNext();
		return tryClone(func19_CreateIntExpression(func7_Hex2Dec(local7_hex_Str_2152)));
		
	} else if ((((func8_IsNumber()) || (func7_IsToken("."))) ? 1 : 0)) {
		var local3_Num_2153 = 0, local12_hasToHaveNum_2154 = 0;
		local12_hasToHaveNum_2154 = 0;
		if (func7_IsToken(".")) {
			local3_Num_2153 = 0;
			local12_hasToHaveNum_2154 = 1;
			
		} else {
			local3_Num_2153 = INT2STR(func14_GetCurrent_Str());
			func7_GetNext();
			
		};
		if (func7_IsToken(".")) {
			var local4_Num2_2155 = 0, local3_pos_2156 = 0, local4_FNum_2157 = 0.0;
			func5_Match(".", 526, "Parser.gbas");
			local4_Num2_2155 = INT2STR(func14_GetCurrent_Str());
			local3_pos_2156 = global8_Compiler.attr11_currentPosi;
			if (func8_IsNumber()) {
				func7_GetNext();
				
			};
			local4_FNum_2157 = FLOAT2STR(((((((CAST2STRING(local3_Num_2153)) + ("."))) + (CAST2STRING(local4_Num2_2155)))) + (CAST2STRING(0))));
			return tryClone(func21_CreateFloatExpression(local4_FNum_2157));
			
		} else {
			if (local12_hasToHaveNum_2154) {
				func5_Error("Expecting number!", 539, "Parser.gbas");
				
			};
			return tryClone(func19_CreateIntExpression(local3_Num_2153));
			
		};
		
	} else if (func7_IsToken("-")) {
		var local4_Expr_2158 = 0, alias2_Op_ref_2159 = [new type8_Operator()], local7_tmpData_2160 = new type8_Datatype();
		func5_Match("-", 543, "Parser.gbas");
		local4_Expr_2158 = func6_Factor();
		alias2_Op_ref_2159 = global9_Operators_ref[0].arrAccess(func14_SearchOperator("sub")).values[tmpPositionCache] /* ALIAS */;
		local7_tmpData_2160 = global5_Exprs_ref[0].arrAccess(local4_Expr_2158).values[tmpPositionCache][0].attr8_datatype.clone(/* In Assign */);
		local7_tmpData_2160.attr7_IsArray_ref[0] = 0;
		local4_Expr_2158 = func14_EnsureDatatype(local4_Expr_2158, local7_tmpData_2160, 550, 0);
		if ((((global5_Exprs_ref[0].arrAccess(local4_Expr_2158).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str_ref[0]) == ("float")) ? 1 : 0)) {
			local4_Expr_2158 = func24_CreateOperatorExpression(unref(alias2_Op_ref_2159[0]), func21_CreateFloatExpression(0), func14_EnsureDatatype(local4_Expr_2158, global13_floatDatatype, 552, 0));
			
		} else if (((((((global5_Exprs_ref[0].arrAccess(local4_Expr_2158).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str_ref[0]) == ("int")) ? 1 : 0)) || ((((global5_Exprs_ref[0].arrAccess(local4_Expr_2158).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str_ref[0]) == ("string")) ? 1 : 0))) ? 1 : 0)) {
			local4_Expr_2158 = func24_CreateOperatorExpression(unref(alias2_Op_ref_2159[0]), func19_CreateIntExpression(0), func14_EnsureDatatype(local4_Expr_2158, global11_intDatatype, 554, 0));
			
		} else {
			func5_Error((((("Unexpected datatype, expecting 'float/int' got '") + (global5_Exprs_ref[0].arrAccess(local4_Expr_2158).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str_ref[0]))) + ("'")), 556, "Parser.gbas");
			
		};
		return tryClone(local4_Expr_2158);
		
	} else if (func7_IsToken("TRUE")) {
		func5_Match("TRUE", 560, "Parser.gbas");
		return tryClone(func19_CreateIntExpression(1));
		
	} else if (func7_IsToken("FALSE")) {
		func5_Match("FALSE", 563, "Parser.gbas");
		return tryClone(func21_CreateFloatExpression(0));
		
	} else if (func7_IsToken("CODELINE")) {
		func5_Match("CODELINE", 566, "Parser.gbas");
		func5_Match("(", 567, "Parser.gbas");
		func5_Match(")", 568, "Parser.gbas");
		return tryClone(func19_CreateIntExpression(unref(global8_Compiler.attr6_Tokens.arrAccess(global8_Compiler.attr11_currentPosi).values[tmpPositionCache].attr4_Line_ref[0])));
		
	} else if (func7_IsToken("CODEFILE$")) {
		func5_Match("CODEFILE$", 571, "Parser.gbas");
		func5_Match("(", 572, "Parser.gbas");
		func5_Match(")", 573, "Parser.gbas");
		return tryClone(func19_CreateStrExpression((((("\"") + (MID_Str(unref(global8_Compiler.attr6_Tokens.arrAccess(global8_Compiler.attr11_currentPosi).values[tmpPositionCache].attr8_Path_Str_ref[0]), 1, -(1))))) + ("\""))));
		
	} else if (func7_IsToken("LEN")) {
		var local4_Expr_2161 = 0, local7_Kerning_2162 = 0;
		func5_Match("LEN", 576, "Parser.gbas");
		func5_Match("(", 577, "Parser.gbas");
		local4_Expr_2161 = func10_Expression(0);
		local7_Kerning_2162 = 0;
		if (func7_IsToken(",")) {
			func5_Match(",", 582, "Parser.gbas");
			local7_Kerning_2162 = func14_EnsureDatatype(func10_Expression(0), global11_intDatatype, 583, 0);
			func5_Match(")", 584, "Parser.gbas");
			local4_Expr_2161 = func14_EnsureDatatype(local4_Expr_2161, global11_strDatatype, 587, 0);
			return tryClone(func19_CreateLenExpression(local4_Expr_2161, local7_Kerning_2162));
			
		} else {
			func5_Match(")", 591, "Parser.gbas");
			if ((((global5_Exprs_ref[0].arrAccess(local4_Expr_2161).values[tmpPositionCache][0].attr8_datatype.attr7_IsArray_ref[0]) == (0)) ? 1 : 0)) {
				if ((((((((((global5_Exprs_ref[0].arrAccess(local4_Expr_2161).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str_ref[0]) == ("int")) ? 1 : 0)) || ((((global5_Exprs_ref[0].arrAccess(local4_Expr_2161).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str_ref[0]) == ("float")) ? 1 : 0))) ? 1 : 0)) || ((((global5_Exprs_ref[0].arrAccess(local4_Expr_2161).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str_ref[0]) == ("string")) ? 1 : 0))) ? 1 : 0)) {
					local4_Expr_2161 = func14_EnsureDatatype(local4_Expr_2161, global11_strDatatype, 595, 0);
					return tryClone(func19_CreateLenExpression(local4_Expr_2161, -(1)));
					
				} else {
					func5_Error((((("Cannot get the length of Type '") + (global5_Exprs_ref[0].arrAccess(local4_Expr_2161).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str_ref[0]))) + ("'")), 599, "Parser.gbas");
					
				};
				
			} else {
				return tryClone(func21_CreateBoundExpression(local4_Expr_2161, func19_CreateIntExpression(0)));
				
			};
			
		};
		
	} else if (func7_IsToken("BOUNDS")) {
		var local4_Expr_2163 = 0, local9_Dimension_2164 = 0;
		func5_Match("BOUNDS", 606, "Parser.gbas");
		func5_Match("(", 607, "Parser.gbas");
		local4_Expr_2163 = func10_Expression(0);
		func5_Match(",", 609, "Parser.gbas");
		if ((((global5_Exprs_ref[0].arrAccess(local4_Expr_2163).values[tmpPositionCache][0].attr8_datatype.attr7_IsArray_ref[0]) == (0)) ? 1 : 0)) {
			func5_Error("BOUNDS needs array!", 610, "Parser.gbas");
			
		};
		local9_Dimension_2164 = func14_EnsureDatatype(func10_Expression(0), global11_intDatatype, 611, 0);
		func5_Match(")", 612, "Parser.gbas");
		return tryClone(func21_CreateBoundExpression(local4_Expr_2163, local9_Dimension_2164));
		
	} else if (func7_IsToken("ADDRESSOF")) {
		var local8_Name_Str_2165 = "", local6_MyFunc_2166 = 0;
		func5_Match("ADDRESSOF", 616, "Parser.gbas");
		func5_Match("(", 617, "Parser.gbas");
		local8_Name_Str_2165 = func14_GetCurrent_Str();
		local6_MyFunc_2166 = -(1);
		var forEachSaver14144 = global8_Compiler.attr5_Funcs_ref[0];
		for(var forEachCounter14144 = 0 ; forEachCounter14144 < forEachSaver14144.values.length ; forEachCounter14144++) {
			var local4_Func_ref_2167 = forEachSaver14144.values[forEachCounter14144];
		{
				if ((((((((((local4_Func_ref_2167[0].attr3_Typ) == (1)) ? 1 : 0)) || ((((local4_Func_ref_2167[0].attr3_Typ) == (2)) ? 1 : 0))) ? 1 : 0)) && ((((local4_Func_ref_2167[0].attr8_Name_Str) == (local8_Name_Str_2165)) ? 1 : 0))) ? 1 : 0)) {
					local6_MyFunc_2166 = local4_Func_ref_2167[0].attr2_ID;
					break;
					
				};
				
			}
			forEachSaver14144.values[forEachCounter14144] = local4_Func_ref_2167;
		
		};
		if ((((local6_MyFunc_2166) == (-(1))) ? 1 : 0)) {
			func5_Error((((("Function '") + (local8_Name_Str_2165))) + ("' is unknown!")), 626, "Parser.gbas");
			
		};
		global8_Compiler.attr5_Funcs_ref[0].arrAccess(local6_MyFunc_2166).values[tmpPositionCache][0].attr10_PlzCompile = 1;
		func7_GetNext();
		func5_Match(")", 629, "Parser.gbas");
		return tryClone(func25_CreateAddressOfExpression(local6_MyFunc_2166));
		
	} else if (func7_IsToken("NOT")) {
		func5_Match("NOT", 633, "Parser.gbas");
		return tryClone(func19_CreateNotExpression(func14_EnsureDatatype(func6_Factor(), global13_floatDatatype, 634, 0)));
		
	} else if ((((((((((func7_IsToken("DIM")) || (func7_IsToken("DIM%"))) ? 1 : 0)) || (func7_IsToken("DIM$"))) ? 1 : 0)) || (func7_IsToken("DIM#"))) ? 1 : 0)) {
		var local8_datatype_2169 = new type8_Datatype(), local4_dims_2170 = new GLBArray();
		if (((static12_Factor_DIMASEXPRErr) ? 0 : 1)) {
			static12_Factor_DIMASEXPRErr = 1;
			func7_Warning("Experimental feature 'DIMASEXPR'");
			
		};
		local8_datatype_2169.attr7_IsArray_ref[0] = 1;
		local8_datatype_2169.attr8_Name_Str_ref[0] = "float";
		if (func7_IsToken("DIM%")) {
			local8_datatype_2169.attr8_Name_Str_ref[0] = "int";
			
		};
		if (func7_IsToken("DIM$")) {
			local8_datatype_2169.attr8_Name_Str_ref[0] = "string";
			
		};
		if (func7_IsToken("DIM#")) {
			local8_datatype_2169.attr8_Name_Str_ref[0] = "float";
			
		};
		func7_GetNext();
		do {
			var local1_E_2171 = 0;
			func5_Match("[", 651, "Parser.gbas");
			local1_E_2171 = func14_EnsureDatatype(func10_Expression(0), global11_intDatatype, 652, 0);
			func5_Match("]", 653, "Parser.gbas");
			DIMPUSH(local4_dims_2170, local1_E_2171);
			
		} while (!((((func7_IsToken("[")) == (0)) ? 1 : 0)));
		if (func7_IsToken("AS")) {
			if ((((local8_datatype_2169.attr8_Name_Str_ref[0]) == ("float")) ? 1 : 0)) {
				func5_Match("AS", 659, "Parser.gbas");
				func15_IsValidDatatype();
				local8_datatype_2169.attr8_Name_Str_ref[0] = func14_GetCurrent_Str();
				
			} else {
				func5_Error("Unexpected AS", 663, "Parser.gbas");
				
			};
			
		};
		return tryClone(func25_CreateDimAsExprExpression(local8_datatype_2169, unref(local4_dims_2170)));
		
	} else if (func7_IsToken("DEFINED")) {
		var local4_Find_2172 = 0;
		func5_Match("DEFINED", 669, "Parser.gbas");
		func5_Match("(", 670, "Parser.gbas");
		local4_Find_2172 = 0;
		var forEachSaver14359 = global7_Defines;
		for(var forEachCounter14359 = 0 ; forEachCounter14359 < forEachSaver14359.values.length ; forEachCounter14359++) {
			var local3_Def_2173 = forEachSaver14359.values[forEachCounter14359];
		{
				if ((((func7_IsToken(local3_Def_2173.attr7_Key_Str)) && ((((INTEGER(FLOAT2STR(local3_Def_2173.attr9_Value_Str))) != (0)) ? 1 : 0))) ? 1 : 0)) {
					local4_Find_2172 = 1;
					break;
					
				};
				
			}
			forEachSaver14359.values[forEachCounter14359] = local3_Def_2173;
		
		};
		func7_GetNext();
		func5_Match(")", 679, "Parser.gbas");
		return tryClone(func19_CreateIntExpression(local4_Find_2172));
		
	} else if (func7_IsToken("IIF")) {
		var local4_Cond_2174 = 0, local6_onTrue_2175 = 0, local7_onFalse_2176 = 0;
		func5_Match("IIF", 683, "Parser.gbas");
		func5_Match("(", 684, "Parser.gbas");
		local4_Cond_2174 = func14_EnsureDatatype(func10_Expression(0), global13_floatDatatype, 686, 0);
		func5_Match(",", 687, "Parser.gbas");
		local6_onTrue_2175 = func10_Expression(0);
		func5_Match(",", 689, "Parser.gbas");
		local7_onFalse_2176 = func10_Expression(0);
		func5_Match(")", 691, "Parser.gbas");
		if (((((((global5_Exprs_ref[0].arrAccess(local6_onTrue_2175).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str_ref[0]) != (global5_Exprs_ref[0].arrAccess(local7_onFalse_2176).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str_ref[0])) ? 1 : 0)) || ((((global5_Exprs_ref[0].arrAccess(local6_onTrue_2175).values[tmpPositionCache][0].attr8_datatype.attr7_IsArray_ref[0]) != (global5_Exprs_ref[0].arrAccess(local7_onFalse_2176).values[tmpPositionCache][0].attr8_datatype.attr7_IsArray_ref[0])) ? 1 : 0))) ? 1 : 0)) {
			func5_Error("IIF parameters do not match!", 694, "Parser.gbas");
			
		};
		return tryClone(func19_CreateIIFExpression(local4_Cond_2174, local6_onTrue_2175, local7_onFalse_2176));
		
	} else if (func8_IsDefine("")) {
		func7_GetNext();
		if ((((CAST2STRING(INTEGER(FLOAT2STR(global10_LastDefine.attr9_Value_Str)))) == (global10_LastDefine.attr9_Value_Str)) ? 1 : 0)) {
			return tryClone(func19_CreateIntExpression(INT2STR(global10_LastDefine.attr9_Value_Str)));
			
		} else if (((((((MID_Str(global10_LastDefine.attr9_Value_Str, 0, 1)) == ("\"")) ? 1 : 0)) && ((((MID_Str(global10_LastDefine.attr9_Value_Str, (((global10_LastDefine.attr9_Value_Str).length) - (1)), 1)) == ("\"")) ? 1 : 0))) ? 1 : 0)) {
			return tryClone(func19_CreateStrExpression(global10_LastDefine.attr9_Value_Str));
			
		} else {
			return tryClone(func21_CreateFloatExpression(FLOAT2STR(global10_LastDefine.attr9_Value_Str)));
			
		};
		
	} else {
		if (((global6_STRICT) ? 0 : 1)) {
			func14_ImplicitDefine();
			return tryClone(func10_Identifier(0));
			
		} else {
			var local8_vars_Str_2177 = "", local5_Varis_2178 = new GLBArray();
			func14_ImplicitDefine();
			local8_vars_Str_2177 = "";
			func8_GetVaris(unref(local5_Varis_2178), -(1), 0);
			var forEachSaver14540 = local5_Varis_2178;
			for(var forEachCounter14540 = 0 ; forEachCounter14540 < forEachSaver14540.values.length ; forEachCounter14540++) {
				var local4_Vari_2179 = forEachSaver14540.values[forEachCounter14540];
			{
					local8_vars_Str_2177 = ((((local8_vars_Str_2177) + (global8_Compiler.attr5_Varis_ref[0].arrAccess(local4_Vari_2179).values[tmpPositionCache][0].attr8_Name_Str))) + (", "));
					
				}
				forEachSaver14540.values[forEachCounter14540] = local4_Vari_2179;
			
			};
			func5_Error((((((((("Unknown variable/function: ") + (func14_GetCurrent_Str()))) + (" possible variables: '"))) + (local8_vars_Str_2177))) + ("'")), 722, "Parser.gbas");
			
		};
		
	};
	return 0;
	
};
func6_Factor = window['func6_Factor'];
window['func8_FixError'] = function() {
	func7_GetNext();
	if (((func7_IsToken("\n")) ? 0 : 1)) {
		while (((((((func9_IsKeyword()) == (0)) ? 1 : 0)) && ((((func7_IsToken("\n")) == (0)) ? 1 : 0))) ? 1 : 0)) {
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
			var local5_found_2198 = 0;
			func5_Start();
			func5_Scope("__EOFFILE__", -(1));
			var forEachSaver14612 = global8_Compiler.attr5_Funcs_ref[0];
			for(var forEachCounter14612 = 0 ; forEachCounter14612 < forEachSaver14612.values.length ; forEachCounter14612++) {
				var local4_func_ref_2180 = forEachSaver14612.values[forEachCounter14612];
			{
					if (((((((local4_func_ref_2180[0].attr3_Typ) == (2)) ? 1 : 0)) || ((((local4_func_ref_2180[0].attr3_Typ) == (3)) ? 1 : 0))) ? 1 : 0)) {
						local4_func_ref_2180[0].attr10_PlzCompile = 1;
						
					};
					
				}
				forEachSaver14612.values[forEachCounter14612] = local4_func_ref_2180;
			
			};
			while (1) {
				var local5_Found_2181 = 0;
				local5_Found_2181 = 0;
				var forEachSaver14650 = global8_Compiler.attr5_Funcs_ref[0];
				for(var forEachCounter14650 = 0 ; forEachCounter14650 < forEachSaver14650.values.length ; forEachCounter14650++) {
					var local4_func_ref_2182 = forEachSaver14650.values[forEachCounter14650];
				{
						if ((((local4_func_ref_2182[0].attr10_PlzCompile) && ((((local4_func_ref_2182[0].attr3_Scp) == (-(1))) ? 1 : 0))) ? 1 : 0)) {
							if (func11_CompileFunc(unref(local4_func_ref_2182[0]))) {
								local5_Found_2181 = 1;
								
							};
							
						};
						
					}
					forEachSaver14650.values[forEachCounter14650] = local4_func_ref_2182;
				
				};
				if ((((local5_Found_2181) == (0)) ? 1 : 0)) {
					break;
					
				};
				
			};
			{
				var local1_i_2183 = 0.0;
				for (local1_i_2183 = 0;toCheck(local1_i_2183, ((global10_LastExprID) - (1)), 1);local1_i_2183 += 1) {
					var alias4_Expr_ref_2184 = [new type4_Expr()];
					alias4_Expr_ref_2184 = global5_Exprs_ref[0].arrAccess(~~(local1_i_2183)).values[tmpPositionCache] /* ALIAS */;
					if (((((((alias4_Expr_ref_2184[0].attr3_Typ) == (6)) ? 1 : 0)) || ((((alias4_Expr_ref_2184[0].attr3_Typ) == (23)) ? 1 : 0))) ? 1 : 0)) {
						if (((((((BOUNDS(alias4_Expr_ref_2184[0].attr6_Params, 0)) < (BOUNDS(global8_Compiler.attr5_Funcs_ref[0].arrAccess(alias4_Expr_ref_2184[0].attr4_func).values[tmpPositionCache][0].attr6_Params, 0))) ? 1 : 0)) && ((((alias4_Expr_ref_2184[0].attr8_wasAdded) == (0)) ? 1 : 0))) ? 1 : 0)) {
							var local4_Meth_2185 = 0, local7_TmpSave_2186 = 0;
							alias4_Expr_ref_2184[0].attr8_wasAdded = 1;
							local4_Meth_2185 = 0;
							if ((((global8_Compiler.attr5_Funcs_ref[0].arrAccess(alias4_Expr_ref_2184[0].attr4_func).values[tmpPositionCache][0].attr3_Typ) == (3)) ? 1 : 0)) {
								if ((((BOUNDS(alias4_Expr_ref_2184[0].attr6_Params, 0)) == (0)) ? 1 : 0)) {
									func5_Error((((("Internal error (method '") + (global8_Compiler.attr5_Funcs_ref[0].arrAccess(alias4_Expr_ref_2184[0].attr4_func).values[tmpPositionCache][0].attr8_Name_Str))) + ("' didn't get self parameter)")), 798, "Parser.gbas");
									
								};
								local4_Meth_2185 = 1;
								local7_TmpSave_2186 = alias4_Expr_ref_2184[0].attr6_Params.arrAccess(-(1)).values[tmpPositionCache];
								DIMDEL(alias4_Expr_ref_2184[0].attr6_Params, -(1));
								
							};
							{
								for (local1_i_2183 = BOUNDS(alias4_Expr_ref_2184[0].attr6_Params, 0);toCheck(local1_i_2183, ((((BOUNDS(global8_Compiler.attr5_Funcs_ref[0].arrAccess(alias4_Expr_ref_2184[0].attr4_func).values[tmpPositionCache][0].attr6_Params, 0)) - (1))) - (local4_Meth_2185)), 1);local1_i_2183 += 1) {
									if ((((global8_Compiler.attr5_Varis_ref[0].arrAccess(global8_Compiler.attr5_Funcs_ref[0].arrAccess(alias4_Expr_ref_2184[0].attr4_func).values[tmpPositionCache][0].attr6_Params.arrAccess(~~(local1_i_2183)).values[tmpPositionCache]).values[tmpPositionCache][0].attr6_PreDef) != (-(1))) ? 1 : 0)) {
										DIMPUSH(alias4_Expr_ref_2184[0].attr6_Params, global8_Compiler.attr5_Varis_ref[0].arrAccess(global8_Compiler.attr5_Funcs_ref[0].arrAccess(alias4_Expr_ref_2184[0].attr4_func).values[tmpPositionCache][0].attr6_Params.arrAccess(~~(local1_i_2183)).values[tmpPositionCache]).values[tmpPositionCache][0].attr6_PreDef);
										
									};
									
								};
								
							};
							if (local4_Meth_2185) {
								DIMPUSH(alias4_Expr_ref_2184[0].attr6_Params, local7_TmpSave_2186);
								
							};
							
						};
						
					};
					
				};
				
			};
			func15_CheckPrototypes();
			{
				var local1_i_2187 = 0.0;
				for (local1_i_2187 = 0;toCheck(local1_i_2187, ((global10_LastExprID) - (1)), 1);local1_i_2187 += 1) {
					if (((((((global5_Exprs_ref[0].arrAccess(~~(local1_i_2187)).values[tmpPositionCache][0].attr3_Typ) == (6)) ? 1 : 0)) || ((((global5_Exprs_ref[0].arrAccess(~~(local1_i_2187)).values[tmpPositionCache][0].attr3_Typ) == (23)) ? 1 : 0))) ? 1 : 0)) {
						var local4_Meth_2188 = 0;
						local4_Meth_2188 = 0;
						if ((((global8_Compiler.attr5_Funcs_ref[0].arrAccess(global5_Exprs_ref[0].arrAccess(~~(local1_i_2187)).values[tmpPositionCache][0].attr4_func).values[tmpPositionCache][0].attr3_Typ) == (3)) ? 1 : 0)) {
							local4_Meth_2188 = 1;
							
						};
						global8_Compiler.attr11_currentPosi = global5_Exprs_ref[0].arrAccess(~~(local1_i_2187)).values[tmpPositionCache][0].attr5_tokID;
						if ((((BOUNDS(global5_Exprs_ref[0].arrAccess(~~(local1_i_2187)).values[tmpPositionCache][0].attr6_Params, 0)) == (BOUNDS(global8_Compiler.attr5_Funcs_ref[0].arrAccess(global5_Exprs_ref[0].arrAccess(~~(local1_i_2187)).values[tmpPositionCache][0].attr4_func).values[tmpPositionCache][0].attr6_Params, 0))) ? 1 : 0)) {
							var local1_j_2189 = 0.0, local9_NewParams_2190 = new GLBArray();
							local1_j_2189 = 0;
							var forEachSaver15077 = global5_Exprs_ref[0].arrAccess(~~(local1_i_2187)).values[tmpPositionCache][0].attr6_Params;
							for(var forEachCounter15077 = 0 ; forEachCounter15077 < forEachSaver15077.values.length ; forEachCounter15077++) {
								var local1_P_2191 = forEachSaver15077.values[forEachCounter15077];
							{
									var local1_S_2192 = 0, local3_Tmp_2193 = 0;
									local1_S_2192 = 0;
									if (global8_Compiler.attr5_Varis_ref[0].arrAccess(global8_Compiler.attr5_Funcs_ref[0].arrAccess(global5_Exprs_ref[0].arrAccess(~~(local1_i_2187)).values[tmpPositionCache][0].attr4_func).values[tmpPositionCache][0].attr6_Params.arrAccess(~~(local1_j_2189)).values[tmpPositionCache]).values[tmpPositionCache][0].attr3_ref) {
										global8_Compiler.attr5_Varis_ref[0].arrAccess(func11_GetVariable(local1_P_2191, 1)).values[tmpPositionCache][0].attr3_ref = 1;
										local1_S_2192 = 1;
										
									};
									if (((local1_S_2192) ? 0 : 1)) {
										local3_Tmp_2193 = func14_EnsureDatatype(local1_P_2191, global8_Compiler.attr5_Varis_ref[0].arrAccess(global8_Compiler.attr5_Funcs_ref[0].arrAccess(global5_Exprs_ref[0].arrAccess(~~(local1_i_2187)).values[tmpPositionCache][0].attr4_func).values[tmpPositionCache][0].attr6_Params.arrAccess(~~(local1_j_2189)).values[tmpPositionCache]).values[tmpPositionCache][0].attr8_datatype, 847, local1_S_2192);
										
									} else {
										local3_Tmp_2193 = local1_P_2191;
										
									};
									DIMPUSH(local9_NewParams_2190, local3_Tmp_2193);
									local1_j_2189+=1;
									
								}
								forEachSaver15077.values[forEachCounter15077] = local1_P_2191;
							
							};
							global5_Exprs_ref[0].arrAccess(~~(local1_i_2187)).values[tmpPositionCache][0].attr6_Params = local9_NewParams_2190.clone(/* In Assign */);
							
						} else {
							var local8_miss_Str_2194 = "", local9_datas_Str_2195 = "";
							local8_miss_Str_2194 = "";
							if ((((BOUNDS(global5_Exprs_ref[0].arrAccess(~~(local1_i_2187)).values[tmpPositionCache][0].attr6_Params, 0)) < (BOUNDS(global8_Compiler.attr5_Funcs_ref[0].arrAccess(global5_Exprs_ref[0].arrAccess(~~(local1_i_2187)).values[tmpPositionCache][0].attr4_func).values[tmpPositionCache][0].attr6_Params, 0))) ? 1 : 0)) {
								{
									var local1_j_2196 = 0.0;
									for (local1_j_2196 = BOUNDS(global5_Exprs_ref[0].arrAccess(~~(local1_i_2187)).values[tmpPositionCache][0].attr6_Params, 0);toCheck(local1_j_2196, ((((BOUNDS(global8_Compiler.attr5_Funcs_ref[0].arrAccess(global5_Exprs_ref[0].arrAccess(~~(local1_i_2187)).values[tmpPositionCache][0].attr4_func).values[tmpPositionCache][0].attr6_Params, 0)) - (1))) - (local4_Meth_2188)), 1);local1_j_2196 += 1) {
										local8_miss_Str_2194 = ((((local8_miss_Str_2194) + (global8_Compiler.attr5_Varis_ref[0].arrAccess(global8_Compiler.attr5_Funcs_ref[0].arrAccess(global5_Exprs_ref[0].arrAccess(~~(local1_i_2187)).values[tmpPositionCache][0].attr4_func).values[tmpPositionCache][0].attr6_Params.arrAccess(~~(local1_j_2196)).values[tmpPositionCache]).values[tmpPositionCache][0].attr8_Name_Str))) + (", "));
										
									};
									
								};
								
							} else if ((((BOUNDS(global5_Exprs_ref[0].arrAccess(~~(local1_i_2187)).values[tmpPositionCache][0].attr6_Params, 0)) > (BOUNDS(global8_Compiler.attr5_Funcs_ref[0].arrAccess(global5_Exprs_ref[0].arrAccess(~~(local1_i_2187)).values[tmpPositionCache][0].attr4_func).values[tmpPositionCache][0].attr6_Params, 0))) ? 1 : 0)) {
								{
									var local1_j_2197 = 0.0;
									for (local1_j_2197 = BOUNDS(global8_Compiler.attr5_Funcs_ref[0].arrAccess(global5_Exprs_ref[0].arrAccess(~~(local1_i_2187)).values[tmpPositionCache][0].attr4_func).values[tmpPositionCache][0].attr6_Params, 0);toCheck(local1_j_2197, ((((BOUNDS(global5_Exprs_ref[0].arrAccess(~~(local1_i_2187)).values[tmpPositionCache][0].attr6_Params, 0)) - (local4_Meth_2188))) - (1)), 1);local1_j_2197 += 1) {
										if ((((global5_Exprs_ref[0].arrAccess(~~(local1_i_2187)).values[tmpPositionCache][0].attr6_Params.arrAccess(~~(local1_j_2197)).values[tmpPositionCache]) < (BOUNDS(global8_Compiler.attr5_Varis_ref[0], 0))) ? 1 : 0)) {
											local9_datas_Str_2195 = ((((local9_datas_Str_2195) + (global8_Compiler.attr5_Varis_ref[0].arrAccess(global5_Exprs_ref[0].arrAccess(~~(local1_i_2187)).values[tmpPositionCache][0].attr6_Params.arrAccess(~~(local1_j_2197)).values[tmpPositionCache]).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str_ref[0]))) + (", "));
											
										};
										
									};
									
								};
								
							};
							global8_Compiler.attr11_currentPosi = global5_Exprs_ref[0].arrAccess(~~(local1_i_2187)).values[tmpPositionCache][0].attr5_tokID;
							if ((((BOUNDS(global5_Exprs_ref[0].arrAccess(~~(local1_i_2187)).values[tmpPositionCache][0].attr6_Params, 0)) > (BOUNDS(global8_Compiler.attr5_Funcs_ref[0].arrAccess(global5_Exprs_ref[0].arrAccess(~~(local1_i_2187)).values[tmpPositionCache][0].attr4_func).values[tmpPositionCache][0].attr6_Params, 0))) ? 1 : 0)) {
								func5_Error((((((((((((((((("Too many parameters, function '") + (global8_Compiler.attr5_Funcs_ref[0].arrAccess(global5_Exprs_ref[0].arrAccess(~~(local1_i_2187)).values[tmpPositionCache][0].attr4_func).values[tmpPositionCache][0].attr8_Name_Str))) + ("' has: '"))) + (CAST2STRING(((BOUNDS(global8_Compiler.attr5_Funcs_ref[0].arrAccess(global5_Exprs_ref[0].arrAccess(~~(local1_i_2187)).values[tmpPositionCache][0].attr4_func).values[tmpPositionCache][0].attr6_Params, 0)) - (local4_Meth_2188)))))) + ("' got '"))) + (CAST2STRING(BOUNDS(global5_Exprs_ref[0].arrAccess(~~(local1_i_2187)).values[tmpPositionCache][0].attr6_Params, 0))))) + ("' datatypes '"))) + (local9_datas_Str_2195))) + ("'")), 870, "Parser.gbas");
								
							} else if ((((BOUNDS(global5_Exprs_ref[0].arrAccess(~~(local1_i_2187)).values[tmpPositionCache][0].attr6_Params, 0)) < (BOUNDS(global8_Compiler.attr5_Funcs_ref[0].arrAccess(global5_Exprs_ref[0].arrAccess(~~(local1_i_2187)).values[tmpPositionCache][0].attr4_func).values[tmpPositionCache][0].attr6_Params, 0))) ? 1 : 0)) {
								func5_Error((((((((((((((((("Too less parameters, function '") + (global8_Compiler.attr5_Funcs_ref[0].arrAccess(global5_Exprs_ref[0].arrAccess(~~(local1_i_2187)).values[tmpPositionCache][0].attr4_func).values[tmpPositionCache][0].attr8_Name_Str))) + ("' has: '"))) + (CAST2STRING(((BOUNDS(global8_Compiler.attr5_Funcs_ref[0].arrAccess(global5_Exprs_ref[0].arrAccess(~~(local1_i_2187)).values[tmpPositionCache][0].attr4_func).values[tmpPositionCache][0].attr6_Params, 0)) - (local4_Meth_2188)))))) + ("' got '"))) + (CAST2STRING(BOUNDS(global5_Exprs_ref[0].arrAccess(~~(local1_i_2187)).values[tmpPositionCache][0].attr6_Params, 0))))) + ("' missing '"))) + (local8_miss_Str_2194))) + ("'")), 872, "Parser.gbas");
								
							} else {
								func5_Error((((((((("Internal error (wtf? call: ") + (CAST2STRING(BOUNDS(global5_Exprs_ref[0].arrAccess(~~(local1_i_2187)).values[tmpPositionCache][0].attr6_Params, 0))))) + (", "))) + (CAST2STRING(BOUNDS(global8_Compiler.attr5_Funcs_ref[0].arrAccess(global5_Exprs_ref[0].arrAccess(~~(local1_i_2187)).values[tmpPositionCache][0].attr4_func).values[tmpPositionCache][0].attr6_Params, 0))))) + (")")), 874, "Parser.gbas");
								
							};
							
						};
						
					};
					
				};
				
			};
			func15_CheckPrototypes();
			local5_found_2198 = 1;
			while (local5_found_2198) {
				local5_found_2198 = 0;
				{
					var local1_i_2199 = 0.0;
					for (local1_i_2199 = 0;toCheck(local1_i_2199, ((global10_LastExprID) - (1)), 1);local1_i_2199 += 1) {
						var alias1_E_ref_2200 = [new type4_Expr()], local3_set_2201 = 0, local4_Vari_2202 = 0, local3_var_2203 = 0;
						alias1_E_ref_2200 = global5_Exprs_ref[0].arrAccess(~~(local1_i_2199)).values[tmpPositionCache] /* ALIAS */;
						local3_set_2201 = 0;
						{
							var local17___SelectHelper19__2204 = 0;
							local17___SelectHelper19__2204 = alias1_E_ref_2200[0].attr3_Typ;
							if ((((local17___SelectHelper19__2204) == (~~(40))) ? 1 : 0)) {
								local4_Vari_2202 = alias1_E_ref_2200[0].attr4_vari;
								local3_var_2203 = func11_GetVariable(alias1_E_ref_2200[0].attr4_expr, 0);
								local3_set_2201 = 1;
								
							} else if ((((local17___SelectHelper19__2204) == (~~(38))) ? 1 : 0)) {
								local4_Vari_2202 = alias1_E_ref_2200[0].attr6_inExpr;
								local3_var_2203 = func11_GetVariable(alias1_E_ref_2200[0].attr7_varExpr, 0);
								local3_set_2201 = 1;
								
							} else if ((((local17___SelectHelper19__2204) == (~~(6))) ? 1 : 0)) {
								
							};
							
						};
						if ((((local3_set_2201) && ((((local3_var_2203) >= (0)) ? 1 : 0))) ? 1 : 0)) {
							var local1_v_2205 = 0;
							local1_v_2205 = func11_GetVariable(local4_Vari_2202, 1);
							if ((((global8_Compiler.attr5_Varis_ref[0].arrAccess(local3_var_2203).values[tmpPositionCache][0].attr3_ref) != (global8_Compiler.attr5_Varis_ref[0].arrAccess(local1_v_2205).values[tmpPositionCache][0].attr3_ref)) ? 1 : 0)) {
								local5_found_2198 = 1;
								
							};
							global8_Compiler.attr5_Varis_ref[0].arrAccess(local3_var_2203).values[tmpPositionCache][0].attr3_ref = global8_Compiler.attr5_Varis_ref[0].arrAccess(local1_v_2205).values[tmpPositionCache][0].attr3_ref;
							
						};
						
					};
					
				};
				
			};
			{
				var local1_i_2206 = 0.0;
				for (local1_i_2206 = 0;toCheck(local1_i_2206, ((global10_LastExprID) - (1)), 1);local1_i_2206 += 1) {
					var alias4_Expr_ref_2207 = [new type4_Expr()];
					alias4_Expr_ref_2207 = global5_Exprs_ref[0].arrAccess(~~(local1_i_2206)).values[tmpPositionCache] /* ALIAS */;
					{
						var local17___SelectHelper20__2208 = 0;
						local17___SelectHelper20__2208 = alias4_Expr_ref_2207[0].attr3_Typ;
						if ((((local17___SelectHelper20__2208) == (~~(2))) ? 1 : 0)) {
							if ((((((((((alias4_Expr_ref_2207[0].attr6_ScpTyp) == (2)) ? 1 : 0)) || ((((alias4_Expr_ref_2207[0].attr6_ScpTyp) == (4)) ? 1 : 0))) ? 1 : 0)) && (BOUNDS(alias4_Expr_ref_2207[0].attr5_Gotos, 0))) ? 1 : 0)) {
								if (((func12_ScopeHasGoto(unref(alias4_Expr_ref_2207[0]))) ? 0 : 1)) {
									func5_Error("Internal Error (There is a goto, but I can't find it)", 937, "Parser.gbas");
									
								};
								var forEachSaver15762 = alias4_Expr_ref_2207[0].attr5_Gotos;
								for(var forEachCounter15762 = 0 ; forEachCounter15762 < forEachSaver15762.values.length ; forEachCounter15762++) {
									var local1_G_2209 = forEachSaver15762.values[forEachCounter15762];
								{
										var local5_Found_2210 = 0;
										local5_Found_2210 = 0;
										var forEachSaver15735 = alias4_Expr_ref_2207[0].attr6_Labels;
										for(var forEachCounter15735 = 0 ; forEachCounter15735 < forEachSaver15735.values.length ; forEachCounter15735++) {
											var local1_L_2211 = forEachSaver15735.values[forEachCounter15735];
										{
												if ((((global5_Exprs_ref[0].arrAccess(local1_L_2211).values[tmpPositionCache][0].attr8_Name_Str) == (global5_Exprs_ref[0].arrAccess(local1_G_2209).values[tmpPositionCache][0].attr8_Name_Str)) ? 1 : 0)) {
													local5_Found_2210 = 1;
													break;
													
												};
												
											}
											forEachSaver15735.values[forEachCounter15735] = local1_L_2211;
										
										};
										if (((local5_Found_2210) ? 0 : 1)) {
											global8_Compiler.attr11_currentPosi = global5_Exprs_ref[0].arrAccess(local1_G_2209).values[tmpPositionCache][0].attr5_tokID;
											func5_Error((((("Label '") + (global5_Exprs_ref[0].arrAccess(local1_G_2209).values[tmpPositionCache][0].attr8_Name_Str))) + ("' does not exist, please use an existing label badass!")), 948, "Parser.gbas");
											
										};
										
									}
									forEachSaver15762.values[forEachCounter15762] = local1_G_2209;
								
								};
								
							};
							
						};
						
					};
					
				};
				
			};
			var forEachSaver15781 = global8_Compiler.attr5_Types_ref[0];
			for(var forEachCounter15781 = 0 ; forEachCounter15781 < forEachSaver15781.values.length ; forEachCounter15781++) {
				var local3_Typ_ref_2212 = forEachSaver15781.values[forEachCounter15781];
			{
					local3_Typ_ref_2212[0].attr8_Name_Str = func18_ChangeTypeName_Str(local3_Typ_ref_2212[0].attr8_Name_Str);
					
				}
				forEachSaver15781.values[forEachCounter15781] = local3_Typ_ref_2212;
			
			};
			var forEachSaver15791 = global8_Compiler.attr5_Funcs_ref[0];
			for(var forEachCounter15791 = 0 ; forEachCounter15791 < forEachSaver15791.values.length ; forEachCounter15791++) {
				var local4_Func_ref_2213 = forEachSaver15791.values[forEachCounter15791];
			{
					func14_ChangeFuncName(unref(local4_Func_ref_2213[0]));
					
				}
				forEachSaver15791.values[forEachCounter15791] = local4_Func_ref_2213;
			
			};
			var forEachSaver15801 = global8_Compiler.attr5_Varis_ref[0];
			for(var forEachCounter15801 = 0 ; forEachCounter15801 < forEachSaver15801.values.length ; forEachCounter15801++) {
				var local4_Vari_ref_2214 = forEachSaver15801.values[forEachCounter15801];
			{
					func13_ChangeVarName(unref(local4_Vari_ref_2214[0]));
					
				}
				forEachSaver15801.values[forEachCounter15801] = local4_Vari_ref_2214;
			
			};
			var forEachSaver15837 = global8_Compiler.attr5_Varis_ref[0];
			for(var forEachCounter15837 = 0 ; forEachCounter15837 < forEachSaver15837.values.length ; forEachCounter15837++) {
				var local1_V_ref_2215 = forEachSaver15837.values[forEachCounter15837];
			{
					if (((((((local1_V_ref_2215[0].attr3_Typ) == (1)) ? 1 : 0)) || ((((local1_V_ref_2215[0].attr3_Typ) == (7)) ? 1 : 0))) ? 1 : 0)) {
						local1_V_ref_2215[0].attr8_Name_Str = ((((local1_V_ref_2215[0].attr8_Name_Str) + ("_"))) + (CAST2STRING(local1_V_ref_2215[0].attr2_ID)));
						
					};
					
				}
				forEachSaver15837.values[forEachCounter15837] = local1_V_ref_2215;
			
			};
			{
				var local1_i_2216 = 0.0;
				for (local1_i_2216 = 0;toCheck(local1_i_2216, ((global10_LastExprID) - (1)), 1);local1_i_2216 += 1) {
					var alias1_E_ref_2217 = [new type4_Expr()];
					alias1_E_ref_2217 = global5_Exprs_ref[0].arrAccess(~~(local1_i_2216)).values[tmpPositionCache] /* ALIAS */;
					if (((((((((((((alias1_E_ref_2217[0].attr8_datatype.attr8_Name_Str_ref[0]) == ("void")) ? 1 : 0)) || ((((alias1_E_ref_2217[0].attr8_datatype.attr8_Name_Str_ref[0]) == ("int")) ? 1 : 0))) ? 1 : 0)) || ((((alias1_E_ref_2217[0].attr8_datatype.attr8_Name_Str_ref[0]) == ("float")) ? 1 : 0))) ? 1 : 0)) || ((((alias1_E_ref_2217[0].attr8_datatype.attr8_Name_Str_ref[0]) == ("string")) ? 1 : 0))) ? 1 : 0)) {
						
					} else {
						if ((((func6_IsType(unref(alias1_E_ref_2217[0].attr8_datatype.attr8_Name_Str_ref[0]))) == (0)) ? 1 : 0)) {
							var forEachSaver15928 = global8_Compiler.attr5_Funcs_ref[0];
							for(var forEachCounter15928 = 0 ; forEachCounter15928 < forEachSaver15928.values.length ; forEachCounter15928++) {
								var local1_F_ref_2218 = forEachSaver15928.values[forEachCounter15928];
							{
									if ((((alias1_E_ref_2217[0].attr8_datatype.attr8_Name_Str_ref[0]) == (local1_F_ref_2218[0].attr9_OName_Str)) ? 1 : 0)) {
										alias1_E_ref_2217[0].attr8_datatype.attr8_Name_Str_ref[0] = local1_F_ref_2218[0].attr8_Name_Str;
										
									};
									
								}
								forEachSaver15928.values[forEachCounter15928] = local1_F_ref_2218;
							
							};
							
						};
						
					};
					
				};
				
			};
			func23_ManageFuncParamOverlaps();
			
		} catch (Err_Str) {
			if (Err_Str instanceof GLBException) Err_Str = Err_Str.getText(); else throwError(Err_Str);{
				
			}
		};
		
	};
	return 0;
	
};
func6_Parser = window['func6_Parser'];
window['func15_CheckPrototypes'] = function() {
	if ((((BOUNDS(global8_Compiler.attr13_protoCheckers, 0)) > (0)) ? 1 : 0)) {
		var forEachSaver16117 = global8_Compiler.attr13_protoCheckers;
		for(var forEachCounter16117 = 0 ; forEachCounter16117 < forEachSaver16117.values.length ; forEachCounter16117++) {
			var local7_checker_2220 = forEachSaver16117.values[forEachCounter16117];
		{
				var alias5_func1_ref_2221 = [new type14_IdentifierFunc()], alias5_func2_ref_2222 = [new type14_IdentifierFunc()], local5_valid_2223 = 0;
				alias5_func1_ref_2221 = global8_Compiler.attr5_Funcs_ref[0].arrAccess(local7_checker_2220.attr8_fromFunc).values[tmpPositionCache] /* ALIAS */;
				alias5_func2_ref_2222 = global8_Compiler.attr5_Funcs_ref[0].arrAccess(local7_checker_2220.attr6_toFunc).values[tmpPositionCache] /* ALIAS */;
				local5_valid_2223 = 0;
				if (((((((alias5_func1_ref_2221[0].attr8_datatype.attr8_Name_Str_ref[0]) == (alias5_func2_ref_2222[0].attr8_datatype.attr8_Name_Str_ref[0])) ? 1 : 0)) && ((((alias5_func1_ref_2221[0].attr8_datatype.attr7_IsArray_ref[0]) == (alias5_func2_ref_2222[0].attr8_datatype.attr7_IsArray_ref[0])) ? 1 : 0))) ? 1 : 0)) {
					if ((((BOUNDS(alias5_func1_ref_2221[0].attr6_Params, 0)) == (BOUNDS(alias5_func2_ref_2222[0].attr6_Params, 0))) ? 1 : 0)) {
						local5_valid_2223 = 1;
						{
							var local1_i_2224 = 0.0;
							for (local1_i_2224 = 0;toCheck(local1_i_2224, ((BOUNDS(alias5_func1_ref_2221[0].attr6_Params, 0)) - (1)), 1);local1_i_2224 += 1) {
								var alias2_p1_ref_2225 = [new type14_IdentifierVari()], alias2_p2_ref_2226 = [new type14_IdentifierVari()];
								alias2_p1_ref_2225 = global8_Compiler.attr5_Varis_ref[0].arrAccess(alias5_func1_ref_2221[0].attr6_Params.arrAccess(~~(local1_i_2224)).values[tmpPositionCache]).values[tmpPositionCache] /* ALIAS */;
								alias2_p2_ref_2226 = global8_Compiler.attr5_Varis_ref[0].arrAccess(alias5_func2_ref_2222[0].attr6_Params.arrAccess(~~(local1_i_2224)).values[tmpPositionCache]).values[tmpPositionCache] /* ALIAS */;
								if (((((((alias2_p1_ref_2225[0].attr8_datatype.attr8_Name_Str_ref[0]) != (alias2_p2_ref_2226[0].attr8_datatype.attr8_Name_Str_ref[0])) ? 1 : 0)) || ((((alias2_p1_ref_2225[0].attr8_datatype.attr7_IsArray_ref[0]) != (alias2_p2_ref_2226[0].attr8_datatype.attr7_IsArray_ref[0])) ? 1 : 0))) ? 1 : 0)) {
									local5_valid_2223 = 0;
									
								};
								
							};
							
						};
						
					};
					
				};
				if ((((local5_valid_2223) == (0)) ? 1 : 0)) {
					func5_Error((((((((("Cannot cast prototype '") + (func17_BuildPrototyp_Str(local7_checker_2220.attr8_fromFunc)))) + ("' to '"))) + (func17_BuildPrototyp_Str(local7_checker_2220.attr6_toFunc)))) + ("'")), 1031, "Parser.gbas");
					
				};
				
			}
			forEachSaver16117.values[forEachCounter16117] = local7_checker_2220;
		
		};
		REDIM(global8_Compiler.attr13_protoCheckers, [0], new type12_ProtoChecker() );
		
	};
	return 0;
	
};
func15_CheckPrototypes = window['func15_CheckPrototypes'];
window['func5_Scope'] = function(param12_CloseStr_Str, param4_func) {
	var local6_ScpTyp_2229 = 0, local9_Important_2230 = 0, local7_befLoop_2232 = 0, local8_TmpScope_2233 = 0.0, local12_TmpImportant_2234 = 0, local7_OneLine_2237 = 0, local13_OCloseStr_Str_2238 = "", local7_MyScope_2245 = 0;
	var local12_CloseStr_Str_ref_2227 = [param12_CloseStr_Str]; /* NEWCODEHERE */
	local6_ScpTyp_2229 = 0;
	local9_Important_2230 = 0;
	{
		var local17___SelectHelper21__2231 = "";
		local17___SelectHelper21__2231 = local12_CloseStr_Str_ref_2227[0];
		if ((((local17___SelectHelper21__2231) == ("ENDIF")) ? 1 : 0)) {
			local6_ScpTyp_2229 = ~~(1);
			
		} else if ((((local17___SelectHelper21__2231) == ("ENDSELECT")) ? 1 : 0)) {
			local6_ScpTyp_2229 = ~~(6);
			
		} else if ((((local17___SelectHelper21__2231) == ("WEND")) ? 1 : 0)) {
			local6_ScpTyp_2229 = ~~(3);
			
		} else if ((((local17___SelectHelper21__2231) == ("UNTIL")) ? 1 : 0)) {
			local6_ScpTyp_2229 = ~~(3);
			
		} else if ((((local17___SelectHelper21__2231) == ("NEXT")) ? 1 : 0)) {
			local6_ScpTyp_2229 = ~~(3);
			
		} else if ((((local17___SelectHelper21__2231) == ("ENDFUNCTION")) ? 1 : 0)) {
			local6_ScpTyp_2229 = ~~(2);
			local9_Important_2230 = 1;
			
		} else if ((((local17___SelectHelper21__2231) == ("ENDSUB")) ? 1 : 0)) {
			local6_ScpTyp_2229 = ~~(2);
			local9_Important_2230 = 1;
			
		} else if ((((local17___SelectHelper21__2231) == ("CATCH")) ? 1 : 0)) {
			local6_ScpTyp_2229 = ~~(5);
			
		} else if ((((local17___SelectHelper21__2231) == ("FINALLY")) ? 1 : 0)) {
			local6_ScpTyp_2229 = ~~(5);
			
		} else if ((((local17___SelectHelper21__2231) == ("__EOFFILE__")) ? 1 : 0)) {
			local6_ScpTyp_2229 = ~~(4);
			local9_Important_2230 = 1;
			
		} else {
			func5_Error("Internal error (unknown scope type)", 1068, "Parser.gbas");
			
		};
		
	};
	local7_befLoop_2232 = global8_Compiler.attr6_inLoop;
	if ((((local6_ScpTyp_2229) == (3)) ? 1 : 0)) {
		global8_Compiler.attr6_inLoop = 1;
		
	};
	local8_TmpScope_2233 = global8_Compiler.attr12_CurrentScope;
	local12_TmpImportant_2234 = global8_Compiler.attr14_ImportantScope;
	global8_Compiler.attr12_CurrentScope = func21_CreateScopeExpression(local6_ScpTyp_2229);
	if ((((local12_CloseStr_Str_ref_2227[0]) == ("__EOFFILE__")) ? 1 : 0)) {
		global8_Compiler.attr9_MainScope = global8_Compiler.attr12_CurrentScope;
		
	};
	if (local9_Important_2230) {
		global8_Compiler.attr14_ImportantScope = global8_Compiler.attr12_CurrentScope;
		
	};
	if (((((((local6_ScpTyp_2229) == (2)) ? 1 : 0)) && ((((param4_func) != (-(1))) ? 1 : 0))) ? 1 : 0)) {
		var forEachSaver16347 = global8_Compiler.attr5_Funcs_ref[0].arrAccess(param4_func).values[tmpPositionCache][0].attr6_Params;
		for(var forEachCounter16347 = 0 ; forEachCounter16347 < forEachSaver16347.values.length ; forEachCounter16347++) {
			var local5_param_2235 = forEachSaver16347.values[forEachCounter16347];
		{
				var local4_vari_2236 = new type14_IdentifierVari();
				local4_vari_2236 = global8_Compiler.attr5_Varis_ref[0].arrAccess(local5_param_2235).values[tmpPositionCache][0].clone(/* In Assign */);
				local4_vari_2236.attr3_Typ = ~~(1);
				func11_AddVariable(local4_vari_2236, 1);
				DIMPUSH(global5_Exprs_ref[0].arrAccess(global8_Compiler.attr12_CurrentScope).values[tmpPositionCache][0].attr5_Varis, ((BOUNDS(global8_Compiler.attr5_Varis_ref[0], 0)) - (1)));
				DIMPUSH(global8_Compiler.attr5_Funcs_ref[0].arrAccess(param4_func).values[tmpPositionCache][0].attr10_CopyParams, ((BOUNDS(global8_Compiler.attr5_Varis_ref[0], 0)) - (1)));
				
			}
			forEachSaver16347.values[forEachCounter16347] = local5_param_2235;
		
		};
		
	};
	local7_OneLine_2237 = 0;
	if (func7_IsToken("THEN")) {
		local7_OneLine_2237 = 1;
		func5_Match("THEN", 1097, "Parser.gbas");
		
	};
	local13_OCloseStr_Str_2238 = local12_CloseStr_Str_ref_2227[0];
	while ((((func7_IsToken(func13_IsClosing_Str(local12_CloseStr_Str_ref_2227, local6_ScpTyp_2229))) == (0)) ? 1 : 0)) {
		if ((((func8_EOFParse()) == (0)) ? 1 : 0)) {
			func5_Error((("Missing closing: ") + (local12_CloseStr_Str_ref_2227[0])), 1101, "Parser.gbas");
			
		};
		{
			var Err_Str = "";
			try {
				var local4_Expr_2239 = 0;
				local4_Expr_2239 = -(1);
				if (func7_IsToken("LET")) {
					func5_Match("LET", 1108, "Parser.gbas");
					if ((((func12_IsIdentifier(0)) == (0)) ? 1 : 0)) {
						func5_Error("Expecting identifier after LET.", 1110, "Parser.gbas");
						
					};
					
				};
				if (func7_IsToken("GOSUB")) {
					func5_Match("GOSUB", 1114, "Parser.gbas");
					if ((((func14_IsFuncExisting(func14_GetCurrent_Str(), 0)) == (0)) ? 1 : 0)) {
						func5_Error("Expecting sub after GOSUB.", 1116, "Parser.gbas");
						
					};
					
				};
				if (func9_IsKeyword()) {
					local4_Expr_2239 = func7_Keyword();
					
				} else if (func12_IsIdentifier(1)) {
					local4_Expr_2239 = func10_Identifier(1);
					
				} else if (func7_IsToken("super")) {
					local4_Expr_2239 = func10_Identifier(1);
					
				} else {
					var local3_pos_2240 = 0, local8_Name_Str_2241 = "";
					local3_pos_2240 = global8_Compiler.attr11_currentPosi;
					local8_Name_Str_2241 = REPLACE_Str(func14_GetCurrent_Str(), "@", "");
					func7_GetNext();
					if (func7_IsToken(":")) {
						var local3_Scp_2242 = 0;
						func5_Match(":", 1132, "Parser.gbas");
						local4_Expr_2239 = func21_CreateLabelExpression(local8_Name_Str_2241);
						local3_Scp_2242 = global8_Compiler.attr12_CurrentScope;
						do {
							var forEachSaver16523 = global5_Exprs_ref[0].arrAccess(local3_Scp_2242).values[tmpPositionCache][0].attr6_Labels;
							for(var forEachCounter16523 = 0 ; forEachCounter16523 < forEachSaver16523.values.length ; forEachCounter16523++) {
								var local3_lbl_2243 = forEachSaver16523.values[forEachCounter16523];
							{
									if ((((global5_Exprs_ref[0].arrAccess(local3_lbl_2243).values[tmpPositionCache][0].attr8_Name_Str) == (local8_Name_Str_2241)) ? 1 : 0)) {
										func10_ResetError((((("Duplicate label identifier '") + (local8_Name_Str_2241))) + ("'")), local3_pos_2240);
										
									};
									
								}
								forEachSaver16523.values[forEachCounter16523] = local3_lbl_2243;
							
							};
							local3_Scp_2242 = global5_Exprs_ref[0].arrAccess(local3_Scp_2242).values[tmpPositionCache][0].attr10_SuperScope;
							
						} while (!(((((((local3_Scp_2242) == (-(1))) ? 1 : 0)) || ((((global5_Exprs_ref[0].arrAccess(local3_Scp_2242).values[tmpPositionCache][0].attr6_ScpTyp) == (2)) ? 1 : 0))) ? 1 : 0)));
						DIMPUSH(global5_Exprs_ref[0].arrAccess(global8_Compiler.attr14_ImportantScope).values[tmpPositionCache][0].attr6_Labels, local4_Expr_2239);
						
					} else {
						if (func7_IsToken("[")) {
							func5_Match("[", 1147, "Parser.gbas");
							func5_Match("]", 1148, "Parser.gbas");
							
						};
						if ((((func7_IsToken("=")) && (((global6_STRICT) ? 0 : 1))) ? 1 : 0)) {
							global8_Compiler.attr11_currentPosi = ((local3_pos_2240) - (1));
							func7_GetNext();
							func14_ImplicitDefine();
							if (func12_IsIdentifier(0)) {
								local4_Expr_2239 = func10_Identifier(1);
								
							} else {
								func5_Error("Internal error (implicit not created)", 1160, "Parser.gbas");
								
							};
							
						} else {
							func10_ResetError("Invalid command (unknown function, variable or keyword).", local3_pos_2240);
							
						};
						
					};
					
				};
				if ((((local4_Expr_2239) != (-(1))) ? 1 : 0)) {
					DIMPUSH(global5_Exprs_ref[0].arrAccess(global8_Compiler.attr12_CurrentScope).values[tmpPositionCache][0].attr5_Exprs, local4_Expr_2239);
					
				};
				if (local7_OneLine_2237) {
					break;
					
				};
				do {
					func5_Match("\n", 1173, "Parser.gbas");
					
				} while (!((((func7_IsToken("\n")) == (0)) ? 1 : 0)));
				
			} catch (Err_Str) {
				if (Err_Str instanceof GLBException) Err_Str = Err_Str.getText(); else throwError(Err_Str);{
					func8_FixError();
					
				}
			};
			
		};
		
	};
	if (((((((local7_OneLine_2237) == (0)) ? 1 : 0)) && ((((local12_CloseStr_Str_ref_2227[0]) == (local13_OCloseStr_Str_2238)) ? 1 : 0))) ? 1 : 0)) {
		func5_Match(unref(local12_CloseStr_Str_ref_2227[0]), 1181, "Parser.gbas");
		
	};
	local7_MyScope_2245 = global8_Compiler.attr12_CurrentScope;
	global8_Compiler.attr12_CurrentScope = ~~(local8_TmpScope_2233);
	global8_Compiler.attr6_inLoop = local7_befLoop_2232;
	if (local9_Important_2230) {
		global8_Compiler.attr14_ImportantScope = local12_TmpImportant_2234;
		
	};
	return tryClone(local7_MyScope_2245);
	return 0;
	
};
func5_Scope = window['func5_Scope'];
window['func10_ResetError'] = function(param7_err_Str, param3_pos) {
	var local3_tmp_2248 = 0.0;
	local3_tmp_2248 = global8_Compiler.attr11_currentPosi;
	global8_Compiler.attr11_currentPosi = param3_pos;
	{
		var Ex_Str = "";
		try {
			func5_Error(param7_err_Str, 1198, "Parser.gbas");
			
		} catch (Ex_Str) {
			if (Ex_Str instanceof GLBException) Ex_Str = Ex_Str.getText(); else throwError(Ex_Str);{
				global8_Compiler.attr11_currentPosi = ~~(local3_tmp_2248);
				throw new GLBException(Ex_Str, "\Parser.gbas", 1202);
				
			}
		};
		
	};
	return 0;
	
};
func10_ResetError = window['func10_ResetError'];
window['func13_IsClosing_Str'] = function(param12_CloseStr_Str_ref, param6_ScpTyp) {
	{
		var local17___SelectHelper22__2252 = 0;
		local17___SelectHelper22__2252 = param6_ScpTyp;
		if ((((local17___SelectHelper22__2252) == (~~(1))) ? 1 : 0)) {
			if (func7_IsToken("ELSE")) {
				param12_CloseStr_Str_ref[0] = "ELSE";
				
			};
			if (func7_IsToken("ELSEIF")) {
				param12_CloseStr_Str_ref[0] = "ELSEIF";
				
			};
			
		} else if ((((local17___SelectHelper22__2252) == (~~(6))) ? 1 : 0)) {
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
	var local9_PreferVar_2254 = 0, local4_Expr_ref_2255 = [0], local5_IsAcc_2256 = 0;
	local9_PreferVar_2254 = 0;
	if ((((func7_IsToken("LOCAL")) && ((((param9_IsCommand) == (0)) ? 1 : 0))) ? 1 : 0)) {
		local9_PreferVar_2254 = 1;
		
	};
	if ((((func7_IsToken("GLOBAL")) && ((((param9_IsCommand) == (0)) ? 1 : 0))) ? 1 : 0)) {
		local9_PreferVar_2254 = -(1);
		
	};
	if ((((local9_PreferVar_2254) != (0)) ? 1 : 0)) {
		func7_GetNext();
		
	};
	local4_Expr_ref_2255[0] = -(1);
	local5_IsAcc_2256 = 0;
	if (func7_IsToken("super")) {
		func5_Match("super", 1231, "Parser.gbas");
		if (((((((global8_Compiler.attr11_currentFunc) != (-(1))) ? 1 : 0)) && ((((global8_Compiler.attr5_Funcs_ref[0].arrAccess(global8_Compiler.attr11_currentFunc).values[tmpPositionCache][0].attr6_MyType) != (-(1))) ? 1 : 0))) ? 1 : 0)) {
			var local3_typ_2257 = 0;
			local3_typ_2257 = global8_Compiler.attr5_Funcs_ref[0].arrAccess(global8_Compiler.attr11_currentFunc).values[tmpPositionCache][0].attr6_MyType;
			if ((((global8_Compiler.attr5_Types_ref[0].arrAccess(local3_typ_2257).values[tmpPositionCache][0].attr9_Extending) != (-(1))) ? 1 : 0)) {
				local4_Expr_ref_2255[0] = func21_CreateSuperExpression(global8_Compiler.attr5_Types_ref[0].arrAccess(local3_typ_2257).values[tmpPositionCache][0].attr9_Extending);
				func5_Match(".", 1236, "Parser.gbas");
				local5_IsAcc_2256 = 1;
				
			} else {
				func5_Error("There is no super class/type", 1239, "Parser.gbas");
				
			};
			
		} else {
			func5_Error("Super has to be in method", 1242, "Parser.gbas");
			
		};
		
	};
	if ((((func6_IsType("")) && (((func12_IsIdentifier(0)) ? 0 : 1))) ? 1 : 0)) {
		var local4_posi_2258 = 0.0, local7_typ_Str_2259 = "";
		local4_posi_2258 = global8_Compiler.attr11_currentPosi;
		local7_typ_Str_2259 = func14_GetCurrent_Str();
		func7_GetNext();
		if (func7_IsToken("(")) {
			func5_Match("(", 1251, "Parser.gbas");
			local4_Expr_ref_2255[0] = func10_Expression(0);
			func5_Match(")", 1253, "Parser.gbas");
			if ((((func6_IsType(unref(global5_Exprs_ref[0].arrAccess(local4_Expr_ref_2255[0]).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str_ref[0]))) && ((((global5_Exprs_ref[0].arrAccess(local4_Expr_ref_2255[0]).values[tmpPositionCache][0].attr8_datatype.attr7_IsArray_ref[0]) == (0)) ? 1 : 0))) ? 1 : 0)) {
				local4_Expr_ref_2255[0] = func14_CreateCast2Obj(local7_typ_Str_2259, unref(local4_Expr_ref_2255[0]));
				if (func7_IsToken(".")) {
					func5_Match(".", 1257, "Parser.gbas");
					local5_IsAcc_2256 = 1;
					
				} else {
					return tryClone(unref(local4_Expr_ref_2255[0]));
					
				};
				
			} else {
				func5_Error("Cannot cast non TYPE or array", 1263, "Parser.gbas");
				
			};
			
		} else {
			global8_Compiler.attr11_currentPosi = ~~(local4_posi_2258);
			
		};
		
	};
	do {
		var local8_Name_Str_2260 = "", local9_SuperExpr_ref_2261 = [0], local5_Varis_2262 = new GLBArray(), local5_Found_2263 = 0;
		local8_Name_Str_2260 = func17_CleanVariable_Str(func14_GetCurrent_Str());
		func7_GetNext();
		if ((((func7_IsToken("%")) || (func7_IsToken("%"))) ? 1 : 0)) {
			func7_GetNext();
			
		};
		local9_SuperExpr_ref_2261[0] = local4_Expr_ref_2255[0];
		if ((((local4_Expr_ref_2255[0]) == (-(1))) ? 1 : 0)) {
			func8_GetVaris(unref(local5_Varis_2262), -(1), local9_PreferVar_2254);
			local9_PreferVar_2254 = 0;
			
		} else {
			if ((((func6_IsType(unref(global5_Exprs_ref[0].arrAccess(local4_Expr_ref_2255[0]).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str_ref[0]))) == (0)) ? 1 : 0)) {
				func5_Error((((("Expecting type, got primitive datatype '") + (global5_Exprs_ref[0].arrAccess(local4_Expr_ref_2255[0]).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str_ref[0]))) + ("'")), 1288, "Parser.gbas");
				
			};
			local5_Varis_2262 = global8_LastType.attr10_Attributes.clone(/* In Assign */);
			
		};
		local5_Found_2263 = 0;
		var forEachSaver17176 = local5_Varis_2262;
		for(var forEachCounter17176 = 0 ; forEachCounter17176 < forEachSaver17176.values.length ; forEachCounter17176++) {
			var local4_Vari_2264 = forEachSaver17176.values[forEachCounter17176];
		{
				if ((((local8_Name_Str_2260) == (global8_Compiler.attr5_Varis_ref[0].arrAccess(local4_Vari_2264).values[tmpPositionCache][0].attr8_Name_Str)) ? 1 : 0)) {
					if ((((((((((global8_Compiler.attr11_currentFunc) != (-(1))) ? 1 : 0)) && ((((global8_Compiler.attr5_Funcs_ref[0].arrAccess(global8_Compiler.attr11_currentFunc).values[tmpPositionCache][0].attr6_MyType) != (-(1))) ? 1 : 0))) ? 1 : 0)) && ((((local4_Expr_ref_2255[0]) == (-(1))) ? 1 : 0))) ? 1 : 0)) {
						var alias3_Typ_ref_2265 = [new type14_IdentifierType()];
						alias3_Typ_ref_2265 = global8_Compiler.attr5_Types_ref[0].arrAccess(global8_Compiler.attr5_Funcs_ref[0].arrAccess(global8_Compiler.attr11_currentFunc).values[tmpPositionCache][0].attr6_MyType).values[tmpPositionCache] /* ALIAS */;
						var forEachSaver17165 = alias3_Typ_ref_2265[0].attr10_Attributes;
						for(var forEachCounter17165 = 0 ; forEachCounter17165 < forEachSaver17165.values.length ; forEachCounter17165++) {
							var local1_A_2266 = forEachSaver17165.values[forEachCounter17165];
						{
								if ((((local4_Vari_2264) == (local1_A_2266)) ? 1 : 0)) {
									local9_SuperExpr_ref_2261[0] = func24_CreateVariableExpression(global8_Compiler.attr5_Funcs_ref[0].arrAccess(global8_Compiler.attr11_currentFunc).values[tmpPositionCache][0].attr7_SelfVar);
									break;
									
								};
								
							}
							forEachSaver17165.values[forEachCounter17165] = local1_A_2266;
						
						};
						
					};
					local4_Expr_ref_2255[0] = func24_CreateVariableExpression(local4_Vari_2264);
					local5_Found_2263 = 1;
					break;
					
				};
				
			}
			forEachSaver17176.values[forEachCounter17176] = local4_Vari_2264;
		
		};
		while ((((func7_IsToken("(")) && (local5_Found_2263)) ? 1 : 0)) {
			var local4_func_2267 = 0;
			local4_func_2267 = func14_SearchPrototyp(unref(global5_Exprs_ref[0].arrAccess(local4_Expr_ref_2255[0]).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str_ref[0]));
			if ((((local4_func_2267) != (-(1))) ? 1 : 0)) {
				var local6_Params_2268 = new GLBArray();
				func13_ParseFuncCall(global8_Compiler.attr5_Funcs_ref[0].arrAccess(local4_func_2267).values[tmpPositionCache][0].attr8_datatype, unref(local6_Params_2268), param9_IsCommand);
				local4_Expr_ref_2255[0] = func25_CreateProtoCallExpression(unref(local4_Expr_ref_2255[0]), unref(local6_Params_2268));
				
			};
			
		};
		if ((((local5_Found_2263) == (0)) ? 1 : 0)) {
			if ((((local4_Expr_ref_2255[0]) != (-(1))) ? 1 : 0)) {
				var local5_typId_2269 = 0;
				func6_IsType(unref(global5_Exprs_ref[0].arrAccess(local4_Expr_ref_2255[0]).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str_ref[0]));
				if (global5_Exprs_ref[0].arrAccess(local4_Expr_ref_2255[0]).values[tmpPositionCache][0].attr8_datatype.attr7_IsArray_ref[0]) {
					func5_Error("Cannot access to array.", 1324, "Parser.gbas");
					
				};
				local5_typId_2269 = global8_LastType.attr2_ID;
				while ((((local5_typId_2269) != (-(1))) ? 1 : 0)) {
					var forEachSaver17319 = global8_Compiler.attr5_Types_ref[0].arrAccess(local5_typId_2269).values[tmpPositionCache][0].attr7_Methods;
					for(var forEachCounter17319 = 0 ; forEachCounter17319 < forEachSaver17319.values.length ; forEachCounter17319++) {
						var local1_M_2270 = forEachSaver17319.values[forEachCounter17319];
					{
							if ((((global8_Compiler.attr5_Funcs_ref[0].arrAccess(local1_M_2270).values[tmpPositionCache][0].attr8_Name_Str) == (local8_Name_Str_2260)) ? 1 : 0)) {
								if (((local5_Found_2263) ? 0 : 1)) {
									var local1_a_2271 = 0;
									local1_a_2271 = func19_ParseIdentifierFunc(local4_Expr_ref_2255, local9_SuperExpr_ref_2261, param9_IsCommand, local8_Name_Str_2260, local1_M_2270);
									if ((((local1_a_2271) != (-(1))) ? 1 : 0)) {
										return tryClone(local1_a_2271);
										
									};
									
								};
								local5_Found_2263 = 1;
								
							};
							
						}
						forEachSaver17319.values[forEachCounter17319] = local1_M_2270;
					
					};
					local5_typId_2269 = global8_Compiler.attr5_Types_ref[0].arrAccess(local5_typId_2269).values[tmpPositionCache][0].attr9_Extending;
					
				};
				
			} else {
				var local3_Val_ref_2272 = [0];
				if ((global8_Compiler.attr11_GlobalFuncs).GetValue(local8_Name_Str_2260, local3_Val_ref_2272)) {
					var local1_a_2273 = 0;
					local1_a_2273 = func19_ParseIdentifierFunc(local4_Expr_ref_2255, local9_SuperExpr_ref_2261, param9_IsCommand, local8_Name_Str_2260, unref(local3_Val_ref_2272[0]));
					if ((((local1_a_2273) != (-(1))) ? 1 : 0)) {
						return tryClone(local1_a_2273);
						
					};
					local5_Found_2263 = 1;
					
				} else if (((((((global8_Compiler.attr11_currentFunc) != (-(1))) ? 1 : 0)) && ((((global8_Compiler.attr5_Funcs_ref[0].arrAccess(global8_Compiler.attr11_currentFunc).values[tmpPositionCache][0].attr6_MyType) != (-(1))) ? 1 : 0))) ? 1 : 0)) {
					var alias3_Typ_ref_2274 = [new type14_IdentifierType()], local5_typId_2275 = 0;
					alias3_Typ_ref_2274 = global8_Compiler.attr5_Types_ref[0].arrAccess(global8_Compiler.attr5_Funcs_ref[0].arrAccess(global8_Compiler.attr11_currentFunc).values[tmpPositionCache][0].attr6_MyType).values[tmpPositionCache] /* ALIAS */;
					local5_typId_2275 = alias3_Typ_ref_2274[0].attr2_ID;
					while ((((local5_typId_2275) != (-(1))) ? 1 : 0)) {
						var forEachSaver17462 = global8_Compiler.attr5_Types_ref[0].arrAccess(local5_typId_2275).values[tmpPositionCache][0].attr7_Methods;
						for(var forEachCounter17462 = 0 ; forEachCounter17462 < forEachSaver17462.values.length ; forEachCounter17462++) {
							var local1_M_2276 = forEachSaver17462.values[forEachCounter17462];
						{
								if ((((global8_Compiler.attr5_Funcs_ref[0].arrAccess(local1_M_2276).values[tmpPositionCache][0].attr8_Name_Str) == (local8_Name_Str_2260)) ? 1 : 0)) {
									if (((local5_Found_2263) ? 0 : 1)) {
										var local1_a_2277 = 0;
										local1_a_2277 = func19_ParseIdentifierFunc(local4_Expr_ref_2255, local9_SuperExpr_ref_2261, param9_IsCommand, local8_Name_Str_2260, local1_M_2276);
										if ((((local1_a_2277) != (-(1))) ? 1 : 0)) {
											return tryClone(local1_a_2277);
											
										};
										
									};
									local5_Found_2263 = 1;
									
								};
								
							}
							forEachSaver17462.values[forEachCounter17462] = local1_M_2276;
						
						};
						local5_typId_2275 = global8_Compiler.attr5_Types_ref[0].arrAccess(local5_typId_2275).values[tmpPositionCache][0].attr9_Extending;
						
					};
					
				};
				
			};
			while ((((func7_IsToken("(")) && (local5_Found_2263)) ? 1 : 0)) {
				var local4_func_2278 = 0;
				local4_func_2278 = func14_SearchPrototyp(unref(global5_Exprs_ref[0].arrAccess(local4_Expr_ref_2255[0]).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str_ref[0]));
				if ((((local4_func_2278) != (-(1))) ? 1 : 0)) {
					var local6_Params_2279 = new GLBArray();
					func13_ParseFuncCall(global8_Compiler.attr5_Funcs_ref[0].arrAccess(local4_func_2278).values[tmpPositionCache][0].attr8_datatype, unref(local6_Params_2279), param9_IsCommand);
					local4_Expr_ref_2255[0] = func25_CreateProtoCallExpression(unref(local4_Expr_ref_2255[0]), unref(local6_Params_2279));
					
				};
				
			};
			if ((((local5_Found_2263) == (0)) ? 1 : 0)) {
				if ((((local4_Expr_ref_2255[0]) != (-(1))) ? 1 : 0)) {
					var local8_Atts_Str_2280 = "";
					local8_Atts_Str_2280 = "";
					var forEachSaver17566 = local5_Varis_2262;
					for(var forEachCounter17566 = 0 ; forEachCounter17566 < forEachSaver17566.values.length ; forEachCounter17566++) {
						var local4_Vari_2281 = forEachSaver17566.values[forEachCounter17566];
					{
							if ((((local8_Name_Str_2260) == (global8_Compiler.attr5_Varis_ref[0].arrAccess(local4_Vari_2281).values[tmpPositionCache][0].attr8_Name_Str)) ? 1 : 0)) {
								local8_Atts_Str_2280 = ((((local8_Atts_Str_2280) + (global8_Compiler.attr5_Varis_ref[0].arrAccess(local4_Vari_2281).values[tmpPositionCache][0].attr8_Name_Str))) + (", "));
								
							};
							
						}
						forEachSaver17566.values[forEachCounter17566] = local4_Vari_2281;
					
					};
					func6_IsType(unref(global5_Exprs_ref[0].arrAccess(local4_Expr_ref_2255[0]).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str_ref[0]));
					func5_Error((((((((((((("Cannot find attribute '") + (local8_Name_Str_2260))) + ("' in type '"))) + (global8_LastType.attr8_Name_Str))) + ("' possible attributes '"))) + (local8_Atts_Str_2280))) + ("'")), 1388, "Parser.gbas");
					
				} else {
					func5_Error((((("Internal error ") + (local8_Name_Str_2260))) + (" (expected identifier).")), 1390, "Parser.gbas");
					
				};
				
			};
			
		};
		if (func7_IsToken("[")) {
			var local4_Dims_2282 = new GLBArray();
			if ((((global5_Exprs_ref[0].arrAccess(local4_Expr_ref_2255[0]).values[tmpPositionCache][0].attr8_datatype.attr7_IsArray_ref[0]) == (0)) ? 1 : 0)) {
				func5_Error("Array access, but this identifier is no array", 1399, "Parser.gbas");
				
			};
			while (func7_IsToken("[")) {
				var local7_dimExpr_2283 = 0;
				func5_Match("[", 1402, "Parser.gbas");
				if (func7_IsToken("]")) {
					func5_Match("]", 1404, "Parser.gbas");
					break;
					
				};
				local7_dimExpr_2283 = func14_EnsureDatatype(func10_Expression(0), global11_intDatatype, 1407, 0);
				func5_Match("]", 1408, "Parser.gbas");
				DIMPUSH(local4_Dims_2282, local7_dimExpr_2283);
				
			};
			local4_Expr_ref_2255[0] = func21_CreateArrayExpression(unref(local4_Expr_ref_2255[0]), unref(local4_Dims_2282));
			
		};
		local4_Expr_ref_2255[0] = func22_CreateAccessExpression(unref(local9_SuperExpr_ref_2261[0]), unref(local4_Expr_ref_2255[0]));
		if (func7_IsToken(".")) {
			func5_Match(".", 1419, "Parser.gbas");
			local5_IsAcc_2256 = 1;
			
		} else {
			local5_IsAcc_2256 = 0;
			
		};
		
	} while (!((((local5_IsAcc_2256) == (0)) ? 1 : 0)));
	if (((((((func7_IsToken("=")) && ((((local4_Expr_ref_2255[0]) != (-(1))) ? 1 : 0))) ? 1 : 0)) && (param9_IsCommand)) ? 1 : 0)) {
		var local7_tmpData_2284 = new type8_Datatype();
		if ((((global8_Compiler.attr5_Varis_ref[0].arrAccess(func11_GetVariable(unref(local4_Expr_ref_2255[0]), 1)).values[tmpPositionCache][0].attr3_Typ) == (6)) ? 1 : 0)) {
			func5_Error("Assignment invalid, because of CONSTANT variable.", 1428, "Parser.gbas");
			
		};
		if (((((((global5_Exprs_ref[0].arrAccess(func12_GetRightExpr(unref(local4_Expr_ref_2255[0]))).values[tmpPositionCache][0].attr3_Typ) == (6)) ? 1 : 0)) || ((((global5_Exprs_ref[0].arrAccess(func12_GetRightExpr(unref(local4_Expr_ref_2255[0]))).values[tmpPositionCache][0].attr3_Typ) == (23)) ? 1 : 0))) ? 1 : 0)) {
			func5_Error("Cannot assign to function call.", 1430, "Parser.gbas");
			
		};
		func5_Match("=", 1431, "Parser.gbas");
		if ((((param9_IsCommand) == (0)) ? 1 : 0)) {
			func5_Error("Assignment is a statement.", 1432, "Parser.gbas");
			
		};
		local7_tmpData_2284 = global5_Exprs_ref[0].arrAccess(local4_Expr_ref_2255[0]).values[tmpPositionCache][0].attr8_datatype.clone(/* In Assign */);
		return tryClone(func22_CreateAssignExpression(unref(local4_Expr_ref_2255[0]), func14_EnsureDatatype(func10_Expression(0), local7_tmpData_2284, 1436, 0)));
		
	};
	if ((((local4_Expr_ref_2255[0]) != (-(1))) ? 1 : 0)) {
		return tryClone(unref(local4_Expr_ref_2255[0]));
		
	} else {
		func5_Error("Internal error (Expecting identifier)", 1442, "Parser.gbas");
		
	};
	return 0;
	
};
func10_Identifier = window['func10_Identifier'];
window['func19_ParseIdentifierFunc'] = function(param4_Expr_ref, param9_SuperExpr_ref, param9_IsCommand, param8_Name_Str, param4_func) {
	if ((((param4_func) == (-(1))) ? 1 : 0)) {
		func5_Error("Internal Error (func is -1, ParseIdentifierFunc", 1448, "Parser.gbas");
		
	};
	if ((((((((((global8_Compiler.attr11_currentFunc) != (-(1))) ? 1 : 0)) && ((((global8_Compiler.attr5_Funcs_ref[0].arrAccess(global8_Compiler.attr11_currentFunc).values[tmpPositionCache][0].attr6_MyType) != (-(1))) ? 1 : 0))) ? 1 : 0)) && ((((param4_Expr_ref[0]) == (-(1))) ? 1 : 0))) ? 1 : 0)) {
		var local3_typ_2290 = 0;
		local3_typ_2290 = global8_Compiler.attr5_Funcs_ref[0].arrAccess(global8_Compiler.attr11_currentFunc).values[tmpPositionCache][0].attr6_MyType;
		while ((((local3_typ_2290) != (-(1))) ? 1 : 0)) {
			if (((((((global8_Compiler.attr5_Funcs_ref[0].arrAccess(param4_func).values[tmpPositionCache][0].attr6_MyType) == (local3_typ_2290)) ? 1 : 0)) && ((((global8_Compiler.attr5_Funcs_ref[0].arrAccess(param4_func).values[tmpPositionCache][0].attr6_MyType) != (-(1))) ? 1 : 0))) ? 1 : 0)) {
				param9_SuperExpr_ref[0] = func24_CreateVariableExpression(global8_Compiler.attr5_Funcs_ref[0].arrAccess(global8_Compiler.attr11_currentFunc).values[tmpPositionCache][0].attr7_SelfVar);
				break;
				
			};
			local3_typ_2290 = global8_Compiler.attr5_Types_ref[0].arrAccess(local3_typ_2290).values[tmpPositionCache][0].attr9_Extending;
			
		};
		
	};
	global8_Compiler.attr5_Funcs_ref[0].arrAccess(param4_func).values[tmpPositionCache][0].attr10_PlzCompile = 1;
	if (((((((func7_IsToken("(")) == (0)) ? 1 : 0)) && ((((param9_IsCommand) == (0)) ? 1 : 0))) ? 1 : 0)) {
		var local8_datatype_2291 = new type8_Datatype();
		local8_datatype_2291.attr8_Name_Str_ref[0] = param8_Name_Str;
		local8_datatype_2291.attr7_IsArray_ref[0] = 0;
		global8_Compiler.attr5_Funcs_ref[0].arrAccess(param4_func).values[tmpPositionCache][0].attr15_UsedAsPrototype = 1;
		return tryClone(func24_CreateFuncDataExpression(local8_datatype_2291));
		
	} else {
		var local6_Params_2292 = new GLBArray();
		func13_ParseFuncCall(global8_Compiler.attr5_Funcs_ref[0].arrAccess(param4_func).values[tmpPositionCache][0].attr8_datatype, unref(local6_Params_2292), param9_IsCommand);
		param4_Expr_ref[0] = func24_CreateFuncCallExpression(global8_Compiler.attr5_Funcs_ref[0].arrAccess(param4_func).values[tmpPositionCache][0].attr2_ID, unref(local6_Params_2292));
		
	};
	return tryClone(-(1));
	return 0;
	
};
func19_ParseIdentifierFunc = window['func19_ParseIdentifierFunc'];
window['func13_ParseFuncCall'] = function(param8_datatype, param6_Params, param9_IsCommand) {
	var local9_OpBracket_2296 = 0, local4_Find_2297 = 0.0, local12_CloseBracket_2298 = 0;
	local9_OpBracket_2296 = func7_IsToken("(");
	if ((((param8_datatype.attr8_Name_Str_ref[0]) == ("void")) ? 1 : 0)) {
		if (((param9_IsCommand) ? 0 : 1)) {
			func5_Error("Void function has to be a command!", 1492, "Parser.gbas");
			
		};
		local9_OpBracket_2296 = 0;
		
	} else {
		if (local9_OpBracket_2296) {
			func5_Match("(", 1499, "Parser.gbas");
			
		};
		
	};
	local4_Find_2297 = 0;
	while (((((((func7_IsToken("\n")) == (0)) ? 1 : 0)) && ((((func7_IsToken(")")) == (0)) ? 1 : 0))) ? 1 : 0)) {
		if (local4_Find_2297) {
			func5_Match(",", 1507, "Parser.gbas");
			
		};
		DIMPUSH(param6_Params, func10_Expression(0));
		local4_Find_2297 = 1;
		
	};
	local12_CloseBracket_2298 = func7_IsToken(")");
	if (local12_CloseBracket_2298) {
		func5_Match(")", 1513, "Parser.gbas");
		
	};
	if ((((local12_CloseBracket_2298) != (local9_OpBracket_2296)) ? 1 : 0)) {
		func5_Error("Brackets are not closed.", 1516, "Parser.gbas");
		
	};
	return 0;
	
};
func13_ParseFuncCall = window['func13_ParseFuncCall'];
window['func7_Keyword'] = function() {
	{
		var local17___SelectHelper23__2299 = 0;
		local17___SelectHelper23__2299 = 1;
		if ((((local17___SelectHelper23__2299) == (func7_IsToken("CALLBACK"))) ? 1 : 0)) {
			func5_Match("CALLBACK", 1525, "Parser.gbas");
			func7_Keyword();
			
		} else if ((((local17___SelectHelper23__2299) == (func7_IsToken("NATIVE"))) ? 1 : 0)) {
			func5_Match("NATIVE", 1528, "Parser.gbas");
			func10_SkipTokens("NATIVE", "\n", "");
			
		} else if ((((local17___SelectHelper23__2299) == (func7_IsToken("ABSTRACT"))) ? 1 : 0)) {
			func5_Match("ABSTRACT", 1531, "Parser.gbas");
			func10_SkipTokens("ABSTRACT", "\n", "");
			
		} else if ((((local17___SelectHelper23__2299) == (func7_IsToken("FUNCTION"))) ? 1 : 0)) {
			func10_SkipTokens("FUNCTION", "ENDFUNCTION", "");
			
		} else if ((((local17___SelectHelper23__2299) == (func7_IsToken("SUB"))) ? 1 : 0)) {
			func10_SkipTokens("SUB", "ENDSUB", "");
			
		} else if ((((local17___SelectHelper23__2299) == (func7_IsToken("TYPE"))) ? 1 : 0)) {
			func10_SkipTokens("TYPE", "ENDTYPE", "");
			
		} else if ((((local17___SelectHelper23__2299) == (func7_IsToken("PROTOTYPE"))) ? 1 : 0)) {
			func10_SkipTokens("PROTOTYPE", "\n", "");
			
		} else if ((((local17___SelectHelper23__2299) == (func7_IsToken("CONSTANT"))) ? 1 : 0)) {
			func10_SkipTokens("CONSTANT", "\n", "");
			
		} else if ((((local17___SelectHelper23__2299) == (func7_IsToken("GLOBAL"))) ? 1 : 0)) {
			do {
				var local7_tmpVari_2300 = new type14_IdentifierVari();
				if (func7_IsToken("GLOBAL")) {
					func5_Match("GLOBAL", 1546, "Parser.gbas");
					
				} else {
					func5_Match(",", 1548, "Parser.gbas");
					
				};
				local7_tmpVari_2300 = func7_VariDef(0).clone(/* In Assign */);
				var forEachSaver18250 = global8_Compiler.attr7_Globals;
				for(var forEachCounter18250 = 0 ; forEachCounter18250 < forEachSaver18250.values.length ; forEachCounter18250++) {
					var local1_V_2301 = forEachSaver18250.values[forEachCounter18250];
				{
						var alias4_Vari_ref_2302 = [new type14_IdentifierVari()];
						alias4_Vari_ref_2302 = global8_Compiler.attr5_Varis_ref[0].arrAccess(local1_V_2301).values[tmpPositionCache] /* ALIAS */;
						if (((((((alias4_Vari_ref_2302[0].attr8_Name_Str) == (local7_tmpVari_2300.attr8_Name_Str)) ? 1 : 0)) && ((((alias4_Vari_ref_2302[0].attr6_PreDef) != (-(1))) ? 1 : 0))) ? 1 : 0)) {
							var local7_tmpExpr_2303 = 0;
							if ((((global8_Compiler.attr12_CurrentScope) == (-(1))) ? 1 : 0)) {
								func5_Error("Internal error (GLOBAL in -1 scope)", 1555, "Parser.gbas");
								
							};
							local7_tmpExpr_2303 = func22_CreateAssignExpression(func24_CreateVariableExpression(alias4_Vari_ref_2302[0].attr2_ID), alias4_Vari_ref_2302[0].attr6_PreDef);
							DIMPUSH(global5_Exprs_ref[0].arrAccess(global8_Compiler.attr12_CurrentScope).values[tmpPositionCache][0].attr5_Exprs, local7_tmpExpr_2303);
							alias4_Vari_ref_2302[0].attr6_PreDef = -(1);
							
						};
						
					}
					forEachSaver18250.values[forEachCounter18250] = local1_V_2301;
				
				};
				
			} while (!((((func7_IsToken(",")) == (0)) ? 1 : 0)));
			
		} else if ((((local17___SelectHelper23__2299) == (func7_IsToken("LOCAL"))) ? 1 : 0)) {
			do {
				var local10_DontCreate_2304 = 0;
				if (func7_IsToken("LOCAL")) {
					func5_Match("LOCAL", 1565, "Parser.gbas");
					
				} else {
					func5_Match(",", 1567, "Parser.gbas");
					
				};
				local10_DontCreate_2304 = 0;
				if (func13_IsVarExisting(func17_CleanVariable_Str(func14_GetCurrent_Str()))) {
					var local5_Varis_2305 = new GLBArray();
					local10_DontCreate_2304 = 1;
					func8_GetVaris(unref(local5_Varis_2305), -(1), 0);
					var forEachSaver18329 = local5_Varis_2305;
					for(var forEachCounter18329 = 0 ; forEachCounter18329 < forEachSaver18329.values.length ; forEachCounter18329++) {
						var local1_V_2306 = forEachSaver18329.values[forEachCounter18329];
					{
							if ((((global8_Compiler.attr5_Varis_ref[0].arrAccess(local1_V_2306).values[tmpPositionCache][0].attr8_Name_Str) == (func17_CleanVariable_Str(func14_GetCurrent_Str()))) ? 1 : 0)) {
								if ((((global8_Compiler.attr5_Varis_ref[0].arrAccess(local1_V_2306).values[tmpPositionCache][0].attr3_Typ) == (2)) ? 1 : 0)) {
									local10_DontCreate_2304 = 0;
									break;
									
								};
								
							};
							
						}
						forEachSaver18329.values[forEachCounter18329] = local1_V_2306;
					
					};
					if (local10_DontCreate_2304) {
						var local4_Expr_2307 = 0;
						func7_Warning((((("Variable '") + (func14_GetCurrent_Str()))) + ("' already exists...")));
						local4_Expr_2307 = func10_Identifier(1);
						DIMPUSH(global5_Exprs_ref[0].arrAccess(global8_Compiler.attr12_CurrentScope).values[tmpPositionCache][0].attr5_Exprs, local4_Expr_2307);
						
					};
					
				};
				if (((local10_DontCreate_2304) ? 0 : 1)) {
					var local4_Vari_2308 = new type14_IdentifierVari(), local4_PDef_2309 = 0;
					local4_Vari_2308 = func7_VariDef(0).clone(/* In Assign */);
					local4_Vari_2308.attr3_Typ = ~~(1);
					local4_PDef_2309 = -(1);
					if ((((local4_Vari_2308.attr6_PreDef) != (-(1))) ? 1 : 0)) {
						local4_PDef_2309 = local4_Vari_2308.attr6_PreDef;
						local4_Vari_2308.attr6_PreDef = -(1);
						
					};
					func11_AddVariable(local4_Vari_2308, 1);
					DIMPUSH(global5_Exprs_ref[0].arrAccess(global8_Compiler.attr12_CurrentScope).values[tmpPositionCache][0].attr5_Varis, ((BOUNDS(global8_Compiler.attr5_Varis_ref[0], 0)) - (1)));
					if ((((local4_PDef_2309) != (-(1))) ? 1 : 0)) {
						var local7_tmpExpr_2310 = 0;
						if ((((global8_Compiler.attr12_CurrentScope) == (-(1))) ? 1 : 0)) {
							func5_Error("Internal error (LOCAL in -1 scope)", 1606, "Parser.gbas");
							
						};
						local7_tmpExpr_2310 = func22_CreateAssignExpression(func24_CreateVariableExpression(((BOUNDS(global8_Compiler.attr5_Varis_ref[0], 0)) - (1))), local4_PDef_2309);
						DIMPUSH(global5_Exprs_ref[0].arrAccess(global8_Compiler.attr12_CurrentScope).values[tmpPositionCache][0].attr5_Exprs, local7_tmpExpr_2310);
						
					};
					
				};
				
			} while (!((((func7_IsToken(",")) == (0)) ? 1 : 0)));
			
		} else if ((((local17___SelectHelper23__2299) == (func7_IsToken("ALIAS"))) ? 1 : 0)) {
			do {
				var local4_Vari_2311 = new type14_IdentifierVari(), local4_PDef_2312 = 0, local7_tmpExpr_2313 = 0;
				if (func7_IsToken("ALIAS")) {
					func5_Match("ALIAS", 1617, "Parser.gbas");
					
				} else {
					func5_Match(",", 1619, "Parser.gbas");
					
				};
				func14_IsValidVarName();
				local4_Vari_2311.attr8_Name_Str = func14_GetCurrent_Str();
				local4_Vari_2311.attr3_Typ = ~~(7);
				local4_Vari_2311.attr3_ref = 1;
				func5_Match(local4_Vari_2311.attr8_Name_Str, 1627, "Parser.gbas");
				func5_Match("AS", 1628, "Parser.gbas");
				local4_PDef_2312 = func10_Identifier(0);
				global8_Compiler.attr5_Varis_ref[0].arrAccess(func11_GetVariable(local4_PDef_2312, 1)).values[tmpPositionCache][0].attr3_ref = 1;
				local4_Vari_2311.attr8_datatype = global5_Exprs_ref[0].arrAccess(local4_PDef_2312).values[tmpPositionCache][0].attr8_datatype.clone(/* In Assign */);
				func11_AddVariable(local4_Vari_2311, 1);
				DIMPUSH(global5_Exprs_ref[0].arrAccess(global8_Compiler.attr12_CurrentScope).values[tmpPositionCache][0].attr5_Varis, ((BOUNDS(global8_Compiler.attr5_Varis_ref[0], 0)) - (1)));
				local7_tmpExpr_2313 = func21_CreateAliasExpression(((BOUNDS(global8_Compiler.attr5_Varis_ref[0], 0)) - (1)), local4_PDef_2312);
				if (func7_IsToken(",")) {
					DIMPUSH(global5_Exprs_ref[0].arrAccess(global8_Compiler.attr12_CurrentScope).values[tmpPositionCache][0].attr5_Exprs, local7_tmpExpr_2313);
					
				} else {
					return tryClone(local7_tmpExpr_2313);
					
				};
				
			} while (!((((func7_IsToken(",")) == (0)) ? 1 : 0)));
			
		} else if ((((local17___SelectHelper23__2299) == (func7_IsToken("STATIC"))) ? 1 : 0)) {
			if ((((global8_Compiler.attr11_currentFunc) == (-(1))) ? 1 : 0)) {
				func5_Error("Static has to be in a FUNCTION", 1647, "Parser.gbas");
				
			};
			do {
				var local4_Vari_2314 = new type14_IdentifierVari();
				if (func7_IsToken("STATIC")) {
					func5_Match("STATIC", 1651, "Parser.gbas");
					
				} else {
					func5_Match(",", 1653, "Parser.gbas");
					
				};
				local4_Vari_2314 = func7_VariDef(0).clone(/* In Assign */);
				local4_Vari_2314.attr3_Typ = ~~(4);
				local4_Vari_2314.attr4_func = global8_Compiler.attr11_currentFunc;
				func11_AddVariable(local4_Vari_2314, 1);
				DIMPUSH(global8_Compiler.attr5_Funcs_ref[0].arrAccess(global8_Compiler.attr11_currentFunc).values[tmpPositionCache][0].attr7_Statics, ((BOUNDS(global8_Compiler.attr5_Varis_ref[0], 0)) - (1)));
				DIMPUSH(global5_Exprs_ref[0].arrAccess(global8_Compiler.attr12_CurrentScope).values[tmpPositionCache][0].attr5_Varis, ((BOUNDS(global8_Compiler.attr5_Varis_ref[0], 0)) - (1)));
				
			} while (!((((func7_IsToken(",")) == (0)) ? 1 : 0)));
			
		} else if ((((local17___SelectHelper23__2299) == (func7_IsToken("DIMPUSH"))) ? 1 : 0)) {
			var local4_Vari_2315 = 0, local8_datatype_2316 = new type8_Datatype(), local4_Expr_2317 = 0;
			func5_Match("DIMPUSH", 1665, "Parser.gbas");
			local4_Vari_2315 = func10_Identifier(0);
			if ((((global5_Exprs_ref[0].arrAccess(local4_Vari_2315).values[tmpPositionCache][0].attr8_datatype.attr7_IsArray_ref[0]) == (0)) ? 1 : 0)) {
				func5_Error("DIMPUSH needs array", 1667, "Parser.gbas");
				
			};
			func5_Match(",", 1668, "Parser.gbas");
			local8_datatype_2316 = global5_Exprs_ref[0].arrAccess(local4_Vari_2315).values[tmpPositionCache][0].attr8_datatype.clone(/* In Assign */);
			local8_datatype_2316.attr7_IsArray_ref[0] = 0;
			local4_Expr_2317 = func14_EnsureDatatype(func10_Expression(0), local8_datatype_2316, 1673, 0);
			return tryClone(func23_CreateDimpushExpression(local4_Vari_2315, local4_Expr_2317));
			
		} else if ((((local17___SelectHelper23__2299) == (func7_IsToken("DIM"))) ? 1 : 0)) {
			var local3_Arr_2318 = 0;
			func5_Match("DIM", 1684, "Parser.gbas");
			local3_Arr_2318 = func14_ImplicitDefine();
			if ((((local3_Arr_2318) != (-(1))) ? 1 : 0)) {
				global8_Compiler.attr5_Varis_ref[0].arrAccess(local3_Arr_2318).values[tmpPositionCache][0].attr8_datatype.attr7_IsArray_ref[0] = 1;
				
			};
			if (func12_IsIdentifier(0)) {
				var local4_expr_2319 = 0, local5_LExpr_2320 = 0, local4_Dims_2321 = new GLBArray();
				local4_expr_2319 = func10_Identifier(0);
				local5_LExpr_2320 = func12_GetRightExpr(local4_expr_2319);
				if ((((global8_Compiler.attr5_Varis_ref[0].arrAccess(func11_GetVariable(local4_expr_2319, 1)).values[tmpPositionCache][0].attr8_datatype.attr7_IsArray_ref[0]) == (0)) ? 1 : 0)) {
					func5_Error("Array expected.", 1693, "Parser.gbas");
					
				};
				{
					var local17___SelectHelper24__2322 = 0;
					local17___SelectHelper24__2322 = global5_Exprs_ref[0].arrAccess(local5_LExpr_2320).values[tmpPositionCache][0].attr3_Typ;
					if ((((local17___SelectHelper24__2322) == (~~(13))) ? 1 : 0)) {
						local4_Dims_2321 = global5_Exprs_ref[0].arrAccess(local5_LExpr_2320).values[tmpPositionCache][0].attr4_dims.clone(/* In Assign */);
						DIM(global5_Exprs_ref[0].arrAccess(local5_LExpr_2320).values[tmpPositionCache][0].attr4_dims, [0], 0);
						
					} else {
						func5_Error("Internal error (array not parsed)", 1700, "Parser.gbas");
						
					};
					
				};
				return tryClone(func19_CreateDimExpression(local4_expr_2319, unref(local4_Dims_2321)));
				
			} else {
				func5_Error("DIM needs identifier", 1705, "Parser.gbas");
				
			};
			
		} else if ((((local17___SelectHelper23__2299) == (func7_IsToken("REDIM"))) ? 1 : 0)) {
			var local3_Arr_2323 = 0;
			func5_Match("REDIM", 1708, "Parser.gbas");
			local3_Arr_2323 = func14_ImplicitDefine();
			if ((((local3_Arr_2323) != (-(1))) ? 1 : 0)) {
				global8_Compiler.attr5_Varis_ref[0].arrAccess(local3_Arr_2323).values[tmpPositionCache][0].attr8_datatype.attr7_IsArray_ref[0] = 1;
				
			};
			if (func12_IsIdentifier(0)) {
				var local4_expr_2324 = 0, local5_LExpr_2325 = 0, local4_Dims_2326 = new GLBArray();
				local4_expr_2324 = func10_Identifier(0);
				local5_LExpr_2325 = func12_GetRightExpr(local4_expr_2324);
				if ((((global8_Compiler.attr5_Varis_ref[0].arrAccess(func11_GetVariable(local4_expr_2324, 1)).values[tmpPositionCache][0].attr8_datatype.attr7_IsArray_ref[0]) == (0)) ? 1 : 0)) {
					func5_Error("Array expected.", 1716, "Parser.gbas");
					
				};
				{
					var local17___SelectHelper25__2327 = 0;
					local17___SelectHelper25__2327 = global5_Exprs_ref[0].arrAccess(local5_LExpr_2325).values[tmpPositionCache][0].attr3_Typ;
					if ((((local17___SelectHelper25__2327) == (~~(13))) ? 1 : 0)) {
						local4_Dims_2326 = global5_Exprs_ref[0].arrAccess(local5_LExpr_2325).values[tmpPositionCache][0].attr4_dims.clone(/* In Assign */);
						DIM(global5_Exprs_ref[0].arrAccess(local5_LExpr_2325).values[tmpPositionCache][0].attr4_dims, [0], 0);
						
					} else {
						func5_Error("Internal error (array not parsed)", 1723, "Parser.gbas");
						
					};
					
				};
				return tryClone(func21_CreateReDimExpression(local4_expr_2324, unref(local4_Dims_2326)));
				
			} else {
				func5_Error("REDIM needs identifier", 1727, "Parser.gbas");
				
			};
			
		} else if ((((local17___SelectHelper23__2299) == (func7_IsToken("DIMDATA"))) ? 1 : 0)) {
			var local5_Array_2328 = 0, local2_Ex_2329 = new GLBArray();
			func5_Match("DIMDATA", 1730, "Parser.gbas");
			local5_Array_2328 = func14_ImplicitDefine();
			if ((((local5_Array_2328) != (-(1))) ? 1 : 0)) {
				global8_Compiler.attr5_Varis_ref[0].arrAccess(local5_Array_2328).values[tmpPositionCache][0].attr8_datatype.attr7_IsArray_ref[0] = 1;
				local5_Array_2328 = func10_Identifier(0);
				
			} else {
				local5_Array_2328 = func10_Expression(0);
				
			};
			if ((((global5_Exprs_ref[0].arrAccess(local5_Array_2328).values[tmpPositionCache][0].attr8_datatype.attr7_IsArray_ref[0]) == (0)) ? 1 : 0)) {
				func5_Error("DIMDATA needs array, stupid...", 1740, "Parser.gbas");
				
			};
			while ((((func7_IsToken("\n")) == (0)) ? 1 : 0)) {
				func5_Match(",", 1743, "Parser.gbas");
				if ((((BOUNDS(local2_Ex_2329, 0)) == (0)) ? 1 : 0)) {
					DIMPUSH(local2_Ex_2329, func10_Expression(0));
					
				} else {
					var local7_datatyp_2330 = new type8_Datatype(), local1_E_2331 = 0;
					local7_datatyp_2330 = global5_Exprs_ref[0].arrAccess(local2_Ex_2329.arrAccess(0).values[tmpPositionCache]).values[tmpPositionCache][0].attr8_datatype.clone(/* In Assign */);
					local1_E_2331 = func14_EnsureDatatype(func10_Expression(0), local7_datatyp_2330, 1749, 0);
					DIMPUSH(local2_Ex_2329, local1_E_2331);
					
				};
				
			};
			return tryClone(func23_CreateDimDataExpression(local5_Array_2328, unref(local2_Ex_2329)));
			
		} else if ((((local17___SelectHelper23__2299) == (func7_IsToken("DELETE"))) ? 1 : 0)) {
			var local11_VarName_Str_2332 = "";
			func5_Match("DELETE", 1756, "Parser.gbas");
			local11_VarName_Str_2332 = func14_GetCurrent_Str();
			if (((((((local11_VarName_Str_2332) != (global8_Compiler.attr18_currentForEach_Str)) ? 1 : 0)) && ((((local11_VarName_Str_2332) != ("\n")) ? 1 : 0))) ? 1 : 0)) {
				func5_Error((((((((("DELETE, invalid name '") + (local11_VarName_Str_2332))) + ("' expecting '"))) + (global8_Compiler.attr18_currentForEach_Str))) + ("'")), 1758, "Parser.gbas");
				
			};
			if ((((func7_IsToken("\n")) == (0)) ? 1 : 0)) {
				func7_GetNext();
				
			};
			return tryClone(func22_CreateDeleteExpression());
			
		} else if ((((local17___SelectHelper23__2299) == (func7_IsToken("DIMDEL"))) ? 1 : 0)) {
			var local5_Array_2333 = 0;
			func5_Match("DIMDEL", 1762, "Parser.gbas");
			local5_Array_2333 = func10_Identifier(0);
			func5_Match(",", 1764, "Parser.gbas");
			return tryClone(func22_CreateDimDelExpression(local5_Array_2333, func14_EnsureDatatype(func10_Expression(0), global11_intDatatype, 1765, 0)));
			
		} else if ((((local17___SelectHelper23__2299) == (func7_IsToken("RETURN"))) ? 1 : 0)) {
			if ((((global8_Compiler.attr11_currentFunc) != (-(1))) ? 1 : 0)) {
				var local4_Expr_2334 = 0, local8_datatype_2335 = new type8_Datatype();
				func5_Match("RETURN", 1768, "Parser.gbas");
				local8_datatype_2335 = global8_Compiler.attr5_Funcs_ref[0].arrAccess(global8_Compiler.attr11_currentFunc).values[tmpPositionCache][0].attr8_datatype.clone(/* In Assign */);
				if (func7_IsToken("\n")) {
					local4_Expr_2334 = func28_CreateDefaultValueExpression(local8_datatype_2335);
					
				} else if ((((global8_Compiler.attr5_Funcs_ref[0].arrAccess(global8_Compiler.attr11_currentFunc).values[tmpPositionCache][0].attr3_Typ) == (2)) ? 1 : 0)) {
					func5_Error("Sub cannot return a value", 1775, "Parser.gbas");
					
				} else {
					local4_Expr_2334 = func14_EnsureDatatype(func10_Expression(0), local8_datatype_2335, 1777, 0);
					
				};
				return tryClone(func22_CreateReturnExpression(local4_Expr_2334));
				
			} else {
				func5_Error("RETURN have to be in a function or sub.", 1781, "Parser.gbas");
				
			};
			
		} else if ((((local17___SelectHelper23__2299) == (func7_IsToken("INLINE"))) ? 1 : 0)) {
			func5_Error("INLINE/ENDINLINE not supported", 1784, "Parser.gbas");
			
		} else if ((((local17___SelectHelper23__2299) == (func7_IsToken("REQUIRE"))) ? 1 : 0)) {
			var local8_Name_Str_2336 = "";
			func5_Match("REQUIRE", 1786, "Parser.gbas");
			local8_Name_Str_2336 = REPLACE_Str(func14_GetCurrent_Str(), "\"", "");
			func7_GetNext();
			return tryClone(~~(func23_CreateRequireExpression(local8_Name_Str_2336)));
			
		} else if ((((local17___SelectHelper23__2299) == (func7_IsToken("EXPORT"))) ? 1 : 0)) {
			var local3_Exp_2337 = new type7_TExport(), local5_Found_2338 = 0;
			func5_Match("EXPORT", 1791, "Parser.gbas");
			local3_Exp_2337.attr8_Name_Str = REPLACE_Str(func14_GetCurrent_Str(), "\"", "");
			local5_Found_2338 = 0;
			var forEachSaver19306 = global8_Compiler.attr5_Funcs_ref[0];
			for(var forEachCounter19306 = 0 ; forEachCounter19306 < forEachSaver19306.values.length ; forEachCounter19306++) {
				var local1_F_ref_2339 = forEachSaver19306.values[forEachCounter19306];
			{
					if (((((((local1_F_ref_2339[0].attr3_Typ) == (1)) ? 1 : 0)) && ((((local3_Exp_2337.attr8_Name_Str) == (local1_F_ref_2339[0].attr8_Name_Str)) ? 1 : 0))) ? 1 : 0)) {
						local1_F_ref_2339[0].attr10_PlzCompile = 1;
						local5_Found_2338 = 1;
						break;
						
					};
					
				}
				forEachSaver19306.values[forEachCounter19306] = local1_F_ref_2339;
			
			};
			if (((local5_Found_2338) ? 0 : 1)) {
				var forEachSaver19346 = global8_Compiler.attr7_Globals;
				for(var forEachCounter19346 = 0 ; forEachCounter19346 < forEachSaver19346.values.length ; forEachCounter19346++) {
					var local1_V_2340 = forEachSaver19346.values[forEachCounter19346];
				{
						if (((((((global8_Compiler.attr5_Varis_ref[0].arrAccess(local1_V_2340).values[tmpPositionCache][0].attr3_Typ) == (2)) ? 1 : 0)) && ((((global8_Compiler.attr5_Varis_ref[0].arrAccess(local1_V_2340).values[tmpPositionCache][0].attr8_Name_Str) == (local3_Exp_2337.attr8_Name_Str)) ? 1 : 0))) ? 1 : 0)) {
							local5_Found_2338 = 1;
							break;
							
						};
						
					}
					forEachSaver19346.values[forEachCounter19346] = local1_V_2340;
				
				};
				
			};
			if (((local5_Found_2338) ? 0 : 1)) {
				func5_Error((((("Cannot export undefined function/global '") + (local3_Exp_2337.attr8_Name_Str))) + ("'")), 1814, "Parser.gbas");
				
			};
			local3_Exp_2337.attr8_Name_Str = REPLACE_Str(local3_Exp_2337.attr8_Name_Str, "$", "_Str");
			func7_GetNext();
			if (func7_IsToken(",")) {
				func5_Match(",", 1818, "Parser.gbas");
				local3_Exp_2337.attr12_RealName_Str = REPLACE_Str(func14_GetCurrent_Str(), "\"", "");
				func7_GetNext();
				
			};
			DIMPUSH(global8_Compiler.attr7_Exports, local3_Exp_2337);
			return tryClone(func21_CreateEmptyExpression());
			
		} else if ((((local17___SelectHelper23__2299) == (func7_IsToken("IF"))) ? 1 : 0)) {
			var local4_Cnds_2341 = new GLBArray(), local4_Scps_2342 = new GLBArray(), local7_elseScp_2343 = 0;
			func5_Match("IF", 1827, "Parser.gbas");
			DIMPUSH(local4_Cnds_2341, func14_EnsureDatatype(func10_Expression(0), global13_floatDatatype, 1829, 0));
			if ((((func7_IsToken("THEN")) == (0)) ? 1 : 0)) {
				func5_Match("\n", 1831, "Parser.gbas");
				
			};
			DIMPUSH(local4_Scps_2342, func5_Scope("ENDIF", -(1)));
			while (func7_IsToken("ELSEIF")) {
				func5_Match("ELSEIF", 1838, "Parser.gbas");
				DIMPUSH(local4_Cnds_2341, func14_EnsureDatatype(func10_Expression(0), global13_floatDatatype, 1839, 0));
				func5_Match("\n", 1840, "Parser.gbas");
				DIMPUSH(local4_Scps_2342, func5_Scope("ENDIF", -(1)));
				
			};
			if (func7_IsToken("ELSE")) {
				func5_Match("ELSE", 1844, "Parser.gbas");
				func5_Match("\n", 1845, "Parser.gbas");
				local7_elseScp_2343 = func5_Scope("ENDIF", -(1));
				
			} else {
				local7_elseScp_2343 = -(1);
				
			};
			return tryClone(func18_CreateIfExpression(unref(local4_Cnds_2341), unref(local4_Scps_2342), local7_elseScp_2343));
			
		} else if ((((local17___SelectHelper23__2299) == (func7_IsToken("WHILE"))) ? 1 : 0)) {
			var local4_Expr_2344 = 0, local3_Scp_2345 = 0;
			func5_Match("WHILE", 1853, "Parser.gbas");
			local4_Expr_2344 = func14_EnsureDatatype(func10_Expression(0), global13_floatDatatype, 1854, 0);
			func5_Match("\n", 1855, "Parser.gbas");
			local3_Scp_2345 = func5_Scope("WEND", -(1));
			return tryClone(func21_CreateWhileExpression(local4_Expr_2344, local3_Scp_2345));
			
		} else if ((((local17___SelectHelper23__2299) == (func7_IsToken("REPEAT"))) ? 1 : 0)) {
			var local3_Scp_2346 = 0, local4_Expr_2347 = 0;
			func5_Match("REPEAT", 1859, "Parser.gbas");
			func5_Match("\n", 1860, "Parser.gbas");
			local3_Scp_2346 = func5_Scope("UNTIL", -(1));
			local4_Expr_2347 = func14_EnsureDatatype(func10_Expression(0), global13_floatDatatype, 1862, 0);
			return tryClone(func22_CreateRepeatExpression(local4_Expr_2347, local3_Scp_2346));
			
		} else if ((((local17___SelectHelper23__2299) == (func7_IsToken("FOR"))) ? 1 : 0)) {
			var local8_TmpScope_2348 = 0.0, local4_Expr_2349 = 0, local6_OScope_2359 = 0;
			local8_TmpScope_2348 = global8_Compiler.attr12_CurrentScope;
			global8_Compiler.attr12_CurrentScope = func21_CreateScopeExpression(~~(3));
			local4_Expr_2349 = -(1);
			{
				var Error_Str = "";
				try {
					var local10_IsImplicit_2350 = 0, local7_varExpr_2351 = 0, local3_Var_2354 = 0.0, local5_hasTo_2355 = 0, local6_toExpr_2356 = 0, local8_stepExpr_2357 = 0;
					func5_Match("FOR", 1869, "Parser.gbas");
					local10_IsImplicit_2350 = -(1);
					if (func12_IsIdentifier(0)) {
						local7_varExpr_2351 = func10_Identifier(1);
						
					} else {
						var local4_Vari_2352 = new type14_IdentifierVari(), local4_PDef_2353 = 0;
						local10_IsImplicit_2350 = 1;
						local4_Vari_2352 = func7_VariDef(0).clone(/* In Assign */);
						local4_Vari_2352.attr3_Typ = ~~(1);
						local4_PDef_2353 = -(1);
						if ((((local4_Vari_2352.attr6_PreDef) != (-(1))) ? 1 : 0)) {
							local4_PDef_2353 = local4_Vari_2352.attr6_PreDef;
							local4_Vari_2352.attr6_PreDef = -(1);
							
						};
						func11_AddVariable(local4_Vari_2352, 1);
						local10_IsImplicit_2350 = ((BOUNDS(global8_Compiler.attr5_Varis_ref[0], 0)) - (1));
						DIMPUSH(global5_Exprs_ref[0].arrAccess(global8_Compiler.attr12_CurrentScope).values[tmpPositionCache][0].attr5_Varis, ((BOUNDS(global8_Compiler.attr5_Varis_ref[0], 0)) - (1)));
						if ((((local4_PDef_2353) != (-(1))) ? 1 : 0)) {
							local7_varExpr_2351 = func22_CreateAssignExpression(func24_CreateVariableExpression(((BOUNDS(global8_Compiler.attr5_Varis_ref[0], 0)) - (1))), local4_PDef_2353);
							
						};
						
					};
					if ((((global5_Exprs_ref[0].arrAccess(local7_varExpr_2351).values[tmpPositionCache][0].attr3_Typ) != (10)) ? 1 : 0)) {
						func5_Error("FOR, variable needs assignment.", 1899, "Parser.gbas");
						
					};
					local3_Var_2354 = func11_GetVariable(global5_Exprs_ref[0].arrAccess(local7_varExpr_2351).values[tmpPositionCache][0].attr4_vari, 1);
					if (func7_IsToken("TO")) {
						local5_hasTo_2355 = 1;
						func5_Match("TO", 1904, "Parser.gbas");
						
					} else if (func7_IsToken("UNTIL")) {
						local5_hasTo_2355 = 0;
						func5_Match("UNTIL", 1907, "Parser.gbas");
						
					} else {
						func5_Error("FOR needs TO or UNTIL!", 1909, "Parser.gbas");
						
					};
					local6_toExpr_2356 = func14_EnsureDatatype(func10_Expression(0), global8_Compiler.attr5_Varis_ref[0].arrAccess(~~(local3_Var_2354)).values[tmpPositionCache][0].attr8_datatype, 1911, 0);
					local8_stepExpr_2357 = func14_EnsureDatatype(func19_CreateIntExpression(1), global8_Compiler.attr5_Varis_ref[0].arrAccess(~~(local3_Var_2354)).values[tmpPositionCache][0].attr8_datatype, 1912, 0);
					if (func7_IsToken("STEP")) {
						func5_Match("STEP", 1914, "Parser.gbas");
						local8_stepExpr_2357 = func14_EnsureDatatype(func10_Expression(0), global8_Compiler.attr5_Varis_ref[0].arrAccess(~~(local3_Var_2354)).values[tmpPositionCache][0].attr8_datatype, 1915, 0);
						
					};
					func5_Match("\n", 1917, "Parser.gbas");
					local4_Expr_2349 = func19_CreateForExpression(local7_varExpr_2351, local6_toExpr_2356, local8_stepExpr_2357, local5_hasTo_2355, func5_Scope("NEXT", -(1)));
					DIMPUSH(global5_Exprs_ref[0].arrAccess(global8_Compiler.attr12_CurrentScope).values[tmpPositionCache][0].attr5_Exprs, local4_Expr_2349);
					
				} catch (Error_Str) {
					if (Error_Str instanceof GLBException) Error_Str = Error_Str.getText(); else throwError(Error_Str);{
						func8_FixError();
						
					}
				};
				
			};
			local6_OScope_2359 = global8_Compiler.attr12_CurrentScope;
			global8_Compiler.attr12_CurrentScope = ~~(local8_TmpScope_2348);
			return tryClone(local6_OScope_2359);
			
		} else if ((((local17___SelectHelper23__2299) == (func7_IsToken("FOREACH"))) ? 1 : 0)) {
			var local8_TmpScope_2360 = 0.0, local14_TmpForEach_Str_2361 = "", local4_Expr_2362 = 0;
			local8_TmpScope_2360 = global8_Compiler.attr12_CurrentScope;
			local14_TmpForEach_Str_2361 = global8_Compiler.attr18_currentForEach_Str;
			global8_Compiler.attr12_CurrentScope = func21_CreateScopeExpression(~~(3));
			local4_Expr_2362 = -(1);
			{
				var Error_Str = "";
				try {
					var local7_varExpr_2363 = 0, local4_Vari_2364 = new type14_IdentifierVari(), local6_InExpr_2365 = 0, local3_var_2366 = 0;
					func5_Match("FOREACH", 1935, "Parser.gbas");
					local4_Vari_2364 = func7_VariDef(0).clone(/* In Assign */);
					local4_Vari_2364.attr3_Typ = ~~(1);
					if ((((local4_Vari_2364.attr6_PreDef) != (-(1))) ? 1 : 0)) {
						func5_Error("No default value, in FOREACH", 1950, "Parser.gbas");
						
					};
					func11_AddVariable(local4_Vari_2364, 1);
					DIMPUSH(global5_Exprs_ref[0].arrAccess(global8_Compiler.attr12_CurrentScope).values[tmpPositionCache][0].attr5_Varis, ((BOUNDS(global8_Compiler.attr5_Varis_ref[0], 0)) - (1)));
					local7_varExpr_2363 = func24_CreateVariableExpression(((BOUNDS(global8_Compiler.attr5_Varis_ref[0], 0)) - (1)));
					global8_Compiler.attr18_currentForEach_Str = global8_Compiler.attr5_Varis_ref[0].arrAccess(func11_GetVariable(local7_varExpr_2363, 1)).values[tmpPositionCache][0].attr8_Name_Str;
					func5_Match("IN", 1957, "Parser.gbas");
					local6_InExpr_2365 = func10_Identifier(0);
					if ((((global5_Exprs_ref[0].arrAccess(local6_InExpr_2365).values[tmpPositionCache][0].attr8_datatype.attr7_IsArray_ref[0]) == (0)) ? 1 : 0)) {
						func5_Error("Expecting Array", 1960, "Parser.gbas");
						
					};
					global5_Exprs_ref[0].arrAccess(local7_varExpr_2363).values[tmpPositionCache][0].attr8_datatype = global5_Exprs_ref[0].arrAccess(local6_InExpr_2365).values[tmpPositionCache][0].attr8_datatype.clone(/* In Assign */);
					global5_Exprs_ref[0].arrAccess(local7_varExpr_2363).values[tmpPositionCache][0].attr8_datatype.attr7_IsArray_ref[0] = 0;
					local3_var_2366 = func11_GetVariable(local7_varExpr_2363, 1);
					global8_Compiler.attr5_Varis_ref[0].arrAccess(local3_var_2366).values[tmpPositionCache][0].attr8_datatype = global5_Exprs_ref[0].arrAccess(local6_InExpr_2365).values[tmpPositionCache][0].attr8_datatype.clone(/* In Assign */);
					global8_Compiler.attr5_Varis_ref[0].arrAccess(local3_var_2366).values[tmpPositionCache][0].attr8_datatype.attr7_IsArray_ref[0] = 0;
					global8_Compiler.attr5_Varis_ref[0].arrAccess(local3_var_2366).values[tmpPositionCache][0].attr3_ref = global8_Compiler.attr5_Varis_ref[0].arrAccess(func11_GetVariable(local6_InExpr_2365, 1)).values[tmpPositionCache][0].attr3_ref;
					func5_Match("\n", 1970, "Parser.gbas");
					local4_Expr_2362 = func23_CreateForEachExpression(local7_varExpr_2363, local6_InExpr_2365, func5_Scope("NEXT", -(1)));
					
				} catch (Error_Str) {
					if (Error_Str instanceof GLBException) Error_Str = Error_Str.getText(); else throwError(Error_Str);{
						func8_FixError();
						
					}
				};
				
			};
			global8_Compiler.attr12_CurrentScope = ~~(local8_TmpScope_2360);
			global8_Compiler.attr18_currentForEach_Str = local14_TmpForEach_Str_2361;
			return tryClone(local4_Expr_2362);
			
		} else if ((((local17___SelectHelper23__2299) == (func7_IsToken("BREAK"))) ? 1 : 0)) {
			func5_Match("BREAK", 1979, "Parser.gbas");
			if ((((global8_Compiler.attr6_inLoop) == (0)) ? 1 : 0)) {
				func5_Error("BREAK not inside loop", 1980, "Parser.gbas");
				
			};
			return tryClone(func21_CreateBreakExpression());
			
		} else if ((((local17___SelectHelper23__2299) == (func7_IsToken("CONTINUE"))) ? 1 : 0)) {
			func5_Match("CONTINUE", 1983, "Parser.gbas");
			if ((((global8_Compiler.attr6_inLoop) == (0)) ? 1 : 0)) {
				func5_Error("CONTINUE not inside loop", 1984, "Parser.gbas");
				
			};
			return tryClone(func24_CreateContinueExpression());
			
		} else if ((((local17___SelectHelper23__2299) == (func7_IsToken("TRY"))) ? 1 : 0)) {
			var local6_tryScp_2368 = 0, local4_Vari_2369 = new type14_IdentifierVari(), local2_id_2370 = 0.0, local7_myScope_2371 = 0, local8_TmpScope_2372 = 0.0;
			func5_Match("TRY", 1987, "Parser.gbas");
			func5_Match("\n", 1988, "Parser.gbas");
			local6_tryScp_2368 = func5_Scope("CATCH", -(1));
			local4_Vari_2369 = func7_VariDef(0).clone(/* In Assign */);
			if ((((local4_Vari_2369.attr8_datatype.attr8_Name_Str_ref[0]) != ("string")) ? 1 : 0)) {
				func5_Error("Catch variable must be string", 1992, "Parser.gbas");
				
			};
			if (local4_Vari_2369.attr8_datatype.attr7_IsArray_ref[0]) {
				func5_Error("Catch variable must be non array", 1993, "Parser.gbas");
				
			};
			local2_id_2370 = BOUNDS(global8_Compiler.attr5_Varis_ref[0], 0);
			func11_AddVariable(local4_Vari_2369, 0);
			local7_myScope_2371 = -(1);
			local8_TmpScope_2372 = global8_Compiler.attr12_CurrentScope;
			global8_Compiler.attr12_CurrentScope = func21_CreateScopeExpression(~~(1));
			{
				var Error_Str = "";
				try {
					var local7_ctchScp_2373 = 0, local1_e_2374 = 0;
					DIMPUSH(global5_Exprs_ref[0].arrAccess(global8_Compiler.attr12_CurrentScope).values[tmpPositionCache][0].attr5_Varis, ~~(local2_id_2370));
					func5_Match("\n", 2003, "Parser.gbas");
					local7_ctchScp_2373 = func5_Scope("FINALLY", -(1));
					local1_e_2374 = func19_CreateTryExpression(local6_tryScp_2368, local7_ctchScp_2373, ~~(local2_id_2370));
					DIMPUSH(global5_Exprs_ref[0].arrAccess(global8_Compiler.attr12_CurrentScope).values[tmpPositionCache][0].attr5_Exprs, local1_e_2374);
					local7_myScope_2371 = global8_Compiler.attr12_CurrentScope;
					
				} catch (Error_Str) {
					if (Error_Str instanceof GLBException) Error_Str = Error_Str.getText(); else throwError(Error_Str);{
						func8_FixError();
						
					}
				};
				
			};
			global8_Compiler.attr12_CurrentScope = ~~(local8_TmpScope_2372);
			return tryClone(local7_myScope_2371);
			
		} else if ((((local17___SelectHelper23__2299) == (func7_IsToken("THROW"))) ? 1 : 0)) {
			func5_Match("THROW", 2017, "Parser.gbas");
			return tryClone(func21_CreateThrowExpression(func14_EnsureDatatype(func10_Expression(0), global11_strDatatype, 2018, 0)));
			
		} else if ((((local17___SelectHelper23__2299) == (func7_IsToken("SELECT"))) ? 1 : 0)) {
			var local4_Vari_2377 = new type14_IdentifierVari(), local5_Cond1_2378 = 0, local8_datatype_2379 = new type8_Datatype(), local5_Conds_2380 = new GLBArray(), local4_Scps_2381 = new GLBArray(), local7_elseScp_2382 = 0, local8_TmpScope_2383 = 0.0, local8_VariExpr_2384 = 0, local1_e_2385 = 0, local7_myScope_2391 = 0;
			static12_Keyword_SelectHelper+=1;
			local4_Vari_2377.attr8_Name_Str = (((("__SelectHelper") + (CAST2STRING(static12_Keyword_SelectHelper)))) + ("_"));
			local4_Vari_2377.attr3_Typ = ~~(1);
			func5_Match("SELECT", 2027, "Parser.gbas");
			local5_Cond1_2378 = func10_Expression(0);
			local8_datatype_2379 = global5_Exprs_ref[0].arrAccess(local5_Cond1_2378).values[tmpPositionCache][0].attr8_datatype.clone(/* In Assign */);
			local4_Vari_2377.attr8_datatype = local8_datatype_2379.clone(/* In Assign */);
			local7_elseScp_2382 = -(1);
			func11_AddVariable(local4_Vari_2377, 0);
			local8_TmpScope_2383 = global8_Compiler.attr12_CurrentScope;
			global8_Compiler.attr12_CurrentScope = func21_CreateScopeExpression(~~(1));
			DIMPUSH(global5_Exprs_ref[0].arrAccess(global8_Compiler.attr12_CurrentScope).values[tmpPositionCache][0].attr5_Varis, ((BOUNDS(global8_Compiler.attr5_Varis_ref[0], 0)) - (1)));
			local8_VariExpr_2384 = func24_CreateVariableExpression(((BOUNDS(global8_Compiler.attr5_Varis_ref[0], 0)) - (1)));
			local1_e_2385 = func22_CreateAssignExpression(local8_VariExpr_2384, local5_Cond1_2378);
			DIMPUSH(global5_Exprs_ref[0].arrAccess(global8_Compiler.attr12_CurrentScope).values[tmpPositionCache][0].attr5_Exprs, local1_e_2385);
			local5_Cond1_2378 = local8_VariExpr_2384;
			func5_Match("\n", 2051, "Parser.gbas");
			while (func7_IsToken("CASE")) {
				var local5_Cond2_2386 = 0;
				func5_Match("CASE", 2053, "Parser.gbas");
				local5_Cond2_2386 = -(1);
				do {
					var local2_Op_2387 = 0.0, local5_Expr1_2388 = 0, local5_Expr2_2389 = 0, local7_tmpCond_2390 = 0;
					if (func7_IsToken(",")) {
						func5_Match(",", 2056, "Parser.gbas");
						
					};
					local2_Op_2387 = func14_SearchOperator("=");
					if (func10_IsOperator()) {
						local2_Op_2387 = func14_SearchOperator(func14_GetCurrent_Str());
						func7_GetNext();
						
					};
					local5_Expr1_2388 = -(1);
					local5_Expr2_2389 = -(1);
					local5_Expr1_2388 = func14_EnsureDatatype(func10_Expression(0), local8_datatype_2379, 2066, 0);
					if (func7_IsToken("TO")) {
						func5_Match("TO", 2068, "Parser.gbas");
						local5_Expr2_2389 = func14_EnsureDatatype(func10_Expression(0), local8_datatype_2379, 2069, 0);
						local5_Expr1_2388 = func24_CreateOperatorExpression(unref(global9_Operators_ref[0].arrAccess(func14_SearchOperator(">=")).values[tmpPositionCache][0]), local5_Cond1_2378, local5_Expr1_2388);
						local5_Expr2_2389 = func24_CreateOperatorExpression(unref(global9_Operators_ref[0].arrAccess(func14_SearchOperator("<=")).values[tmpPositionCache][0]), local5_Cond1_2378, local5_Expr2_2389);
						local7_tmpCond_2390 = func24_CreateOperatorExpression(unref(global9_Operators_ref[0].arrAccess(func14_SearchOperator("AND")).values[tmpPositionCache][0]), local5_Expr1_2388, local5_Expr2_2389);
						
					} else {
						local7_tmpCond_2390 = func24_CreateOperatorExpression(unref(global9_Operators_ref[0].arrAccess(~~(local2_Op_2387)).values[tmpPositionCache][0]), local5_Cond1_2378, local5_Expr1_2388);
						
					};
					if ((((local5_Cond2_2386) == (-(1))) ? 1 : 0)) {
						local5_Cond2_2386 = local7_tmpCond_2390;
						
					} else {
						local5_Cond2_2386 = func24_CreateOperatorExpression(unref(global9_Operators_ref[0].arrAccess(func14_SearchOperator("OR")).values[tmpPositionCache][0]), local5_Cond2_2386, local7_tmpCond_2390);
						
					};
					
				} while (!((((func7_IsToken(",")) == (0)) ? 1 : 0)));
				func5_Match("\n", 2085, "Parser.gbas");
				DIMPUSH(local5_Conds_2380, local5_Cond2_2386);
				DIMPUSH(local4_Scps_2381, func5_Scope("ENDSELECT", -(1)));
				
			};
			if (func7_IsToken("DEFAULT")) {
				func5_Match("DEFAULT", 2090, "Parser.gbas");
				func5_Match("\n", 2091, "Parser.gbas");
				local7_elseScp_2382 = func5_Scope("ENDSELECT", -(1));
				
			};
			if (((((((local7_elseScp_2382) == (-(1))) ? 1 : 0)) && ((((BOUNDS(local5_Conds_2380, 0)) == (0)) ? 1 : 0))) ? 1 : 0)) {
				func5_Match("ENDSELECT", 2095, "Parser.gbas");
				
			};
			local1_e_2385 = func18_CreateIfExpression(unref(local5_Conds_2380), unref(local4_Scps_2381), local7_elseScp_2382);
			DIMPUSH(global5_Exprs_ref[0].arrAccess(global8_Compiler.attr12_CurrentScope).values[tmpPositionCache][0].attr5_Exprs, local1_e_2385);
			local7_myScope_2391 = global8_Compiler.attr12_CurrentScope;
			global8_Compiler.attr12_CurrentScope = ~~(local8_TmpScope_2383);
			return tryClone(local7_myScope_2391);
			
		} else if ((((local17___SelectHelper23__2299) == (func7_IsToken("STARTDATA"))) ? 1 : 0)) {
			func5_Match("STARTDATA", 2104, "Parser.gbas");
			func10_SkipTokens("STARTDATA", "ENDDATA", func14_GetCurrent_Str());
			
		} else if ((((local17___SelectHelper23__2299) == (func7_IsToken("RESTORE"))) ? 1 : 0)) {
			var local8_Name_Str_2392 = "";
			func5_Match("RESTORE", 2107, "Parser.gbas");
			local8_Name_Str_2392 = func14_GetCurrent_Str();
			func5_Match(local8_Name_Str_2392, 2109, "Parser.gbas");
			var forEachSaver20621 = global8_Compiler.attr10_DataBlocks;
			for(var forEachCounter20621 = 0 ; forEachCounter20621 < forEachSaver20621.values.length ; forEachCounter20621++) {
				var local5_block_2393 = forEachSaver20621.values[forEachCounter20621];
			{
					if ((((local5_block_2393.attr8_Name_Str) == (local8_Name_Str_2392)) ? 1 : 0)) {
						return tryClone(func23_CreateRestoreExpression(local8_Name_Str_2392));
						
					};
					
				}
				forEachSaver20621.values[forEachCounter20621] = local5_block_2393;
			
			};
			func5_Error((((("RESTORE label '") + (local8_Name_Str_2392))) + ("' unknown.")), 2115, "Parser.gbas");
			
		} else if ((((local17___SelectHelper23__2299) == (func7_IsToken("READ"))) ? 1 : 0)) {
			var local5_Reads_2394 = new GLBArray();
			func5_Match("READ", 2117, "Parser.gbas");
			do {
				var local1_e_2395 = 0;
				if (func7_IsToken(",")) {
					func5_Match(",", 2120, "Parser.gbas");
					
				};
				local1_e_2395 = func10_Identifier(0);
				DIMPUSH(local5_Reads_2394, local1_e_2395);
				
			} while (!((((func7_IsToken(",")) == (0)) ? 1 : 0)));
			return tryClone(func20_CreateReadExpression(unref(local5_Reads_2394)));
			
		} else if ((((local17___SelectHelper23__2299) == (func7_IsToken("GOTO"))) ? 1 : 0)) {
			var local8_Name_Str_2397 = "", local4_Expr_2398 = 0, local3_Scp_2399 = 0;
			func5_Match("GOTO", 2128, "Parser.gbas");
			local8_Name_Str_2397 = func14_GetCurrent_Str();
			func7_GetNext();
			global8_Compiler.attr7_HasGoto = 1;
			if (((static7_Keyword_GOTOErr) ? 0 : 1)) {
				static7_Keyword_GOTOErr = 1;
				func7_Warning("GOTO may cause problems!");
				
			};
			local4_Expr_2398 = func20_CreateGotoExpression(local8_Name_Str_2397);
			local3_Scp_2399 = global8_Compiler.attr14_ImportantScope;
			if ((((local3_Scp_2399) == (-(1))) ? 1 : 0)) {
				func5_Error("Internal error (GOTO Scp is -1", 2141, "Parser.gbas");
				
			};
			DIMPUSH(global5_Exprs_ref[0].arrAccess(local3_Scp_2399).values[tmpPositionCache][0].attr5_Gotos, local4_Expr_2398);
			return tryClone(local4_Expr_2398);
			
		} else if ((((local17___SelectHelper23__2299) == (func7_IsToken("INC"))) ? 1 : 0)) {
			var local4_Vari_2400 = 0, local7_AddExpr_2401 = 0;
			func5_Match("INC", 2147, "Parser.gbas");
			local4_Vari_2400 = func10_Identifier(0);
			if (global5_Exprs_ref[0].arrAccess(local4_Vari_2400).values[tmpPositionCache][0].attr8_datatype.attr7_IsArray_ref[0]) {
				func5_Error("Cannot increment array...", 2149, "Parser.gbas");
				
			};
			{
				var local17___SelectHelper26__2402 = "";
				local17___SelectHelper26__2402 = global5_Exprs_ref[0].arrAccess(local4_Vari_2400).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str_ref[0];
				if ((((local17___SelectHelper26__2402) == ("int")) ? 1 : 0)) {
					if (func7_IsToken(",")) {
						func5_Match(",", 2154, "Parser.gbas");
						local7_AddExpr_2401 = func14_EnsureDatatype(func10_Expression(0), global11_intDatatype, 2155, 0);
						
					} else {
						local7_AddExpr_2401 = func19_CreateIntExpression(1);
						
					};
					
				} else if ((((local17___SelectHelper26__2402) == ("float")) ? 1 : 0)) {
					if (func7_IsToken(",")) {
						func5_Match(",", 2161, "Parser.gbas");
						local7_AddExpr_2401 = func14_EnsureDatatype(func10_Expression(0), global13_floatDatatype, 2162, 0);
						
					} else {
						local7_AddExpr_2401 = func21_CreateFloatExpression(1);
						
					};
					
				} else if ((((local17___SelectHelper26__2402) == ("string")) ? 1 : 0)) {
					if (func7_IsToken(",")) {
						func5_Match(",", 2168, "Parser.gbas");
						local7_AddExpr_2401 = func14_EnsureDatatype(func10_Expression(0), global11_strDatatype, 2169, 0);
						
					} else {
						local7_AddExpr_2401 = func19_CreateStrExpression(" ");
						
					};
					
				} else {
					func5_Error("Cannot increment type or prototype", 2174, "Parser.gbas");
					
				};
				
			};
			return tryClone(func19_CreateIncExpression(local4_Vari_2400, local7_AddExpr_2401));
			
		} else if ((((local17___SelectHelper23__2299) == (func7_IsToken("DEC"))) ? 1 : 0)) {
			var local4_Vari_2403 = 0, local7_AddExpr_2404 = 0;
			func5_Match("DEC", 2178, "Parser.gbas");
			local4_Vari_2403 = func10_Identifier(0);
			if (global5_Exprs_ref[0].arrAccess(local4_Vari_2403).values[tmpPositionCache][0].attr8_datatype.attr7_IsArray_ref[0]) {
				func5_Error("Cannot decrement array...", 2181, "Parser.gbas");
				
			};
			{
				var local17___SelectHelper27__2405 = "";
				local17___SelectHelper27__2405 = global5_Exprs_ref[0].arrAccess(local4_Vari_2403).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str_ref[0];
				if ((((local17___SelectHelper27__2405) == ("int")) ? 1 : 0)) {
					if (func7_IsToken(",")) {
						var alias2_Op_ref_2406 = [new type8_Operator()];
						func5_Match(",", 2185, "Parser.gbas");
						alias2_Op_ref_2406 = global9_Operators_ref[0].arrAccess(func14_SearchOperator("sub")).values[tmpPositionCache] /* ALIAS */;
						local7_AddExpr_2404 = func24_CreateOperatorExpression(unref(alias2_Op_ref_2406[0]), func19_CreateIntExpression(0), func14_EnsureDatatype(func10_Expression(0), global11_intDatatype, 2187, 0));
						
					} else {
						local7_AddExpr_2404 = func19_CreateIntExpression(-(1));
						
					};
					
				} else if ((((local17___SelectHelper27__2405) == ("float")) ? 1 : 0)) {
					if (func7_IsToken(",")) {
						var alias2_Op_ref_2407 = [new type8_Operator()];
						func5_Match(",", 2193, "Parser.gbas");
						alias2_Op_ref_2407 = global9_Operators_ref[0].arrAccess(func14_SearchOperator("sub")).values[tmpPositionCache] /* ALIAS */;
						local7_AddExpr_2404 = func24_CreateOperatorExpression(unref(alias2_Op_ref_2407[0]), func21_CreateFloatExpression(0), func14_EnsureDatatype(func10_Expression(0), global13_floatDatatype, 2195, 0));
						
					} else {
						local7_AddExpr_2404 = func21_CreateFloatExpression(-(1));
						
					};
					
				} else if ((((local17___SelectHelper27__2405) == ("string")) ? 1 : 0)) {
					func5_Error("Cannot decrement string...", 2200, "Parser.gbas");
					
				} else {
					func5_Error("Cannot decrement type or prototype", 2202, "Parser.gbas");
					
				};
				
			};
			return tryClone(func19_CreateIncExpression(local4_Vari_2403, local7_AddExpr_2404));
			
		} else if ((((local17___SelectHelper23__2299) == (func7_IsToken("ASSERT"))) ? 1 : 0)) {
			var local4_Expr_2408 = 0;
			func5_Match("ASSERT", 2206, "Parser.gbas");
			local4_Expr_2408 = func14_EnsureDatatype(func10_Expression(0), global11_intDatatype, 2207, 0);
			if (global9_DEBUGMODE) {
				return tryClone(func22_CreateAssertExpression(local4_Expr_2408));
				
			};
			
		} else if ((((local17___SelectHelper23__2299) == (func7_IsToken("DEBUG"))) ? 1 : 0)) {
			var local4_Expr_2409 = 0;
			func5_Match("DEBUG", 2213, "Parser.gbas");
			local4_Expr_2409 = func14_EnsureDatatype(func10_Expression(0), global11_strDatatype, 2214, 0);
			if (global9_DEBUGMODE) {
				return tryClone(func27_CreateDebugOutputExpression(local4_Expr_2409));
				
			};
			
		} else {
			func5_Error("Unexpected keyword", 2220, "Parser.gbas");
			
		};
		
	};
	return tryClone(func21_CreateEmptyExpression());
	return 0;
	
};
func7_Keyword = window['func7_Keyword'];
window['func14_ImplicitDefine'] = function() {
	if ((((global6_STRICT) == (0)) ? 1 : 0)) {
		if (((func12_IsIdentifier(0)) ? 0 : 1)) {
			var local3_pos_2410 = 0, local4_Vari_2411 = new type14_IdentifierVari();
			local3_pos_2410 = global8_Compiler.attr11_currentPosi;
			local4_Vari_2411 = func7_VariDef(1).clone(/* In Assign */);
			local4_Vari_2411.attr3_Typ = ~~(2);
			func11_AddVariable(local4_Vari_2411, 0);
			DIMPUSH(global8_Compiler.attr7_Globals, ((BOUNDS(global8_Compiler.attr5_Varis_ref[0], 0)) - (1)));
			func7_Warning((((("Implicit variable declaration '") + (local4_Vari_2411.attr8_Name_Str))) + ("'")));
			global8_Compiler.attr11_currentPosi = ((local3_pos_2410) - (1));
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
window['func12_IsIdentifier'] = function(param9_CheckType) {
	var local11_Current_Str_2415 = "", local5_dummy_ref_2416 = [0], local5_Varis_2417 = new GLBArray();
	if ((((func7_IsToken("GLOBAL")) || (func7_IsToken("LOCAL"))) ? 1 : 0)) {
		return 1;
		
	};
	if ((((func6_IsType("")) && (param9_CheckType)) ? 1 : 0)) {
		var local3_pos_2413 = 0, local3_ret_2414 = 0;
		local3_pos_2413 = global8_Compiler.attr11_currentPosi;
		func7_GetNext();
		if (func7_IsToken("(")) {
			local3_ret_2414 = 1;
			
		} else {
			local3_ret_2414 = 0;
			
		};
		global8_Compiler.attr11_currentPosi = local3_pos_2413;
		
	};
	local11_Current_Str_2415 = func14_GetCurrent_Str();
	if ((global8_Compiler.attr11_GlobalFuncs).GetValue(local11_Current_Str_2415, local5_dummy_ref_2416)) {
		return 1;
		
	};
	func8_GetVaris(unref(local5_Varis_2417), -(1), 0);
	{
		var local1_i_2418 = 0.0;
		for (local1_i_2418 = ((BOUNDS(local5_Varis_2417, 0)) - (1));toCheck(local1_i_2418, 0, -(1));local1_i_2418 += -(1)) {
			if ((((func17_CleanVariable_Str(local11_Current_Str_2415)) == (global8_Compiler.attr5_Varis_ref[0].arrAccess(local5_Varis_2417.arrAccess(~~(local1_i_2418)).values[tmpPositionCache]).values[tmpPositionCache][0].attr8_Name_Str)) ? 1 : 0)) {
				return 1;
				
			};
			
		};
		
	};
	if (((((((global8_Compiler.attr11_currentFunc) != (-(1))) ? 1 : 0)) && ((((global8_Compiler.attr5_Funcs_ref[0].arrAccess(global8_Compiler.attr11_currentFunc).values[tmpPositionCache][0].attr6_MyType) != (-(1))) ? 1 : 0))) ? 1 : 0)) {
		var alias3_Typ_ref_2419 = [new type14_IdentifierType()], local5_myTyp_2420 = 0;
		alias3_Typ_ref_2419 = global8_Compiler.attr5_Types_ref[0].arrAccess(global8_Compiler.attr5_Funcs_ref[0].arrAccess(global8_Compiler.attr11_currentFunc).values[tmpPositionCache][0].attr6_MyType).values[tmpPositionCache] /* ALIAS */;
		local5_myTyp_2420 = alias3_Typ_ref_2419[0].attr2_ID;
		while ((((local5_myTyp_2420) != (-(1))) ? 1 : 0)) {
			var forEachSaver21282 = global8_Compiler.attr5_Types_ref[0].arrAccess(local5_myTyp_2420).values[tmpPositionCache][0].attr7_Methods;
			for(var forEachCounter21282 = 0 ; forEachCounter21282 < forEachSaver21282.values.length ; forEachCounter21282++) {
				var local1_M_2421 = forEachSaver21282.values[forEachCounter21282];
			{
					if (func7_IsToken(global8_Compiler.attr5_Funcs_ref[0].arrAccess(local1_M_2421).values[tmpPositionCache][0].attr8_Name_Str)) {
						return 1;
						
					};
					
				}
				forEachSaver21282.values[forEachCounter21282] = local1_M_2421;
			
			};
			local5_myTyp_2420 = global8_Compiler.attr5_Types_ref[0].arrAccess(local5_myTyp_2420).values[tmpPositionCache][0].attr9_Extending;
			
		};
		var forEachSaver21313 = alias3_Typ_ref_2419[0].attr10_Attributes;
		for(var forEachCounter21313 = 0 ; forEachCounter21313 < forEachSaver21313.values.length ; forEachCounter21313++) {
			var local1_A_2422 = forEachSaver21313.values[forEachCounter21313];
		{
				if (func7_IsToken(global8_Compiler.attr5_Varis_ref[0].arrAccess(local1_A_2422).values[tmpPositionCache][0].attr8_Name_Str)) {
					return 1;
					
				};
				
			}
			forEachSaver21313.values[forEachCounter21313] = local1_A_2422;
		
		};
		
	};
	return tryClone(0);
	return 0;
	
};
func12_IsIdentifier = window['func12_IsIdentifier'];
window['func8_IsNumber'] = function() {
	{
		var local1_i_2423 = 0.0;
		for (local1_i_2423 = 0;toCheck(local1_i_2423, (((func14_GetCurrent_Str()).length) - (1)), 1);local1_i_2423 += 1) {
			if (((((((ASC(func14_GetCurrent_Str(), ~~(local1_i_2423))) < (48)) ? 1 : 0)) || ((((ASC(func14_GetCurrent_Str(), ~~(local1_i_2423))) > (57)) ? 1 : 0))) ? 1 : 0)) {
				return tryClone(0);
				
			};
			
		};
		
	};
	return 1;
	return 0;
	
};
func8_IsNumber = window['func8_IsNumber'];
window['func8_IsString'] = function() {
	if (((((((MID_Str(func14_GetCurrent_Str(), 0, 1)) == ("\"")) ? 1 : 0)) && ((((MID_Str(func14_GetCurrent_Str(), (((func14_GetCurrent_Str()).length) - (1)), 1)) == ("\"")) ? 1 : 0))) ? 1 : 0)) {
		return 1;
		
	} else {
		return tryClone(0);
		
	};
	return 0;
	
};
func8_IsString = window['func8_IsString'];
window['func6_IsType'] = function(param7_Str_Str) {
	if ((((param7_Str_Str) == ("")) ? 1 : 0)) {
		param7_Str_Str = func14_GetCurrent_Str();
		
	};
	var forEachSaver21414 = global8_Compiler.attr5_Types_ref[0];
	for(var forEachCounter21414 = 0 ; forEachCounter21414 < forEachSaver21414.values.length ; forEachCounter21414++) {
		var local3_typ_ref_2425 = forEachSaver21414.values[forEachCounter21414];
	{
			if ((((local3_typ_ref_2425[0].attr12_RealName_Str) == (param7_Str_Str)) ? 1 : 0)) {
				global8_LastType = local3_typ_ref_2425[0].clone(/* In Assign */);
				return 1;
				
			};
			
		}
		forEachSaver21414.values[forEachCounter21414] = local3_typ_ref_2425;
	
	};
	return tryClone(0);
	return 0;
	
};
func6_IsType = window['func6_IsType'];
window['func13_IsVarExisting'] = function(param7_Var_Str) {
	var local4_Vars_2427 = new GLBArray();
	func8_GetVaris(unref(local4_Vars_2427), -(1), 0);
	{
		var local1_i_2428 = 0.0;
		for (local1_i_2428 = ((BOUNDS(local4_Vars_2427, 0)) - (1));toCheck(local1_i_2428, 0, -(1));local1_i_2428 += -(1)) {
			if ((((global8_Compiler.attr5_Varis_ref[0].arrAccess(local4_Vars_2427.arrAccess(~~(local1_i_2428)).values[tmpPositionCache]).values[tmpPositionCache][0].attr8_Name_Str) == (param7_Var_Str)) ? 1 : 0)) {
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
		func5_Error((((("Invalid identifier name: '") + (func14_GetCurrent_Str()))) + ("' is already a keyword")), 2361, "Parser.gbas");
		
	};
	if (func8_IsNumber()) {
		func5_Error((((("Invalid Identifier name: '") + (func14_GetCurrent_Str()))) + ("' is a number")), 2363, "Parser.gbas");
		
	};
	if (func8_IsString()) {
		func5_Error((((("Invalid identifier name: '") + (func14_GetCurrent_Str()))) + ("' is a string")), 2364, "Parser.gbas");
		
	};
	if (func10_IsOperator()) {
		func5_Error((((("Invalid identifier name: '") + (func14_GetCurrent_Str()))) + ("' is an operator")), 2365, "Parser.gbas");
		
	};
	return 1;
	return 0;
	
};
func14_IsValidVarName = window['func14_IsValidVarName'];
window['func14_IsFuncExisting'] = function(param8_func_Str, param10_IsCallback) {
	var forEachSaver21539 = global8_Compiler.attr5_Types_ref[0];
	for(var forEachCounter21539 = 0 ; forEachCounter21539 < forEachSaver21539.values.length ; forEachCounter21539++) {
		var local1_T_ref_2431 = forEachSaver21539.values[forEachCounter21539];
	{
			if ((((local1_T_ref_2431[0].attr8_Name_Str) == (param8_func_Str)) ? 1 : 0)) {
				return 1;
				
			};
			
		}
		forEachSaver21539.values[forEachCounter21539] = local1_T_ref_2431;
	
	};
	if ((global10_KeywordMap).DoesKeyExist(param8_func_Str)) {
		return 1;
		
	};
	var forEachSaver21583 = global8_Compiler.attr5_Funcs_ref[0];
	for(var forEachCounter21583 = 0 ; forEachCounter21583 < forEachSaver21583.values.length ; forEachCounter21583++) {
		var local1_F_ref_2432 = forEachSaver21583.values[forEachCounter21583];
	{
			if ((((((((((param8_func_Str) == (local1_F_ref_2432[0].attr8_Name_Str)) ? 1 : 0)) && (((((((local1_F_ref_2432[0].attr3_Typ) == (2)) ? 1 : 0)) || ((((local1_F_ref_2432[0].attr3_Typ) == (1)) ? 1 : 0))) ? 1 : 0))) ? 1 : 0)) && ((((local1_F_ref_2432[0].attr10_IsCallback) == (param10_IsCallback)) ? 1 : 0))) ? 1 : 0)) {
				return 1;
				
			};
			
		}
		forEachSaver21583.values[forEachCounter21583] = local1_F_ref_2432;
	
	};
	return tryClone(0);
	return 0;
	
};
func14_IsFuncExisting = window['func14_IsFuncExisting'];
window['func10_IsOperator'] = function() {
	var forEachSaver21604 = global9_Operators_ref[0];
	for(var forEachCounter21604 = 0 ; forEachCounter21604 < forEachSaver21604.values.length ; forEachCounter21604++) {
		var local2_Op_ref_2433 = forEachSaver21604.values[forEachCounter21604];
	{
			if (func7_IsToken(local2_Op_ref_2433[0].attr7_Sym_Str)) {
				return 1;
				
			};
			
		}
		forEachSaver21604.values[forEachCounter21604] = local2_Op_ref_2433;
	
	};
	return tryClone(0);
	return 0;
	
};
func10_IsOperator = window['func10_IsOperator'];
window['func15_IsValidDatatype'] = function() {
	if (func6_IsType("")) {
		return 1;
		
	};
	var forEachSaver21639 = global8_Compiler.attr5_Funcs_ref[0];
	for(var forEachCounter21639 = 0 ; forEachCounter21639 < forEachSaver21639.values.length ; forEachCounter21639++) {
		var local4_func_ref_2434 = forEachSaver21639.values[forEachCounter21639];
	{
			if (((((((local4_func_ref_2434[0].attr3_Typ) == (4)) ? 1 : 0)) && (func7_IsToken(local4_func_ref_2434[0].attr8_Name_Str))) ? 1 : 0)) {
				return 1;
				
			};
			
		}
		forEachSaver21639.values[forEachCounter21639] = local4_func_ref_2434;
	
	};
	var forEachSaver21653 = global8_Compiler.attr5_Types_ref[0];
	for(var forEachCounter21653 = 0 ; forEachCounter21653 < forEachSaver21653.values.length ; forEachCounter21653++) {
		var local3_typ_ref_2435 = forEachSaver21653.values[forEachCounter21653];
	{
			STDOUT(((local3_typ_ref_2435[0].attr12_RealName_Str) + ("\n")));
			
		}
		forEachSaver21653.values[forEachCounter21653] = local3_typ_ref_2435;
	
	};
	func5_Error((("Unknown datatype: ") + (func14_GetCurrent_Str())), 2408, "Parser.gbas");
	return 0;
	
};
func15_IsValidDatatype = window['func15_IsValidDatatype'];
window['func8_IsDefine'] = function(param7_Def_Str) {
	if ((((param7_Def_Str) == ("")) ? 1 : 0)) {
		param7_Def_Str = func14_GetCurrent_Str();
		
	};
	var forEachSaver21690 = global7_Defines;
	for(var forEachCounter21690 = 0 ; forEachCounter21690 < forEachSaver21690.values.length ; forEachCounter21690++) {
		var local3_Def_2437 = forEachSaver21690.values[forEachCounter21690];
	{
			if ((((local3_Def_2437.attr7_Key_Str) == (param7_Def_Str)) ? 1 : 0)) {
				global10_LastDefine = local3_Def_2437.clone(/* In Assign */);
				return 1;
				
			};
			
		}
		forEachSaver21690.values[forEachCounter21690] = local3_Def_2437;
	
	};
	return tryClone(0);
	return 0;
	
};
func8_IsDefine = window['func8_IsDefine'];
window['func8_GetVaris'] = function(param5_Varis, param3_Scp, param9_PreferVar) {
	if ((((param3_Scp) == (-(1))) ? 1 : 0)) {
		param3_Scp = global8_Compiler.attr12_CurrentScope;
		
	};
	if (((((((param9_PreferVar) == (-(1))) ? 1 : 0)) && ((((BOUNDS(param5_Varis, 0)) == (0)) ? 1 : 0))) ? 1 : 0)) {
		var forEachSaver21737 = global8_Compiler.attr7_Globals;
		for(var forEachCounter21737 = 0 ; forEachCounter21737 < forEachSaver21737.values.length ; forEachCounter21737++) {
			var local4_Vari_2441 = forEachSaver21737.values[forEachCounter21737];
		{
				DIMPUSH(param5_Varis, local4_Vari_2441);
				
			}
			forEachSaver21737.values[forEachCounter21737] = local4_Vari_2441;
		
		};
		
	};
	if ((((param3_Scp) != (-(1))) ? 1 : 0)) {
		var forEachSaver21761 = global5_Exprs_ref[0].arrAccess(~~(param3_Scp)).values[tmpPositionCache][0].attr5_Varis;
		for(var forEachCounter21761 = 0 ; forEachCounter21761 < forEachSaver21761.values.length ; forEachCounter21761++) {
			var local4_Vari_2442 = forEachSaver21761.values[forEachCounter21761];
		{
				DIMPUSH(param5_Varis, local4_Vari_2442);
				
			}
			forEachSaver21761.values[forEachCounter21761] = local4_Vari_2442;
		
		};
		if (((((((global8_Compiler.attr11_currentFunc) != (-(1))) ? 1 : 0)) && ((((global8_Compiler.attr5_Funcs_ref[0].arrAccess(global8_Compiler.attr11_currentFunc).values[tmpPositionCache][0].attr6_MyType) != (-(1))) ? 1 : 0))) ? 1 : 0)) {
			var alias3_Typ_ref_2443 = [new type14_IdentifierType()];
			alias3_Typ_ref_2443 = global8_Compiler.attr5_Types_ref[0].arrAccess(global8_Compiler.attr5_Funcs_ref[0].arrAccess(global8_Compiler.attr11_currentFunc).values[tmpPositionCache][0].attr6_MyType).values[tmpPositionCache] /* ALIAS */;
			var forEachSaver21810 = alias3_Typ_ref_2443[0].attr10_Attributes;
			for(var forEachCounter21810 = 0 ; forEachCounter21810 < forEachSaver21810.values.length ; forEachCounter21810++) {
				var local1_A_2444 = forEachSaver21810.values[forEachCounter21810];
			{
					DIMPUSH(param5_Varis, local1_A_2444);
					
				}
				forEachSaver21810.values[forEachCounter21810] = local1_A_2444;
			
			};
			
		};
		
	};
	if (((((((global5_Exprs_ref[0].arrAccess(~~(param3_Scp)).values[tmpPositionCache][0].attr10_SuperScope) != (-(1))) ? 1 : 0)) && ((((global5_Exprs_ref[0].arrAccess(~~(param3_Scp)).values[tmpPositionCache][0].attr6_ScpTyp) != (2)) ? 1 : 0))) ? 1 : 0)) {
		func8_GetVaris(unref(param5_Varis), global5_Exprs_ref[0].arrAccess(~~(param3_Scp)).values[tmpPositionCache][0].attr10_SuperScope, 0);
		
	} else if ((((param9_PreferVar) >= (0)) ? 1 : 0)) {
		var forEachSaver21859 = global8_Compiler.attr7_Globals;
		for(var forEachCounter21859 = 0 ; forEachCounter21859 < forEachSaver21859.values.length ; forEachCounter21859++) {
			var local4_Vari_2445 = forEachSaver21859.values[forEachCounter21859];
		{
				DIMPUSH(param5_Varis, local4_Vari_2445);
				
			}
			forEachSaver21859.values[forEachCounter21859] = local4_Vari_2445;
		
		};
		
	};
	return 0;
	
};
func8_GetVaris = window['func8_GetVaris'];
window['func11_GetVariable'] = function(param4_expr, param3_err) {
	var local6_hasErr_2448 = 0;
	local6_hasErr_2448 = 0;
	{
		var local17___SelectHelper28__2449 = 0;
		local17___SelectHelper28__2449 = global5_Exprs_ref[0].arrAccess(param4_expr).values[tmpPositionCache][0].attr3_Typ;
		if ((((local17___SelectHelper28__2449) == (~~(9))) ? 1 : 0)) {
			return tryClone(global5_Exprs_ref[0].arrAccess(param4_expr).values[tmpPositionCache][0].attr4_vari);
			
		} else if ((((local17___SelectHelper28__2449) == (~~(13))) ? 1 : 0)) {
			return tryClone(func11_GetVariable(global5_Exprs_ref[0].arrAccess(param4_expr).values[tmpPositionCache][0].attr5_array, param3_err));
			
		} else if ((((local17___SelectHelper28__2449) == (~~(18))) ? 1 : 0)) {
			return tryClone(func11_GetVariable(global5_Exprs_ref[0].arrAccess(param4_expr).values[tmpPositionCache][0].attr8_nextExpr, param3_err));
			
		} else if ((((local17___SelectHelper28__2449) == (~~(54))) ? 1 : 0)) {
			return tryClone(func11_GetVariable(global5_Exprs_ref[0].arrAccess(param4_expr).values[tmpPositionCache][0].attr4_expr, param3_err));
			
		} else if ((((local17___SelectHelper28__2449) == (~~(6))) ? 1 : 0)) {
			if ((((global5_Exprs_ref[0].arrAccess(param4_expr).values[tmpPositionCache][0].attr4_func) != (-(1))) ? 1 : 0)) {
				var alias4_func_ref_2450 = [new type14_IdentifierFunc()];
				alias4_func_ref_2450 = global8_Compiler.attr5_Funcs_ref[0].arrAccess(global5_Exprs_ref[0].arrAccess(param4_expr).values[tmpPositionCache][0].attr4_func).values[tmpPositionCache] /* ALIAS */;
				if ((((alias4_func_ref_2450[0].attr3_Typ) == (3)) ? 1 : 0)) {
					return tryClone(-(1));
					
				} else {
					local6_hasErr_2448 = 1;
					
				};
				
			} else {
				local6_hasErr_2448 = 1;
				
			};
			
		} else {
			local6_hasErr_2448 = 1;
			
		};
		
	};
	if ((((local6_hasErr_2448) && (param3_err)) ? 1 : 0)) {
		var local7_add_Str_2451 = "";
		local7_add_Str_2451 = "";
		func5_Error((("Variable expected.") + (local7_add_Str_2451)), 2493, "Parser.gbas");
		
	} else {
		return tryClone(-(1));
		
	};
	return 0;
	
};
func11_GetVariable = window['func11_GetVariable'];
window['func12_GetRightExpr'] = function(param4_expr) {
	{
		var local17___SelectHelper29__2453 = 0;
		local17___SelectHelper29__2453 = global5_Exprs_ref[0].arrAccess(param4_expr).values[tmpPositionCache][0].attr3_Typ;
		if ((((local17___SelectHelper29__2453) == (~~(18))) ? 1 : 0)) {
			return tryClone(func12_GetRightExpr(global5_Exprs_ref[0].arrAccess(param4_expr).values[tmpPositionCache][0].attr8_nextExpr));
			
		} else {
			return tryClone(param4_expr);
			
		};
		
	};
	return 0;
	
};
func12_GetRightExpr = window['func12_GetRightExpr'];
window['func16_AddDataChars_Str'] = function(param8_Text_Str, param4_func) {
	if ((((param4_func.attr8_datatype.attr8_Name_Str_ref[0]) == ("int")) ? 1 : 0)) {
		return tryClone(((param8_Text_Str) + ("%")));
		
	};
	if ((((param4_func.attr8_datatype.attr8_Name_Str_ref[0]) == ("float")) ? 1 : 0)) {
		return tryClone(((param8_Text_Str) + ("#")));
		
	};
	return tryClone(param8_Text_Str);
	return "";
	
};
func16_AddDataChars_Str = window['func16_AddDataChars_Str'];
window['func10_SkipTokens'] = function(param8_Open_Str, param9_Close_Str, param8_Name_Str) {
	var local8_startpos_2459 = 0;
	local8_startpos_2459 = global8_Compiler.attr11_currentPosi;
	while (((((((func7_IsToken(param9_Close_Str)) == (0)) ? 1 : 0)) && (func7_HasNext())) ? 1 : 0)) {
		if (func7_HasNext()) {
			func7_GetNext();
			
		};
		
	};
	if ((((func7_HasNext()) == (0)) ? 1 : 0)) {
		var local6_tmpPos_2460 = 0.0;
		local6_tmpPos_2460 = global8_Compiler.attr11_currentPosi;
		global8_Compiler.attr11_currentPosi = local8_startpos_2459;
		{
			var ex_Str = "";
			try {
				func5_Error(((((((((((param8_Open_Str) + (" "))) + (param8_Name_Str))) + (" needs '"))) + (param9_Close_Str))) + ("', unexpected end of file.")), 2529, "Parser.gbas");
				
			} catch (ex_Str) {
				if (ex_Str instanceof GLBException) ex_Str = ex_Str.getText(); else throwError(ex_Str);{
					global8_Compiler.attr11_currentPosi = ~~(local6_tmpPos_2460);
					throw new GLBException(ex_Str, "\Parser.gbas", 2533);
					
				}
			};
			
		};
		
	};
	if ((((param9_Close_Str) != ("\n")) ? 1 : 0)) {
		func5_Match(param9_Close_Str, 2535, "Parser.gbas");
		
	};
	return 0;
	
};
func10_SkipTokens = window['func10_SkipTokens'];
window['func17_BuildPrototyp_Str'] = function(param1_F) {
	var alias4_Func_ref_2463 = [new type14_IdentifierFunc()], local8_Text_Str_2464 = "", local5_Found_2465 = 0;
	alias4_Func_ref_2463 = global8_Compiler.attr5_Funcs_ref[0].arrAccess(param1_F).values[tmpPositionCache] /* ALIAS */;
	local8_Text_Str_2464 = (((((("RETURN TYPE: ") + (alias4_Func_ref_2463[0].attr8_datatype.attr8_Name_Str_ref[0]))) + (func20_BuildArrBrackets_Str(unref(alias4_Func_ref_2463[0].attr8_datatype.attr7_IsArray_ref[0]))))) + (" PARAMETER:"));
	local5_Found_2465 = 0;
	var forEachSaver22201 = alias4_Func_ref_2463[0].attr6_Params;
	for(var forEachCounter22201 = 0 ; forEachCounter22201 < forEachSaver22201.values.length ; forEachCounter22201++) {
		var local1_P_2466 = forEachSaver22201.values[forEachCounter22201];
	{
			var alias5_Param_ref_2467 = [new type14_IdentifierVari()];
			alias5_Param_ref_2467 = global8_Compiler.attr5_Varis_ref[0].arrAccess(local1_P_2466).values[tmpPositionCache] /* ALIAS */;
			if (local5_Found_2465) {
				local8_Text_Str_2464 = ((local8_Text_Str_2464) + (", "));
				
			};
			local8_Text_Str_2464 = ((((local8_Text_Str_2464) + (alias5_Param_ref_2467[0].attr8_datatype.attr8_Name_Str_ref[0]))) + (func20_BuildArrBrackets_Str(unref(alias5_Param_ref_2467[0].attr8_datatype.attr7_IsArray_ref[0]))));
			local5_Found_2465 = 1;
			
		}
		forEachSaver22201.values[forEachCounter22201] = local1_P_2466;
	
	};
	return tryClone(local8_Text_Str_2464);
	return "";
	
};
func17_BuildPrototyp_Str = window['func17_BuildPrototyp_Str'];
window['func14_SearchPrototyp'] = function(param8_Name_Str) {
	var local3_Ret_ref_2469 = [0];
	if ((global8_Compiler.attr11_GlobalFuncs).GetValue(param8_Name_Str, local3_Ret_ref_2469)) {
		if ((((global8_Compiler.attr5_Funcs_ref[0].arrAccess(local3_Ret_ref_2469[0]).values[tmpPositionCache][0].attr3_Typ) == (2)) ? 1 : 0)) {
			return tryClone(-(1));
			
		} else {
			return tryClone(unref(local3_Ret_ref_2469[0]));
			
		};
		
	} else {
		return tryClone(-(1));
		
	};
	return 0;
	
};
func14_SearchPrototyp = window['func14_SearchPrototyp'];
window['func14_SearchOperator'] = function(param8_Name_Str) {
	var forEachSaver22267 = global9_Operators_ref[0];
	for(var forEachCounter22267 = 0 ; forEachCounter22267 < forEachSaver22267.values.length ; forEachCounter22267++) {
		var local2_Op_ref_2471 = forEachSaver22267.values[forEachCounter22267];
	{
			if (((((((local2_Op_ref_2471[0].attr7_Sym_Str) == (param8_Name_Str)) ? 1 : 0)) || ((((local2_Op_ref_2471[0].attr8_Name_Str) == (param8_Name_Str)) ? 1 : 0))) ? 1 : 0)) {
				return tryClone(local2_Op_ref_2471[0].attr2_ID);
				
			};
			
		}
		forEachSaver22267.values[forEachCounter22267] = local2_Op_ref_2471;
	
	};
	return tryClone(-(1));
	return 0;
	
};
func14_SearchOperator = window['func14_SearchOperator'];
window['func17_CleanVariable_Str'] = function(param7_Var_Str) {
	var local11_Postfix_Str_2473 = "";
	local11_Postfix_Str_2473 = RIGHT_Str(param7_Var_Str, 1);
	if (((((((local11_Postfix_Str_2473) == ("%")) ? 1 : 0)) || ((((local11_Postfix_Str_2473) == ("#")) ? 1 : 0))) ? 1 : 0)) {
		return tryClone(LEFT_Str(param7_Var_Str, (((param7_Var_Str).length) - (1))));
		
	} else {
		return tryClone(param7_Var_Str);
		
	};
	return "";
	
};
func17_CleanVariable_Str = window['func17_CleanVariable_Str'];
window['func12_ScopeHasGoto'] = function(param3_scp) {
	if ((((param3_scp.attr3_Typ) != (2)) ? 1 : 0)) {
		func5_Error("Internal error (Cant look for Scope)", 2590, "Parser.gbas");
		
	};
	var forEachSaver22472 = param3_scp.attr5_Exprs;
	for(var forEachCounter22472 = 0 ; forEachCounter22472 < forEachSaver22472.values.length ; forEachCounter22472++) {
		var local1_E_2475 = forEachSaver22472.values[forEachCounter22472];
	{
			var alias4_SubE_ref_2476 = [new type4_Expr()];
			alias4_SubE_ref_2476 = global5_Exprs_ref[0].arrAccess(local1_E_2475).values[tmpPositionCache] /* ALIAS */;
			{
				var local17___SelectHelper30__2477 = 0;
				local17___SelectHelper30__2477 = alias4_SubE_ref_2476[0].attr3_Typ;
				if ((((local17___SelectHelper30__2477) == (~~(24))) ? 1 : 0)) {
					var forEachSaver22352 = alias4_SubE_ref_2476[0].attr6_Scopes;
					for(var forEachCounter22352 = 0 ; forEachCounter22352 < forEachSaver22352.values.length ; forEachCounter22352++) {
						var local1_E_2478 = forEachSaver22352.values[forEachCounter22352];
					{
							if (func12_ScopeHasGoto(unref(global5_Exprs_ref[0].arrAccess(local1_E_2478).values[tmpPositionCache][0]))) {
								return 1;
								
							};
							
						}
						forEachSaver22352.values[forEachCounter22352] = local1_E_2478;
					
					};
					if ((((alias4_SubE_ref_2476[0].attr9_elseScope) != (-(1))) ? 1 : 0)) {
						if (func12_ScopeHasGoto(unref(global5_Exprs_ref[0].arrAccess(alias4_SubE_ref_2476[0].attr9_elseScope).values[tmpPositionCache][0]))) {
							return 1;
							
						};
						
					};
					
				} else if ((((local17___SelectHelper30__2477) == (~~(25))) ? 1 : 0)) {
					if (func12_ScopeHasGoto(unref(global5_Exprs_ref[0].arrAccess(alias4_SubE_ref_2476[0].attr3_Scp).values[tmpPositionCache][0]))) {
						return 1;
						
					};
					
				} else if ((((local17___SelectHelper30__2477) == (~~(26))) ? 1 : 0)) {
					if (func12_ScopeHasGoto(unref(global5_Exprs_ref[0].arrAccess(alias4_SubE_ref_2476[0].attr3_Scp).values[tmpPositionCache][0]))) {
						return 1;
						
					};
					
				} else if ((((local17___SelectHelper30__2477) == (~~(27))) ? 1 : 0)) {
					if (func12_ScopeHasGoto(unref(global5_Exprs_ref[0].arrAccess(alias4_SubE_ref_2476[0].attr3_Scp).values[tmpPositionCache][0]))) {
						return 1;
						
					};
					
				} else if ((((local17___SelectHelper30__2477) == (~~(38))) ? 1 : 0)) {
					if (func12_ScopeHasGoto(unref(global5_Exprs_ref[0].arrAccess(alias4_SubE_ref_2476[0].attr3_Scp).values[tmpPositionCache][0]))) {
						return 1;
						
					};
					
				} else if ((((local17___SelectHelper30__2477) == (~~(31))) ? 1 : 0)) {
					if (func12_ScopeHasGoto(unref(global5_Exprs_ref[0].arrAccess(alias4_SubE_ref_2476[0].attr3_Scp).values[tmpPositionCache][0]))) {
						return 1;
						
					};
					if (func12_ScopeHasGoto(unref(global5_Exprs_ref[0].arrAccess(alias4_SubE_ref_2476[0].attr8_catchScp).values[tmpPositionCache][0]))) {
						return 1;
						
					};
					
				} else if ((((local17___SelectHelper30__2477) == (~~(20))) ? 1 : 0)) {
					return 1;
					
				} else if ((((local17___SelectHelper30__2477) == (~~(2))) ? 1 : 0)) {
					if (func12_ScopeHasGoto(unref(alias4_SubE_ref_2476[0]))) {
						return 1;
						
					};
					
				} else {
					
				};
				
			};
			
		}
		forEachSaver22472.values[forEachCounter22472] = local1_E_2475;
	
	};
	return tryClone(0);
	return 0;
	
};
func12_ScopeHasGoto = window['func12_ScopeHasGoto'];
window['func13_ScopeName_Str'] = function(param4_expr) {
	{
		var local17___SelectHelper31__2480 = 0;
		local17___SelectHelper31__2480 = param4_expr.attr6_ScpTyp;
		if ((((local17___SelectHelper31__2480) == (~~(1))) ? 1 : 0)) {
			return "if";
			
		} else if ((((local17___SelectHelper31__2480) == (~~(3))) ? 1 : 0)) {
			return "loop";
			
		} else if ((((local17___SelectHelper31__2480) == (~~(5))) ? 1 : 0)) {
			return "try";
			
		} else if ((((local17___SelectHelper31__2480) == (~~(4))) ? 1 : 0)) {
			return "main";
			
		} else if ((((local17___SelectHelper31__2480) == (~~(2))) ? 1 : 0)) {
			{
				var local17___SelectHelper32__2481 = 0;
				local17___SelectHelper32__2481 = global8_Compiler.attr5_Funcs_ref[0].arrAccess(global11_CurrentFunc).values[tmpPositionCache][0].attr3_Typ;
				if ((((local17___SelectHelper32__2481) == (~~(2))) ? 1 : 0)) {
					return tryClone((("sub: ") + (global8_Compiler.attr5_Funcs_ref[0].arrAccess(global11_CurrentFunc).values[tmpPositionCache][0].attr9_OName_Str)));
					
				} else if ((((local17___SelectHelper32__2481) == (~~(3))) ? 1 : 0)) {
					return tryClone((("method: ") + (global8_Compiler.attr5_Funcs_ref[0].arrAccess(global11_CurrentFunc).values[tmpPositionCache][0].attr9_OName_Str)));
					
				} else if ((((local17___SelectHelper32__2481) == (~~(1))) ? 1 : 0)) {
					return tryClone((("function: ") + (global8_Compiler.attr5_Funcs_ref[0].arrAccess(global11_CurrentFunc).values[tmpPositionCache][0].attr9_OName_Str)));
					
				} else if ((((local17___SelectHelper32__2481) == (~~(4))) ? 1 : 0)) {
					return tryClone((("prototype: ") + (global8_Compiler.attr5_Funcs_ref[0].arrAccess(global11_CurrentFunc).values[tmpPositionCache][0].attr9_OName_Str)));
					
				};
				
			};
			
		} else if ((((local17___SelectHelper31__2480) == (~~(6))) ? 1 : 0)) {
			return "select";
			
		} else {
			func5_Error("Internal error (unknown scope type)", 2650, "Parser.gbas");
			
		};
		
	};
	return "";
	
};
func13_ScopeName_Str = window['func13_ScopeName_Str'];
window['func13_ChangeVarName'] = function(param4_Vari) {
	param4_Vari.attr8_Name_Str = TRIM_Str(REPLACE_Str(param4_Vari.attr8_Name_Str, "$", "_Str"), " \t\r\n\v\f");
	{
		var local17___SelectHelper33__2483 = 0;
		local17___SelectHelper33__2483 = param4_Vari.attr3_Typ;
		if ((((local17___SelectHelper33__2483) == (~~(1))) ? 1 : 0)) {
			param4_Vari.attr8_Name_Str = (((((("local") + (CAST2STRING((param4_Vari.attr8_Name_Str).length)))) + ("_"))) + (param4_Vari.attr8_Name_Str));
			
		} else if ((((local17___SelectHelper33__2483) == (~~(2))) ? 1 : 0)) {
			var local5_Found_2484 = 0;
			local5_Found_2484 = 0;
			var forEachSaver22683 = global8_Compiler.attr7_Exports;
			for(var forEachCounter22683 = 0 ; forEachCounter22683 < forEachSaver22683.values.length ; forEachCounter22683++) {
				var local3_Exp_2485 = forEachSaver22683.values[forEachCounter22683];
			{
					if ((((local3_Exp_2485.attr8_Name_Str) == (param4_Vari.attr8_Name_Str)) ? 1 : 0)) {
						local5_Found_2484 = 1;
						if (param4_Vari.attr3_ref) {
							func5_Error((((("Cannot export '") + (param4_Vari.attr8_Name_Str))) + ("' because it is a reference (dont use in connection with BYREF and ALIAS!)")), 2668, "Parser.gbas");
							
						};
						if ((((local3_Exp_2485.attr12_RealName_Str) != ("")) ? 1 : 0)) {
							param4_Vari.attr8_Name_Str = local3_Exp_2485.attr12_RealName_Str;
							
						};
						return 0;
						
					};
					
				}
				forEachSaver22683.values[forEachCounter22683] = local3_Exp_2485;
			
			};
			param4_Vari.attr8_Name_Str = (((((("global") + (CAST2STRING((param4_Vari.attr8_Name_Str).length)))) + ("_"))) + (param4_Vari.attr8_Name_Str));
			
		} else if ((((local17___SelectHelper33__2483) == (~~(3))) ? 1 : 0)) {
			param4_Vari.attr8_Name_Str = (((((("attr") + (CAST2STRING((param4_Vari.attr8_Name_Str).length)))) + ("_"))) + (param4_Vari.attr8_Name_Str));
			
		} else if ((((local17___SelectHelper33__2483) == (~~(4))) ? 1 : 0)) {
			param4_Vari.attr8_Name_Str = (((((((((("static") + (CAST2STRING((param4_Vari.attr8_Name_Str).length)))) + ("_"))) + (global8_Compiler.attr5_Funcs_ref[0].arrAccess(param4_Vari.attr4_func).values[tmpPositionCache][0].attr9_OName_Str))) + ("_"))) + (param4_Vari.attr8_Name_Str));
			
		} else if ((((local17___SelectHelper33__2483) == (~~(5))) ? 1 : 0)) {
			param4_Vari.attr8_Name_Str = (((((("param") + (CAST2STRING((param4_Vari.attr8_Name_Str).length)))) + ("_"))) + (param4_Vari.attr8_Name_Str));
			
		} else if ((((local17___SelectHelper33__2483) == (~~(6))) ? 1 : 0)) {
			param4_Vari.attr8_Name_Str = (((((("const") + (CAST2STRING((param4_Vari.attr8_Name_Str).length)))) + ("_"))) + (param4_Vari.attr8_Name_Str));
			
		} else if ((((local17___SelectHelper33__2483) == (~~(7))) ? 1 : 0)) {
			param4_Vari.attr8_Name_Str = (((((("alias") + (CAST2STRING((param4_Vari.attr8_Name_Str).length)))) + ("_"))) + (param4_Vari.attr8_Name_Str));
			
		};
		
	};
	if (param4_Vari.attr3_ref) {
		param4_Vari.attr8_Name_Str = ((param4_Vari.attr8_Name_Str) + ("_ref"));
		
	};
	if ((((param4_Vari.attr6_PreDef) != (-(1))) ? 1 : 0)) {
		if ((((global5_Exprs_ref[0].arrAccess(param4_Vari.attr6_PreDef).values[tmpPositionCache][0].attr3_Typ) == (36)) ? 1 : 0)) {
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
		var local17___SelectHelper34__2487 = 0;
		local17___SelectHelper34__2487 = param4_Func.attr3_Typ;
		if ((((local17___SelectHelper34__2487) == (~~(3))) ? 1 : 0)) {
			param4_Func.attr8_Name_Str = (((((((((((((("method") + (CAST2STRING((global8_Compiler.attr5_Types_ref[0].arrAccess(param4_Func.attr6_MyType).values[tmpPositionCache][0].attr8_Name_Str).length)))) + ("_"))) + (global8_Compiler.attr5_Types_ref[0].arrAccess(param4_Func.attr6_MyType).values[tmpPositionCache][0].attr8_Name_Str))) + ("_"))) + (CAST2STRING((param4_Func.attr8_Name_Str).length)))) + ("_"))) + (param4_Func.attr8_Name_Str));
			
		} else if ((((local17___SelectHelper34__2487) == (~~(1))) ? 1 : 0)) {
			if ((((param4_Func.attr6_Native) == (0)) ? 1 : 0)) {
				var local5_Found_2488 = 0;
				local5_Found_2488 = 0;
				var forEachSaver22987 = global8_Compiler.attr7_Exports;
				for(var forEachCounter22987 = 0 ; forEachCounter22987 < forEachSaver22987.values.length ; forEachCounter22987++) {
					var local3_Exp_2489 = forEachSaver22987.values[forEachCounter22987];
				{
						if ((((local3_Exp_2489.attr8_Name_Str) == (param4_Func.attr8_Name_Str)) ? 1 : 0)) {
							local5_Found_2488 = 1;
							if ((((local3_Exp_2489.attr12_RealName_Str) != ("")) ? 1 : 0)) {
								param4_Func.attr8_Name_Str = local3_Exp_2489.attr12_RealName_Str;
								
							};
							break;
							
						};
						
					}
					forEachSaver22987.values[forEachCounter22987] = local3_Exp_2489;
				
				};
				if (((local5_Found_2488) ? 0 : 1)) {
					param4_Func.attr8_Name_Str = (((((("func") + (CAST2STRING((param4_Func.attr8_Name_Str).length)))) + ("_"))) + (param4_Func.attr8_Name_Str));
					
				};
				
			};
			
		} else if ((((local17___SelectHelper34__2487) == (~~(2))) ? 1 : 0)) {
			
		};
		
	};
	return 0;
	
};
func14_ChangeFuncName = window['func14_ChangeFuncName'];
window['func18_ChangeTypeName_Str'] = function(param8_Name_Str) {
	if ((((((((((((((((((((((((((((((((((param8_Name_Str) == ("string")) ? 1 : 0)) || ((((param8_Name_Str) == ("void")) ? 1 : 0))) ? 1 : 0)) || ((((param8_Name_Str) == ("float")) ? 1 : 0))) ? 1 : 0)) || ((((param8_Name_Str) == ("double")) ? 1 : 0))) ? 1 : 0)) || ((((param8_Name_Str) == ("int")) ? 1 : 0))) ? 1 : 0)) || ((((param8_Name_Str) == ("short")) ? 1 : 0))) ? 1 : 0)) || ((((param8_Name_Str) == ("byte")) ? 1 : 0))) ? 1 : 0)) || ((((param8_Name_Str) == ("bool")) ? 1 : 0))) ? 1 : 0)) || ((((param8_Name_Str) == ("boolean")) ? 1 : 0))) ? 1 : 0)) || ((((param8_Name_Str) == ("long")) ? 1 : 0))) ? 1 : 0)) || ((((param8_Name_Str) == ("single")) ? 1 : 0))) ? 1 : 0)) {
		return tryClone(param8_Name_Str);
		
	} else {
		return tryClone((((((("type") + (CAST2STRING((param8_Name_Str).length)))) + ("_"))) + (param8_Name_Str)));
		
	};
	return "";
	
};
func18_ChangeTypeName_Str = window['func18_ChangeTypeName_Str'];
window['func11_NewLine_Str'] = function() {
	var local8_Text_Str_2491 = "";
	local8_Text_Str_2491 = "\n";
	{
		var local1_i_2492 = 0.0;
		for (local1_i_2492 = 1;toCheck(local1_i_2492, global6_Indent, 1);local1_i_2492 += 1) {
			local8_Text_Str_2491 = ((local8_Text_Str_2491) + ("\t"));
			
		};
		
	};
	return tryClone(local8_Text_Str_2491);
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
	var forEachSaver23218 = global8_Compiler.attr5_Funcs_ref[0];
	for(var forEachCounter23218 = 0 ; forEachCounter23218 < forEachSaver23218.values.length ; forEachCounter23218++) {
		var local4_Func_ref_2493 = forEachSaver23218.values[forEachCounter23218];
	{
			if ((((((((((local4_Func_ref_2493[0].attr6_Native) == (0)) ? 1 : 0)) && ((((local4_Func_ref_2493[0].attr3_Scp) != (-(1))) ? 1 : 0))) ? 1 : 0)) && ((((local4_Func_ref_2493[0].attr10_IsAbstract) == (0)) ? 1 : 0))) ? 1 : 0)) {
				var local1_i_2494 = 0;
				local1_i_2494 = 0;
				var forEachSaver23216 = local4_Func_ref_2493[0].attr6_Params;
				for(var forEachCounter23216 = 0 ; forEachCounter23216 < forEachSaver23216.values.length ; forEachCounter23216++) {
					var local1_P_2495 = forEachSaver23216.values[forEachCounter23216];
				{
						if ((((global8_Compiler.attr5_Varis_ref[0].arrAccess(local1_P_2495).values[tmpPositionCache][0].attr3_ref) != (global8_Compiler.attr5_Varis_ref[0].arrAccess(local4_Func_ref_2493[0].attr10_CopyParams.arrAccess(local1_i_2494).values[tmpPositionCache]).values[tmpPositionCache][0].attr3_ref)) ? 1 : 0)) {
							global8_Compiler.attr5_Varis_ref[0].arrAccess(local1_P_2495).values[tmpPositionCache][0].attr9_OwnerVari = local4_Func_ref_2493[0].attr10_CopyParams.arrAccess(local1_i_2494).values[tmpPositionCache];
							
						} else {
							global8_Compiler.attr5_Varis_ref[0].arrAccess(local4_Func_ref_2493[0].attr10_CopyParams.arrAccess(local1_i_2494).values[tmpPositionCache]).values[tmpPositionCache][0].attr8_Name_Str = global8_Compiler.attr5_Varis_ref[0].arrAccess(local1_P_2495).values[tmpPositionCache][0].attr8_Name_Str;
							
						};
						local1_i_2494+=1;
						
					}
					forEachSaver23216.values[forEachCounter23216] = local1_P_2495;
				
				};
				
			};
			
		}
		forEachSaver23218.values[forEachCounter23218] = local4_Func_ref_2493;
	
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
			if (Err_Str instanceof GLBException) Err_Str = Err_Str.getText(); else throwError(Err_Str);{
				
			}
		};
		
	};
	return 0;
	
};
func11_Precompiler = window['func11_Precompiler'];
window['func10_PreCommand'] = function(param9_IgnoreAll) {
	if (func7_IsToken("?")) {
		var local7_Cur_Str_2498 = "";
		func14_MatchAndRemove("?", 17, "Preprocessor.gbas");
		local7_Cur_Str_2498 = func14_GetCurrent_Str();
		func13_RemoveCurrent();
		{
			var local17___SelectHelper35__2499 = "";
			local17___SelectHelper35__2499 = local7_Cur_Str_2498;
			if ((((local17___SelectHelper35__2499) == ("DEFINE")) ? 1 : 0)) {
				var local3_Def_2500 = new type7_TDefine();
				local3_Def_2500.attr7_Key_Str = func14_GetCurrent_Str();
				func13_RemoveCurrent();
				if ((((func7_IsToken("\n")) == (0)) ? 1 : 0)) {
					local3_Def_2500.attr9_Value_Str = func14_GetCurrent_Str();
					func13_RemoveCurrent();
					
				} else {
					local3_Def_2500.attr9_Value_Str = CAST2STRING(1);
					
				};
				if (((param9_IgnoreAll) ? 0 : 1)) {
					DIMPUSH(global7_Defines, local3_Def_2500);
					
				};
				
			} else if ((((local17___SelectHelper35__2499) == ("UNDEF")) ? 1 : 0)) {
				if (((param9_IgnoreAll) ? 0 : 1)) {
					var forEachSaver23313 = global7_Defines;
					for(var forEachCounter23313 = 0 ; forEachCounter23313 < forEachSaver23313.values.length ; forEachCounter23313++) {
						var local3_Def_2501 = forEachSaver23313.values[forEachCounter23313];
					{
							if (func7_IsToken(local3_Def_2501.attr7_Key_Str)) {
								//DELETE!!111
								forEachSaver23313.values[forEachCounter23313] = local3_Def_2501;
								DIMDEL(forEachSaver23313, forEachCounter23313);
								forEachCounter23313--;
								continue;
								
							};
							
						}
						forEachSaver23313.values[forEachCounter23313] = local3_Def_2501;
					
					};
					
				};
				func13_RemoveCurrent();
				
			} else if ((((local17___SelectHelper35__2499) == ("IFDEF")) ? 1 : 0)) {
				if (((param9_IgnoreAll) ? 0 : 1)) {
					var local4_doIt_2502 = 0;
					local4_doIt_2502 = 0;
					var forEachSaver23344 = global7_Defines;
					for(var forEachCounter23344 = 0 ; forEachCounter23344 < forEachSaver23344.values.length ; forEachCounter23344++) {
						var local3_Def_2503 = forEachSaver23344.values[forEachCounter23344];
					{
							if (func7_IsToken(local3_Def_2503.attr7_Key_Str)) {
								local4_doIt_2502 = 1;
								break;
								
							};
							
						}
						forEachSaver23344.values[forEachCounter23344] = local3_Def_2503;
					
					};
					func13_RemoveCurrent();
					func14_MatchAndRemove("\n", 49, "Preprocessor.gbas");
					func5_PreIf(local4_doIt_2502);
					
				} else {
					func13_RemoveCurrent();
					func14_MatchAndRemove("\n", 53, "Preprocessor.gbas");
					func5_PreIf(2);
					
				};
				
			} else if ((((local17___SelectHelper35__2499) == ("IFNDEF")) ? 1 : 0)) {
				if (((param9_IgnoreAll) ? 0 : 1)) {
					var local4_doIt_2504 = 0;
					local4_doIt_2504 = 1;
					var forEachSaver23389 = global7_Defines;
					for(var forEachCounter23389 = 0 ; forEachCounter23389 < forEachSaver23389.values.length ; forEachCounter23389++) {
						var local3_Def_2505 = forEachSaver23389.values[forEachCounter23389];
					{
							if (func7_IsToken(local3_Def_2505.attr7_Key_Str)) {
								local4_doIt_2504 = 0;
								break;
								
							};
							
						}
						forEachSaver23389.values[forEachCounter23389] = local3_Def_2505;
					
					};
					func13_RemoveCurrent();
					func14_MatchAndRemove("\n", 66, "Preprocessor.gbas");
					func5_PreIf(local4_doIt_2504);
					
				} else {
					func13_RemoveCurrent();
					func14_MatchAndRemove("\n", 71, "Preprocessor.gbas");
					func5_PreIf(2);
					
				};
				
			} else if ((((local17___SelectHelper35__2499) == ("IF")) ? 1 : 0)) {
				if (((param9_IgnoreAll) ? 0 : 1)) {
					var local6_Result_2506 = 0, local3_Pos_2507 = 0.0;
					local6_Result_2506 = 0;
					local3_Pos_2507 = global8_Compiler.attr11_currentPosi;
					{
						var Error_Str = "";
						try {
							local6_Result_2506 = ~~(func13_CalculateTree(unref(global5_Exprs_ref[0].arrAccess(func10_Expression(0)).values[tmpPositionCache][0])));
							
						} catch (Error_Str) {
							if (Error_Str instanceof GLBException) Error_Str = Error_Str.getText(); else throwError(Error_Str);{
								func5_Error((((("Unable to evaluate IF (syntax error?) '") + (Error_Str))) + ("'")), 82, "Preprocessor.gbas");
								
							}
						};
						
					};
					global8_Compiler.attr11_currentPosi = ~~(((local3_Pos_2507) - (1)));
					func7_GetNext();
					while (((func7_IsToken("\n")) ? 0 : 1)) {
						func13_RemoveCurrent();
						
					};
					func14_MatchAndRemove("\n", 91, "Preprocessor.gbas");
					if ((((local6_Result_2506) == (1)) ? 1 : 0)) {
						func5_PreIf(1);
						
					} else {
						func5_PreIf(0);
						
					};
					
				} else {
					while (((func7_IsToken("\n")) ? 0 : 1)) {
						func13_RemoveCurrent();
						
					};
					func14_MatchAndRemove("\n", 103, "Preprocessor.gbas");
					func5_PreIf(2);
					
				};
				
			} else if ((((local17___SelectHelper35__2499) == ("WARNING")) ? 1 : 0)) {
				if (((param9_IgnoreAll) ? 0 : 1)) {
					func7_Warning(func14_GetCurrent_Str());
					
				};
				func13_RemoveCurrent();
				
			} else if ((((local17___SelectHelper35__2499) == ("ERROR")) ? 1 : 0)) {
				if (((param9_IgnoreAll) ? 0 : 1)) {
					func5_Error(func14_GetCurrent_Str(), 111, "Preprocessor.gbas");
					
				};
				func13_RemoveCurrent();
				
			} else if ((((local17___SelectHelper35__2499) == ("ELSE")) ? 1 : 0)) {
				return 1;
				
			} else if ((((local17___SelectHelper35__2499) == ("ENDIF")) ? 1 : 0)) {
				return 2;
				
			} else if ((((local17___SelectHelper35__2499) == ("OPTIMIZE")) ? 1 : 0)) {
				if (((param9_IgnoreAll) ? 0 : 1)) {
					{
						var local17___SelectHelper36__2509 = "";
						local17___SelectHelper36__2509 = func14_GetCurrent_Str();
						if ((((local17___SelectHelper36__2509) == ("SIMPLE")) ? 1 : 0)) {
							global13_OptimizeLevel = 1;
							
						} else if ((((local17___SelectHelper36__2509) == ("AGGRESSIVE")) ? 1 : 0)) {
							global13_OptimizeLevel = 2;
							
						} else if ((((local17___SelectHelper36__2509) == ("NONE")) ? 1 : 0)) {
							global13_OptimizeLevel = 0;
							
						} else {
							func5_Error("Unknown optimization level", 137, "Preprocessor.gbas");
							
						};
						
					};
					
				};
				func13_RemoveCurrent();
				
			} else if ((((local17___SelectHelper35__2499) == ("GRAPHICS")) ? 1 : 0)) {
				if (((param9_IgnoreAll) ? 0 : 1)) {
					global7_CONSOLE = 0;
					
				};
				
			} else {
				func5_Error((((("Expecting preprocessor command got '") + (local7_Cur_Str_2498))) + ("'")), 145, "Preprocessor.gbas");
				
			};
			
		};
		func14_MatchAndRemove("\n", 148, "Preprocessor.gbas");
		
	} else {
		var local6_Is_Str_2510 = "";
		local6_Is_Str_2510 = func14_GetCurrent_Str();
		if ((((local6_Is_Str_2510) == ("_")) ? 1 : 0)) {
			func13_RemoveCurrent();
			func14_MatchAndRemove("\n", 153, "Preprocessor.gbas");
			
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
	var local8_Text_Str_2512 = "";
	if ((((param4_doIt) == (0)) ? 1 : 0)) {
		if ((((func7_PreSkip(1)) == (1)) ? 1 : 0)) {
			func14_MatchAndRemove("\n", 170, "Preprocessor.gbas");
			if ((((func7_PreSkip(0)) == (1)) ? 1 : 0)) {
				func5_Error("Expecting '?ENDIF'", 172, "Preprocessor.gbas");
				
			};
			
		};
		
	} else if ((((param4_doIt) == (1)) ? 1 : 0)) {
		if ((((func7_PreSkip(0)) == (1)) ? 1 : 0)) {
			if ((((func7_PreSkip(1)) == (1)) ? 1 : 0)) {
				func5_Error("Expectiong '?ENDIF'", 176, "Preprocessor.gbas");
				
			};
			
		};
		
	} else if ((((param4_doIt) == (2)) ? 1 : 0)) {
		if ((((func7_PreSkip(1)) == (1)) ? 1 : 0)) {
			if ((((func7_PreSkip(1)) == (1)) ? 1 : 0)) {
				func5_Error("Expecting '?ENDIF'", 181, "Preprocessor.gbas");
				
			};
			
		};
		
	} else {
		func5_Error("Internal error (unknown preif)", 184, "Preprocessor.gbas");
		
	};
	return 0;
	
};
func5_PreIf = window['func5_PreIf'];
window['func7_PreSkip'] = function(param9_RemoveAll) {
	while (func8_EOFParse()) {
		var local1_E_2514 = 0;
		local1_E_2514 = func10_PreCommand(param9_RemoveAll);
		if ((((local1_E_2514) > (0)) ? 1 : 0)) {
			return tryClone(local1_E_2514);
			
		};
		
	};
	func5_Error("Unexpected End Of File (maybe missing ?ENDIF)", 195, "Preprocessor.gbas");
	return 0;
	
};
func7_PreSkip = window['func7_PreSkip'];
window['func13_CalculateTree'] = function(param4_expr) {
	{
		var local17___SelectHelper37__2516 = 0;
		local17___SelectHelper37__2516 = param4_expr.attr3_Typ;
		if ((((local17___SelectHelper37__2516) == (~~(3))) ? 1 : 0)) {
			return tryClone(param4_expr.attr6_intval);
			
		} else if ((((local17___SelectHelper37__2516) == (~~(4))) ? 1 : 0)) {
			return tryClone(param4_expr.attr8_floatval);
			
		} else if ((((local17___SelectHelper37__2516) == (~~(46))) ? 1 : 0)) {
			return tryClone(unref(((func13_CalculateTree(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr4_expr).values[tmpPositionCache][0]))) ? 0 : 1)));
			
		} else if ((((local17___SelectHelper37__2516) == (~~(15))) ? 1 : 0)) {
			return tryClone(INTEGER(func13_CalculateTree(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr4_expr).values[tmpPositionCache][0]))));
			
		} else if ((((local17___SelectHelper37__2516) == (~~(16))) ? 1 : 0)) {
			return tryClone(func13_CalculateTree(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr4_expr).values[tmpPositionCache][0])));
			
		} else if ((((local17___SelectHelper37__2516) == (~~(1))) ? 1 : 0)) {
			var local4_Left_2517 = 0.0, local5_Right_2518 = 0.0;
			local4_Left_2517 = func13_CalculateTree(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr4_Left).values[tmpPositionCache][0]));
			local5_Right_2518 = func13_CalculateTree(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr5_Right).values[tmpPositionCache][0]));
			{
				var local17___SelectHelper38__2519 = "";
				local17___SelectHelper38__2519 = global9_Operators_ref[0].arrAccess(param4_expr.attr2_Op).values[tmpPositionCache][0].attr7_Sym_Str;
				if ((((local17___SelectHelper38__2519) == ("+")) ? 1 : 0)) {
					return tryClone(((local4_Left_2517) + (local5_Right_2518)));
					
				} else if ((((local17___SelectHelper38__2519) == ("-")) ? 1 : 0)) {
					return tryClone(((local4_Left_2517) - (local5_Right_2518)));
					
				} else if ((((local17___SelectHelper38__2519) == ("*")) ? 1 : 0)) {
					return tryClone(((local4_Left_2517) * (local5_Right_2518)));
					
				} else if ((((local17___SelectHelper38__2519) == ("/")) ? 1 : 0)) {
					return tryClone(((local4_Left_2517) / (local5_Right_2518)));
					
				} else if ((((local17___SelectHelper38__2519) == ("^")) ? 1 : 0)) {
					return tryClone(POW(local4_Left_2517, local5_Right_2518));
					
				} else if ((((local17___SelectHelper38__2519) == ("=")) ? 1 : 0)) {
					return tryClone((((local4_Left_2517) == (local5_Right_2518)) ? 1 : 0));
					
				} else if ((((local17___SelectHelper38__2519) == (">")) ? 1 : 0)) {
					return tryClone((((local4_Left_2517) > (local5_Right_2518)) ? 1 : 0));
					
				} else if ((((local17___SelectHelper38__2519) == ("<")) ? 1 : 0)) {
					return tryClone((((local4_Left_2517) < (local5_Right_2518)) ? 1 : 0));
					
				} else if ((((local17___SelectHelper38__2519) == ("<=")) ? 1 : 0)) {
					return tryClone((((local4_Left_2517) <= (local5_Right_2518)) ? 1 : 0));
					
				} else if ((((local17___SelectHelper38__2519) == (">=")) ? 1 : 0)) {
					return tryClone((((local4_Left_2517) >= (local5_Right_2518)) ? 1 : 0));
					
				} else if ((((local17___SelectHelper38__2519) == ("AND")) ? 1 : 0)) {
					return tryClone((((local4_Left_2517) && (local5_Right_2518)) ? 1 : 0));
					
				} else if ((((local17___SelectHelper38__2519) == ("OR")) ? 1 : 0)) {
					return tryClone((((local4_Left_2517) || (local5_Right_2518)) ? 1 : 0));
					
				} else {
					func5_Error("Internal error (unimplemented operator!)", 239, "Preprocessor.gbas");
					
				};
				
			};
			
		} else {
			throw new GLBException((((("Unable to resolve '") + (CAST2STRING(param4_expr.attr3_Typ)))) + ("'")), "\Preprocessor.gbas", 243);
			
		};
		
	};
	return 0;
	
};
func13_CalculateTree = window['func13_CalculateTree'];
window['func12_DoTarget_Str'] = function(param8_Name_Str) {
	var local10_Output_Str_2521 = "";
	global8_Compiler.attr14_errorState_Str = ((((" (target '") + (param8_Name_Str))) + ("' error)"));
	global10_Target_Str = param8_Name_Str;
	global13_SettingIn_Str = "";
	REDIM(global9_Templates, [0], new type9_TTemplate() );
	REDIM(global9_Libraries, [0], new type8_TLibrary() );
	REDIM(global10_Blacklists, [0], new type10_TBlackList() );
	REDIM(global7_Actions, [0], new type7_TAction() );
	local10_Output_Str_2521 = "";
	var forEachSaver23999 = global10_Generators;
	for(var forEachCounter23999 = 0 ; forEachCounter23999 < forEachSaver23999.values.length ; forEachCounter23999++) {
		var local1_G_2522 = forEachSaver23999.values[forEachCounter23999];
	{
			if ((((UCASE_Str(local1_G_2522.attr8_Name_Str)) == (UCASE_Str(global8_Lang_Str))) ? 1 : 0)) {
				global8_Compiler.attr14_errorState_Str = " (generate error)";
				local10_Output_Str_2521 = CAST2STRING(local1_G_2522.attr8_genProto());
				global8_Compiler.attr14_errorState_Str = ((((" (target '") + (param8_Name_Str))) + ("' error)"));
				break;
				
			};
			
		}
		forEachSaver23999.values[forEachCounter23999] = local1_G_2522;
	
	};
	if ((((local10_Output_Str_2521) == ("")) ? 1 : 0)) {
		func5_Error("Empty output!", 79, "Target.gbas");
		
	};
	return tryClone(local10_Output_Str_2521);
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
window['method9_type3_XML_7_ReadXML'] = function(param8_File_Str, param5_event, param4_self) {
	param4_self.attr5_Event = param5_event;
	param4_self.attr8_Text_Str = func12_LoadFile_Str(param8_File_Str);
	param4_self.attr8_Position = 0;
	(param4_self).SkipWhitespaces();
	if ((((LEFT_Str(param4_self.attr8_Text_Str, 2)) == ("<?")) ? 1 : 0)) {
		while (((((param4_self).Get_Str()) != (">")) ? 1 : 0)) {
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
			if (Err_Str instanceof GLBException) Err_Str = Err_Str.getText(); else throwError(Err_Str);{
				if ((((Err_Str) == ("EXIT")) ? 1 : 0)) {
					
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
	while (((((param4_self).Get_Str()) == ("<")) ? 1 : 0)) {
		var local8_HasSlash_2531 = 0;
		local8_HasSlash_2531 = 0;
		param4_self.attr8_Position+=1;
		(param4_self).SkipWhitespaces();
		if (((((param4_self).Get_Str()) == ("/")) ? 1 : 0)) {
			local8_HasSlash_2531 = 1;
			
		};
		while (((((param4_self).Get_Str()) != ("<")) ? 1 : 0)) {
			param4_self.attr8_Position+=-1;
			
		};
		if (local8_HasSlash_2531) {
			return tryClone(0);
			
		};
		(param4_self).ParseNode();
		
	};
	return tryClone(1);
	return 0;
	
};
method9_type3_XML_10_ParseLayer = window['method9_type3_XML_10_ParseLayer'];
window['method9_type3_XML_9_ParseNode'] = function(param4_self) {
	var local8_Name_Str_2534 = "", local10_Attributes_2535 = new GLBArray();
	if (((((param4_self).Get_Str()) != ("<")) ? 1 : 0)) {
		throw new GLBException("XML Error - Expecting '<'", "\XMLReader.gbas", 65);
		
	};
	param4_self.attr8_Position+=1;
	(param4_self).SkipWhitespaces();
	local8_Name_Str_2534 = (param4_self).ParseIdentifier_Str();
	if (((((param4_self).Get_Str()) == (" ")) ? 1 : 0)) {
		(param4_self).SkipWhitespaces();
		while ((((((((param4_self).Get_Str()) != ("/")) ? 1 : 0)) && (((((param4_self).Get_Str()) != (">")) ? 1 : 0))) ? 1 : 0)) {
			var local3_Att_2536 = new type12_xmlAttribute(), local3_Pos_2537 = 0;
			(param4_self).SkipWhitespaces();
			local3_Att_2536.attr8_Name_Str = (param4_self).ParseIdentifier_Str();
			(param4_self).SkipWhitespaces();
			if (((((param4_self).Get_Str()) != ("=")) ? 1 : 0)) {
				throw new GLBException("XML Error - Expecting '='", "\XMLReader.gbas", 82);
				
			};
			param4_self.attr8_Position+=1;
			(param4_self).SkipWhitespaces();
			if (((((param4_self).Get_Str()) != ("\"")) ? 1 : 0)) {
				throw new GLBException("XML Error - Expecting '\"'", "\XMLReader.gbas", 87);
				
			};
			param4_self.attr8_Position+=1;
			local3_Pos_2537 = param4_self.attr8_Position;
			while (((((param4_self).Get_Str()) != ("\"")) ? 1 : 0)) {
				param4_self.attr8_Position+=1;
				
			};
			param4_self.attr8_Position+=1;
			local3_Att_2536.attr9_Value_Str = MID_Str(param4_self.attr8_Text_Str, local3_Pos_2537, ((((param4_self.attr8_Position) - (local3_Pos_2537))) - (1)));
			(param4_self).SkipWhitespaces();
			DIMPUSH(local10_Attributes_2535, local3_Att_2536);
			
		};
		
	};
	param4_self.attr5_Event(local8_Name_Str_2534, local10_Attributes_2535);
	{
		var local17___SelectHelper39__2538 = "";
		local17___SelectHelper39__2538 = (param4_self).Get_Str();
		if ((((local17___SelectHelper39__2538) == (">")) ? 1 : 0)) {
			param4_self.attr8_Position+=1;
			(param4_self).SkipWhitespaces();
			if ((param4_self).ParseLayer()) {
				throw new GLBException((((("XML Error - Unexpected End of File, expecting </") + (local8_Name_Str_2534))) + (">")), "\XMLReader.gbas", 109);
				
			};
			(param4_self).SkipWhitespaces();
			if (((((param4_self).Get_Str()) != ("<")) ? 1 : 0)) {
				throw new GLBException("XML Error - Expecting '<'", "\XMLReader.gbas", 113);
				
			};
			param4_self.attr8_Position+=1;
			(param4_self).SkipWhitespaces();
			if (((((param4_self).Get_Str()) != ("/")) ? 1 : 0)) {
				throw new GLBException("XML Error - Expecting '/'", "\XMLReader.gbas", 116);
				
			};
			param4_self.attr8_Position+=1;
			if ((((local8_Name_Str_2534) != ((param4_self).ParseIdentifier_Str())) ? 1 : 0)) {
				throw new GLBException("XML Error - Nodes do not match", "\XMLReader.gbas", 119);
				
			};
			if (((((param4_self).Get_Str()) != (">")) ? 1 : 0)) {
				throw new GLBException("XML Error Expecting '>'", "\XMLReader.gbas", 120);
				
			};
			param4_self.attr8_Position+=1;
			(param4_self).SkipWhitespaces();
			
		} else if ((((local17___SelectHelper39__2538) == ("/")) ? 1 : 0)) {
			param4_self.attr8_Position+=1;
			if (((((param4_self).Get_Str()) != (">")) ? 1 : 0)) {
				throw new GLBException("XML Error - Expecting '>'", "\XMLReader.gbas", 126);
				
			};
			param4_self.attr8_Position+=1;
			(param4_self).SkipWhitespaces();
			
		} else {
			throw new GLBException("XML Error", "\XMLReader.gbas", 130);
			
		};
		
	};
	return 0;
	
};
method9_type3_XML_9_ParseNode = window['method9_type3_XML_9_ParseNode'];
window['method9_type3_XML_19_ParseIdentifier_Str'] = function(param4_self) {
	var local3_Pos_2541 = 0;
	local3_Pos_2541 = param4_self.attr8_Position;
	while ((((((((((((((param4_self).Get_Str()) != (" ")) ? 1 : 0)) && (((((param4_self).Get_Str()) != ("/")) ? 1 : 0))) ? 1 : 0)) && (((((param4_self).Get_Str()) != (">")) ? 1 : 0))) ? 1 : 0)) && (((((param4_self).Get_Str()) != ("=")) ? 1 : 0))) ? 1 : 0)) {
		param4_self.attr8_Position+=1;
		
	};
	if ((((param4_self.attr8_Position) >= ((param4_self.attr8_Text_Str).length)) ? 1 : 0)) {
		throw new GLBException("XML Error", "\XMLReader.gbas", 139);
		
	};
	return tryClone(UCASE_Str(MID_Str(param4_self.attr8_Text_Str, local3_Pos_2541, ((param4_self.attr8_Position) - (local3_Pos_2541)))));
	return "";
	
};
method9_type3_XML_19_ParseIdentifier_Str = window['method9_type3_XML_19_ParseIdentifier_Str'];
window['method9_type3_XML_7_Get_Str'] = function(param4_self) {
	if ((((param4_self.attr8_Position) >= ((param4_self.attr8_Text_Str).length)) ? 1 : 0)) {
		throw new GLBException("XML Error - Unexpected End Of File", "\XMLReader.gbas", 145);
		
	} else {
		return tryClone(MID_Str(param4_self.attr8_Text_Str, param4_self.attr8_Position, 1));
		
	};
	return "";
	
};
method9_type3_XML_7_Get_Str = window['method9_type3_XML_7_Get_Str'];
window['method9_type3_XML_15_SkipWhitespaces'] = function(param4_self) {
	while (((((((param4_self.attr8_Position) < ((param4_self.attr8_Text_Str).length)) ? 1 : 0)) && ((((((((((((((param4_self).Get_Str()) == (" ")) ? 1 : 0)) || (((((param4_self).Get_Str()) == ("\n")) ? 1 : 0))) ? 1 : 0)) || (((((param4_self).Get_Str()) == (CHR_Str(13))) ? 1 : 0))) ? 1 : 0)) || (((((param4_self).Get_Str()) == ("\t")) ? 1 : 0))) ? 1 : 0))) ? 1 : 0)) {
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
	if ((((param3_Obj) == (param4_self)) ? 1 : 0)) {
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
window ['type9_TCompiler'] = function() {
	this.attr8_Code_Str = "";
	this.attr6_Tokens = new GLBArray();
	this.attr11_currentPosi = 0;
	this.attr11_GlobalFuncs = new type7_HashMap();
	this.attr5_Funcs_ref = [new GLBArray()];
	this.attr7_Globals = new GLBArray();
	this.attr5_Types_ref = [new GLBArray()];
	this.attr5_Varis_ref = [new GLBArray()];
	this.attr13_protoCheckers = new GLBArray();
	this.attr10_DataBlocks = new GLBArray();
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
	this.attr7_Exports = new GLBArray();
	this.attr11_LastTokenID = 0;
	this.attr8_GetIdent = 0;
	this.vtbl = vtbl_type9_TCompiler;
	this.attr12_CurrentScope = -(1);
	this.attr14_ImportantScope = -(1);
	this.attr11_currentFunc = -(1);
	this.attr8_WasError = 0;
	this.attr7_HasGoto = 0;
	this.attr14_errorState_Str = "";
	this.attr11_LastTokenID = 0;
	this.attr8_GetIdent = 0;
	return this;
	
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
	other.attr8_GetIdent = this.attr8_GetIdent;
	other.vtbl = this.vtbl;
	return other;
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
var vtbl_type14_IdentifierFunc = {
	Save: method21_type14_IdentifierFunc_4_Save, 
	Load: method21_type14_IdentifierFunc_4_Load, 
	ToString_Str: method13_type7_TObject_12_ToString_Str, 
	Equals: method13_type7_TObject_6_Equals, 
	ToHashCode: method13_type7_TObject_10_ToHashCode
};
/**
* @constructor
*/
window ['type14_IdentifierFunc'] = function() {
	this.attr9_OName_Str = "";
	this.attr8_Name_Str = "";
	this.attr6_Params = new GLBArray();
	this.attr10_CopyParams = new GLBArray();
	this.attr7_Statics = new GLBArray();
	this.attr8_datatype = new type8_Datatype();
	this.attr6_Native = 0;
	this.attr3_Scp = 0;
	this.attr2_ID = 0;
	this.attr3_Typ = 0;
	this.attr3_Tok = 0;
	this.attr10_PlzCompile = 0;
	this.attr6_HasRef = 0;
	this.attr15_UsedAsPrototype = 0;
	this.attr6_MyType = 0;
	this.attr7_SelfVar = 0;
	this.attr10_IsAbstract = 0;
	this.attr10_IsCallback = 0;
	this.vtbl = vtbl_type14_IdentifierFunc;
	this.attr3_Scp = -(1);
	this.attr6_HasRef = 0;
	this.attr15_UsedAsPrototype = 0;
	this.attr6_MyType = -(1);
	this.attr7_SelfVar = -(1);
	this.attr10_IsCallback = 0;
	return this;
	
};
window['type14_IdentifierFunc'].prototype.clone = function() {
	var other = new type14_IdentifierFunc();
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
	other.attr15_UsedAsPrototype = this.attr15_UsedAsPrototype;
	other.attr6_MyType = this.attr6_MyType;
	other.attr7_SelfVar = this.attr7_SelfVar;
	other.attr10_IsAbstract = this.attr10_IsAbstract;
	other.attr10_IsCallback = this.attr10_IsCallback;
	other.vtbl = this.vtbl;
	return other;
};
type14_IdentifierFunc = window['type14_IdentifierFunc'];
type14_IdentifierFunc.prototype.Save = function() {
	 return this.vtbl.Save(arguments[0], this);
};
type14_IdentifierFunc.prototype.Load = function() {
	 return this.vtbl.Load(arguments[0], this);
};
type14_IdentifierFunc.prototype.ToString_Str = function() {
	 return this.vtbl.ToString_Str(this);
};
type14_IdentifierFunc.prototype.Equals = function() {
	 return this.vtbl.Equals(arguments[0], this);
};
type14_IdentifierFunc.prototype.ToHashCode = function() {
	 return this.vtbl.ToHashCode(this);
};
var vtbl_type14_IdentifierVari = {
	Save: method21_type14_IdentifierVari_4_Save, 
	Load: method21_type14_IdentifierVari_4_Load, 
	ToString_Str: method13_type7_TObject_12_ToString_Str, 
	Equals: method13_type7_TObject_6_Equals, 
	ToHashCode: method13_type7_TObject_10_ToHashCode
};
/**
* @constructor
*/
window ['type14_IdentifierVari'] = function() {
	this.attr8_Name_Str = "";
	this.attr8_datatype = new type8_Datatype();
	this.attr3_Typ = 0;
	this.attr2_ID = 0;
	this.attr6_PreDef = 0;
	this.attr3_ref = 0;
	this.attr9_OwnerVari = 0;
	this.attr4_func = 0;
	this.vtbl = vtbl_type14_IdentifierVari;
	this.attr6_PreDef = -(1);
	this.attr3_ref = 0;
	this.attr9_OwnerVari = -(1);
	return this;
	
};
window['type14_IdentifierVari'].prototype.clone = function() {
	var other = new type14_IdentifierVari();
	other.attr8_Name_Str = this.attr8_Name_Str;
	other.attr8_datatype = tryClone(this.attr8_datatype);
	other.attr3_Typ = this.attr3_Typ;
	other.attr2_ID = this.attr2_ID;
	other.attr6_PreDef = this.attr6_PreDef;
	other.attr3_ref = this.attr3_ref;
	other.attr9_OwnerVari = this.attr9_OwnerVari;
	other.attr4_func = this.attr4_func;
	other.vtbl = this.vtbl;
	return other;
};
type14_IdentifierVari = window['type14_IdentifierVari'];
type14_IdentifierVari.prototype.Save = function() {
	 return this.vtbl.Save(arguments[0], this);
};
type14_IdentifierVari.prototype.Load = function() {
	 return this.vtbl.Load(arguments[0], this);
};
type14_IdentifierVari.prototype.ToString_Str = function() {
	 return this.vtbl.ToString_Str(this);
};
type14_IdentifierVari.prototype.Equals = function() {
	 return this.vtbl.Equals(arguments[0], this);
};
type14_IdentifierVari.prototype.ToHashCode = function() {
	 return this.vtbl.ToHashCode(this);
};
var vtbl_type14_IdentifierType = {
	Save: method21_type14_IdentifierType_4_Save, 
	Load: method21_type14_IdentifierType_4_Load, 
	ToString_Str: method13_type7_TObject_12_ToString_Str, 
	Equals: method13_type7_TObject_6_Equals, 
	ToHashCode: method13_type7_TObject_10_ToHashCode
};
/**
* @constructor
*/
window ['type14_IdentifierType'] = function() {
	this.attr8_Name_Str = "";
	this.attr12_RealName_Str = "";
	this.attr10_Attributes = new GLBArray();
	this.attr7_Methods = new GLBArray();
	this.attr7_PreSize = new GLBArray();
	this.attr2_ID = 0;
	this.attr9_Extending = 0;
	this.attr10_Createable = 0;
	this.attr8_IsNative = 0;
	this.vtbl = vtbl_type14_IdentifierType;
	this.attr9_Extending = -(1);
	this.attr10_Createable = 1;
	this.attr8_IsNative = 0;
	return this;
	
};
window['type14_IdentifierType'].prototype.clone = function() {
	var other = new type14_IdentifierType();
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
	return other;
};
type14_IdentifierType = window['type14_IdentifierType'];
type14_IdentifierType.prototype.Save = function() {
	 return this.vtbl.Save(arguments[0], this);
};
type14_IdentifierType.prototype.Load = function() {
	 return this.vtbl.Load(arguments[0], this);
};
type14_IdentifierType.prototype.ToString_Str = function() {
	 return this.vtbl.ToString_Str(this);
};
type14_IdentifierType.prototype.Equals = function() {
	 return this.vtbl.Equals(arguments[0], this);
};
type14_IdentifierType.prototype.ToHashCode = function() {
	 return this.vtbl.ToHashCode(this);
};
var vtbl_type8_Datatype = {
	Save: method14_type8_Datatype_4_Save, 
	Load: method14_type8_Datatype_4_Load, 
	ToString_Str: method13_type7_TObject_12_ToString_Str, 
	Equals: method13_type7_TObject_6_Equals, 
	ToHashCode: method13_type7_TObject_10_ToHashCode
};
/**
* @constructor
*/
window ['type8_Datatype'] = function() {
	this.attr8_Name_Str_ref = [""];
	this.attr7_IsArray_ref = [0];
	this.vtbl = vtbl_type8_Datatype;
	return this;
	
};
window['type8_Datatype'].prototype.clone = function() {
	var other = new type8_Datatype();
	other.attr8_Name_Str_ref = tryClone(this.attr8_Name_Str_ref);
	other.attr7_IsArray_ref = tryClone(this.attr7_IsArray_ref);
	other.vtbl = this.vtbl;
	return other;
};
type8_Datatype = window['type8_Datatype'];
type8_Datatype.prototype.Save = function() {
	 return this.vtbl.Save(arguments[0], this);
};
type8_Datatype.prototype.Load = function() {
	 return this.vtbl.Load(arguments[0], this);
};
type8_Datatype.prototype.ToString_Str = function() {
	 return this.vtbl.ToString_Str(this);
};
type8_Datatype.prototype.Equals = function() {
	 return this.vtbl.Equals(arguments[0], this);
};
type8_Datatype.prototype.ToHashCode = function() {
	 return this.vtbl.ToHashCode(this);
};
var vtbl_type9_DataBlock = {
	ToString_Str: method13_type7_TObject_12_ToString_Str, 
	Equals: method13_type7_TObject_6_Equals, 
	ToHashCode: method13_type7_TObject_10_ToHashCode
};
/**
* @constructor
*/
window ['type9_DataBlock'] = function() {
	this.attr8_Name_Str = "";
	this.attr5_Datas = new GLBArray();
	this.vtbl = vtbl_type9_DataBlock;
	return this;
	
};
window['type9_DataBlock'].prototype.clone = function() {
	var other = new type9_DataBlock();
	other.attr8_Name_Str = this.attr8_Name_Str;
	other.attr5_Datas = tryClone(this.attr5_Datas);
	other.vtbl = this.vtbl;
	return other;
};
type9_DataBlock = window['type9_DataBlock'];
type9_DataBlock.prototype.ToString_Str = function() {
	 return this.vtbl.ToString_Str(this);
};
type9_DataBlock.prototype.Equals = function() {
	 return this.vtbl.Equals(arguments[0], this);
};
type9_DataBlock.prototype.ToHashCode = function() {
	 return this.vtbl.ToHashCode(this);
};
var vtbl_type12_ProtoChecker = {
	ToString_Str: method13_type7_TObject_12_ToString_Str, 
	Equals: method13_type7_TObject_6_Equals, 
	ToHashCode: method13_type7_TObject_10_ToHashCode
};
/**
* @constructor
*/
window ['type12_ProtoChecker'] = function() {
	this.attr3_Tok = new type5_Token();
	this.attr8_fromFunc = 0;
	this.attr6_toFunc = 0;
	this.vtbl = vtbl_type12_ProtoChecker;
	return this;
	
};
window['type12_ProtoChecker'].prototype.clone = function() {
	var other = new type12_ProtoChecker();
	other.attr3_Tok = tryClone(this.attr3_Tok);
	other.attr8_fromFunc = this.attr8_fromFunc;
	other.attr6_toFunc = this.attr6_toFunc;
	other.vtbl = this.vtbl;
	return other;
};
type12_ProtoChecker = window['type12_ProtoChecker'];
type12_ProtoChecker.prototype.ToString_Str = function() {
	 return this.vtbl.ToString_Str(this);
};
type12_ProtoChecker.prototype.Equals = function() {
	 return this.vtbl.Equals(arguments[0], this);
};
type12_ProtoChecker.prototype.ToHashCode = function() {
	 return this.vtbl.ToHashCode(this);
};
var vtbl_type5_Token = {
	Load: method11_type5_Token_4_Load, 
	Save: method11_type5_Token_4_Save, 
	ToString_Str: method13_type7_TObject_12_ToString_Str, 
	Equals: method13_type7_TObject_6_Equals, 
	ToHashCode: method13_type7_TObject_10_ToHashCode
};
/**
* @constructor
*/
window ['type5_Token'] = function() {
	this.attr4_Line_ref = [0];
	this.attr15_LineContent_Str_ref = [""];
	this.attr9_Character_ref = [0];
	this.attr8_Path_Str_ref = [""];
	this.attr8_Text_Str_ref = [""];
	this.attr5_IsDel = 0;
	this.vtbl = vtbl_type5_Token;
	this.attr5_IsDel = 0;
	return this;
	
};
window['type5_Token'].prototype.clone = function() {
	var other = new type5_Token();
	other.attr4_Line_ref = tryClone(this.attr4_Line_ref);
	other.attr15_LineContent_Str_ref = tryClone(this.attr15_LineContent_Str_ref);
	other.attr9_Character_ref = tryClone(this.attr9_Character_ref);
	other.attr8_Path_Str_ref = tryClone(this.attr8_Path_Str_ref);
	other.attr8_Text_Str_ref = tryClone(this.attr8_Text_Str_ref);
	other.attr5_IsDel = this.attr5_IsDel;
	other.vtbl = this.vtbl;
	return other;
};
type5_Token = window['type5_Token'];
type5_Token.prototype.Load = function() {
	 return this.vtbl.Load(arguments[0], this);
};
type5_Token.prototype.Save = function() {
	 return this.vtbl.Save(arguments[0], this);
};
type5_Token.prototype.ToString_Str = function() {
	 return this.vtbl.ToString_Str(this);
};
type5_Token.prototype.Equals = function() {
	 return this.vtbl.Equals(arguments[0], this);
};
type5_Token.prototype.ToHashCode = function() {
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
window ['type7_TExport'] = function() {
	this.attr8_Name_Str = "";
	this.attr12_RealName_Str = "";
	this.vtbl = vtbl_type7_TExport;
	return this;
	
};
window['type7_TExport'].prototype.clone = function() {
	var other = new type7_TExport();
	other.attr8_Name_Str = this.attr8_Name_Str;
	other.attr12_RealName_Str = this.attr12_RealName_Str;
	other.vtbl = this.vtbl;
	return other;
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
var vtbl_type4_Expr = {
	Load: method10_type4_Expr_4_Load, 
	Save: method10_type4_Expr_4_Save, 
	ToString_Str: method13_type7_TObject_12_ToString_Str, 
	Equals: method13_type7_TObject_6_Equals, 
	ToHashCode: method13_type7_TObject_10_ToHashCode
};
/**
* @constructor
*/
window ['type4_Expr'] = function() {
	this.attr8_datatype = new type8_Datatype();
	this.attr3_Typ = 0;
	this.attr2_ID = 0;
	this.attr5_tokID = 0;
	this.attr4_Left = 0;
	this.attr5_Right = 0;
	this.attr2_Op = 0;
	this.attr5_Exprs = new GLBArray();
	this.attr5_Varis = new GLBArray();
	this.attr10_SuperScope = 0;
	this.attr6_ScpTyp = 0;
	this.attr6_Labels = new GLBArray();
	this.attr5_Gotos = new GLBArray();
	this.attr6_intval = 0;
	this.attr8_floatval = 0.0;
	this.attr10_strval_Str = "";
	this.attr4_func = 0;
	this.attr6_Params = new GLBArray();
	this.attr8_wasAdded = 0;
	this.attr4_vari = 0;
	this.attr5_array = 0;
	this.attr4_dims = new GLBArray();
	this.attr4_expr = 0;
	this.attr8_nextExpr = 0;
	this.attr8_Name_Str = "";
	this.attr10_Conditions = new GLBArray();
	this.attr6_Scopes = new GLBArray();
	this.attr9_elseScope = 0;
	this.attr5_dummy = 0.0;
	this.attr3_Scp = 0;
	this.attr7_varExpr = 0;
	this.attr6_toExpr = 0;
	this.attr8_stepExpr = 0;
	this.attr5_hasTo = 0;
	this.attr6_inExpr = 0;
	this.attr8_catchScp = 0;
	this.attr5_Reads = new GLBArray();
	this.attr4_kern = 0;
	this.attr8_position = 0;
	this.attr11_Content_Str = "";
	this.vtbl = vtbl_type4_Expr;
	this.attr10_SuperScope = -(1);
	this.attr8_wasAdded = 0;
	this.attr9_elseScope = -(1);
	this.attr5_dummy = -(42);
	this.attr4_kern = -(1);
	return this;
	
};
window['type4_Expr'].prototype.clone = function() {
	var other = new type4_Expr();
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
type4_Expr = window['type4_Expr'];
type4_Expr.prototype.Load = function() {
	 return this.vtbl.Load(this);
};
type4_Expr.prototype.Save = function() {
	 return this.vtbl.Save(arguments[0], this);
};
type4_Expr.prototype.ToString_Str = function() {
	 return this.vtbl.ToString_Str(this);
};
type4_Expr.prototype.Equals = function() {
	 return this.vtbl.Equals(arguments[0], this);
};
type4_Expr.prototype.ToHashCode = function() {
	 return this.vtbl.ToHashCode(this);
};
var vtbl_type8_Operator = {
	ToString_Str: method13_type7_TObject_12_ToString_Str, 
	Equals: method13_type7_TObject_6_Equals, 
	ToHashCode: method13_type7_TObject_10_ToHashCode
};
/**
* @constructor
*/
window ['type8_Operator'] = function() {
	this.attr8_Name_Str = "";
	this.attr7_Sym_Str = "";
	this.attr3_Typ = 0;
	this.attr4_Prio = 0;
	this.attr2_ID = 0;
	this.vtbl = vtbl_type8_Operator;
	return this;
	
};
window['type8_Operator'].prototype.clone = function() {
	var other = new type8_Operator();
	other.attr8_Name_Str = this.attr8_Name_Str;
	other.attr7_Sym_Str = this.attr7_Sym_Str;
	other.attr3_Typ = this.attr3_Typ;
	other.attr4_Prio = this.attr4_Prio;
	other.attr2_ID = this.attr2_ID;
	other.vtbl = this.vtbl;
	return other;
};
type8_Operator = window['type8_Operator'];
type8_Operator.prototype.ToString_Str = function() {
	 return this.vtbl.ToString_Str(this);
};
type8_Operator.prototype.Equals = function() {
	 return this.vtbl.Equals(arguments[0], this);
};
type8_Operator.prototype.ToHashCode = function() {
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
window ['type7_TDefine'] = function() {
	this.attr7_Key_Str = "";
	this.attr9_Value_Str = "";
	this.vtbl = vtbl_type7_TDefine;
	return this;
	
};
window['type7_TDefine'].prototype.clone = function() {
	var other = new type7_TDefine();
	other.attr7_Key_Str = this.attr7_Key_Str;
	other.attr9_Value_Str = this.attr9_Value_Str;
	other.vtbl = this.vtbl;
	return other;
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
window ['type10_TGenerator'] = function() {
	this.attr8_Name_Str = "";
	this.attr8_genProto = Lang_Generator_Str;
	this.vtbl = vtbl_type10_TGenerator;
	return this;
	
};
window['type10_TGenerator'].prototype.clone = function() {
	var other = new type10_TGenerator();
	other.attr8_Name_Str = this.attr8_Name_Str;
	other.attr8_genProto = tryClone(this.attr8_genProto);
	other.vtbl = this.vtbl;
	return other;
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
var vtbl_type6_Bucket = {
	ToString_Str: method13_type7_TObject_12_ToString_Str, 
	Equals: method13_type7_TObject_6_Equals, 
	ToHashCode: method13_type7_TObject_10_ToHashCode
};
/**
* @constructor
*/
window ['type6_Bucket'] = function() {
	this.attr3_Set = 0;
	this.attr8_Elements = new GLBArray();
	this.attr7_Element = new type8_KeyValue();
	this.vtbl = vtbl_type6_Bucket;
	this.attr3_Set = 0;
	return this;
	
};
window['type6_Bucket'].prototype.clone = function() {
	var other = new type6_Bucket();
	other.attr3_Set = this.attr3_Set;
	other.attr8_Elements = tryClone(this.attr8_Elements);
	other.attr7_Element = tryClone(this.attr7_Element);
	other.vtbl = this.vtbl;
	return other;
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
window ['type8_KeyValue'] = function() {
	this.attr7_Key_Str = "";
	this.attr5_Value = 0;
	this.vtbl = vtbl_type8_KeyValue;
	return this;
	
};
window['type8_KeyValue'].prototype.clone = function() {
	var other = new type8_KeyValue();
	other.attr7_Key_Str = this.attr7_Key_Str;
	other.attr5_Value = this.attr5_Value;
	other.vtbl = this.vtbl;
	return other;
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
window ['type7_HashMap'] = function() {
	this.attr7_Buckets_ref = [new GLBArray()];
	this.attr8_Elements = 0;
	this.vtbl = vtbl_type7_HashMap;
	return this;
	
};
window['type7_HashMap'].prototype.clone = function() {
	var other = new type7_HashMap();
	other.attr7_Buckets_ref = tryClone(this.attr7_Buckets_ref);
	other.attr8_Elements = this.attr8_Elements;
	other.vtbl = this.vtbl;
	return other;
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
var vtbl_type9_TTemplate = {
	ToString_Str: method13_type7_TObject_12_ToString_Str, 
	Equals: method13_type7_TObject_6_Equals, 
	ToHashCode: method13_type7_TObject_10_ToHashCode
};
/**
* @constructor
*/
window ['type9_TTemplate'] = function() {
	this.attr8_Path_Str = "";
	this.attr8_Mode_Str = "";
	this.attr8_Name_Str = "";
	this.vtbl = vtbl_type9_TTemplate;
	return this;
	
};
window['type9_TTemplate'].prototype.clone = function() {
	var other = new type9_TTemplate();
	other.attr8_Path_Str = this.attr8_Path_Str;
	other.attr8_Mode_Str = this.attr8_Mode_Str;
	other.attr8_Name_Str = this.attr8_Name_Str;
	other.vtbl = this.vtbl;
	return other;
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
window ['type8_TLibrary'] = function() {
	this.attr8_Path_Str = "";
	this.attr8_Mode_Str = "";
	this.vtbl = vtbl_type8_TLibrary;
	return this;
	
};
window['type8_TLibrary'].prototype.clone = function() {
	var other = new type8_TLibrary();
	other.attr8_Path_Str = this.attr8_Path_Str;
	other.attr8_Mode_Str = this.attr8_Mode_Str;
	other.vtbl = this.vtbl;
	return other;
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
window ['type10_TBlackList'] = function() {
	this.attr3_Typ = 0;
	this.attr8_Name_Str = "";
	this.attr10_Action_Str = "";
	this.vtbl = vtbl_type10_TBlackList;
	return this;
	
};
window['type10_TBlackList'].prototype.clone = function() {
	var other = new type10_TBlackList();
	other.attr3_Typ = this.attr3_Typ;
	other.attr8_Name_Str = this.attr8_Name_Str;
	other.attr10_Action_Str = this.attr10_Action_Str;
	other.vtbl = this.vtbl;
	return other;
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
window ['type7_TAction'] = function() {
	this.attr8_Name_Str = "";
	this.attr3_Att = new GLBArray();
	this.vtbl = vtbl_type7_TAction;
	return this;
	
};
window['type7_TAction'].prototype.clone = function() {
	var other = new type7_TAction();
	other.attr8_Name_Str = this.attr8_Name_Str;
	other.attr3_Att = tryClone(this.attr3_Att);
	other.vtbl = this.vtbl;
	return other;
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
window ['type12_xmlAttribute'] = function() {
	this.attr8_Name_Str = "";
	this.attr9_Value_Str = "";
	this.vtbl = vtbl_type12_xmlAttribute;
	return this;
	
};
window['type12_xmlAttribute'].prototype.clone = function() {
	var other = new type12_xmlAttribute();
	other.attr8_Name_Str = this.attr8_Name_Str;
	other.attr9_Value_Str = this.attr9_Value_Str;
	other.vtbl = this.vtbl;
	return other;
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
window ['type3_XML'] = function() {
	this.attr8_Text_Str = "";
	this.attr5_Event = XMLEvent;
	this.attr8_Position = 0;
	this.attr8_DontCall = 0;
	this.vtbl = vtbl_type3_XML;
	this.attr8_DontCall = 0;
	return this;
	
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
window ['type7_TObject'] = function() {
	this.vtbl = vtbl_type7_TObject;
	return this;
	
};
window['type7_TObject'].prototype.clone = function() {
	var other = new type7_TObject();
	other.vtbl = this.vtbl;
	return other;
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
var vtbl_type6_TObj3D = {
	ToString_Str: method13_type7_TObject_12_ToString_Str, 
	Equals: method13_type7_TObject_6_Equals, 
	ToHashCode: method13_type7_TObject_10_ToHashCode
};
/**
* @constructor
*/
window ['type6_TObj3D'] = function() {
	this.vtbl = vtbl_type6_TObj3D;
	return this;
	
};
window['type6_TObj3D'].prototype.clone = function() {
	var other = new type6_TObj3D();
	other.vtbl = this.vtbl;
	return other;
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
window ['type10_DataBuffer'] = function() {
	this.vtbl = vtbl_type10_DataBuffer;
	return this;
	
};
window['type10_DataBuffer'].prototype.clone = function() {
	var other = new type10_DataBuffer();
	other.vtbl = this.vtbl;
	return other;
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
var const11_VERSION_Str = "1", const11_XMLNAME_Str = "WIN32", const12_FUNC_IS_FUNC = 1, const11_FUNC_IS_SUB = 2, const14_FUNC_IS_METHOD = 3, const13_FUNC_IS_PROTO = 4, const22_IDENTIFIERFUNC_VERSION = 1000, const13_VARI_IS_LOCAL = 1, const14_VARI_IS_GLOBAL = 2, const12_VARI_IS_ATTR = 3, const14_VARI_IS_STATIC = 4, const13_VARI_IS_PARAM = 5, const13_VARI_IS_CONST = 6, const13_VARI_IS_ALIAS = 7, const22_IDENTIFIERVARI_VERSION = 2000, const22_IDENTIFIERTYPE_VERSION = 3000, const16_DATATYPE_VERSION = 4000, const13_TOKEN_VERSION = 5000, const11_SCOPE_IS_IF = 1, const13_SCOPE_IS_FUNC = 2, const13_SCOPE_IS_LOOP = 3, const13_SCOPE_IS_MAIN = 4, const12_SCOPE_IS_TRY = 5, const15_SCOPE_IS_SELECT = 6, const12_EXPR_VERSION = 1, const11_OP_IS_UNAER = 1, const12_OP_IS_BINAER = 2, const10_OP_IS_BOOL = 3, const16_EXPR_IS_OPERATOR = 1, const13_EXPR_IS_SCOPE = 2, const11_EXPR_IS_INT = 3, const13_EXPR_IS_FLOAT = 4, const11_EXPR_IS_STR = 5, const16_EXPR_IS_FUNCCALL = 6, const13_EXPR_IS_EMPTY = 7, const13_EXPR_IS_DEBUG = 8, const12_EXPR_IS_VARI = 9, const14_EXPR_IS_ASSIGN = 10, const11_EXPR_IS_DIM = 11, const13_EXPR_IS_REDIM = 12, const13_EXPR_IS_ARRAY = 13, const16_EXPR_IS_CAST2INT = 15, const18_EXPR_IS_CAST2FLOAT = 16, const19_EXPR_IS_CAST2STRING = 17, const14_EXPR_IS_ACCESS = 18, const14_EXPR_IS_RETURN = 19, const12_EXPR_IS_GOTO = 20, const13_EXPR_IS_LABEL = 21, const16_EXPR_IS_FUNCDATA = 22, const17_EXPR_IS_PROTOCALL = 23, const10_EXPR_IS_IF = 24, const13_EXPR_IS_WHILE = 25, const14_EXPR_IS_REPEAT = 26, const11_EXPR_IS_FOR = 27, const13_EXPR_IS_BREAK = 29, const16_EXPR_IS_CONTINUE = 30, const11_EXPR_IS_TRY = 31, const13_EXPR_IS_THROW = 32, const15_EXPR_IS_RESTORE = 33, const12_EXPR_IS_READ = 34, const14_EXPR_IS_DEFVAL = 35, const17_EXPR_IS_DIMASEXPR = 36, const13_EXPR_IS_ALIAS = 37, const15_EXPR_IS_FOREACH = 38, const11_EXPR_IS_INC = 39, const15_EXPR_IS_DIMPUSH = 40, const11_EXPR_IS_LEN = 41, const15_EXPR_IS_DIMDATA = 42, const14_EXPR_IS_DELETE = 43, const14_EXPR_IS_DIMDEL = 44, const13_EXPR_IS_BOUND = 45, const11_EXPR_IS_NOT = 46, const13_EXPR_IS_DUMMY = 47, const17_EXPR_IS_ADDRESSOF = 48, const14_EXPR_IS_ASSERT = 49, const19_EXPR_IS_DEBUGOUTPUT = 50, const11_EXPR_IS_IIF = 51, const15_EXPR_IS_REQUIRE = 52, const13_EXPR_IS_SUPER = 53, const16_EXPR_IS_CAST2OBJ = 54, const6_BL_EXT = 1, const7_BL_FILE = 2, const19_GL_DEPTH_BUFFER_BIT = 256, const21_GL_STENCIL_BUFFER_BIT = 1024, const19_GL_COLOR_BUFFER_BIT = 16384, const8_GL_FALSE = 0, const7_GL_TRUE = 1, const9_GL_POINTS = 0, const8_GL_LINES = 1, const12_GL_LINE_LOOP = 2, const13_GL_LINE_STRIP = 3, const12_GL_TRIANGLES = 4, const17_GL_TRIANGLE_STRIP = 5, const15_GL_TRIANGLE_FAN = 6, const7_GL_ZERO = 0, const6_GL_ONE = 1, const12_GL_SRC_COLOR = 768, const22_GL_ONE_MINUS_SRC_COLOR = 769, const12_GL_SRC_ALPHA = 770, const22_GL_ONE_MINUS_SRC_ALPHA = 771, const12_GL_DST_ALPHA = 772, const22_GL_ONE_MINUS_DST_ALPHA = 773, const12_GL_DST_COLOR = 774, const22_GL_ONE_MINUS_DST_COLOR = 775, const21_GL_SRC_ALPHA_SATURATE = 776, const11_GL_FUNC_ADD = 32774, const17_GL_BLEND_EQUATION = 32777, const21_GL_BLEND_EQUATION_RGB = 32777, const23_GL_BLEND_EQUATION_ALPHA = 34877, const16_GL_FUNC_SUBTRACT = 32778, const24_GL_FUNC_REVERSE_SUBTRACT = 32779, const16_GL_BLEND_DST_RGB = 32968, const16_GL_BLEND_SRC_RGB = 32969, const18_GL_BLEND_DST_ALPHA = 32970, const18_GL_BLEND_SRC_ALPHA = 32971, const17_GL_CONSTANT_COLOR = 32769, const27_GL_ONE_MINUS_CONSTANT_COLOR = 32770, const17_GL_CONSTANT_ALPHA = 32771, const27_GL_ONE_MINUS_CONSTANT_ALPHA = 32772, const14_GL_BLEND_COLOR = 32773, const15_GL_ARRAY_BUFFER = 34962, const23_GL_ELEMENT_ARRAY_BUFFER = 34963, const23_GL_ARRAY_BUFFER_BINDING = 34964, const31_GL_ELEMENT_ARRAY_BUFFER_BINDING = 34965, const14_GL_STREAM_DRAW = 35040, const14_GL_STATIC_DRAW = 35044, const15_GL_DYNAMIC_DRAW = 35048, const14_GL_BUFFER_SIZE = 34660, const15_GL_BUFFER_USAGE = 34661, const24_GL_CURRENT_VERTEX_ATTRIB = 34342, const8_GL_FRONT = 1028, const7_GL_BACK = 1029, const17_GL_FRONT_AND_BACK = 1032, const13_GL_TEXTURE_2D = 3553, const12_GL_CULL_FACE = 2884, const8_GL_BLEND = 3042, const9_GL_DITHER = 3024, const15_GL_STENCIL_TEST = 2960, const13_GL_DEPTH_TEST = 2929, const15_GL_SCISSOR_TEST = 3089, const22_GL_POLYGON_OFFSET_FILL = 32823, const27_GL_SAMPLE_ALPHA_TO_COVERAGE = 32926, const18_GL_SAMPLE_COVERAGE = 32928, const11_GL_NO_ERROR = 0, const15_GL_INVALID_ENUM = 1280, const16_GL_INVALID_VALUE = 1281, const20_GL_INVALID_OPERATION = 1282, const16_GL_OUT_OF_MEMORY = 1285, const5_GL_CW = 2304, const6_GL_CCW = 2305, const13_GL_LINE_WIDTH = 2849, const27_GL_ALIASED_POINT_SIZE_RANGE = 33901, const27_GL_ALIASED_LINE_WIDTH_RANGE = 33902, const17_GL_CULL_FACE_MODE = 2885, const13_GL_FRONT_FACE = 2886, const14_GL_DEPTH_RANGE = 2928, const18_GL_DEPTH_WRITEMASK = 2930, const20_GL_DEPTH_CLEAR_VALUE = 2931, const13_GL_DEPTH_FUNC = 2932, const22_GL_STENCIL_CLEAR_VALUE = 2961, const15_GL_STENCIL_FUNC = 2962, const15_GL_STENCIL_FAIL = 2964, const26_GL_STENCIL_PASS_DEPTH_FAIL = 2965, const26_GL_STENCIL_PASS_DEPTH_PASS = 2966, const14_GL_STENCIL_REF = 2967, const21_GL_STENCIL_VALUE_MASK = 2963, const20_GL_STENCIL_WRITEMASK = 2968, const20_GL_STENCIL_BACK_FUNC = 34816, const20_GL_STENCIL_BACK_FAIL = 34817, const31_GL_STENCIL_BACK_PASS_DEPTH_FAIL = 34818, const31_GL_STENCIL_BACK_PASS_DEPTH_PASS = 34819, const19_GL_STENCIL_BACK_REF = 36003, const26_GL_STENCIL_BACK_VALUE_MASK = 36004, const25_GL_STENCIL_BACK_WRITEMASK = 36005, const11_GL_VIEWPORT = 2978, const14_GL_SCISSOR_BOX = 3088, const20_GL_COLOR_CLEAR_VALUE = 3106, const18_GL_COLOR_WRITEMASK = 3107, const19_GL_UNPACK_ALIGNMENT = 3317, const17_GL_PACK_ALIGNMENT = 3333, const19_GL_MAX_TEXTURE_SIZE = 3379, const20_GL_MAX_VIEWPORT_DIMS = 3386, const16_GL_SUBPIXEL_BITS = 3408, const11_GL_RED_BITS = 3410, const13_GL_GREEN_BITS = 3411, const12_GL_BLUE_BITS = 3412, const13_GL_ALPHA_BITS = 3413, const13_GL_DEPTH_BITS = 3414, const15_GL_STENCIL_BITS = 3415, const23_GL_POLYGON_OFFSET_UNITS = 10752, const24_GL_POLYGON_OFFSET_FACTOR = 32824, const21_GL_TEXTURE_BINDING_2D = 32873, const17_GL_SAMPLE_BUFFERS = 32936, const10_GL_SAMPLES = 32937, const24_GL_SAMPLE_COVERAGE_VALUE = 32938, const25_GL_SAMPLE_COVERAGE_INVERT = 32939, const33_GL_NUM_COMPRESSED_TEXTURE_FORMATS = 34466, const29_GL_COMPRESSED_TEXTURE_FORMATS = 34467, const12_GL_DONT_CARE = 4352, const10_GL_FASTEST = 4353, const9_GL_NICEST = 4354, const23_GL_GENERATE_MIPMAP_HINT = 33170, const7_GL_BYTE = 5120, const16_GL_UNSIGNED_BYTE = 5121, const8_GL_SHORT = 5122, const17_GL_UNSIGNED_SHORT = 5123, const6_GL_INT = 5124, const15_GL_UNSIGNED_INT = 5125, const8_GL_FLOAT = 5126, const8_GL_FIXED = 5132, const18_GL_DEPTH_COMPONENT = 6402, const8_GL_ALPHA = 6406, const6_GL_RGB = 6407, const7_GL_RGBA = 6408, const12_GL_LUMINANCE = 6409, const18_GL_LUMINANCE_ALPHA = 6410, const25_GL_UNSIGNED_SHORT_4_4_4_4 = 32819, const25_GL_UNSIGNED_SHORT_5_5_5_1 = 32820, const23_GL_UNSIGNED_SHORT_5_6_5 = 33635, const18_GL_FRAGMENT_SHADER = 35632, const16_GL_VERTEX_SHADER = 35633, const21_GL_MAX_VERTEX_ATTRIBS = 34921, const29_GL_MAX_VERTEX_UNIFORM_VECTORS = 36347, const22_GL_MAX_VARYING_VECTORS = 36348, const35_GL_MAX_COMBINED_TEXTURE_IMAGE_UNITS = 35661, const33_GL_MAX_VERTEX_TEXTURE_IMAGE_UNITS = 35660, const26_GL_MAX_TEXTURE_IMAGE_UNITS = 34930, const31_GL_MAX_FRAGMENT_UNIFORM_VECTORS = 36349, const14_GL_SHADER_TYPE = 35663, const16_GL_DELETE_STATUS = 35712, const14_GL_LINK_STATUS = 35714, const18_GL_VALIDATE_STATUS = 35715, const19_GL_ATTACHED_SHADERS = 35717, const18_GL_ACTIVE_UNIFORMS = 35718, const28_GL_ACTIVE_UNIFORM_MAX_LENGTH = 35719, const20_GL_ACTIVE_ATTRIBUTES = 35721, const30_GL_ACTIVE_ATTRIBUTE_MAX_LENGTH = 35722, const27_GL_SHADING_LANGUAGE_VERSION = 35724, const18_GL_CURRENT_PROGRAM = 35725, const8_GL_NEVER = 512, const7_GL_LESS = 513, const8_GL_EQUAL = 514, const9_GL_LEQUAL = 515, const10_GL_GREATER = 516, const11_GL_NOTEQUAL = 517, const9_GL_GEQUAL = 518, const9_GL_ALWAYS = 519, const7_GL_KEEP = 7680, const10_GL_REPLACE = 7681, const7_GL_INCR = 7682, const7_GL_DECR = 7683, const9_GL_INVERT = 5386, const12_GL_INCR_WRAP = 34055, const12_GL_DECR_WRAP = 34056, const9_GL_VENDOR = 7936, const11_GL_RENDERER = 7937, const10_GL_VERSION = 7938, const13_GL_EXTENSIONS = 7939, const10_GL_NEAREST = 9728, const9_GL_LINEAR = 9729, const25_GL_NEAREST_MIPMAP_NEAREST = 9984, const24_GL_LINEAR_MIPMAP_NEAREST = 9985, const24_GL_NEAREST_MIPMAP_LINEAR = 9986, const23_GL_LINEAR_MIPMAP_LINEAR = 9987, const21_GL_TEXTURE_MAG_FILTER = 10240, const21_GL_TEXTURE_MIN_FILTER = 10241, const17_GL_TEXTURE_WRAP_S = 10242, const17_GL_TEXTURE_WRAP_T = 10243, const10_GL_TEXTURE = 5890, const19_GL_TEXTURE_CUBE_MAP = 34067, const27_GL_TEXTURE_BINDING_CUBE_MAP = 34068, const30_GL_TEXTURE_CUBE_MAP_POSITIVE_X = 34069, const30_GL_TEXTURE_CUBE_MAP_NEGATIVE_X = 34070, const30_GL_TEXTURE_CUBE_MAP_POSITIVE_Y = 34071, const30_GL_TEXTURE_CUBE_MAP_NEGATIVE_Y = 34072, const30_GL_TEXTURE_CUBE_MAP_POSITIVE_Z = 34073, const30_GL_TEXTURE_CUBE_MAP_NEGATIVE_Z = 34074, const28_GL_MAX_CUBE_MAP_TEXTURE_SIZE = 34076, const11_GL_TEXTURE0 = 33984, const11_GL_TEXTURE1 = 33985, const11_GL_TEXTURE2 = 33986, const11_GL_TEXTURE3 = 33987, const11_GL_TEXTURE4 = 33988, const11_GL_TEXTURE5 = 33989, const11_GL_TEXTURE6 = 33990, const11_GL_TEXTURE7 = 33991, const11_GL_TEXTURE8 = 33992, const11_GL_TEXTURE9 = 33993, const12_GL_TEXTURE10 = 33994, const12_GL_TEXTURE11 = 33995, const12_GL_TEXTURE12 = 33996, const12_GL_TEXTURE13 = 33997, const12_GL_TEXTURE14 = 33998, const12_GL_TEXTURE15 = 33999, const12_GL_TEXTURE16 = 34000, const12_GL_TEXTURE17 = 34001, const12_GL_TEXTURE18 = 34002, const12_GL_TEXTURE19 = 34003, const12_GL_TEXTURE20 = 34004, const12_GL_TEXTURE21 = 34005, const12_GL_TEXTURE22 = 34006, const12_GL_TEXTURE23 = 34007, const12_GL_TEXTURE24 = 34008, const12_GL_TEXTURE25 = 34009, const12_GL_TEXTURE26 = 34010, const12_GL_TEXTURE27 = 34011, const12_GL_TEXTURE28 = 34012, const12_GL_TEXTURE29 = 34013, const12_GL_TEXTURE30 = 34014, const12_GL_TEXTURE31 = 34015, const17_GL_ACTIVE_TEXTURE = 34016, const9_GL_REPEAT = 10497, const16_GL_CLAMP_TO_EDGE = 33071, const18_GL_MIRRORED_REPEAT = 33648, const13_GL_FLOAT_VEC2 = 35664, const13_GL_FLOAT_VEC3 = 35665, const13_GL_FLOAT_VEC4 = 35666, const11_GL_INT_VEC2 = 35667, const11_GL_INT_VEC3 = 35668, const11_GL_INT_VEC4 = 35669, const7_GL_BOOL = 35670, const12_GL_BOOL_VEC2 = 35671, const12_GL_BOOL_VEC3 = 35672, const12_GL_BOOL_VEC4 = 35673, const13_GL_FLOAT_MAT2 = 35674, const13_GL_FLOAT_MAT3 = 35675, const13_GL_FLOAT_MAT4 = 35676, const13_GL_SAMPLER_2D = 35678, const15_GL_SAMPLER_CUBE = 35680, const30_GL_VERTEX_ATTRIB_ARRAY_ENABLED = 34338, const27_GL_VERTEX_ATTRIB_ARRAY_SIZE = 34339, const29_GL_VERTEX_ATTRIB_ARRAY_STRIDE = 34340, const27_GL_VERTEX_ATTRIB_ARRAY_TYPE = 34341, const33_GL_VERTEX_ATTRIB_ARRAY_NORMALIZED = 34922, const30_GL_VERTEX_ATTRIB_ARRAY_POINTER = 34373, const37_GL_VERTEX_ATTRIB_ARRAY_BUFFER_BINDING = 34975, const33_GL_IMPLEMENTATION_COLOR_READ_TYPE = 35738, const35_GL_IMPLEMENTATION_COLOR_READ_FORMAT = 35739, const17_GL_COMPILE_STATUS = 35713, const18_GL_INFO_LOG_LENGTH = 35716, const23_GL_SHADER_SOURCE_LENGTH = 35720, const18_GL_SHADER_COMPILER = 36346, const24_GL_SHADER_BINARY_FORMATS = 36344, const28_GL_NUM_SHADER_BINARY_FORMATS = 36345, const12_GL_LOW_FLOAT = 36336, const15_GL_MEDIUM_FLOAT = 36337, const13_GL_HIGH_FLOAT = 36338, const10_GL_LOW_INT = 36339, const13_GL_MEDIUM_INT = 36340, const11_GL_HIGH_INT = 36341, const14_GL_FRAMEBUFFER = 36160, const15_GL_RENDERBUFFER = 36161, const8_GL_RGBA4 = 32854, const10_GL_RGB5_A1 = 32855, const9_GL_RGB565 = 36194, const20_GL_DEPTH_COMPONENT16 = 33189, const16_GL_STENCIL_INDEX = 6401, const17_GL_STENCIL_INDEX8 = 36168, const21_GL_RENDERBUFFER_WIDTH = 36162, const22_GL_RENDERBUFFER_HEIGHT = 36163, const31_GL_RENDERBUFFER_INTERNAL_FORMAT = 36164, const24_GL_RENDERBUFFER_RED_SIZE = 36176, const26_GL_RENDERBUFFER_GREEN_SIZE = 36177, const25_GL_RENDERBUFFER_BLUE_SIZE = 36178, const26_GL_RENDERBUFFER_ALPHA_SIZE = 36179, const26_GL_RENDERBUFFER_DEPTH_SIZE = 36180, const28_GL_RENDERBUFFER_STENCIL_SIZE = 36181, const37_GL_FRAMEBUFFER_ATTACHMENT_OBJECT_TYPE = 36048, const37_GL_FRAMEBUFFER_ATTACHMENT_OBJECT_NAME = 36049, const39_GL_FRAMEBUFFER_ATTACHMENT_TEXTURE_LEVEL = 36050, const47_GL_FRAMEBUFFER_ATTACHMENT_TEXTURE_CUBE_MAP_FACE = 36051, const20_GL_COLOR_ATTACHMENT0 = 36064, const19_GL_DEPTH_ATTACHMENT = 36096, const21_GL_STENCIL_ATTACHMENT = 36128, const7_GL_NONE = 0, const23_GL_FRAMEBUFFER_COMPLETE = 36053, const36_GL_FRAMEBUFFER_INCOMPLETE_ATTACHMENT = 36054, const44_GL_FRAMEBUFFER_INCOMPLETE_MISSING_ATTACHMENT = 36055, const36_GL_FRAMEBUFFER_INCOMPLETE_DIMENSIONS = 36057, const26_GL_FRAMEBUFFER_UNSUPPORTED = 36061, const22_GL_FRAMEBUFFER_BINDING = 36006, const23_GL_RENDERBUFFER_BINDING = 36007, const24_GL_MAX_RENDERBUFFER_SIZE = 34024, const32_GL_INVALID_FRAMEBUFFER_OPERATION = 1286, global10_LastExprID = 0.0, global5_Exprs_ref = [new GLBArray()], global8_LastType = new type14_IdentifierType(), global12_voidDatatype = new type8_Datatype(), global11_intDatatype = new type8_Datatype(), global13_floatDatatype = new type8_Datatype(), global11_strDatatype = new type8_Datatype(), global9_Operators_ref = [new GLBArray()], global10_KeywordMap = new type7_HashMap(), global8_Compiler = new type9_TCompiler(), global7_Defines = new GLBArray(), global10_LastDefine = new type7_TDefine(), global10_Generators = new GLBArray(), global13_SettingIn_Str = "", global11_SHLASHF_Str = "", MaxPasses = 0, global9_GFX_WIDTH = 0.0, global10_GFX_HEIGHT = 0.0, global10_FULLSCREEN = 0, global9_FRAMERATE = 0, global11_APPNAME_Str = "", global9_DEBUGMODE = 0, global7_CONSOLE = 0.0, global6_STRICT = 0.0, global15_USRDEF_VERS_Str = "", global14_GbapOutput_Str = "", global12_GbapPath_Str = "", global12_GbapName_Str = "", global6_Ignore = 0, global13_OptimizeLevel = 0, global12_CurrentScope = 0, global14_ForEachCounter = 0, global11_CurrentFunc = 0, global12_LabelDef_Str = "", global8_IsInGoto = 0, global11_LoopBreakID = 0, global14_LoopContinueID = 0, global11_LastDummyID = 0, global14_StaticText_Str = "", global6_Indent = 0, global9_Templates = new GLBArray(), global9_Libraries = new GLBArray(), global10_Blacklists = new GLBArray(), global7_Actions = new GLBArray(), global8_Mode_Str = "", global10_Target_Str = "", global13_SettingIn_Str = "", global9_Templates = new GLBArray(), global8_Lang_Str = "", global22_DirectoryStructure_Str = "", global6_Objs3D = new GLBArray();
// set default statics:
window['initStatics'] = function() {
	static12_Factor_DIMASEXPRErr = 0;
static12_Keyword_SelectHelper = 0.0, static7_Keyword_GOTOErr = 0;

}
initStatics = window['initStatics'];
for (var __init = 0; __init < preInitFuncs.length; __init++) preInitFuncs[__init]();
