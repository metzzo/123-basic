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
var static10_DDgui_show_intern_mouse_down = 0, static10_DDgui_show_intern_movemousex = 0, static10_DDgui_show_intern_movemousey = 0, static12_DDgui_show_intern_ToolTipDelay = 0, static9_DDgui_show_intern_ToolTipMx = 0, static9_DDgui_show_intern_ToolTipMy = 0;
var static9_DDgui_draw_widget_intern_lines_Str = new GLBArray();
var static7_DDgui_backgnd_QuickGL = 0;
var static9_DDgui_drawwidget_dummy_Str_ref = [""];
var static9_DDgui_handlewidget_dummy_Str_ref = [""];
var static7_DDgui_handleradio_txt_Str = new GLBArray();
var static7_DDgui_list_opt_Str = new GLBArray();
var static7_DDgui_drawlist_opt_Str_ref = [new GLBArray()];
var static11_ddgui_handletext_st_lasttime = 0, static10_ddgui_handletext_st_lastkey = 0;
var static7_DDgui_drawtab_str_Str = new GLBArray(), static8_DDgui_drawtab_str2_Str_ref = [new GLBArray()];
var static7_DDgui_handletab_str_Str = new GLBArray(), static8_DDgui_handletab_str2_Str_ref = [new GLBArray()];
var static7_DDgui_selecttab_str_Str = new GLBArray(), static8_DDgui_selecttab_str2_Str_ref = [new GLBArray()];
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
		__debugInfo = "222:\ddgui.gbas";
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
		var local3_now_1608 = 0;
		__debugInfo = "31:\ddgui.gbas";
		global3_old = GETTIMERALL();
		__debugInfo = "32:\ddgui.gbas";
		func10_DDgui_show(0);
		__debugInfo = "49:\ddgui.gbas";
		local3_now_1608 = GETTIMERALL();
		__debugInfo = "50:\ddgui.gbas";
		global5_delta+=((local3_now_1608) - (global3_old));
		__debugInfo = "51:\ddgui.gbas";
		global5_flips+=1;
		__debugInfo = "57:\ddgui.gbas";
		if ((((global5_flips) > (300)) ? 1 : 0)) {
			__debugInfo = "53:\ddgui.gbas";
			global2_nt = 1000;
			__debugInfo = "54:\ddgui.gbas";
			global3_fps = ~~(global5_delta);
			__debugInfo = "55:\ddgui.gbas";
			global5_delta = 0;
			__debugInfo = "56:\ddgui.gbas";
			global5_flips = 0;
			__debugInfo = "53:\ddgui.gbas";
		};
		__debugInfo = "58:\ddgui.gbas";
		PRINT((("fps:") + (CAST2STRING(INTEGER(global3_fps)))), 0, 0, 0);
		__debugInfo = "61:\ddgui.gbas";
		SHOWSCREEN();
		__debugInfo = "31:\ddgui.gbas";
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
		__debugInfo = "73:\ddgui.gbas";
		func16_DDgui_pushdialog(0, 0, 300, 300, 0);
		__debugInfo = "76:\ddgui.gbas";
		func9_DDgui_set("", "MOVEABLE", CAST2STRING(1));
		__debugInfo = "78:\ddgui.gbas";
		func12_DDgui_widget("", "Static Text", 0, 0);
		__debugInfo = "79:\ddgui.gbas";
		func12_DDgui_spacer(10000, 20);
		__debugInfo = "73:\ddgui.gbas";
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
		var local2_up_2201 = 0, local2_dn_2202 = 0, local3_mid_2203 = 0;
		__debugInfo = "358:\ddgui.gbas";
		local2_up_2201 = 0;
		__debugInfo = "359:\ddgui.gbas";
		local2_dn_2202 = ((BOUNDS(param10_ddgui_vals.attr7_widgets_ref[0], 0)) - (1));
		__debugInfo = "371:\ddgui.gbas";
		while ((((local2_up_2201) < (local2_dn_2202)) ? 1 : 0)) {
			__debugInfo = "361:\ddgui.gbas";
			local3_mid_2203 = CAST2INT(((((local2_up_2201) + (local2_dn_2202))) / (2)));
			__debugInfo = "370:\ddgui.gbas";
			if ((((param10_ddgui_vals.attr7_widgets_ref[0].arrAccess(local3_mid_2203).values[tmpPositionCache][0].attr7_wid_Str) > (param8_name_Str_ref[0])) ? 1 : 0)) {
				__debugInfo = "363:\ddgui.gbas";
				local2_dn_2202 = MAX(((local3_mid_2203) - (1)), local2_up_2201);
				__debugInfo = "363:\ddgui.gbas";
			} else {
				__debugInfo = "369:\ddgui.gbas";
				if ((((param10_ddgui_vals.attr7_widgets_ref[0].arrAccess(local3_mid_2203).values[tmpPositionCache][0].attr7_wid_Str) < (param8_name_Str_ref[0])) ? 1 : 0)) {
					__debugInfo = "366:\ddgui.gbas";
					local2_up_2201 = MIN(local2_dn_2202, ((local3_mid_2203) + (1)));
					__debugInfo = "366:\ddgui.gbas";
				} else {
					__debugInfo = "368:\ddgui.gbas";
					return tryClone(local3_mid_2203);
					__debugInfo = "368:\ddgui.gbas";
				};
				__debugInfo = "369:\ddgui.gbas";
			};
			__debugInfo = "361:\ddgui.gbas";
		};
		__debugInfo = "373:\ddgui.gbas";
		if ((((BOUNDS(param10_ddgui_vals.attr7_widgets_ref[0], 0)) && ((((param10_ddgui_vals.attr7_widgets_ref[0].arrAccess(local2_up_2201).values[tmpPositionCache][0].attr7_wid_Str) == (param8_name_Str_ref[0])) ? 1 : 0))) ? 1 : 0)) {
			__debugInfo = "373:\ddgui.gbas";
			return tryClone(local2_up_2201);
			__debugInfo = "373:\ddgui.gbas";
		};
		__debugInfo = "400:\ddgui.gbas";
		if (param6_create) {
			var local4_widg_2204 = new type9_DDGUI_WDG(), local5_order_2205 = new type11_DDGUI_ORDER();
			__debugInfo = "378:\ddgui.gbas";
			local2_dn_2202 = BOUNDS(param10_ddgui_vals.attr7_widgets_ref[0], 0);
			__debugInfo = "379:\ddgui.gbas";
			REDIM(unref(param10_ddgui_vals.attr7_widgets_ref[0]), [((local2_dn_2202) + (1))], [new type9_DDGUI_WDG()] );
			__debugInfo = "379:\ddgui.gbas";
			{
				__debugInfo = "382:\ddgui.gbas";
				for (local3_mid_2203 = local2_dn_2202;toCheck(local3_mid_2203, ((local2_up_2201) + (1)), -(1));local3_mid_2203 += -(1)) {
					__debugInfo = "381:\ddgui.gbas";
					param10_ddgui_vals.attr7_widgets_ref[0].arrAccess(local3_mid_2203).values[tmpPositionCache][0] = param10_ddgui_vals.attr7_widgets_ref[0].arrAccess(((local3_mid_2203) - (1))).values[tmpPositionCache][0].clone(/* In Assign */);
					__debugInfo = "381:\ddgui.gbas";
				};
				__debugInfo = "382:\ddgui.gbas";
			};
			__debugInfo = "383:\ddgui.gbas";
			if (((((((local2_dn_2202) > (0)) ? 1 : 0)) && ((((param10_ddgui_vals.attr7_widgets_ref[0].arrAccess(local2_up_2201).values[tmpPositionCache][0].attr7_wid_Str) < (param8_name_Str_ref[0])) ? 1 : 0))) ? 1 : 0)) {
				__debugInfo = "383:\ddgui.gbas";
				local2_up_2201 = ((local2_up_2201) + (1));
				__debugInfo = "383:\ddgui.gbas";
			};
			__debugInfo = "385:\ddgui.gbas";
			local4_widg_2204.attr7_wid_Str = param8_name_Str_ref[0];
			__debugInfo = "386:\ddgui.gbas";
			param10_ddgui_vals.attr7_widgets_ref[0].arrAccess(local2_up_2201).values[tmpPositionCache][0] = local4_widg_2204.clone(/* In Assign */);
			__debugInfo = "390:\ddgui.gbas";
			local5_order_2205.attr6_id_Str_ref[0] = param8_name_Str_ref[0];
			__debugInfo = "391:\ddgui.gbas";
			DIMPUSH(param10_ddgui_vals.attr9_draworder, local5_order_2205);
			__debugInfo = "397:\ddgui.gbas";
			var forEachSaver13306 = param10_ddgui_vals.attr9_draworder;
			for(var forEachCounter13306 = 0 ; forEachCounter13306 < forEachSaver13306.values.length ; forEachCounter13306++) {
				var local2_od_2206 = forEachSaver13306.values[forEachCounter13306];
			{
					__debugInfo = "396:\ddgui.gbas";
					local2_od_2206.attr5_index = func11_DDgui_index(param10_ddgui_vals, local2_od_2206.attr6_id_Str_ref, 0);
					__debugInfo = "396:\ddgui.gbas";
				}
				forEachSaver13306.values[forEachCounter13306] = local2_od_2206;
			
			};
			__debugInfo = "399:\ddgui.gbas";
			return tryClone(local2_up_2201);
			__debugInfo = "378:\ddgui.gbas";
		};
		__debugInfo = "401:\ddgui.gbas";
		return tryClone(-(1));
		__debugInfo = "402:\ddgui.gbas";
		return 0;
		__debugInfo = "358:\ddgui.gbas";
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
		__debugInfo = "410:\ddgui.gbas";
		{
			var local17___SelectHelper10__2311 = "";
			__debugInfo = "410:\ddgui.gbas";
			local17___SelectHelper10__2311 = param8_name_Str_ref[0];
			__debugInfo = "434:\ddgui.gbas";
			if ((((local17___SelectHelper10__2311) == ("CLICKED")) ? 1 : 0)) {
				__debugInfo = "411:\ddgui.gbas";
				return tryClone(CAST2STRING(param3_wdg.attr8_wclicked));
				__debugInfo = "411:\ddgui.gbas";
			} else if ((((local17___SelectHelper10__2311) == ("TEXT")) ? 1 : 0)) {
				__debugInfo = "412:\ddgui.gbas";
				return tryClone(unref(param3_wdg.attr9_wtext_Str_ref[0]));
				__debugInfo = "412:\ddgui.gbas";
			} else if ((((local17___SelectHelper10__2311) == ("WIDTH")) ? 1 : 0)) {
				__debugInfo = "413:\ddgui.gbas";
				return tryClone(CAST2STRING(param3_wdg.attr6_wwidth));
				__debugInfo = "413:\ddgui.gbas";
			} else if ((((local17___SelectHelper10__2311) == ("HEIGHT")) ? 1 : 0)) {
				__debugInfo = "414:\ddgui.gbas";
				return tryClone(CAST2STRING(param3_wdg.attr7_wheight));
				__debugInfo = "414:\ddgui.gbas";
			} else if ((((local17___SelectHelper10__2311) == ("SELECT")) ? 1 : 0)) {
				__debugInfo = "415:\ddgui.gbas";
				return tryClone(CAST2STRING(param3_wdg.attr7_wselect));
				__debugInfo = "415:\ddgui.gbas";
			} else if ((((local17___SelectHelper10__2311) == ("COUNT")) ? 1 : 0)) {
				__debugInfo = "416:\ddgui.gbas";
				return tryClone(CAST2STRING(param3_wdg.attr6_wcount));
				__debugInfo = "416:\ddgui.gbas";
			} else if ((((local17___SelectHelper10__2311) == ("HOVER")) ? 1 : 0)) {
				__debugInfo = "417:\ddgui.gbas";
				return tryClone(CAST2STRING(param3_wdg.attr6_whover));
				__debugInfo = "417:\ddgui.gbas";
			} else if ((((local17___SelectHelper10__2311) == ("READONLY")) ? 1 : 0)) {
				__debugInfo = "418:\ddgui.gbas";
				return tryClone(CAST2STRING(param3_wdg.attr9_wreadonly));
				__debugInfo = "418:\ddgui.gbas";
			} else if ((((local17___SelectHelper10__2311) == ("SELSTART")) ? 1 : 0)) {
				__debugInfo = "419:\ddgui.gbas";
				return tryClone(CAST2STRING(param3_wdg.attr9_wselstart));
				__debugInfo = "419:\ddgui.gbas";
			} else if ((((local17___SelectHelper10__2311) == ("SELEND")) ? 1 : 0)) {
				__debugInfo = "420:\ddgui.gbas";
				return tryClone(CAST2STRING(param3_wdg.attr7_wselend));
				__debugInfo = "420:\ddgui.gbas";
			} else if ((((local17___SelectHelper10__2311) == ("HIDE")) ? 1 : 0)) {
				__debugInfo = "421:\ddgui.gbas";
				return tryClone(CAST2STRING(param3_wdg.attr5_whide));
				__debugInfo = "421:\ddgui.gbas";
			} else if ((((local17___SelectHelper10__2311) == ("TYPE")) ? 1 : 0)) {
				__debugInfo = "422:\ddgui.gbas";
				return tryClone(param3_wdg.attr9_wtype_Str);
				__debugInfo = "422:\ddgui.gbas";
			} else if ((((local17___SelectHelper10__2311) == ("FILTER")) ? 1 : 0)) {
				__debugInfo = "423:\ddgui.gbas";
				return tryClone(param3_wdg.attr11_wfilter_Str);
				__debugInfo = "423:\ddgui.gbas";
			} else if ((((local17___SelectHelper10__2311) == ("TIPTEXT")) ? 1 : 0)) {
				__debugInfo = "424:\ddgui.gbas";
				return tryClone(unref(param3_wdg.attr11_tiptext_Str_ref[0]));
				__debugInfo = "424:\ddgui.gbas";
			} else if ((((local17___SelectHelper10__2311) == ("MINVAL")) ? 1 : 0)) {
				__debugInfo = "425:\ddgui.gbas";
				return tryClone(CAST2STRING(param3_wdg.attr7_wminval));
				__debugInfo = "425:\ddgui.gbas";
			} else if ((((local17___SelectHelper10__2311) == ("MAXVAL")) ? 1 : 0)) {
				__debugInfo = "426:\ddgui.gbas";
				return tryClone(CAST2STRING(param3_wdg.attr7_wmaxval));
				__debugInfo = "426:\ddgui.gbas";
			} else if ((((local17___SelectHelper10__2311) == ("STEP")) ? 1 : 0)) {
				__debugInfo = "427:\ddgui.gbas";
				return tryClone(CAST2STRING(param3_wdg.attr5_wstep));
				__debugInfo = "427:\ddgui.gbas";
			} else if ((((local17___SelectHelper10__2311) == ("SCROLL")) ? 1 : 0)) {
				__debugInfo = "428:\ddgui.gbas";
				return tryClone(CAST2STRING(param3_wdg.attr7_wscroll));
				__debugInfo = "428:\ddgui.gbas";
			} else if ((((local17___SelectHelper10__2311) == ("ALIGN")) ? 1 : 0)) {
				__debugInfo = "429:\ddgui.gbas";
				return tryClone(CAST2STRING(param3_wdg.attr6_walign));
				__debugInfo = "429:\ddgui.gbas";
			} else if ((((local17___SelectHelper10__2311) == ("XPOS")) ? 1 : 0)) {
				__debugInfo = "430:\ddgui.gbas";
				return tryClone(CAST2STRING(param3_wdg.attr5_wxpos));
				__debugInfo = "430:\ddgui.gbas";
			} else if ((((local17___SelectHelper10__2311) == ("YPOS")) ? 1 : 0)) {
				__debugInfo = "431:\ddgui.gbas";
				return tryClone(CAST2STRING(param3_wdg.attr5_wypos));
				__debugInfo = "431:\ddgui.gbas";
			} else {
				__debugInfo = "433:\ddgui.gbas";
				DEBUG((((("DDgui_get_intern$: Widget property ") + (param8_name_Str_ref[0]))) + (" is unknown\n")));
				__debugInfo = "433:\ddgui.gbas";
			};
			__debugInfo = "410:\ddgui.gbas";
		};
		__debugInfo = "435:\ddgui.gbas";
		return "";
		__debugInfo = "410:\ddgui.gbas";
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
		var local6_id_Str_ref_2207 = [param6_id_Str]; /* NEWCODEHERE */
		var local8_name_Str_ref_2208 = [param8_name_Str]; /* NEWCODEHERE */
		__debugInfo = "443:\ddgui.gbas";
		if ((((BOUNDS(global11_ddgui_stack_ref[0], 0)) == (0)) ? 1 : 0)) {
			__debugInfo = "441:\ddgui.gbas";
			DEBUG("DDgui_get$: No active dialog!\n");
			__debugInfo = "442:\ddgui.gbas";
			return "";
			__debugInfo = "441:\ddgui.gbas";
		};
		__debugInfo = "466:\ddgui.gbas";
		if (((((local6_id_Str_ref_2207[0]).length) == (0)) ? 1 : 0)) {
			__debugInfo = "445:\ddgui.gbas";
			{
				var local16___SelectHelper8__2209 = "";
				__debugInfo = "445:\ddgui.gbas";
				local16___SelectHelper8__2209 = local8_name_Str_ref_2208[0];
				__debugInfo = "461:\ddgui.gbas";
				if ((((local16___SelectHelper8__2209) == ("FOCUS")) ? 1 : 0)) {
					__debugInfo = "446:\ddgui.gbas";
					return tryClone(global11_ddgui_stack_ref[0].arrAccess(-(1)).values[tmpPositionCache][0].attr9_focus_Str);
					__debugInfo = "446:\ddgui.gbas";
				} else if ((((local16___SelectHelper8__2209) == ("INKEY")) ? 1 : 0)) {
					__debugInfo = "447:\ddgui.gbas";
					return tryClone(global11_ddgui_stack_ref[0].arrAccess(-(1)).values[tmpPositionCache][0].attr13_dlg_inkey_Str);
					__debugInfo = "447:\ddgui.gbas";
				} else if ((((local16___SelectHelper8__2209) == ("TEXT")) ? 1 : 0)) {
					__debugInfo = "448:\ddgui.gbas";
					return tryClone(unref(global11_ddgui_stack_ref[0].arrAccess(-(1)).values[tmpPositionCache][0].attr4_main.attr9_wtext_Str_ref[0]));
					__debugInfo = "448:\ddgui.gbas";
				} else if ((((local16___SelectHelper8__2209) == ("COL_BRIGHT")) ? 1 : 0)) {
					__debugInfo = "449:\ddgui.gbas";
					return tryClone(CAST2STRING(global11_ddgui_stack_ref[0].arrAccess(-(1)).values[tmpPositionCache][0].attr10_col_bright));
					__debugInfo = "449:\ddgui.gbas";
				} else if ((((local16___SelectHelper8__2209) == ("COL_NORM")) ? 1 : 0)) {
					__debugInfo = "450:\ddgui.gbas";
					return tryClone(CAST2STRING(global11_ddgui_stack_ref[0].arrAccess(-(1)).values[tmpPositionCache][0].attr8_col_norm));
					__debugInfo = "450:\ddgui.gbas";
				} else if ((((local16___SelectHelper8__2209) == ("COL_HOVER_BRIGHT")) ? 1 : 0)) {
					__debugInfo = "451:\ddgui.gbas";
					return tryClone(CAST2STRING(global11_ddgui_stack_ref[0].arrAccess(-(1)).values[tmpPositionCache][0].attr16_col_hover_bright));
					__debugInfo = "451:\ddgui.gbas";
				} else if ((((local16___SelectHelper8__2209) == ("COL_HOVER_NORM")) ? 1 : 0)) {
					__debugInfo = "452:\ddgui.gbas";
					return tryClone(CAST2STRING(global11_ddgui_stack_ref[0].arrAccess(-(1)).values[tmpPositionCache][0].attr14_col_hover_norm));
					__debugInfo = "452:\ddgui.gbas";
				} else if ((((local16___SelectHelper8__2209) == ("XPOS")) ? 1 : 0)) {
					__debugInfo = "453:\ddgui.gbas";
					return tryClone(CAST2STRING(global11_ddgui_stack_ref[0].arrAccess(-(1)).values[tmpPositionCache][0].attr4_xpos));
					__debugInfo = "453:\ddgui.gbas";
				} else if ((((local16___SelectHelper8__2209) == ("YPOS")) ? 1 : 0)) {
					__debugInfo = "454:\ddgui.gbas";
					return tryClone(CAST2STRING(global11_ddgui_stack_ref[0].arrAccess(-(1)).values[tmpPositionCache][0].attr4_ypos));
					__debugInfo = "454:\ddgui.gbas";
				} else if ((((local16___SelectHelper8__2209) == ("WIDTH")) ? 1 : 0)) {
					__debugInfo = "455:\ddgui.gbas";
					return tryClone(CAST2STRING(global11_ddgui_stack_ref[0].arrAccess(-(1)).values[tmpPositionCache][0].attr4_main.attr6_wwidth));
					__debugInfo = "455:\ddgui.gbas";
				} else if ((((local16___SelectHelper8__2209) == ("HEIGHT")) ? 1 : 0)) {
					__debugInfo = "456:\ddgui.gbas";
					return tryClone(CAST2STRING(global11_ddgui_stack_ref[0].arrAccess(-(1)).values[tmpPositionCache][0].attr4_main.attr7_wheight));
					__debugInfo = "456:\ddgui.gbas";
				} else if ((((local16___SelectHelper8__2209) == ("MOVEABLE")) ? 1 : 0)) {
					__debugInfo = "457:\ddgui.gbas";
					return tryClone(CAST2STRING(global11_ddgui_stack_ref[0].arrAccess(-(1)).values[tmpPositionCache][0].attr8_moveable));
					__debugInfo = "457:\ddgui.gbas";
				} else if ((((local16___SelectHelper8__2209) == ("SCALEABLE")) ? 1 : 0)) {
					__debugInfo = "458:\ddgui.gbas";
					return tryClone(CAST2STRING(global11_ddgui_stack_ref[0].arrAccess(-(1)).values[tmpPositionCache][0].attr9_scaleable));
					__debugInfo = "458:\ddgui.gbas";
				} else if ((((local16___SelectHelper8__2209) == ("MOVING")) ? 1 : 0)) {
					__debugInfo = "459:\ddgui.gbas";
					return tryClone(CAST2STRING(global11_ddgui_stack_ref[0].arrAccess(-(1)).values[tmpPositionCache][0].attr6_moving));
					__debugInfo = "459:\ddgui.gbas";
				} else if ((((local16___SelectHelper8__2209) == ("SCALEING")) ? 1 : 0)) {
					__debugInfo = "460:\ddgui.gbas";
					return tryClone(CAST2STRING(global11_ddgui_stack_ref[0].arrAccess(-(1)).values[tmpPositionCache][0].attr8_scaleing));
					__debugInfo = "460:\ddgui.gbas";
				};
				__debugInfo = "445:\ddgui.gbas";
			};
			__debugInfo = "445:\ddgui.gbas";
		} else {
			var local2_iw_2210 = 0;
			__debugInfo = "463:\ddgui.gbas";
			local2_iw_2210 = func11_DDgui_index(unref(global11_ddgui_stack_ref[0].arrAccess(-(1)).values[tmpPositionCache][0]), local6_id_Str_ref_2207, 0);
			__debugInfo = "464:\ddgui.gbas";
			if ((((local2_iw_2210) >= (0)) ? 1 : 0)) {
				__debugInfo = "464:\ddgui.gbas";
				return tryClone(func20_DDgui_get_intern_Str(unref(global11_ddgui_stack_ref[0].arrAccess(-(1)).values[tmpPositionCache][0].attr7_widgets_ref[0].arrAccess(local2_iw_2210).values[tmpPositionCache][0]), local8_name_Str_ref_2208));
				__debugInfo = "464:\ddgui.gbas";
			};
			__debugInfo = "465:\ddgui.gbas";
			DEBUG((((("DDgui_get$: Widget not found ") + (local6_id_Str_ref_2207[0]))) + ("\n")));
			__debugInfo = "463:\ddgui.gbas";
		};
		__debugInfo = "467:\ddgui.gbas";
		return "";
		__debugInfo = "468:\ddgui.gbas";
		return "";
		__debugInfo = "443:\ddgui.gbas";
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
		var local6_id_Str_ref_2211 = [param6_id_Str]; /* NEWCODEHERE */
		var local8_name_Str_ref_2212 = [param8_name_Str]; /* NEWCODEHERE */
		__debugInfo = "475:\ddgui.gbas";
		if ((((BOUNDS(global11_ddgui_stack_ref[0], 0)) == (0)) ? 1 : 0)) {
			__debugInfo = "473:\ddgui.gbas";
			DEBUG("DDgui_get: No active dialog!\n");
			__debugInfo = "474:\ddgui.gbas";
			return tryClone(0);
			__debugInfo = "473:\ddgui.gbas";
		};
		__debugInfo = "494:\ddgui.gbas";
		if (((((local6_id_Str_ref_2211[0]).length) == (0)) ? 1 : 0)) {
			__debugInfo = "477:\ddgui.gbas";
			return tryClone(FLOAT2STR(func13_DDgui_get_Str(unref(local6_id_Str_ref_2211[0]), unref(local8_name_Str_ref_2212[0]))));
			__debugInfo = "477:\ddgui.gbas";
		} else {
			var local2_iw_2213 = 0;
			__debugInfo = "479:\ddgui.gbas";
			local2_iw_2213 = func11_DDgui_index(unref(global11_ddgui_stack_ref[0].arrAccess(-(1)).values[tmpPositionCache][0]), local6_id_Str_ref_2211, 0);
			__debugInfo = "492:\ddgui.gbas";
			if ((((local2_iw_2213) >= (0)) ? 1 : 0)) {
				var alias3_wdg_ref_2214 = [new type9_DDGUI_WDG()];
				__debugInfo = "482:\ddgui.gbas";
				alias3_wdg_ref_2214 = global11_ddgui_stack_ref[0].arrAccess(-(1)).values[tmpPositionCache][0].attr7_widgets_ref[0].arrAccess(local2_iw_2213).values[tmpPositionCache] /* ALIAS */;
				__debugInfo = "483:\ddgui.gbas";
				{
					var local16___SelectHelper9__2215 = "";
					__debugInfo = "483:\ddgui.gbas";
					local16___SelectHelper9__2215 = local8_name_Str_ref_2212[0];
					__debugInfo = "489:\ddgui.gbas";
					if ((((local16___SelectHelper9__2215) == ("CLICKED")) ? 1 : 0)) {
						__debugInfo = "484:\ddgui.gbas";
						return tryClone(alias3_wdg_ref_2214[0].attr8_wclicked);
						__debugInfo = "484:\ddgui.gbas";
					} else if ((((local16___SelectHelper9__2215) == ("SELECT")) ? 1 : 0)) {
						__debugInfo = "485:\ddgui.gbas";
						return tryClone(alias3_wdg_ref_2214[0].attr7_wselect);
						__debugInfo = "485:\ddgui.gbas";
					} else if ((((local16___SelectHelper9__2215) == ("COUNT")) ? 1 : 0)) {
						__debugInfo = "486:\ddgui.gbas";
						return tryClone(alias3_wdg_ref_2214[0].attr6_wcount);
						__debugInfo = "486:\ddgui.gbas";
					} else if ((((local16___SelectHelper9__2215) == ("SELSTART")) ? 1 : 0)) {
						__debugInfo = "487:\ddgui.gbas";
						return tryClone(alias3_wdg_ref_2214[0].attr9_wselstart);
						__debugInfo = "487:\ddgui.gbas";
					} else if ((((local16___SelectHelper9__2215) == ("SELEND")) ? 1 : 0)) {
						__debugInfo = "488:\ddgui.gbas";
						return tryClone(alias3_wdg_ref_2214[0].attr7_wselend);
						__debugInfo = "488:\ddgui.gbas";
					};
					__debugInfo = "483:\ddgui.gbas";
				};
				__debugInfo = "491:\ddgui.gbas";
				return tryClone(FLOAT2STR(func20_DDgui_get_intern_Str(unref(alias3_wdg_ref_2214[0]), local8_name_Str_ref_2212)));
				__debugInfo = "482:\ddgui.gbas";
			};
			__debugInfo = "493:\ddgui.gbas";
			DEBUG((((("DDgui_get: Widget not found ") + (local6_id_Str_ref_2211[0]))) + ("\n")));
			__debugInfo = "479:\ddgui.gbas";
		};
		__debugInfo = "495:\ddgui.gbas";
		return 0;
		__debugInfo = "475:\ddgui.gbas";
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
		var local6_id_Str_ref_1609 = [param6_id_Str]; /* NEWCODEHERE */
		__debugInfo = "544:\ddgui.gbas";
		if (((((local6_id_Str_ref_1609[0]).length) == (0)) ? 1 : 0)) {
			__debugInfo = "499:\ddgui.gbas";
			{
				var local16___SelectHelper1__1612 = "";
				__debugInfo = "499:\ddgui.gbas";
				local16___SelectHelper1__1612 = param8_name_Str;
				__debugInfo = "515:\ddgui.gbas";
				if ((((local16___SelectHelper1__1612) == ("FOCUS")) ? 1 : 0)) {
					__debugInfo = "500:\ddgui.gbas";
					global11_ddgui_stack_ref[0].arrAccess(-(1)).values[tmpPositionCache][0].attr9_focus_Str = param7_val_Str;
					__debugInfo = "500:\ddgui.gbas";
				} else if ((((local16___SelectHelper1__1612) == ("INKEY")) ? 1 : 0)) {
					__debugInfo = "501:\ddgui.gbas";
					global11_ddgui_stack_ref[0].arrAccess(-(1)).values[tmpPositionCache][0].attr13_dlg_inkey_Str = param7_val_Str;
					__debugInfo = "501:\ddgui.gbas";
				} else if ((((local16___SelectHelper1__1612) == ("COL_BRIGHT")) ? 1 : 0)) {
					__debugInfo = "502:\ddgui.gbas";
					global11_ddgui_stack_ref[0].arrAccess(-(1)).values[tmpPositionCache][0].attr10_col_bright = INT2STR(param7_val_Str);
					__debugInfo = "502:\ddgui.gbas";
				} else if ((((local16___SelectHelper1__1612) == ("COL_NORM")) ? 1 : 0)) {
					__debugInfo = "503:\ddgui.gbas";
					global11_ddgui_stack_ref[0].arrAccess(-(1)).values[tmpPositionCache][0].attr8_col_norm = INT2STR(param7_val_Str);
					__debugInfo = "503:\ddgui.gbas";
				} else if ((((local16___SelectHelper1__1612) == ("COL_HOVER_BRIGHT")) ? 1 : 0)) {
					__debugInfo = "504:\ddgui.gbas";
					global11_ddgui_stack_ref[0].arrAccess(-(1)).values[tmpPositionCache][0].attr16_col_hover_bright = INT2STR(param7_val_Str);
					__debugInfo = "504:\ddgui.gbas";
				} else if ((((local16___SelectHelper1__1612) == ("COL_HOVER_NORM")) ? 1 : 0)) {
					__debugInfo = "505:\ddgui.gbas";
					global11_ddgui_stack_ref[0].arrAccess(-(1)).values[tmpPositionCache][0].attr14_col_hover_norm = INT2STR(param7_val_Str);
					__debugInfo = "505:\ddgui.gbas";
				} else if ((((local16___SelectHelper1__1612) == ("TEXT")) ? 1 : 0)) {
					__debugInfo = "506:\ddgui.gbas";
					global11_ddgui_stack_ref[0].arrAccess(-(1)).values[tmpPositionCache][0].attr4_main.attr9_wtext_Str_ref[0] = param7_val_Str;
					__debugInfo = "506:\ddgui.gbas";
				} else if ((((local16___SelectHelper1__1612) == ("XPOS")) ? 1 : 0)) {
					__debugInfo = "507:\ddgui.gbas";
					global11_ddgui_stack_ref[0].arrAccess(-(1)).values[tmpPositionCache][0].attr4_xpos = INT2STR(param7_val_Str);
					__debugInfo = "507:\ddgui.gbas";
				} else if ((((local16___SelectHelper1__1612) == ("YPOS")) ? 1 : 0)) {
					__debugInfo = "508:\ddgui.gbas";
					global11_ddgui_stack_ref[0].arrAccess(-(1)).values[tmpPositionCache][0].attr4_ypos = INT2STR(param7_val_Str);
					__debugInfo = "508:\ddgui.gbas";
				} else if ((((local16___SelectHelper1__1612) == ("WIDTH")) ? 1 : 0)) {
					__debugInfo = "509:\ddgui.gbas";
					global11_ddgui_stack_ref[0].arrAccess(-(1)).values[tmpPositionCache][0].attr4_main.attr6_wwidth = INT2STR(param7_val_Str);
					__debugInfo = "509:\ddgui.gbas";
				} else if ((((local16___SelectHelper1__1612) == ("HEIGHT")) ? 1 : 0)) {
					__debugInfo = "510:\ddgui.gbas";
					global11_ddgui_stack_ref[0].arrAccess(-(1)).values[tmpPositionCache][0].attr4_main.attr7_wheight = INT2STR(param7_val_Str);
					__debugInfo = "510:\ddgui.gbas";
				} else if ((((local16___SelectHelper1__1612) == ("MOVEABLE")) ? 1 : 0)) {
					__debugInfo = "511:\ddgui.gbas";
					global11_ddgui_stack_ref[0].arrAccess(-(1)).values[tmpPositionCache][0].attr8_moveable = INT2STR(param7_val_Str);
					__debugInfo = "511:\ddgui.gbas";
				} else if ((((local16___SelectHelper1__1612) == ("SCALEABLE")) ? 1 : 0)) {
					__debugInfo = "512:\ddgui.gbas";
					global11_ddgui_stack_ref[0].arrAccess(-(1)).values[tmpPositionCache][0].attr9_scaleable = INT2STR(param7_val_Str);
					__debugInfo = "512:\ddgui.gbas";
				} else {
					__debugInfo = "514:\ddgui.gbas";
					DEBUG((((("DDgui_set dialog (\"\") property: ") + (param8_name_Str))) + (" is unknown\n")));
					__debugInfo = "514:\ddgui.gbas";
				};
				__debugInfo = "499:\ddgui.gbas";
			};
			__debugInfo = "499:\ddgui.gbas";
		} else {
			var local2_iw_1613 = 0.0, alias3_wdg_ref_1614 = [new type9_DDGUI_WDG()];
			__debugInfo = "517:\ddgui.gbas";
			local2_iw_1613 = func11_DDgui_index(unref(global11_ddgui_stack_ref[0].arrAccess(-(1)).values[tmpPositionCache][0]), local6_id_Str_ref_1609, 1);
			__debugInfo = "519:\ddgui.gbas";
			alias3_wdg_ref_1614 = global11_ddgui_stack_ref[0].arrAccess(-(1)).values[tmpPositionCache][0].attr7_widgets_ref[0].arrAccess(~~(local2_iw_1613)).values[tmpPositionCache] /* ALIAS */;
			__debugInfo = "521:\ddgui.gbas";
			{
				var local16___SelectHelper2__1615 = "";
				__debugInfo = "521:\ddgui.gbas";
				local16___SelectHelper2__1615 = param8_name_Str;
				__debugInfo = "543:\ddgui.gbas";
				if ((((local16___SelectHelper2__1615) == ("TEXT")) ? 1 : 0)) {
					__debugInfo = "522:\ddgui.gbas";
					alias3_wdg_ref_1614[0].attr9_wtext_Str_ref[0] = param7_val_Str;
					__debugInfo = "522:\ddgui.gbas";
				} else if ((((local16___SelectHelper2__1615) == ("CLICKED")) ? 1 : 0)) {
					__debugInfo = "523:\ddgui.gbas";
					alias3_wdg_ref_1614[0].attr8_wclicked = INT2STR(param7_val_Str);
					__debugInfo = "523:\ddgui.gbas";
				} else if ((((local16___SelectHelper2__1615) == ("WIDTH")) ? 1 : 0)) {
					__debugInfo = "524:\ddgui.gbas";
					alias3_wdg_ref_1614[0].attr6_wwidth = INT2STR(param7_val_Str);
					__debugInfo = "524:\ddgui.gbas";
				} else if ((((local16___SelectHelper2__1615) == ("HEIGHT")) ? 1 : 0)) {
					__debugInfo = "525:\ddgui.gbas";
					alias3_wdg_ref_1614[0].attr7_wheight = INT2STR(param7_val_Str);
					__debugInfo = "525:\ddgui.gbas";
				} else if ((((local16___SelectHelper2__1615) == ("SELECT")) ? 1 : 0)) {
					__debugInfo = "526:\ddgui.gbas";
					alias3_wdg_ref_1614[0].attr7_wselect = INT2STR(param7_val_Str);
					__debugInfo = "526:\ddgui.gbas";
				} else if ((((local16___SelectHelper2__1615) == ("COUNT")) ? 1 : 0)) {
					__debugInfo = "527:\ddgui.gbas";
					alias3_wdg_ref_1614[0].attr6_wcount = INT2STR(param7_val_Str);
					__debugInfo = "527:\ddgui.gbas";
				} else if ((((local16___SelectHelper2__1615) == ("HOVER")) ? 1 : 0)) {
					__debugInfo = "528:\ddgui.gbas";
					alias3_wdg_ref_1614[0].attr6_whover = INT2STR(param7_val_Str);
					__debugInfo = "528:\ddgui.gbas";
				} else if ((((local16___SelectHelper2__1615) == ("READONLY")) ? 1 : 0)) {
					__debugInfo = "529:\ddgui.gbas";
					alias3_wdg_ref_1614[0].attr9_wreadonly = INT2STR(param7_val_Str);
					__debugInfo = "529:\ddgui.gbas";
				} else if ((((local16___SelectHelper2__1615) == ("SELSTART")) ? 1 : 0)) {
					__debugInfo = "530:\ddgui.gbas";
					alias3_wdg_ref_1614[0].attr9_wselstart = INT2STR(param7_val_Str);
					__debugInfo = "530:\ddgui.gbas";
				} else if ((((local16___SelectHelper2__1615) == ("SELEND")) ? 1 : 0)) {
					__debugInfo = "531:\ddgui.gbas";
					alias3_wdg_ref_1614[0].attr7_wselend = INT2STR(param7_val_Str);
					__debugInfo = "531:\ddgui.gbas";
				} else if ((((local16___SelectHelper2__1615) == ("HIDE")) ? 1 : 0)) {
					__debugInfo = "532:\ddgui.gbas";
					alias3_wdg_ref_1614[0].attr5_whide = INT2STR(param7_val_Str);
					__debugInfo = "532:\ddgui.gbas";
				} else if ((((local16___SelectHelper2__1615) == ("TYPE")) ? 1 : 0)) {
					__debugInfo = "533:\ddgui.gbas";
					alias3_wdg_ref_1614[0].attr9_wtype_Str = param7_val_Str;
					__debugInfo = "533:\ddgui.gbas";
				} else if ((((local16___SelectHelper2__1615) == ("FILTER")) ? 1 : 0)) {
					__debugInfo = "534:\ddgui.gbas";
					alias3_wdg_ref_1614[0].attr11_wfilter_Str = param7_val_Str;
					__debugInfo = "534:\ddgui.gbas";
				} else if ((((local16___SelectHelper2__1615) == ("TIPTEXT")) ? 1 : 0)) {
					__debugInfo = "535:\ddgui.gbas";
					alias3_wdg_ref_1614[0].attr11_tiptext_Str_ref[0] = param7_val_Str;
					__debugInfo = "535:\ddgui.gbas";
				} else if ((((local16___SelectHelper2__1615) == ("MINVAL")) ? 1 : 0)) {
					__debugInfo = "536:\ddgui.gbas";
					alias3_wdg_ref_1614[0].attr7_wminval = FLOAT2STR(param7_val_Str);
					__debugInfo = "536:\ddgui.gbas";
				} else if ((((local16___SelectHelper2__1615) == ("MAXVAL")) ? 1 : 0)) {
					__debugInfo = "537:\ddgui.gbas";
					alias3_wdg_ref_1614[0].attr7_wmaxval = FLOAT2STR(param7_val_Str);
					__debugInfo = "537:\ddgui.gbas";
				} else if ((((local16___SelectHelper2__1615) == ("STEP")) ? 1 : 0)) {
					__debugInfo = "538:\ddgui.gbas";
					alias3_wdg_ref_1614[0].attr5_wstep = FLOAT2STR(param7_val_Str);
					__debugInfo = "538:\ddgui.gbas";
				} else if ((((local16___SelectHelper2__1615) == ("SCROLL")) ? 1 : 0)) {
					__debugInfo = "539:\ddgui.gbas";
					alias3_wdg_ref_1614[0].attr7_wscroll = INT2STR(param7_val_Str);
					__debugInfo = "539:\ddgui.gbas";
				} else if ((((local16___SelectHelper2__1615) == ("ALIGN")) ? 1 : 0)) {
					__debugInfo = "540:\ddgui.gbas";
					alias3_wdg_ref_1614[0].attr6_walign = INT2STR(param7_val_Str);
					__debugInfo = "540:\ddgui.gbas";
				} else {
					__debugInfo = "542:\ddgui.gbas";
					DEBUG((((("DDgui_set: Widget property ") + (param8_name_Str))) + (" is unknown\n")));
					__debugInfo = "542:\ddgui.gbas";
				};
				__debugInfo = "521:\ddgui.gbas";
			};
			__debugInfo = "517:\ddgui.gbas";
		};
		__debugInfo = "546:\ddgui.gbas";
		return 0;
		__debugInfo = "544:\ddgui.gbas";
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
		__debugInfo = "632:\ddgui.gbas";
		if (param5_bBold) {
			__debugInfo = "629:\ddgui.gbas";
			ALPHAMODE(-(0.5));
			__debugInfo = "630:\ddgui.gbas";
			func17_DDGui_PrintIntern(param5_t_Str_ref, ((param1_x) + (1)), param1_y, 0);
			__debugInfo = "631:\ddgui.gbas";
			ALPHAMODE(0);
			__debugInfo = "629:\ddgui.gbas";
		};
		__debugInfo = "635:\ddgui.gbas";
		PRINT(unref(param5_t_Str_ref[0]), param1_x, param1_y, global18_ddgui_font_kerning.attr11_bHasKerning);
		__debugInfo = "636:\ddgui.gbas";
		return 0;
		__debugInfo = "652:\ddgui.gbas";
		if (global18_ddgui_font_kerning.attr11_bHasKerning) {
			var local2_fx_2220 = 0, local2_lt_2221 = 0, local5_c_Str_2222 = "", local4_kern_2223 = 0, local2_ac_2224 = 0;
			__debugInfo = "642:\ddgui.gbas";
			local2_lt_2221 = (((param5_t_Str_ref[0]).length) - (1));
			__debugInfo = "642:\ddgui.gbas";
			{
				var local1_c_2225 = 0;
				__debugInfo = "649:\ddgui.gbas";
				for (local1_c_2225 = 0;toCheck(local1_c_2225, local2_lt_2221, 1);local1_c_2225 += 1) {
					__debugInfo = "644:\ddgui.gbas";
					local5_c_Str_2222 = MID_Str(unref(param5_t_Str_ref[0]), local1_c_2225, 1);
					__debugInfo = "645:\ddgui.gbas";
					local2_ac_2224 = ASC(local5_c_Str_2222, 0);
					__debugInfo = "646:\ddgui.gbas";
					local4_kern_2223 = global18_ddgui_font_kerning.attr4_left.arrAccess(local2_ac_2224).values[tmpPositionCache];
					__debugInfo = "647:\ddgui.gbas";
					PRINT(local5_c_Str_2222, ((param1_x) - (local4_kern_2223)), param1_y, 0);
					__debugInfo = "648:\ddgui.gbas";
					param1_x+=global18_ddgui_font_kerning.attr5_width.arrAccess(local2_ac_2224).values[tmpPositionCache];
					__debugInfo = "644:\ddgui.gbas";
				};
				__debugInfo = "649:\ddgui.gbas";
			};
			__debugInfo = "642:\ddgui.gbas";
		} else {
			__debugInfo = "651:\ddgui.gbas";
			PRINT(unref(param5_t_Str_ref[0]), param1_x, param1_y, 0);
			__debugInfo = "651:\ddgui.gbas";
		};
		__debugInfo = "653:\ddgui.gbas";
		return 0;
		__debugInfo = "632:\ddgui.gbas";
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
		__debugInfo = "663:\ddgui.gbas";
		return tryClone(KERNLEN(param5_t_Str_ref[0], global18_ddgui_font_kerning.attr11_bHasKerning));
		__debugInfo = "678:\ddgui.gbas";
		if (global18_ddgui_font_kerning.attr11_bHasKerning) {
			var local2_fx_2227 = 0, local2_lt_2228 = 0, local5_c_Str_2229 = "", local1_x_2230 = 0, local2_ac_2231 = 0;
			__debugInfo = "668:\ddgui.gbas";
			local2_lt_2228 = (((param5_t_Str_ref[0]).length) - (1));
			__debugInfo = "668:\ddgui.gbas";
			{
				var local1_c_2232 = 0;
				__debugInfo = "672:\ddgui.gbas";
				for (local1_c_2232 = 0;toCheck(local1_c_2232, local2_lt_2228, 1);local1_c_2232 += 1) {
					__debugInfo = "670:\ddgui.gbas";
					local2_ac_2231 = ASC(MID_Str(unref(param5_t_Str_ref[0]), local1_c_2232, 1), 0);
					__debugInfo = "671:\ddgui.gbas";
					local1_x_2230+=global18_ddgui_font_kerning.attr5_width.arrAccess(local2_ac_2231).values[tmpPositionCache];
					__debugInfo = "670:\ddgui.gbas";
				};
				__debugInfo = "672:\ddgui.gbas";
			};
			__debugInfo = "673:\ddgui.gbas";
			return tryClone(local1_x_2230);
			__debugInfo = "668:\ddgui.gbas";
		} else {
			var local2_fx_ref_2233 = [0], local2_fy_ref_2234 = [0];
			__debugInfo = "676:\ddgui.gbas";
			GETFONTSIZE(local2_fx_ref_2233, local2_fy_ref_2234);
			__debugInfo = "677:\ddgui.gbas";
			return tryClone((((param5_t_Str_ref[0]).length) * (local2_fx_ref_2233[0])));
			__debugInfo = "676:\ddgui.gbas";
		};
		__debugInfo = "679:\ddgui.gbas";
		return 0;
		__debugInfo = "663:\ddgui.gbas";
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
		__debugInfo = "686:\ddgui.gbas";
		if ((((BOUNDS(global11_ddgui_stack_ref[0], 0)) == (0)) ? 1 : 0)) {
			__debugInfo = "686:\ddgui.gbas";
			DIM(unref(global11_ddgui_stack_ref[0]), [1], [new type9_DDGUI_DLG()]);
			__debugInfo = "686:\ddgui.gbas";
		};
		__debugInfo = "693:\ddgui.gbas";
		if (((((((global11_ddgui_stack_ref[0].arrAccess(-(1)).values[tmpPositionCache][0].attr8_col_norm) == (0)) ? 1 : 0)) && ((((global11_ddgui_stack_ref[0].arrAccess(-(1)).values[tmpPositionCache][0].attr10_col_bright) == (0)) ? 1 : 0))) ? 1 : 0)) {
			__debugInfo = "689:\ddgui.gbas";
			global11_ddgui_stack_ref[0].arrAccess(-(1)).values[tmpPositionCache][0].attr8_col_norm = RGB(192, 192, 192);
			__debugInfo = "690:\ddgui.gbas";
			global11_ddgui_stack_ref[0].arrAccess(-(1)).values[tmpPositionCache][0].attr10_col_bright = RGB(255, 255, 255);
			__debugInfo = "691:\ddgui.gbas";
			global11_ddgui_stack_ref[0].arrAccess(-(1)).values[tmpPositionCache][0].attr14_col_hover_norm = RGB(64, 144, 255);
			__debugInfo = "692:\ddgui.gbas";
			global11_ddgui_stack_ref[0].arrAccess(-(1)).values[tmpPositionCache][0].attr16_col_hover_bright = RGB(160, 240, 255);
			__debugInfo = "689:\ddgui.gbas";
		};
		__debugInfo = "694:\ddgui.gbas";
		DIM(unref(global11_ddgui_stack_ref[0].arrAccess(-(1)).values[tmpPositionCache][0].attr7_widgets_ref[0]), [0], [new type9_DDGUI_WDG()]);
		__debugInfo = "695:\ddgui.gbas";
		DIM(global11_ddgui_stack_ref[0].arrAccess(-(1)).values[tmpPositionCache][0].attr9_draworder, [0], new type11_DDGUI_ORDER());
		__debugInfo = "696:\ddgui.gbas";
		DIM(global11_ddgui_stack_ref[0].arrAccess(-(1)).values[tmpPositionCache][0].attr5_autos, [0], new type10_DDGUI_AUTO());
		__debugInfo = "704:\ddgui.gbas";
		if ((((((((((((((((((((((PLATFORMINFO_Str("")) == ("WINCE")) ? 1 : 0)) || ((((PLATFORMINFO_Str("")) == ("GP2X")) ? 1 : 0))) ? 1 : 0)) || ((((PLATFORMINFO_Str("")) == ("ANDROID")) ? 1 : 0))) ? 1 : 0)) || ((((PLATFORMINFO_Str("")) == ("IPHONE")) ? 1 : 0))) ? 1 : 0)) || ((((PLATFORMINFO_Str("")) == ("PANDORA")) ? 1 : 0))) ? 1 : 0)) || ((((PLATFORMINFO_Str("")) == ("WEBOS")) ? 1 : 0))) ? 1 : 0)) || ((((PLATFORMINFO_Str("")) == ("PALM_PIXI")) ? 1 : 0))) ? 1 : 0)) {
			__debugInfo = "702:\ddgui.gbas";
			global20_DDGUI_AUTO_INPUT_DLG = 1;
			__debugInfo = "703:\ddgui.gbas";
			if ((((global20_gDDguiScrollbarWidth) == (0)) ? 1 : 0)) {
				__debugInfo = "703:\ddgui.gbas";
				global20_gDDguiScrollbarWidth = 30;
				__debugInfo = "703:\ddgui.gbas";
			};
			__debugInfo = "702:\ddgui.gbas";
		};
		__debugInfo = "705:\ddgui.gbas";
		if ((((global20_gDDguiScrollbarWidth) == (0)) ? 1 : 0)) {
			__debugInfo = "705:\ddgui.gbas";
			global20_gDDguiScrollbarWidth = 20;
			__debugInfo = "705:\ddgui.gbas";
		};
		__debugInfo = "707:\ddgui.gbas";
		return 0;
		__debugInfo = "686:\ddgui.gbas";
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
		var local2_sx_ref_1621 = [0], local2_sy_ref_1622 = [0], local3_dlg_ref_1623 = [new type9_DDGUI_DLG()];
		__debugInfo = "789:\ddgui.gbas";
		if ((((global25_gDDguiMinControlDimension) <= (0)) ? 1 : 0)) {
			__debugInfo = "776:\ddgui.gbas";
			global25_gDDguiMinControlDimension = 16;
			__debugInfo = "776:\ddgui.gbas";
		};
		__debugInfo = "791:\ddgui.gbas";
		DIMPUSH(global11_ddgui_stack_ref[0], local3_dlg_ref_1623);
		__debugInfo = "793:\ddgui.gbas";
		GETSCREENSIZE(local2_sx_ref_1621, local2_sy_ref_1622);
		__debugInfo = "797:\ddgui.gbas";
		func10_DDgui_init();
		__debugInfo = "798:\ddgui.gbas";
		global11_ddgui_stack_ref[0].arrAccess(-(1)).values[tmpPositionCache][0].attr4_xpos = MIN(param1_x, ((local2_sx_ref_1621[0]) - (1)));
		__debugInfo = "799:\ddgui.gbas";
		global11_ddgui_stack_ref[0].arrAccess(-(1)).values[tmpPositionCache][0].attr4_ypos = MIN(param1_y, ((local2_sy_ref_1622[0]) - (1)));
		__debugInfo = "800:\ddgui.gbas";
		global11_ddgui_stack_ref[0].arrAccess(-(1)).values[tmpPositionCache][0].attr4_main.attr6_wwidth = MIN(param5_width, ((local2_sx_ref_1621[0]) - (param1_x)));
		__debugInfo = "801:\ddgui.gbas";
		global11_ddgui_stack_ref[0].arrAccess(-(1)).values[tmpPositionCache][0].attr4_main.attr7_wheight = MIN(param6_height, ((local2_sy_ref_1622[0]) - (param1_y)));
		__debugInfo = "804:\ddgui.gbas";
		global11_ddgui_stack_ref[0].arrAccess(-(1)).values[tmpPositionCache][0].attr8_col_norm = global11_ddgui_stack_ref[0].arrAccess(0).values[tmpPositionCache][0].attr8_col_norm;
		__debugInfo = "805:\ddgui.gbas";
		global11_ddgui_stack_ref[0].arrAccess(-(1)).values[tmpPositionCache][0].attr10_col_bright = global11_ddgui_stack_ref[0].arrAccess(0).values[tmpPositionCache][0].attr10_col_bright;
		__debugInfo = "806:\ddgui.gbas";
		global11_ddgui_stack_ref[0].arrAccess(-(1)).values[tmpPositionCache][0].attr14_col_hover_norm = global11_ddgui_stack_ref[0].arrAccess(0).values[tmpPositionCache][0].attr14_col_hover_norm;
		__debugInfo = "807:\ddgui.gbas";
		global11_ddgui_stack_ref[0].arrAccess(-(1)).values[tmpPositionCache][0].attr16_col_hover_bright = global11_ddgui_stack_ref[0].arrAccess(0).values[tmpPositionCache][0].attr16_col_hover_bright;
		__debugInfo = "810:\ddgui.gbas";
		if (param16_center_to_screen) {
			__debugInfo = "810:\ddgui.gbas";
			func18_DDgui_CenterDialog();
			__debugInfo = "810:\ddgui.gbas";
		};
		__debugInfo = "811:\ddgui.gbas";
		return 0;
		__debugInfo = "789:\ddgui.gbas";
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
		__debugInfo = "831:\ddgui.gbas";
		if ((((BOUNDS(global11_ddgui_stack_ref[0], 0)) > (0)) ? 1 : 0)) {
			var local1_n_2235 = 0, local9_dummy_Str_ref_2236 = [""];
			__debugInfo = "819:\ddgui.gbas";
			local1_n_2235 = ((BOUNDS(global11_ddgui_stack_ref[0], 0)) - (1));
			__debugInfo = "825:\ddgui.gbas";
			var forEachSaver14035 = global11_ddgui_stack_ref[0].arrAccess(local1_n_2235).values[tmpPositionCache][0].attr7_widgets_ref[0];
			for(var forEachCounter14035 = 0 ; forEachCounter14035 < forEachSaver14035.values.length ; forEachCounter14035++) {
				var local3_wdg_ref_2237 = forEachSaver14035.values[forEachCounter14035];
			{
					__debugInfo = "824:\ddgui.gbas";
					if (local3_wdg_ref_2237[0].attr8_wuserfoo_ref[0]) {
						__debugInfo = "824:\ddgui.gbas";
						func12_DDgui_signal(local3_wdg_ref_2237[0].attr7_wid_Str, "DESTROY", local9_dummy_Str_ref_2236);
						__debugInfo = "824:\ddgui.gbas";
					};
					__debugInfo = "824:\ddgui.gbas";
				}
				forEachSaver14035.values[forEachCounter14035] = local3_wdg_ref_2237;
			
			};
			__debugInfo = "827:\ddgui.gbas";
			DIMDEL(global11_ddgui_stack_ref[0], local1_n_2235);
			__debugInfo = "819:\ddgui.gbas";
		};
		__debugInfo = "833:\ddgui.gbas";
		if (BOUNDS(global11_ddgui_stack_ref[0], 0)) {
			__debugInfo = "833:\ddgui.gbas";
			func18_DDgui_resizedialog(0, 0, 0, 0);
			__debugInfo = "833:\ddgui.gbas";
		};
		__debugInfo = "834:\ddgui.gbas";
		return 0;
		__debugInfo = "831:\ddgui.gbas";
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
		__debugInfo = "844:\ddgui.gbas";
		if ((((BOUNDS(global11_ddgui_stack_ref[0], 0)) == (0)) ? 1 : 0)) {
			__debugInfo = "842:\ddgui.gbas";
			DEBUG("DDshow: No active dialog!\n");
			__debugInfo = "843:\ddgui.gbas";
			return tryClone(0);
			__debugInfo = "842:\ddgui.gbas";
		};
		__debugInfo = "852:\ddgui.gbas";
		if ((((param17_only_show_current) == (0)) ? 1 : 0)) {
			var local1_i_1625 = 0;
			__debugInfo = "847:\ddgui.gbas";
			{
				__debugInfo = "851:\ddgui.gbas";
				for (local1_i_1625 = 0;toCheck(local1_i_1625, ((BOUNDS(global11_ddgui_stack_ref[0], 0)) - (2)), 1);local1_i_1625 += 1) {
					var alias3_dlg_ref_1626 = [new type9_DDGUI_DLG()];
					__debugInfo = "849:\ddgui.gbas";
					alias3_dlg_ref_1626 = global11_ddgui_stack_ref[0].arrAccess(local1_i_1625).values[tmpPositionCache] /* ALIAS */;
					__debugInfo = "850:\ddgui.gbas";
					func17_DDgui_show_intern(unref(alias3_dlg_ref_1626[0]), 0);
					__debugInfo = "849:\ddgui.gbas";
				};
				__debugInfo = "851:\ddgui.gbas";
			};
			__debugInfo = "847:\ddgui.gbas";
		};
		__debugInfo = "853:\ddgui.gbas";
		func17_DDgui_show_intern(unref(global11_ddgui_stack_ref[0].arrAccess(-(1)).values[tmpPositionCache][0]), 1);
		__debugInfo = "857:\ddgui.gbas";
		var forEachSaver2216 = global11_ddgui_stack_ref[0].arrAccess(-(1)).values[tmpPositionCache][0].attr5_autos;
		for(var forEachCounter2216 = 0 ; forEachCounter2216 < forEachSaver2216.values.length ; forEachCounter2216++) {
			var local5_autom_1627 = forEachSaver2216.values[forEachCounter2216];
		{
				__debugInfo = "856:\ddgui.gbas";
				func9_DDgui_set(local5_autom_1627.attr8_idto_Str, local5_autom_1627.attr9_objto_Str, func13_DDgui_get_Str(local5_autom_1627.attr10_idfrom_Str, local5_autom_1627.attr11_objfrom_Str));
				__debugInfo = "856:\ddgui.gbas";
			}
			forEachSaver2216.values[forEachCounter2216] = local5_autom_1627;
		
		};
		__debugInfo = "858:\ddgui.gbas";
		return 0;
		__debugInfo = "844:\ddgui.gbas";
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
		var local1_x_1630 = 0, local1_y_1631 = 0, local5_width_1632 = 0, local6_height_1633 = 0, local2_c1_1634 = 0, local2_c2_1635 = 0, local1_i_1636 = 0, local6_id_Str_1637 = "", local7_dy_line_ref_1638 = [0], local4_xpos_ref_1639 = [0], local4_ypos_ref_1640 = [0], local4_ytop_1641 = 0, local5_yclip_1642 = 0, local2_mx_ref_1643 = [0], local2_my_ref_1644 = [0], local2_b1_1645 = 0, local2_b2_1646 = 0, local6_realb1_ref_1647 = [0], local6_realb2_ref_1648 = [0], local2_tx_ref_1649 = [0], local2_ty_ref_1650 = [0], local7_spacing_1651 = 0, local7_movable_1652 = 0, local3_col_1653 = 0, local14_caption_height_1660 = 0, local10_sizer_size_1661 = 0, local9_show_tips_1663 = 0, local5_xclip_1664 = 0, local6_ybclip_1665 = 0, local6_retval_1667 = 0, local10_KickId_Str_1668 = "";
		__debugInfo = "882:\ddgui.gbas";
		local7_spacing_1651 = 2;
		__debugInfo = "883:\ddgui.gbas";
		MOUSESTATE(local2_mx_ref_1643, local2_my_ref_1644, local6_realb1_ref_1647, local6_realb2_ref_1648);
		__debugInfo = "884:\ddgui.gbas";
		GETFONTSIZE(local2_tx_ref_1649, local2_ty_ref_1650);
		__debugInfo = "888:\ddgui.gbas";
		local14_caption_height_1660 = MAX(unref(local2_ty_ref_1650[0]), global25_gDDguiMinControlDimension);
		__debugInfo = "894:\ddgui.gbas";
		if (((((((ABS(((local2_mx_ref_1643[0]) - (static9_DDgui_show_intern_ToolTipMx)))) > (4)) ? 1 : 0)) || ((((ABS(((local2_my_ref_1644[0]) - (static9_DDgui_show_intern_ToolTipMy)))) > (4)) ? 1 : 0))) ? 1 : 0)) {
			__debugInfo = "891:\ddgui.gbas";
			static12_DDgui_show_intern_ToolTipDelay = GETTIMERALL();
			__debugInfo = "892:\ddgui.gbas";
			static9_DDgui_show_intern_ToolTipMx = local2_mx_ref_1643[0];
			__debugInfo = "893:\ddgui.gbas";
			static9_DDgui_show_intern_ToolTipMy = local2_my_ref_1644[0];
			__debugInfo = "891:\ddgui.gbas";
		};
		__debugInfo = "922:\ddgui.gbas";
		if (param10_is_current) {
			__debugInfo = "897:\ddgui.gbas";
			local2_b1_1645 = 0;
			__debugInfo = "904:\ddgui.gbas";
			if ((((local6_realb1_ref_1647[0]) && ((((static10_DDgui_show_intern_mouse_down) == (0)) ? 1 : 0))) ? 1 : 0)) {
				__debugInfo = "900:\ddgui.gbas";
				local2_b1_1645 = -(1);
				__debugInfo = "901:\ddgui.gbas";
				static10_DDgui_show_intern_mouse_down = 1;
				__debugInfo = "902:\ddgui.gbas";
				static10_DDgui_show_intern_movemousex = local2_mx_ref_1643[0];
				__debugInfo = "903:\ddgui.gbas";
				static10_DDgui_show_intern_movemousey = local2_my_ref_1644[0];
				__debugInfo = "900:\ddgui.gbas";
			};
			__debugInfo = "914:\ddgui.gbas";
			if (((((((local6_realb1_ref_1647[0]) == (0)) ? 1 : 0)) && ((((static10_DDgui_show_intern_mouse_down) > (0)) ? 1 : 0))) ? 1 : 0)) {
				__debugInfo = "907:\ddgui.gbas";
				local2_b1_1645 = 1;
				__debugInfo = "908:\ddgui.gbas";
				static10_DDgui_show_intern_mouse_down = 0;
				__debugInfo = "907:\ddgui.gbas";
			};
			__debugInfo = "897:\ddgui.gbas";
		};
		__debugInfo = "925:\ddgui.gbas";
		VIEWPORT(0, 0, 0, 0);
		__debugInfo = "926:\ddgui.gbas";
		local2_c1_1634 = param10_ddgui_vals.attr10_col_bright;
		__debugInfo = "927:\ddgui.gbas";
		local2_c2_1635 = param10_ddgui_vals.attr8_col_norm;
		__debugInfo = "928:\ddgui.gbas";
		local1_x_1630 = param10_ddgui_vals.attr4_xpos;
		__debugInfo = "929:\ddgui.gbas";
		local1_y_1631 = param10_ddgui_vals.attr4_ypos;
		__debugInfo = "930:\ddgui.gbas";
		local5_width_1632 = param10_ddgui_vals.attr4_main.attr6_wwidth;
		__debugInfo = "931:\ddgui.gbas";
		local6_height_1633 = param10_ddgui_vals.attr4_main.attr7_wheight;
		__debugInfo = "952:\ddgui.gbas";
		if (param10_is_current) {
			__debugInfo = "951:\ddgui.gbas";
			if (param10_ddgui_vals.attr8_moveable) {
				__debugInfo = "950:\ddgui.gbas";
				if (local6_realb1_ref_1647[0]) {
					__debugInfo = "938:\ddgui.gbas";
					local1_i_1636 = BOXCOLL(local1_x_1630, local1_y_1631, local5_width_1632, local14_caption_height_1660, unref(local2_mx_ref_1643[0]), unref(local2_my_ref_1644[0]), 1, 1);
					__debugInfo = "947:\ddgui.gbas";
					if (((((((local1_i_1636) || (param10_ddgui_vals.attr6_moving)) ? 1 : 0)) && (((((param10_ddgui_vals.attr9_focus_Str).length) == (0)) ? 1 : 0))) ? 1 : 0)) {
						__debugInfo = "940:\ddgui.gbas";
						param10_ddgui_vals.attr6_moving = 1;
						__debugInfo = "941:\ddgui.gbas";
						local1_x_1630 = MAX(0, ((((local1_x_1630) + (local2_mx_ref_1643[0]))) - (static10_DDgui_show_intern_movemousex)));
						__debugInfo = "942:\ddgui.gbas";
						local1_y_1631 = MAX(0, ((((local1_y_1631) + (local2_my_ref_1644[0]))) - (static10_DDgui_show_intern_movemousey)));
						__debugInfo = "943:\ddgui.gbas";
						param10_ddgui_vals.attr4_xpos = local1_x_1630;
						__debugInfo = "944:\ddgui.gbas";
						param10_ddgui_vals.attr4_ypos = local1_y_1631;
						__debugInfo = "940:\ddgui.gbas";
					} else if (local1_i_1636) {
						__debugInfo = "946:\ddgui.gbas";
						param10_ddgui_vals.attr9_focus_Str = "";
						__debugInfo = "946:\ddgui.gbas";
					};
					__debugInfo = "938:\ddgui.gbas";
				} else {
					__debugInfo = "949:\ddgui.gbas";
					param10_ddgui_vals.attr6_moving = 0;
					__debugInfo = "949:\ddgui.gbas";
				};
				__debugInfo = "950:\ddgui.gbas";
			};
			__debugInfo = "951:\ddgui.gbas";
		};
		__debugInfo = "975:\ddgui.gbas";
		if ((((param10_ddgui_vals.attr8_moveable) || ((param10_ddgui_vals.attr4_main.attr9_wtext_Str_ref[0]).length)) ? 1 : 0)) {
			__debugInfo = "956:\ddgui.gbas";
			local7_movable_1652 = 1;
			__debugInfo = "957:\ddgui.gbas";
			local1_y_1631 = ((((local1_y_1631) + (local14_caption_height_1660))) + (4));
			__debugInfo = "960:\ddgui.gbas";
			func13_DDgui_backgnd(local2_c1_1634, local2_c2_1635, ((local1_x_1630) + (1)), ((((local1_y_1631) - (local14_caption_height_1660))) - (3)), ((local5_width_1632) - (2)), ((local14_caption_height_1660) + (4)));
			__debugInfo = "962:\ddgui.gbas";
			func17_DDGui_PrintIntern(param10_ddgui_vals.attr4_main.attr9_wtext_Str_ref, ((local1_x_1630) + (3)), ((((local1_y_1631) - (local14_caption_height_1660))) - (2)), 1);
			__debugInfo = "963:\ddgui.gbas";
			func14_DDgui_backrect(local1_x_1630, ((((local1_y_1631) - (local14_caption_height_1660))) - (4)), local5_width_1632, ((((local6_height_1633) + (local14_caption_height_1660))) + (4)), local2_c2_1635);
			__debugInfo = "965:\ddgui.gbas";
			param10_ddgui_vals.attr5_rectx = local1_x_1630;
			__debugInfo = "966:\ddgui.gbas";
			param10_ddgui_vals.attr5_recty = ((((local1_y_1631) - (local14_caption_height_1660))) - (4));
			__debugInfo = "967:\ddgui.gbas";
			param10_ddgui_vals.attr5_rectw = local5_width_1632;
			__debugInfo = "968:\ddgui.gbas";
			param10_ddgui_vals.attr5_recth = ((((local6_height_1633) + (local14_caption_height_1660))) + (4));
			__debugInfo = "956:\ddgui.gbas";
		} else {
			__debugInfo = "970:\ddgui.gbas";
			func14_DDgui_backrect(local1_x_1630, local1_y_1631, local5_width_1632, local6_height_1633, local2_c2_1635);
			__debugInfo = "971:\ddgui.gbas";
			param10_ddgui_vals.attr5_rectx = local1_x_1630;
			__debugInfo = "972:\ddgui.gbas";
			param10_ddgui_vals.attr5_recty = local1_y_1631;
			__debugInfo = "973:\ddgui.gbas";
			param10_ddgui_vals.attr5_rectw = local5_width_1632;
			__debugInfo = "974:\ddgui.gbas";
			param10_ddgui_vals.attr5_recth = local6_height_1633;
			__debugInfo = "970:\ddgui.gbas";
		};
		__debugInfo = "979:\ddgui.gbas";
		func13_DDgui_backgnd(local2_c1_1634, local2_c1_1634, ((local1_x_1630) + (1)), ((local1_y_1631) + (1)), ((local5_width_1632) - (2)), ((local6_height_1633) - (2)));
		__debugInfo = "982:\ddgui.gbas";
		local4_ytop_1641 = local1_y_1631;
		__debugInfo = "983:\ddgui.gbas";
		local5_yclip_1642 = local4_ytop_1641;
		__debugInfo = "986:\ddgui.gbas";
		local10_sizer_size_1661 = MAX(((local2_tx_ref_1649[0]) * (2)), global20_gDDguiScrollbarWidth);
		__debugInfo = "1003:\ddgui.gbas";
		if (param10_is_current) {
			__debugInfo = "1002:\ddgui.gbas";
			if ((((param10_ddgui_vals.attr9_scaleable) || (param10_ddgui_vals.attr8_scaleing)) ? 1 : 0)) {
				__debugInfo = "1001:\ddgui.gbas";
				if (local6_realb1_ref_1647[0]) {
					__debugInfo = "991:\ddgui.gbas";
					local1_i_1636 = BOXCOLL(((((((local1_x_1630) + (local5_width_1632))) - (local10_sizer_size_1661))) - (4)), ((((((local1_y_1631) + (local6_height_1633))) - (local10_sizer_size_1661))) - (4)), ((local10_sizer_size_1661) + (4)), ((local10_sizer_size_1661) + (4)), unref(local2_mx_ref_1643[0]), unref(local2_my_ref_1644[0]), 1, 1);
					__debugInfo = "998:\ddgui.gbas";
					if ((((local1_i_1636) || (param10_ddgui_vals.attr8_scaleing)) ? 1 : 0)) {
						__debugInfo = "993:\ddgui.gbas";
						param10_ddgui_vals.attr8_scaleing = 1;
						__debugInfo = "994:\ddgui.gbas";
						local5_width_1632 = MAX(0, ((((local5_width_1632) + (local2_mx_ref_1643[0]))) - (static10_DDgui_show_intern_movemousex)));
						__debugInfo = "995:\ddgui.gbas";
						local6_height_1633 = MAX(0, ((((local6_height_1633) + (local2_my_ref_1644[0]))) - (static10_DDgui_show_intern_movemousey)));
						__debugInfo = "996:\ddgui.gbas";
						param10_ddgui_vals.attr4_main.attr6_wwidth = local5_width_1632;
						__debugInfo = "997:\ddgui.gbas";
						param10_ddgui_vals.attr4_main.attr7_wheight = local6_height_1633;
						__debugInfo = "993:\ddgui.gbas";
					};
					__debugInfo = "991:\ddgui.gbas";
				} else {
					__debugInfo = "1000:\ddgui.gbas";
					param10_ddgui_vals.attr8_scaleing = 0;
					__debugInfo = "1000:\ddgui.gbas";
				};
				__debugInfo = "1001:\ddgui.gbas";
			};
			__debugInfo = "1002:\ddgui.gbas";
		};
		__debugInfo = "1015:\ddgui.gbas";
		if ((((param10_ddgui_vals.attr9_scaleable) || (param10_ddgui_vals.attr8_scaleing)) ? 1 : 0)) {
			__debugInfo = "1006:\ddgui.gbas";
			local3_col_1653 = BOXCOLL(((((((local1_x_1630) + (local5_width_1632))) - (local10_sizer_size_1661))) - (4)), ((((((local1_y_1631) + (local6_height_1633))) - (local10_sizer_size_1661))) - (4)), ((local10_sizer_size_1661) + (4)), ((local10_sizer_size_1661) + (4)), unref(local2_mx_ref_1643[0]), unref(local2_my_ref_1644[0]), 1, 1);
			__debugInfo = "1007:\ddgui.gbas";
			if (local3_col_1653) {
				__debugInfo = "1007:\ddgui.gbas";
				local2_c2_1635 = param10_ddgui_vals.attr14_col_hover_norm;
				__debugInfo = "1007:\ddgui.gbas";
			};
			__debugInfo = "1008:\ddgui.gbas";
			local1_i_1636 = ((((((local1_y_1631) + (local6_height_1633))) - (local10_sizer_size_1661))) - (3));
			__debugInfo = "1009:\ddgui.gbas";
			DRAWRECT(((((((local1_x_1630) + (local5_width_1632))) - (CAST2INT(((local10_sizer_size_1661) / (3)))))) - (5)), local1_i_1636, CAST2INT(((local10_sizer_size_1661) / (3))), 2, local2_c2_1635);
			__debugInfo = "1010:\ddgui.gbas";
			local1_i_1636+=CAST2INT(((local10_sizer_size_1661) / (3)));
			__debugInfo = "1011:\ddgui.gbas";
			DRAWRECT(((((((local1_x_1630) + (local5_width_1632))) - (CAST2INT(((((2) * (local10_sizer_size_1661))) / (3)))))) - (5)), local1_i_1636, CAST2INT(((((2) * (local10_sizer_size_1661))) / (3))), 2, local2_c2_1635);
			__debugInfo = "1012:\ddgui.gbas";
			local1_i_1636+=CAST2INT(((local10_sizer_size_1661) / (3)));
			__debugInfo = "1013:\ddgui.gbas";
			DRAWRECT(((((((local1_x_1630) + (local5_width_1632))) - (local10_sizer_size_1661))) - (5)), local1_i_1636, local10_sizer_size_1661, 2, local2_c2_1635);
			__debugInfo = "1014:\ddgui.gbas";
			if (local3_col_1653) {
				__debugInfo = "1014:\ddgui.gbas";
				local2_c2_1635 = param10_ddgui_vals.attr8_col_norm;
				__debugInfo = "1014:\ddgui.gbas";
			};
			__debugInfo = "1006:\ddgui.gbas";
		};
		__debugInfo = "1021:\ddgui.gbas";
		if (param10_is_current) {
			__debugInfo = "1019:\ddgui.gbas";
			static10_DDgui_show_intern_movemousex = local2_mx_ref_1643[0];
			__debugInfo = "1020:\ddgui.gbas";
			static10_DDgui_show_intern_movemousey = local2_my_ref_1644[0];
			__debugInfo = "1019:\ddgui.gbas";
		};
		__debugInfo = "1022:\ddgui.gbas";
		local1_x_1630+=3;
		__debugInfo = "1023:\ddgui.gbas";
		local1_y_1631+=3;
		__debugInfo = "1024:\ddgui.gbas";
		local4_ytop_1641+=3;
		__debugInfo = "1025:\ddgui.gbas";
		local5_yclip_1642+=3;
		__debugInfo = "1026:\ddgui.gbas";
		local5_width_1632+=-(6);
		__debugInfo = "1027:\ddgui.gbas";
		local6_height_1633+=-(6);
		__debugInfo = "1028:\ddgui.gbas";
		local4_ypos_ref_1640[0] = local1_y_1631;
		__debugInfo = "1029:\ddgui.gbas";
		local4_xpos_ref_1639[0] = local1_x_1630;
		__debugInfo = "1053:\ddgui.gbas";
		if (param10_is_current) {
			var local4_hgrp_1662 = 0;
			__debugInfo = "1033:\ddgui.gbas";
			param10_ddgui_vals.attr4_main.attr10_wscrollmax = MAX(0, ((((param10_ddgui_vals.attr10_realheight) - (local6_height_1633))) - (12)));
			__debugInfo = "1035:\ddgui.gbas";
			if (param10_ddgui_vals.attr4_main.attr10_wscrollmax) {
				__debugInfo = "1035:\ddgui.gbas";
				param10_ddgui_vals.attr4_main.attr10_wscrollmax+=24;
				__debugInfo = "1035:\ddgui.gbas";
			};
			__debugInfo = "1040:\ddgui.gbas";
			if (param10_ddgui_vals.attr9_scaleable) {
				__debugInfo = "1039:\ddgui.gbas";
				local4_hgrp_1662 = MAX(32, local10_sizer_size_1661);
				__debugInfo = "1039:\ddgui.gbas";
			};
			__debugInfo = "1052:\ddgui.gbas";
			if ((((param10_is_current) && (func21_DDgui_handlescrollbar(param10_ddgui_vals, param10_ddgui_vals.attr4_main, ((((local2_mx_ref_1643[0]) - (local1_x_1630))) + (10)), ((local2_my_ref_1644[0]) - (local1_y_1631)), local2_b1_1645, local2_b2_1646, ((local6_height_1633) - (local4_hgrp_1662))))) ? 1 : 0)) {
				__debugInfo = "1044:\ddgui.gbas";
				VIEWPORT(local1_x_1630, local1_y_1631, local5_width_1632, local6_height_1633);
				__debugInfo = "1045:\ddgui.gbas";
				func19_DDgui_drawscrollbar(param10_ddgui_vals, param10_ddgui_vals.attr4_main, local5_width_1632, ((local6_height_1633) - (local4_hgrp_1662)), local6_height_1633, 0);
				__debugInfo = "1046:\ddgui.gbas";
				VIEWPORT(0, 0, 0, 0);
				__debugInfo = "1048:\ddgui.gbas";
				local5_width_1632+=-(local10_sizer_size_1661);
				__debugInfo = "1049:\ddgui.gbas";
				local1_i_1636 = param10_ddgui_vals.attr4_main.attr7_wscroll;
				__debugInfo = "1050:\ddgui.gbas";
				local4_ypos_ref_1640[0] = ((local4_ypos_ref_1640[0]) - (local1_i_1636));
				__debugInfo = "1051:\ddgui.gbas";
				local4_ytop_1641 = ((local4_ytop_1641) - (local1_i_1636));
				__debugInfo = "1044:\ddgui.gbas";
			};
			__debugInfo = "1033:\ddgui.gbas";
		};
		__debugInfo = "1055:\ddgui.gbas";
		local7_dy_line_ref_1638[0] = 0;
		__debugInfo = "1059:\ddgui.gbas";
		if ((((BOUNDS(param10_ddgui_vals.attr9_draworder, 0)) != (BOUNDS(param10_ddgui_vals.attr7_widgets_ref[0], 0))) ? 1 : 0)) {
			__debugInfo = "1058:\ddgui.gbas";
			DEBUG((((((((("Draw order is messed up ") + (CAST2STRING(BOUNDS(param10_ddgui_vals.attr9_draworder, 0))))) + ("/"))) + (CAST2STRING(BOUNDS(param10_ddgui_vals.attr7_widgets_ref[0], 0))))) + ("\n")));
			__debugInfo = "1058:\ddgui.gbas";
		};
		__debugInfo = "1062:\ddgui.gbas";
		if ((((((GETTIMERALL()) - (static12_DDgui_show_intern_ToolTipDelay))) > (500)) ? 1 : 0)) {
			__debugInfo = "1062:\ddgui.gbas";
			local9_show_tips_1663 = 1;
			__debugInfo = "1062:\ddgui.gbas";
		};
		__debugInfo = "1065:\ddgui.gbas";
		local5_xclip_1664 = ((local4_xpos_ref_1639[0]) + (local5_width_1632));
		__debugInfo = "1066:\ddgui.gbas";
		local6_ybclip_1665 = ((local5_yclip_1642) + (local6_height_1633));
		__debugInfo = "1067:\ddgui.gbas";
		{
			var local2_od_ref_1666 = [0];
			__debugInfo = "1070:\ddgui.gbas";
			for (local2_od_ref_1666[0] = 0;toCheck(local2_od_ref_1666[0], ((BOUNDS(param10_ddgui_vals.attr9_draworder, 0)) - (1)), 1);local2_od_ref_1666[0] += 1) {
				__debugInfo = "1069:\ddgui.gbas";
				func24_DDgui_draw_widget_intern(param10_ddgui_vals, local2_od_ref_1666, local4_xpos_ref_1639, local4_ypos_ref_1640, local7_dy_line_ref_1638, local5_width_1632, param10_is_current, local7_spacing_1651, local5_xclip_1664, local5_yclip_1642, local6_ybclip_1665, unref(local2_mx_ref_1643[0]), unref(local2_my_ref_1644[0]), local2_b1_1645, local2_b2_1646, local1_x_1630, local1_y_1631, local9_show_tips_1663);
				__debugInfo = "1069:\ddgui.gbas";
			};
			__debugInfo = "1070:\ddgui.gbas";
		};
		__debugInfo = "1071:\ddgui.gbas";
		VIEWPORT(0, 0, 0, 0);
		__debugInfo = "1083:\ddgui.gbas";
		if ((((param10_is_current) == (0)) ? 1 : 0)) {
			__debugInfo = "1075:\ddgui.gbas";
			ALPHAMODE(-(0.5));
			__debugInfo = "1076:\ddgui.gbas";
			local1_x_1630 = param10_ddgui_vals.attr4_xpos;
			__debugInfo = "1077:\ddgui.gbas";
			local1_y_1631 = param10_ddgui_vals.attr4_ypos;
			__debugInfo = "1078:\ddgui.gbas";
			local5_width_1632 = param10_ddgui_vals.attr4_main.attr6_wwidth;
			__debugInfo = "1079:\ddgui.gbas";
			local6_height_1633 = param10_ddgui_vals.attr4_main.attr7_wheight;
			__debugInfo = "1080:\ddgui.gbas";
			if (local7_movable_1652) {
				__debugInfo = "1080:\ddgui.gbas";
				local6_height_1633+=((local14_caption_height_1660) + (4));
				__debugInfo = "1080:\ddgui.gbas";
			};
			__debugInfo = "1081:\ddgui.gbas";
			DRAWRECT(local1_x_1630, local1_y_1631, local5_width_1632, local6_height_1633, RGB(0, 0, 0));
			__debugInfo = "1082:\ddgui.gbas";
			ALPHAMODE(0);
			__debugInfo = "1075:\ddgui.gbas";
		};
		__debugInfo = "1084:\ddgui.gbas";
		SYSTEMPOINTER(1);
		__debugInfo = "1087:\ddgui.gbas";
		local6_height_1633 = ((((((local4_ypos_ref_1640[0]) + (local7_spacing_1651))) + (local7_dy_line_ref_1638[0]))) - (local4_ytop_1641));
		__debugInfo = "1088:\ddgui.gbas";
		if (param10_is_current) {
			__debugInfo = "1088:\ddgui.gbas";
			param10_ddgui_vals.attr10_realheight = local6_height_1633;
			__debugInfo = "1088:\ddgui.gbas";
		};
		__debugInfo = "1089:\ddgui.gbas";
		local6_retval_1667 = MAX(local6_height_1633, param10_ddgui_vals.attr4_main.attr7_wheight);
		__debugInfo = "1093:\ddgui.gbas";
		local1_x_1630 = param10_ddgui_vals.attr15_kick_intern_dlg;
		__debugInfo = "1094:\ddgui.gbas";
		param10_ddgui_vals.attr15_kick_intern_dlg = 0;
		__debugInfo = "1095:\ddgui.gbas";
		local10_KickId_Str_1668 = param10_ddgui_vals.attr18_kick_intern_id_Str;
		__debugInfo = "1097:\ddgui.gbas";
		{
			var local16___SelectHelper3__1669 = 0;
			__debugInfo = "1097:\ddgui.gbas";
			local16___SelectHelper3__1669 = local1_x_1630;
			__debugInfo = "1126:\ddgui.gbas";
			if ((((local16___SelectHelper3__1669) == (1)) ? 1 : 0)) {
				__debugInfo = "1099:\ddgui.gbas";
				local3_col_1653;
				__debugInfo = "1101:\ddgui.gbas";
				local3_col_1653 = func14_DDgui_ColorDlg(INT2STR(MID_Str(func13_DDgui_get_Str(local10_KickId_Str_1668, "TEXT"), 5, 64)));
				__debugInfo = "1102:\ddgui.gbas";
				func9_DDgui_set(local10_KickId_Str_1668, "TEXT", (("SPR_C") + (CAST2STRING(local3_col_1653))));
				__debugInfo = "1103:\ddgui.gbas";
				func9_DDgui_set(local10_KickId_Str_1668, "CLICKED", CAST2STRING(1));
				__debugInfo = "1099:\ddgui.gbas";
			} else if ((((local16___SelectHelper3__1669) == (2)) ? 1 : 0)) {
				var local11_bSingleText_1670 = 0, local9_bIsNumber_1671 = 0, local8_text_Str_1672 = "";
				__debugInfo = "1105:\ddgui.gbas";
				local11_bSingleText_1670 = 0;
				__debugInfo = "1106:\ddgui.gbas";
				local9_bIsNumber_1671 = 0;
				__debugInfo = "1107:\ddgui.gbas";
				if ((((func13_DDgui_get_Str(local10_KickId_Str_1668, "TYPE")) == ("SINGLETEXT")) ? 1 : 0)) {
					__debugInfo = "1107:\ddgui.gbas";
					local11_bSingleText_1670 = 1;
					__debugInfo = "1107:\ddgui.gbas";
				};
				__debugInfo = "1111:\ddgui.gbas";
				if ((((func13_DDgui_get_Str(local10_KickId_Str_1668, "TYPE")) == ("NUMBERTEXT")) ? 1 : 0)) {
					__debugInfo = "1109:\ddgui.gbas";
					local11_bSingleText_1670 = 1;
					__debugInfo = "1110:\ddgui.gbas";
					local9_bIsNumber_1671 = 1;
					__debugInfo = "1109:\ddgui.gbas";
				};
				__debugInfo = "1112:\ddgui.gbas";
				local8_text_Str_1672 = func15_DDgui_input_Str(func13_DDgui_get_Str(local10_KickId_Str_1668, "TEXT"), 0, 0, local11_bSingleText_1670, local9_bIsNumber_1671);
				__debugInfo = "1113:\ddgui.gbas";
				func9_DDgui_set(local10_KickId_Str_1668, "TEXT", local8_text_Str_1672);
				__debugInfo = "1105:\ddgui.gbas";
			} else if ((((local16___SelectHelper3__1669) == (3)) ? 1 : 0)) {
				var local3_scx_ref_1673 = [0], local3_scy_ref_1674 = [0], local4_isel_1675 = 0;
				__debugInfo = "1116:\ddgui.gbas";
				GETSCREENSIZE(local3_scx_ref_1673, local3_scy_ref_1674);
				__debugInfo = "1118:\ddgui.gbas";
				local4_isel_1675 = func24_DDgui_button_list_picker(MIN(((local3_scy_ref_1674[0]) - (16)), func9_DDgui_get(local10_KickId_Str_1668, "XPOS")), ~~(func9_DDgui_get(local10_KickId_Str_1668, "YPOS")), ~~(func9_DDgui_get(local10_KickId_Str_1668, "WIDTH")), MAX(16, ((local3_scy_ref_1674[0]) - (func9_DDgui_get(local10_KickId_Str_1668, "YPOS")))), func13_DDgui_get_Str(local10_KickId_Str_1668, "TEXT"), ~~(func9_DDgui_get(local10_KickId_Str_1668, "SELECT")));
				__debugInfo = "1122:\ddgui.gbas";
				if ((((local4_isel_1675) >= (0)) ? 1 : 0)) {
					__debugInfo = "1120:\ddgui.gbas";
					func9_DDgui_set(local10_KickId_Str_1668, "SELECT", CAST2STRING(local4_isel_1675));
					__debugInfo = "1121:\ddgui.gbas";
					func9_DDgui_set(local10_KickId_Str_1668, "CLICKED", CAST2STRING(1));
					__debugInfo = "1120:\ddgui.gbas";
				};
				__debugInfo = "1116:\ddgui.gbas";
			} else if ((((local16___SelectHelper3__1669) == (4)) ? 1 : 0)) {
				var local7_ret_Str_1676 = "";
				__debugInfo = "1124:\ddgui.gbas";
				local7_ret_Str_1676 = func20_DDgui_FileDialog_Str(1, "*.*", 0);
				__debugInfo = "1125:\ddgui.gbas";
				func9_DDgui_set(local10_KickId_Str_1668, "TEXT", local7_ret_Str_1676);
				__debugInfo = "1124:\ddgui.gbas";
			};
			__debugInfo = "1097:\ddgui.gbas";
		};
		__debugInfo = "1131:\ddgui.gbas";
		return tryClone(local6_retval_1667);
		__debugInfo = "1132:\ddgui.gbas";
		return 0;
		__debugInfo = "882:\ddgui.gbas";
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
		var local3_vpx_1695 = 0, local3_vpy_1696 = 0, local2_dx_1697 = 0, local2_dy_1698 = 0, local5_vptop_1700 = 0, local4_ytop_1701 = 0, alias3_wdg_ref_1702 = [new type9_DDGUI_WDG()];
		__debugInfo = "1156:\ddgui.gbas";
		alias3_wdg_ref_1702 = param10_ddgui_vals.attr7_widgets_ref[0].arrAccess(param10_ddgui_vals.attr9_draworder.arrAccess(param11_order_index_ref[0]).values[tmpPositionCache].attr5_index).values[tmpPositionCache] /* ALIAS */;
		__debugInfo = "1159:\ddgui.gbas";
		if (alias3_wdg_ref_1702[0].attr5_whide) {
			__debugInfo = "1159:\ddgui.gbas";
			return 1;
			__debugInfo = "1159:\ddgui.gbas";
		};
		__debugInfo = "1161:\ddgui.gbas";
		local2_dx_1697 = alias3_wdg_ref_1702[0].attr6_wwidth;
		__debugInfo = "1162:\ddgui.gbas";
		local2_dy_1698 = alias3_wdg_ref_1702[0].attr7_wheight;
		__debugInfo = "1171:\ddgui.gbas";
		if ((((((param4_xpos_ref[0]) + (local2_dx_1697))) > (((param5_width) + (param1_x)))) ? 1 : 0)) {
			__debugInfo = "1166:\ddgui.gbas";
			param4_xpos_ref[0] = param1_x;
			__debugInfo = "1167:\ddgui.gbas";
			param4_ypos_ref[0] = ((((param4_ypos_ref[0]) + (param7_dy_line_ref[0]))) + (param7_spacing));
			__debugInfo = "1168:\ddgui.gbas";
			param7_dy_line_ref[0] = local2_dy_1698;
			__debugInfo = "1170:\ddgui.gbas";
			if (((((((local2_dx_1697) >= (param5_width)) ? 1 : 0)) && ((((alias3_wdg_ref_1702[0].attr9_wtype_Str) == ("SPACER")) ? 1 : 0))) ? 1 : 0)) {
				__debugInfo = "1170:\ddgui.gbas";
				return 1;
				__debugInfo = "1170:\ddgui.gbas";
			};
			__debugInfo = "1166:\ddgui.gbas";
		};
		__debugInfo = "1177:\ddgui.gbas";
		if ((((((((((alias3_wdg_ref_1702[0].attr6_walign) == (0)) ? 1 : 0)) && ((((local2_dx_1697) < (param5_width)) ? 1 : 0))) ? 1 : 0)) && ((((param5_width) < (10000)) ? 1 : 0))) ? 1 : 0)) {
			__debugInfo = "1176:\ddgui.gbas";
			param4_xpos_ref[0] = ((param4_xpos_ref[0]) + (CAST2INT(((((((((param5_width) + (param1_x))) - (param4_xpos_ref[0]))) - (local2_dx_1697))) / (2)))));
			__debugInfo = "1176:\ddgui.gbas";
		};
		__debugInfo = "1181:\ddgui.gbas";
		if ((((((((((alias3_wdg_ref_1702[0].attr6_walign) > (0)) ? 1 : 0)) && ((((local2_dx_1697) < (param5_width)) ? 1 : 0))) ? 1 : 0)) && ((((param5_width) < (10000)) ? 1 : 0))) ? 1 : 0)) {
			__debugInfo = "1180:\ddgui.gbas";
			param4_xpos_ref[0] = ((((param1_x) + (param5_width))) - (local2_dx_1697));
			__debugInfo = "1180:\ddgui.gbas";
		};
		__debugInfo = "1183:\ddgui.gbas";
		//label: __DrawFrames__;
		__debugInfo = "1265:\ddgui.gbas";
		if ((((alias3_wdg_ref_1702[0].attr9_wtype_Str) == ("FRAME")) ? 1 : 0)) {
			var local6_border_1703 = 0, local13_dy_line_frame_ref_1704 = [0], local6_xstart_1705 = 0, local6_ystart_1706 = 0, local4_iord_ref_1709 = [0], local8_fr_width_1710 = 0, local6_wwidth_1711 = 0;
			__debugInfo = "1185:\ddgui.gbas";
			local6_border_1703 = 0;
			__debugInfo = "1186:\ddgui.gbas";
			if ((((local2_dx_1697) == (10000)) ? 1 : 0)) {
				__debugInfo = "1186:\ddgui.gbas";
				local6_border_1703 = 1;
				__debugInfo = "1186:\ddgui.gbas";
			};
			__debugInfo = "1187:\ddgui.gbas";
			local13_dy_line_frame_ref_1704[0] = 0;
			__debugInfo = "1188:\ddgui.gbas";
			local6_xstart_1705 = param4_xpos_ref[0];
			__debugInfo = "1189:\ddgui.gbas";
			local6_ystart_1706 = param4_ypos_ref[0];
			__debugInfo = "1227:\ddgui.gbas";
			if ((alias3_wdg_ref_1702[0].attr9_wtext_Str_ref[0]).length) {
				var local2_fx_ref_1707 = [0], local2_fy_ref_1708 = [0];
				__debugInfo = "1192:\ddgui.gbas";
				local6_border_1703 = 4;
				__debugInfo = "1194:\ddgui.gbas";
				GETFONTSIZE(local2_fx_ref_1707, local2_fy_ref_1708);
				__debugInfo = "1197:\ddgui.gbas";
				local3_vpx_1695 = alias3_wdg_ref_1702[0].attr6_wwidth;
				__debugInfo = "1198:\ddgui.gbas";
				local3_vpy_1696 = alias3_wdg_ref_1702[0].attr7_wheight;
				__debugInfo = "1199:\ddgui.gbas";
				local5_vptop_1700 = param4_ypos_ref[0];
				__debugInfo = "1201:\ddgui.gbas";
				local4_ytop_1701 = 0;
				__debugInfo = "1206:\ddgui.gbas";
				if ((((param4_ypos_ref[0]) < (param5_yclip)) ? 1 : 0)) {
					__debugInfo = "1203:\ddgui.gbas";
					local4_ytop_1701 = ((param4_ypos_ref[0]) - (param5_yclip));
					__debugInfo = "1204:\ddgui.gbas";
					local5_vptop_1700+=-(local4_ytop_1701);
					__debugInfo = "1205:\ddgui.gbas";
					local3_vpy_1696+=local4_ytop_1701;
					__debugInfo = "1203:\ddgui.gbas";
				};
				__debugInfo = "1207:\ddgui.gbas";
				if ((((((local3_vpx_1695) + (param4_xpos_ref[0]))) > (param5_xclip)) ? 1 : 0)) {
					__debugInfo = "1207:\ddgui.gbas";
					local3_vpx_1695 = ((param5_xclip) - (param4_xpos_ref[0]));
					__debugInfo = "1207:\ddgui.gbas";
				};
				__debugInfo = "1208:\ddgui.gbas";
				if ((((((local3_vpy_1696) + (local5_vptop_1700))) > (param6_ybclip)) ? 1 : 0)) {
					__debugInfo = "1208:\ddgui.gbas";
					local3_vpy_1696 = ((param6_ybclip) - (local5_vptop_1700));
					__debugInfo = "1208:\ddgui.gbas";
				};
				__debugInfo = "1220:\ddgui.gbas";
				if (((((((local3_vpx_1695) > (0)) ? 1 : 0)) && ((((local3_vpy_1696) > (0)) ? 1 : 0))) ? 1 : 0)) {
					__debugInfo = "1212:\ddgui.gbas";
					VIEWPORT(unref(param4_xpos_ref[0]), local5_vptop_1700, local3_vpx_1695, local3_vpy_1696);
					__debugInfo = "1214:\ddgui.gbas";
					ALPHAMODE(-(0.5));
					__debugInfo = "1215:\ddgui.gbas";
					func14_DDgui_backrect(1, ((((local4_ytop_1701) + (CAST2INT(((local2_fy_ref_1708[0]) / (2)))))) + (1)), ((alias3_wdg_ref_1702[0].attr6_wwidth) - (2)), ((((alias3_wdg_ref_1702[0].attr7_wheight) - (CAST2INT(((local2_fy_ref_1708[0]) / (2)))))) - (2)), param10_ddgui_vals.attr8_col_norm);
					__debugInfo = "1216:\ddgui.gbas";
					ALPHAMODE(0);
					__debugInfo = "1217:\ddgui.gbas";
					func14_DDgui_backrect(0, ((local4_ytop_1701) + (CAST2INT(((local2_fy_ref_1708[0]) / (2))))), alias3_wdg_ref_1702[0].attr6_wwidth, ((alias3_wdg_ref_1702[0].attr7_wheight) - (CAST2INT(((local2_fy_ref_1708[0]) / (2))))), param10_ddgui_vals.attr8_col_norm);
					__debugInfo = "1218:\ddgui.gbas";
					DRAWRECT(local6_border_1703, local4_ytop_1701, ((((local6_border_1703) * (4))) + (func21_DDGui_TextWidthIntern(alias3_wdg_ref_1702[0].attr9_wtext_Str_ref))), unref(local2_fy_ref_1708[0]), param10_ddgui_vals.attr10_col_bright);
					__debugInfo = "1219:\ddgui.gbas";
					func17_DDGui_PrintIntern(alias3_wdg_ref_1702[0].attr9_wtext_Str_ref, ((local6_border_1703) * (2)), local4_ytop_1701, 0);
					__debugInfo = "1212:\ddgui.gbas";
				};
				__debugInfo = "1222:\ddgui.gbas";
				param4_ypos_ref[0]+=((local2_fy_ref_1708[0]) + (local6_border_1703));
				__debugInfo = "1223:\ddgui.gbas";
				param4_xpos_ref[0]+=local6_border_1703;
				__debugInfo = "1224:\ddgui.gbas";
				param4_ypos_ref[0]+=local6_border_1703;
				__debugInfo = "1225:\ddgui.gbas";
				local6_xstart_1705+=local6_border_1703;
				__debugInfo = "1192:\ddgui.gbas";
			};
			__debugInfo = "1231:\ddgui.gbas";
			local8_fr_width_1710 = 0;
			__debugInfo = "1235:\ddgui.gbas";
			local6_wwidth_1711 = alias3_wdg_ref_1702[0].attr6_wwidth;
			__debugInfo = "1236:\ddgui.gbas";
			if ((((local6_wwidth_1711) < (10000)) ? 1 : 0)) {
				__debugInfo = "1236:\ddgui.gbas";
				local6_wwidth_1711+=-(((2) * (local6_border_1703)));
				__debugInfo = "1236:\ddgui.gbas";
			};
			__debugInfo = "1236:\ddgui.gbas";
			{
				__debugInfo = "1252:\ddgui.gbas";
				for (local4_iord_ref_1709[0] = ((param11_order_index_ref[0]) + (1));toCheck(local4_iord_ref_1709[0], ((BOUNDS(param10_ddgui_vals.attr9_draworder, 0)) - (1)), 1);local4_iord_ref_1709[0] += 1) {
					var local9_simplewdg_1712 = 0, local4_icur_1713 = 0;
					__debugInfo = "1239:\ddgui.gbas";
					local4_icur_1713 = local4_iord_ref_1709[0];
					__debugInfo = "1244:\ddgui.gbas";
					local9_simplewdg_1712 = func24_DDgui_draw_widget_intern(param10_ddgui_vals, local4_iord_ref_1709, param4_xpos_ref, param4_ypos_ref, local13_dy_line_frame_ref_1704, local6_wwidth_1711, param10_is_current, param7_spacing, param5_xclip, param5_yclip, param6_ybclip, param2_mx, param2_my, param2_b1, param2_b2, local6_xstart_1705, local6_ystart_1706, param9_show_tips);
					__debugInfo = "1247:\ddgui.gbas";
					local8_fr_width_1710 = MAX(local8_fr_width_1710, ((param4_xpos_ref[0]) - (local6_xstart_1705)));
					__debugInfo = "1251:\ddgui.gbas";
					if ((((local9_simplewdg_1712) == (0)) ? 1 : 0)) {
						__debugInfo = "1249:\ddgui.gbas";
						param11_order_index_ref[0] = local4_iord_ref_1709[0];
						__debugInfo = "1250:\ddgui.gbas";
						break;
						__debugInfo = "1249:\ddgui.gbas";
					};
					__debugInfo = "1239:\ddgui.gbas";
				};
				__debugInfo = "1252:\ddgui.gbas";
			};
			__debugInfo = "1257:\ddgui.gbas";
			if ((((alias3_wdg_ref_1702[0].attr6_wwidth) == (10000)) ? 1 : 0)) {
				__debugInfo = "1255:\ddgui.gbas";
				alias3_wdg_ref_1702[0].attr6_wwidth = ((local8_fr_width_1710) + (((2) * (local6_border_1703))));
				__debugInfo = "1256:\ddgui.gbas";
				local2_dx_1697 = alias3_wdg_ref_1702[0].attr6_wwidth;
				__debugInfo = "1255:\ddgui.gbas";
			};
			__debugInfo = "1259:\ddgui.gbas";
			alias3_wdg_ref_1702[0].attr7_wheight = ((((((param4_ypos_ref[0]) - (local6_ystart_1706))) + (local13_dy_line_frame_ref_1704[0]))) + (((local6_border_1703) * (2))));
			__debugInfo = "1260:\ddgui.gbas";
			param4_xpos_ref[0] = local6_xstart_1705;
			__debugInfo = "1261:\ddgui.gbas";
			param4_ypos_ref[0] = local6_ystart_1706;
			__debugInfo = "1185:\ddgui.gbas";
		} else if ((((alias3_wdg_ref_1702[0].attr9_wtype_Str) == ("UNFRAME")) ? 1 : 0)) {
			__debugInfo = "1264:\ddgui.gbas";
			return tryClone(0);
			__debugInfo = "1264:\ddgui.gbas";
		};
		__debugInfo = "1268:\ddgui.gbas";
		if (param10_is_current) {
			__debugInfo = "1268:\ddgui.gbas";
			func18_DDgui_handlewidget(param10_ddgui_vals, unref(alias3_wdg_ref_1702[0]), ((param2_mx) - (param4_xpos_ref[0])), ((param2_my) - (param4_ypos_ref[0])), param2_b1, param2_b2);
			__debugInfo = "1268:\ddgui.gbas";
		};
		__debugInfo = "1270:\ddgui.gbas";
		local3_vpx_1695 = local2_dx_1697;
		__debugInfo = "1271:\ddgui.gbas";
		local3_vpy_1696 = local2_dy_1698;
		__debugInfo = "1272:\ddgui.gbas";
		local5_vptop_1700 = param4_ypos_ref[0];
		__debugInfo = "1273:\ddgui.gbas";
		local4_ytop_1701 = 0;
		__debugInfo = "1278:\ddgui.gbas";
		if ((((param4_ypos_ref[0]) < (param5_yclip)) ? 1 : 0)) {
			__debugInfo = "1275:\ddgui.gbas";
			local4_ytop_1701 = ((param4_ypos_ref[0]) - (param5_yclip));
			__debugInfo = "1276:\ddgui.gbas";
			local5_vptop_1700+=-(local4_ytop_1701);
			__debugInfo = "1277:\ddgui.gbas";
			local3_vpy_1696+=local4_ytop_1701;
			__debugInfo = "1275:\ddgui.gbas";
		};
		__debugInfo = "1279:\ddgui.gbas";
		if ((((((local3_vpx_1695) + (param4_xpos_ref[0]))) > (param5_xclip)) ? 1 : 0)) {
			__debugInfo = "1279:\ddgui.gbas";
			local3_vpx_1695 = ((param5_xclip) - (param4_xpos_ref[0]));
			__debugInfo = "1279:\ddgui.gbas";
		};
		__debugInfo = "1280:\ddgui.gbas";
		if ((((((local3_vpy_1696) + (local5_vptop_1700))) > (param6_ybclip)) ? 1 : 0)) {
			__debugInfo = "1280:\ddgui.gbas";
			local3_vpy_1696 = ((param6_ybclip) - (local5_vptop_1700));
			__debugInfo = "1280:\ddgui.gbas";
		};
		__debugInfo = "1283:\ddgui.gbas";
		alias3_wdg_ref_1702[0].attr5_wxpos = param4_xpos_ref[0];
		__debugInfo = "1284:\ddgui.gbas";
		alias3_wdg_ref_1702[0].attr5_wypos = local5_vptop_1700;
		__debugInfo = "1290:\ddgui.gbas";
		if (((((((local3_vpx_1695) > (0)) ? 1 : 0)) && ((((local3_vpy_1696) > (0)) ? 1 : 0))) ? 1 : 0)) {
			__debugInfo = "1288:\ddgui.gbas";
			VIEWPORT(unref(param4_xpos_ref[0]), local5_vptop_1700, local3_vpx_1695, local3_vpy_1696);
			__debugInfo = "1289:\ddgui.gbas";
			func16_DDgui_drawwidget(param10_ddgui_vals, unref(alias3_wdg_ref_1702[0]), local4_ytop_1701);
			__debugInfo = "1288:\ddgui.gbas";
		};
		__debugInfo = "1342:\ddgui.gbas";
		if (((((((param9_show_tips) && (alias3_wdg_ref_1702[0].attr6_whover)) ? 1 : 0)) && ((alias3_wdg_ref_1702[0].attr11_tiptext_Str_ref[0]).length)) ? 1 : 0)) {
			var local4_boxx_ref_1714 = [0.0], local4_boxy_ref_1715 = [0.0], local5_frame_1716 = 0, local5_truew_1717 = 0, local12_is_multiline_1718 = 0;
			__debugInfo = "1295:\ddgui.gbas";
			local5_frame_1716 = 1;
			__debugInfo = "1296:\ddgui.gbas";
			VIEWPORT(0, 0, 0, 0);
			__debugInfo = "1297:\ddgui.gbas";
			GETFONTSIZE(local4_boxx_ref_1714, local4_boxy_ref_1715);
			__debugInfo = "1301:\ddgui.gbas";
			local12_is_multiline_1718 = INSTR(unref(alias3_wdg_ref_1702[0].attr11_tiptext_Str_ref[0]), "\n", 0);
			__debugInfo = "1316:\ddgui.gbas";
			if ((((local12_is_multiline_1718) != (-(1))) ? 1 : 0)) {
				__debugInfo = "1303:\ddgui.gbas";
				SPLITSTR(unref(alias3_wdg_ref_1702[0].attr11_tiptext_Str_ref[0]), unref(static9_DDgui_draw_widget_intern_lines_Str), "\n", 1);
				__debugInfo = "1304:\ddgui.gbas";
				local4_boxy_ref_1715[0] = ((local4_boxy_ref_1715[0]) * (BOUNDS(static9_DDgui_draw_widget_intern_lines_Str, 0)));
				__debugInfo = "1306:\ddgui.gbas";
				local5_truew_1717 = 0;
				__debugInfo = "1309:\ddgui.gbas";
				var forEachSaver3970 = static9_DDgui_draw_widget_intern_lines_Str;
				for(var forEachCounter3970 = 0 ; forEachCounter3970 < forEachSaver3970.values.length ; forEachCounter3970++) {
					var local5_l_Str_1719 = forEachSaver3970.values[forEachCounter3970];
				{
						__debugInfo = "1308:\ddgui.gbas";
						local5_truew_1717 = MAX(local5_truew_1717, func21_DDGui_TextWidthIntern(local5_l_Str_1719));
						__debugInfo = "1308:\ddgui.gbas";
					}
					forEachSaver3970.values[forEachCounter3970] = local5_l_Str_1719;
				
				};
				__debugInfo = "1310:\ddgui.gbas";
				local4_boxx_ref_1714[0] = local5_truew_1717;
				__debugInfo = "1303:\ddgui.gbas";
			} else {
				__debugInfo = "1312:\ddgui.gbas";
				local5_truew_1717 = func21_DDGui_TextWidthIntern(alias3_wdg_ref_1702[0].attr11_tiptext_Str_ref);
				__debugInfo = "1313:\ddgui.gbas";
				local4_boxx_ref_1714[0] = MAX(local3_vpx_1695, local5_truew_1717);
				__debugInfo = "1314:\ddgui.gbas";
				DIM(static9_DDgui_draw_widget_intern_lines_Str, [1], "");
				__debugInfo = "1315:\ddgui.gbas";
				static9_DDgui_draw_widget_intern_lines_Str.arrAccess(0).values[tmpPositionCache] = alias3_wdg_ref_1702[0].attr11_tiptext_Str_ref[0];
				__debugInfo = "1312:\ddgui.gbas";
			};
			__debugInfo = "1317:\ddgui.gbas";
			param1_x;
			__debugInfo = "1318:\ddgui.gbas";
			param1_y;
			__debugInfo = "1319:\ddgui.gbas";
			param1_x = MAX(0, ((((param4_xpos_ref[0]) + (((((local3_vpx_1695) - (local4_boxx_ref_1714[0]))) / (2))))) - (local5_frame_1716)));
			__debugInfo = "1320:\ddgui.gbas";
			param1_y = MAX(0, ((((param4_ypos_ref[0]) - (local4_boxy_ref_1715[0]))) - (((local5_frame_1716) * (2)))));
			__debugInfo = "1322:\ddgui.gbas";
			param1_y+=-(global25_gDDguiMinControlDimension);
			__debugInfo = "1323:\ddgui.gbas";
			if ((((param1_y) < (0)) ? 1 : 0)) {
				__debugInfo = "1323:\ddgui.gbas";
				param1_y = 0;
				__debugInfo = "1323:\ddgui.gbas";
			};
			__debugInfo = "1325:\ddgui.gbas";
			ALPHAMODE(-(0.8));
			__debugInfo = "1326:\ddgui.gbas";
			DRAWRECT(param1_x, param1_y, ((local4_boxx_ref_1714[0]) + (((local5_frame_1716) * (2)))), ((local4_boxy_ref_1715[0]) + (((local5_frame_1716) * (2)))), param10_ddgui_vals.attr16_col_hover_bright);
			__debugInfo = "1327:\ddgui.gbas";
			ALPHAMODE(0);
			__debugInfo = "1328:\ddgui.gbas";
			func14_DDgui_backrect(param1_x, param1_y, ~~(((local4_boxx_ref_1714[0]) + (((local5_frame_1716) * (2))))), ~~(((local4_boxy_ref_1715[0]) + (((local5_frame_1716) * (2))))), param10_ddgui_vals.attr8_col_norm);
			__debugInfo = "1330:\ddgui.gbas";
			param1_x+=local5_frame_1716;
			__debugInfo = "1331:\ddgui.gbas";
			param1_y+=local5_frame_1716;
			__debugInfo = "1341:\ddgui.gbas";
			if (BOUNDS(static9_DDgui_draw_widget_intern_lines_Str, 0)) {
				var local1_w_ref_1720 = [0], local1_h_ref_1721 = [0];
				__debugInfo = "1334:\ddgui.gbas";
				GETFONTSIZE(local1_w_ref_1720, local1_h_ref_1721);
				__debugInfo = "1338:\ddgui.gbas";
				var forEachSaver4127 = static9_DDgui_draw_widget_intern_lines_Str;
				for(var forEachCounter4127 = 0 ; forEachCounter4127 < forEachSaver4127.values.length ; forEachCounter4127++) {
					var local5_l_Str_1722 = forEachSaver4127.values[forEachCounter4127];
				{
						__debugInfo = "1336:\ddgui.gbas";
						func17_DDGui_PrintIntern(local5_l_Str_1722, ~~(((param1_x) + (((((local4_boxx_ref_1714[0]) - (func21_DDGui_TextWidthIntern(local5_l_Str_1722)))) / (2))))), param1_y, 0);
						__debugInfo = "1337:\ddgui.gbas";
						param1_y+=local1_h_ref_1721[0];
						__debugInfo = "1336:\ddgui.gbas";
					}
					forEachSaver4127.values[forEachCounter4127] = local5_l_Str_1722;
				
				};
				__debugInfo = "1334:\ddgui.gbas";
			} else {
				__debugInfo = "1340:\ddgui.gbas";
				func17_DDGui_PrintIntern(alias3_wdg_ref_1702[0].attr11_tiptext_Str_ref, ~~(((param1_x) + (((((local4_boxx_ref_1714[0]) - (local5_truew_1717))) / (2))))), param1_y, 0);
				__debugInfo = "1340:\ddgui.gbas";
			};
			__debugInfo = "1295:\ddgui.gbas";
		};
		__debugInfo = "1344:\ddgui.gbas";
		param4_xpos_ref[0] = ((((param4_xpos_ref[0]) + (local3_vpx_1695))) + (param7_spacing));
		__debugInfo = "1345:\ddgui.gbas";
		if ((((param7_dy_line_ref[0]) < (local2_dy_1698)) ? 1 : 0)) {
			__debugInfo = "1345:\ddgui.gbas";
			param7_dy_line_ref[0] = local2_dy_1698;
			__debugInfo = "1345:\ddgui.gbas";
		};
		__debugInfo = "1347:\ddgui.gbas";
		return 1;
		__debugInfo = "1348:\ddgui.gbas";
		return 0;
		__debugInfo = "1156:\ddgui.gbas";
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
		var local1_i_2242 = 0, local6_id_Str_2243 = "", local3_scx_ref_2244 = [0], local3_scy_ref_2245 = [0];
		__debugInfo = "1358:\ddgui.gbas";
		GETSCREENSIZE(local3_scx_ref_2244, local3_scy_ref_2245);
		__debugInfo = "1364:\ddgui.gbas";
		if (((((((param5_width) > (0)) ? 1 : 0)) && ((((param6_height) > (0)) ? 1 : 0))) ? 1 : 0)) {
			__debugInfo = "1360:\ddgui.gbas";
			func9_DDgui_set("", "XPOS", CAST2STRING(param1_x));
			__debugInfo = "1361:\ddgui.gbas";
			func9_DDgui_set("", "YPOS", CAST2STRING(param1_y));
			__debugInfo = "1362:\ddgui.gbas";
			if ((((param5_width) > (0)) ? 1 : 0)) {
				__debugInfo = "1362:\ddgui.gbas";
				func9_DDgui_set("", "WIDTH", CAST2STRING(MIN(unref(local3_scx_ref_2244[0]), param5_width)));
				__debugInfo = "1362:\ddgui.gbas";
			};
			__debugInfo = "1363:\ddgui.gbas";
			if ((((param6_height) > (0)) ? 1 : 0)) {
				__debugInfo = "1363:\ddgui.gbas";
				func9_DDgui_set("", "HEIGHT", CAST2STRING(MIN(unref(local3_scy_ref_2245[0]), param6_height)));
				__debugInfo = "1363:\ddgui.gbas";
			};
			__debugInfo = "1360:\ddgui.gbas";
		};
		__debugInfo = "1368:\ddgui.gbas";
		var forEachSaver14129 = global11_ddgui_stack_ref[0].arrAccess(-(1)).values[tmpPositionCache][0].attr7_widgets_ref[0];
		for(var forEachCounter14129 = 0 ; forEachCounter14129 < forEachSaver14129.values.length ; forEachCounter14129++) {
			var local3_wdg_ref_2246 = forEachSaver14129.values[forEachCounter14129];
		{
				__debugInfo = "1367:\ddgui.gbas";
				func18_DDgui_handlewidget(unref(global11_ddgui_stack_ref[0].arrAccess(-(1)).values[tmpPositionCache][0]), unref(local3_wdg_ref_2246[0]), -(1), -(1), 0, 0);
				__debugInfo = "1367:\ddgui.gbas";
			}
			forEachSaver14129.values[forEachCounter14129] = local3_wdg_ref_2246;
		
		};
		__debugInfo = "1369:\ddgui.gbas";
		return 0;
		__debugInfo = "1358:\ddgui.gbas";
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
		__debugInfo = "1376:\ddgui.gbas";
		func9_DDgui_set(param6_id_Str, "HIDE", CAST2STRING(param5_bHide));
		__debugInfo = "1394:\ddgui.gbas";
		if ((((func13_DDgui_get_Str(param6_id_Str, "TYPE")) == ("FRAME")) ? 1 : 0)) {
			var local2_od_2249 = 0, local7_inframe_2250 = 0;
			__debugInfo = "1380:\ddgui.gbas";
			{
				__debugInfo = "1393:\ddgui.gbas";
				for (local2_od_2249 = 0;toCheck(local2_od_2249, ((BOUNDS(global11_ddgui_stack_ref[0].arrAccess(-(1)).values[tmpPositionCache][0].attr9_draworder, 0)) - (1)), 1);local2_od_2249 += 1) {
					__debugInfo = "1382:\ddgui.gbas";
					if (((((((local7_inframe_2250) == (0)) ? 1 : 0)) && ((((global11_ddgui_stack_ref[0].arrAccess(-(1)).values[tmpPositionCache][0].attr9_draworder.arrAccess(local2_od_2249).values[tmpPositionCache].attr6_id_Str_ref[0]) == (param6_id_Str)) ? 1 : 0))) ? 1 : 0)) {
						__debugInfo = "1382:\ddgui.gbas";
						local7_inframe_2250+=1;
						__debugInfo = "1382:\ddgui.gbas";
					};
					__debugInfo = "1392:\ddgui.gbas";
					if (local7_inframe_2250) {
						var alias3_wdg_ref_2251 = [new type9_DDGUI_WDG()];
						__debugInfo = "1384:\ddgui.gbas";
						alias3_wdg_ref_2251 = global11_ddgui_stack_ref[0].arrAccess(-(1)).values[tmpPositionCache][0].attr7_widgets_ref[0].arrAccess(global11_ddgui_stack_ref[0].arrAccess(-(1)).values[tmpPositionCache][0].attr9_draworder.arrAccess(local2_od_2249).values[tmpPositionCache].attr5_index).values[tmpPositionCache] /* ALIAS */;
						__debugInfo = "1388:\ddgui.gbas";
						if ((((alias3_wdg_ref_2251[0].attr9_wtype_Str) == ("UNFRAME")) ? 1 : 0)) {
							__debugInfo = "1386:\ddgui.gbas";
							local7_inframe_2250+=-1;
							__debugInfo = "1387:\ddgui.gbas";
							if ((((local7_inframe_2250) < (2)) ? 1 : 0)) {
								__debugInfo = "1387:\ddgui.gbas";
								break;
								__debugInfo = "1387:\ddgui.gbas";
							};
							__debugInfo = "1386:\ddgui.gbas";
						};
						__debugInfo = "1389:\ddgui.gbas";
						if ((((alias3_wdg_ref_2251[0].attr9_wtype_Str) == ("FRAME")) ? 1 : 0)) {
							__debugInfo = "1389:\ddgui.gbas";
							local7_inframe_2250+=1;
							__debugInfo = "1389:\ddgui.gbas";
						};
						__debugInfo = "1390:\ddgui.gbas";
						alias3_wdg_ref_2251[0].attr5_whide = param5_bHide;
						__debugInfo = "1391:\ddgui.gbas";
						if (param5_bHide) {
							__debugInfo = "1391:\ddgui.gbas";
							alias3_wdg_ref_2251[0].attr8_wclicked = 0;
							__debugInfo = "1391:\ddgui.gbas";
						};
						__debugInfo = "1384:\ddgui.gbas";
					};
					__debugInfo = "1382:\ddgui.gbas";
				};
				__debugInfo = "1393:\ddgui.gbas";
			};
			__debugInfo = "1380:\ddgui.gbas";
		};
		__debugInfo = "1395:\ddgui.gbas";
		return 0;
		__debugInfo = "1376:\ddgui.gbas";
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
		__debugInfo = "1407:\ddgui.gbas";
		func13_DDgui_backgnd(RGB(0, 0, 0), RGB(255, 255, 255), 0, 0, param5_width, param6_height);
		__debugInfo = "1408:\ddgui.gbas";
		PRINT((("user: id=") + (param6_id_Str_ref[0])), 0, 0, 0);
		__debugInfo = "1409:\ddgui.gbas";
		return 0;
		__debugInfo = "1407:\ddgui.gbas";
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
		__debugInfo = "1415:\ddgui.gbas";
		VIEWPORT(0, 0, 0, 0);
		__debugInfo = "1416:\ddgui.gbas";
		DRAWRECT(0, 0, 1024, 1024, RGB(255, 128, 64));
		__debugInfo = "1417:\ddgui.gbas";
		PRINT("Must overwrite: ddgui_handle_user", 0, 0, 0);
		__debugInfo = "1418:\ddgui.gbas";
		PRINT((("for item: ") + (param6_id_Str_ref[0])), 0, 20, 0);
		__debugInfo = "1419:\ddgui.gbas";
		PRINT((("type=") + (func13_DDgui_get_Str(unref(param6_id_Str_ref[0]), "TYPE"))), 0, 40, 0);
		__debugInfo = "1420:\ddgui.gbas";
		SHOWSCREEN();
		__debugInfo = "1423:\ddgui.gbas";
		return 0;
		__debugInfo = "1415:\ddgui.gbas";
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
		__debugInfo = "1459:\ddgui.gbas";
		DRAWRECT(((param1_x) + (1)), param1_y, ((param2_dx) - (2)), 1, param3_col);
		__debugInfo = "1460:\ddgui.gbas";
		DRAWRECT(param1_x, ((param1_y) + (1)), 1, ((param2_dy) - (2)), param3_col);
		__debugInfo = "1461:\ddgui.gbas";
		DRAWRECT(((((param1_x) + (param2_dx))) - (1)), ((param1_y) + (1)), 1, ((param2_dy) - (2)), param3_col);
		__debugInfo = "1462:\ddgui.gbas";
		DRAWRECT(((param1_x) + (1)), ((((param1_y) + (param2_dy))) - (1)), ((param2_dx) - (2)), 1, param3_col);
		__debugInfo = "1464:\ddgui.gbas";
		return 0;
		__debugInfo = "1459:\ddgui.gbas";
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
		__debugInfo = "1493:\ddgui.gbas";
		if ((((static7_DDgui_backgnd_QuickGL) == (-(1))) ? 1 : 0)) {
			__debugInfo = "1492:\ddgui.gbas";
			if ((((INTEGER(FLOAT2STR(PLATFORMINFO_Str("GLEXT:glDrawRangeElements")))) != (0)) ? 1 : 0)) {
				__debugInfo = "1486:\ddgui.gbas";
				static7_DDgui_backgnd_QuickGL = 1;
				__debugInfo = "1486:\ddgui.gbas";
			} else {
				__debugInfo = "1488:\ddgui.gbas";
				static7_DDgui_backgnd_QuickGL = 0;
				__debugInfo = "1488:\ddgui.gbas";
			};
			__debugInfo = "1492:\ddgui.gbas";
		};
		__debugInfo = "1499:\ddgui.gbas";
		if ((((param4_col1) == (param4_col2)) ? 1 : 0)) {
			__debugInfo = "1497:\ddgui.gbas";
			DRAWRECT(param1_x, param1_y, param2_dx, param2_dy, param4_col1);
			__debugInfo = "1498:\ddgui.gbas";
			return 0;
			__debugInfo = "1497:\ddgui.gbas";
		};
		__debugInfo = "1529:\ddgui.gbas";
		if (static7_DDgui_backgnd_QuickGL) {
			var local4_hpos_1735 = 0.0;
			__debugInfo = "1502:\ddgui.gbas";
			local4_hpos_1735 = 0.35;
			__debugInfo = "1503:\ddgui.gbas";
			STARTPOLY(-(1), 2);
			__debugInfo = "1518:\ddgui.gbas";
			if ((((param2_dx) >= (((param2_dy) * (0.65)))) ? 1 : 0)) {
				__debugInfo = "1505:\ddgui.gbas";
				POLYVECTOR(((param1_x) + (param2_dx)), param1_y, 0, 0, param4_col1);
				__debugInfo = "1506:\ddgui.gbas";
				POLYVECTOR(param1_x, param1_y, 0, 0, param4_col1);
				__debugInfo = "1507:\ddgui.gbas";
				POLYVECTOR(((param1_x) + (param2_dx)), ((param1_y) + (((param2_dy) * (local4_hpos_1735)))), 0, 0, param4_col2);
				__debugInfo = "1508:\ddgui.gbas";
				POLYVECTOR(param1_x, ((param1_y) + (((param2_dy) * (local4_hpos_1735)))), 0, 0, param4_col2);
				__debugInfo = "1509:\ddgui.gbas";
				POLYVECTOR(((param1_x) + (param2_dx)), ((param1_y) + (param2_dy)), 0, 0, param4_col2);
				__debugInfo = "1510:\ddgui.gbas";
				POLYVECTOR(param1_x, ((param1_y) + (param2_dy)), 0, 0, param4_col2);
				__debugInfo = "1505:\ddgui.gbas";
			} else {
				__debugInfo = "1512:\ddgui.gbas";
				POLYVECTOR(param1_x, param1_y, 0, 0, param4_col1);
				__debugInfo = "1513:\ddgui.gbas";
				POLYVECTOR(param1_x, ((param1_y) + (param2_dy)), 0, 0, param4_col1);
				__debugInfo = "1514:\ddgui.gbas";
				POLYVECTOR(((param1_x) + (((param2_dx) * (local4_hpos_1735)))), param1_y, 0, 0, param4_col2);
				__debugInfo = "1515:\ddgui.gbas";
				POLYVECTOR(((param1_x) + (((param2_dx) * (local4_hpos_1735)))), ((param1_y) + (param2_dy)), 0, 0, param4_col2);
				__debugInfo = "1516:\ddgui.gbas";
				POLYVECTOR(((param1_x) + (param2_dx)), param1_y, 0, 0, param4_col2);
				__debugInfo = "1517:\ddgui.gbas";
				POLYVECTOR(((param1_x) + (param2_dx)), ((param1_y) + (param2_dy)), 0, 0, param4_col1);
				__debugInfo = "1512:\ddgui.gbas";
			};
			__debugInfo = "1519:\ddgui.gbas";
			ENDPOLY();
			__debugInfo = "1502:\ddgui.gbas";
		} else {
			var local4_hpos_1736 = 0.0;
			__debugInfo = "1521:\ddgui.gbas";
			local4_hpos_1736 = 0.35;
			__debugInfo = "1528:\ddgui.gbas";
			if ((((param2_dx) >= (((param2_dy) * (0.65)))) ? 1 : 0)) {
				__debugInfo = "1523:\ddgui.gbas";
				DRAWRECT(param1_x, param1_y, param2_dx, ((param2_dy) * (local4_hpos_1736)), param4_col1);
				__debugInfo = "1524:\ddgui.gbas";
				DRAWRECT(param1_x, ((param1_y) + (((param2_dy) * (local4_hpos_1736)))), param2_dx, ((((param2_dy) * (((1) - (local4_hpos_1736))))) + (0.99)), param4_col2);
				__debugInfo = "1523:\ddgui.gbas";
			} else {
				__debugInfo = "1526:\ddgui.gbas";
				DRAWRECT(param1_x, param1_y, ((param2_dx) * (local4_hpos_1736)), param2_dy, param4_col1);
				__debugInfo = "1527:\ddgui.gbas";
				DRAWRECT(((param1_x) + (((param2_dx) * (local4_hpos_1736)))), param1_y, ((((param2_dx) * (((1) - (local4_hpos_1736))))) + (0.99)), param2_dy, param4_col2);
				__debugInfo = "1526:\ddgui.gbas";
			};
			__debugInfo = "1521:\ddgui.gbas";
		};
		__debugInfo = "1530:\ddgui.gbas";
		return 0;
		__debugInfo = "1493:\ddgui.gbas";
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
		var local5_count_1741 = 0, local2_fx_ref_1742 = [0], local2_fy_ref_1743 = [0], local3_wdg_1744 = new type9_DDGUI_WDG(), local1_i_1745 = 0;
		var local6_id_Str_ref_1737 = [param6_id_Str]; /* NEWCODEHERE */
		var local11_caption_Str_ref_1738 = [param11_caption_Str]; /* NEWCODEHERE */
		__debugInfo = "1544:\ddgui.gbas";
		local5_count_1741 = ((1) + (BOUNDS(global11_ddgui_stack_ref[0].arrAccess(-(1)).values[tmpPositionCache][0].attr7_widgets_ref[0], 0)));
		__debugInfo = "1545:\ddgui.gbas";
		if ((((local6_id_Str_ref_1737[0]) == ("")) ? 1 : 0)) {
			__debugInfo = "1545:\ddgui.gbas";
			local6_id_Str_ref_1737[0] = (("iwdg%") + (CAST2STRING(local5_count_1741)));
			__debugInfo = "1545:\ddgui.gbas";
		};
		__debugInfo = "1547:\ddgui.gbas";
		GETFONTSIZE(local2_fx_ref_1742, local2_fy_ref_1743);
		__debugInfo = "1548:\ddgui.gbas";
		if ((((param5_width) <= (global25_gDDguiMinControlDimension)) ? 1 : 0)) {
			__debugInfo = "1548:\ddgui.gbas";
			param5_width = MAX(global25_gDDguiMinControlDimension, MAX(param5_width, ((func21_DDGui_TextWidthIntern(local11_caption_Str_ref_1738)) + (local2_fx_ref_1742[0]))));
			__debugInfo = "1548:\ddgui.gbas";
		};
		__debugInfo = "1549:\ddgui.gbas";
		if ((((param6_height) <= (global25_gDDguiMinControlDimension)) ? 1 : 0)) {
			__debugInfo = "1549:\ddgui.gbas";
			param6_height = MAX(global25_gDDguiMinControlDimension, MAX(param6_height, ((local2_fy_ref_1743[0]) + (6))));
			__debugInfo = "1549:\ddgui.gbas";
		};
		__debugInfo = "1551:\ddgui.gbas";
		local1_i_1745 = func11_DDgui_index(unref(global11_ddgui_stack_ref[0].arrAccess(-(1)).values[tmpPositionCache][0]), local6_id_Str_ref_1737, 1);
		__debugInfo = "1552:\ddgui.gbas";
		global11_ddgui_stack_ref[0].arrAccess(-(1)).values[tmpPositionCache][0].attr7_widgets_ref[0].arrAccess(local1_i_1745).values[tmpPositionCache][0].attr7_wid_Str = local6_id_Str_ref_1737[0];
		__debugInfo = "1553:\ddgui.gbas";
		global11_ddgui_stack_ref[0].arrAccess(-(1)).values[tmpPositionCache][0].attr7_widgets_ref[0].arrAccess(local1_i_1745).values[tmpPositionCache][0].attr6_wwidth = param5_width;
		__debugInfo = "1554:\ddgui.gbas";
		global11_ddgui_stack_ref[0].arrAccess(-(1)).values[tmpPositionCache][0].attr7_widgets_ref[0].arrAccess(local1_i_1745).values[tmpPositionCache][0].attr7_wheight = param6_height;
		__debugInfo = "1555:\ddgui.gbas";
		global11_ddgui_stack_ref[0].arrAccess(-(1)).values[tmpPositionCache][0].attr7_widgets_ref[0].arrAccess(local1_i_1745).values[tmpPositionCache][0].attr9_wtype_Str = "WIDGET";
		__debugInfo = "1556:\ddgui.gbas";
		global11_ddgui_stack_ref[0].arrAccess(-(1)).values[tmpPositionCache][0].attr7_widgets_ref[0].arrAccess(local1_i_1745).values[tmpPositionCache][0].attr9_wtext_Str_ref[0] = local11_caption_Str_ref_1738[0];
		__debugInfo = "1557:\ddgui.gbas";
		return 0;
		__debugInfo = "1544:\ddgui.gbas";
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
		var local2_id_2264 = 0, alias3_foo_ref_2265 = [DDgui_userfunction];
		var local6_id_Str_ref_2261 = [param6_id_Str]; /* NEWCODEHERE */
		__debugInfo = "1574:\ddgui.gbas";
		local2_id_2264 = func11_DDgui_index(unref(global11_ddgui_stack_ref[0].arrAccess(-(1)).values[tmpPositionCache][0]), local6_id_Str_ref_2261, 0);
		__debugInfo = "1575:\ddgui.gbas";
		if ((((local2_id_2264) < (0)) ? 1 : 0)) {
			__debugInfo = "1575:\ddgui.gbas";
			return tryClone(0);
			__debugInfo = "1575:\ddgui.gbas";
		};
		__debugInfo = "1576:\ddgui.gbas";
		alias3_foo_ref_2265 = global11_ddgui_stack_ref[0].arrAccess(-(1)).values[tmpPositionCache][0].attr7_widgets_ref[0].arrAccess(local2_id_2264).values[tmpPositionCache][0].attr8_wuserfoo_ref /* ALIAS */;
		__debugInfo = "1579:\ddgui.gbas";
		if (alias3_foo_ref_2265[0]) {
			__debugInfo = "1578:\ddgui.gbas";
			alias3_foo_ref_2265[0](local6_id_Str_ref_2261, param8_verb_Str, param8_info_Str_ref);
			__debugInfo = "1578:\ddgui.gbas";
		};
		__debugInfo = "1580:\ddgui.gbas";
		return 0;
		__debugInfo = "1574:\ddgui.gbas";
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
		__debugInfo = "1600:\ddgui.gbas";
		{
			var local16___SelectHelper4__1750 = "";
			__debugInfo = "1600:\ddgui.gbas";
			local16___SelectHelper4__1750 = param3_wdg.attr9_wtype_Str;
			__debugInfo = "1646:\ddgui.gbas";
			if ((((local16___SelectHelper4__1750) == ("FRAME")) ? 1 : 0)) {
				
			} else if ((((local16___SelectHelper4__1750) == ("UNFRAME")) ? 1 : 0)) {
				
			} else if ((((local16___SelectHelper4__1750) == ("SPACER")) ? 1 : 0)) {
				
			} else if ((((local16___SelectHelper4__1750) == ("WIDGET")) ? 1 : 0)) {
				var local1_w_ref_1751 = [0], local1_h_ref_1752 = [0];
				__debugInfo = "1606:\ddgui.gbas";
				ALPHAMODE(-(0.7));
				__debugInfo = "1608:\ddgui.gbas";
				GETFONTSIZE(local1_w_ref_1751, local1_h_ref_1752);
				__debugInfo = "1615:\ddgui.gbas";
				if ((((INSTR(unref(param3_wdg.attr9_wtext_Str_ref[0]), "\n", 0)) < (0)) ? 1 : 0)) {
					__debugInfo = "1612:\ddgui.gbas";
					local1_h_ref_1752[0] = func14_DDgui_boxprint(param10_ddgui_vals, param3_wdg, 0, ((param4_ytop) + (CAST2INT(((((param3_wdg.attr7_wheight) - (local1_h_ref_1752[0]))) / (2))))), param3_wdg.attr6_wwidth, 1, 0);
					__debugInfo = "1612:\ddgui.gbas";
				} else {
					__debugInfo = "1614:\ddgui.gbas";
					local1_h_ref_1752[0] = func14_DDgui_boxprint(param10_ddgui_vals, param3_wdg, 0, param4_ytop, param3_wdg.attr6_wwidth, 1, 0);
					__debugInfo = "1614:\ddgui.gbas";
				};
				__debugInfo = "1616:\ddgui.gbas";
				param3_wdg.attr7_wheight = MAX(global25_gDDguiMinControlDimension, unref(local1_h_ref_1752[0]));
				__debugInfo = "1617:\ddgui.gbas";
				ALPHAMODE(0);
				__debugInfo = "1606:\ddgui.gbas";
			} else if ((((local16___SelectHelper4__1750) == ("BUTTON")) ? 1 : 0)) {
				__debugInfo = "1619:\ddgui.gbas";
				func16_DDgui_drawbutton(param10_ddgui_vals, param3_wdg, param4_ytop);
				__debugInfo = "1619:\ddgui.gbas";
			} else if ((((local16___SelectHelper4__1750) == ("SLIDER")) ? 1 : 0)) {
				__debugInfo = "1621:\ddgui.gbas";
				func16_DDgui_drawslider(param10_ddgui_vals, param3_wdg, param4_ytop);
				__debugInfo = "1621:\ddgui.gbas";
			} else if ((((local16___SelectHelper4__1750) == ("RADIO")) ? 1 : 0)) {
				__debugInfo = "1623:\ddgui.gbas";
				func15_DDgui_drawradio(param10_ddgui_vals, param3_wdg, param4_ytop);
				__debugInfo = "1623:\ddgui.gbas";
			} else if ((((local16___SelectHelper4__1750) == ("CHECKBOX")) ? 1 : 0)) {
				__debugInfo = "1625:\ddgui.gbas";
				func18_DDgui_drawcheckbox(param10_ddgui_vals, param3_wdg, param4_ytop);
				__debugInfo = "1625:\ddgui.gbas";
			} else if ((((local16___SelectHelper4__1750) == ("TAB")) ? 1 : 0)) {
				__debugInfo = "1627:\ddgui.gbas";
				func13_DDgui_drawtab(param10_ddgui_vals, param3_wdg, param4_ytop);
				__debugInfo = "1627:\ddgui.gbas";
			} else if ((((local16___SelectHelper4__1750) == ("COMBO")) ? 1 : 0)) {
				__debugInfo = "1629:\ddgui.gbas";
				func15_DDgui_drawcombo(param10_ddgui_vals, param3_wdg, param4_ytop);
				__debugInfo = "1629:\ddgui.gbas";
			} else if ((((local16___SelectHelper4__1750) == ("LIST")) ? 1 : 0)) {
				__debugInfo = "1631:\ddgui.gbas";
				func14_DDgui_drawlist(param10_ddgui_vals, param3_wdg, param4_ytop);
				__debugInfo = "1631:\ddgui.gbas";
			} else if ((((local16___SelectHelper4__1750) == ("SINGLETEXT")) ? 1 : 0)) {
				__debugInfo = "1633:\ddgui.gbas";
				func14_DDgui_drawtext(param10_ddgui_vals, param3_wdg, param4_ytop, 1);
				__debugInfo = "1633:\ddgui.gbas";
			} else if ((((local16___SelectHelper4__1750) == ("NUMBERTEXT")) ? 1 : 0)) {
				__debugInfo = "1635:\ddgui.gbas";
				func14_DDgui_drawtext(param10_ddgui_vals, param3_wdg, param4_ytop, 1);
				__debugInfo = "1635:\ddgui.gbas";
			} else if ((((local16___SelectHelper4__1750) == ("TEXT")) ? 1 : 0)) {
				__debugInfo = "1637:\ddgui.gbas";
				func14_DDgui_drawtext(param10_ddgui_vals, param3_wdg, param4_ytop, 0);
				__debugInfo = "1637:\ddgui.gbas";
			} else if ((((local16___SelectHelper4__1750) == ("FILE")) ? 1 : 0)) {
				__debugInfo = "1639:\ddgui.gbas";
				func14_DDgui_drawfile(param10_ddgui_vals, param3_wdg, param4_ytop);
				__debugInfo = "1639:\ddgui.gbas";
			} else {
				__debugInfo = "1645:\ddgui.gbas";
				if (param3_wdg.attr8_wuserfoo_ref[0]) {
					__debugInfo = "1642:\ddgui.gbas";
					param3_wdg.attr8_wuserfoo_ref[0](param3_wdg.attr7_wid_Str, "DRAW", static9_DDgui_drawwidget_dummy_Str_ref);
					__debugInfo = "1642:\ddgui.gbas";
				} else {
					__debugInfo = "1644:\ddgui.gbas";
					func15_DDgui_draw_user(param3_wdg.attr7_wid_Str, param3_wdg.attr6_wwidth, param3_wdg.attr7_wheight, param4_ytop);
					__debugInfo = "1644:\ddgui.gbas";
				};
				__debugInfo = "1645:\ddgui.gbas";
			};
			__debugInfo = "1600:\ddgui.gbas";
		};
		__debugInfo = "1647:\ddgui.gbas";
		return 0;
		__debugInfo = "1600:\ddgui.gbas";
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
		__debugInfo = "1665:\ddgui.gbas";
		if (((((((((((((param2_mx) >= (0)) ? 1 : 0)) && ((((param2_my) >= (0)) ? 1 : 0))) ? 1 : 0)) && ((((param2_mx) < (param3_wdg.attr6_wwidth)) ? 1 : 0))) ? 1 : 0)) && ((((param2_my) < (param3_wdg.attr7_wheight)) ? 1 : 0))) ? 1 : 0)) {
			__debugInfo = "1661:\ddgui.gbas";
			param3_wdg.attr6_whover = 1;
			__debugInfo = "1661:\ddgui.gbas";
		} else {
			__debugInfo = "1662:\ddgui.gbas";
			param2_b1 = 0;
			__debugInfo = "1663:\ddgui.gbas";
			param2_b2 = 0;
			__debugInfo = "1664:\ddgui.gbas";
			param3_wdg.attr6_whover = 0;
			__debugInfo = "1662:\ddgui.gbas";
		};
		__debugInfo = "1667:\ddgui.gbas";
		{
			var local16___SelectHelper5__1760 = "";
			__debugInfo = "1667:\ddgui.gbas";
			local16___SelectHelper5__1760 = param3_wdg.attr9_wtype_Str;
			__debugInfo = "1713:\ddgui.gbas";
			if ((((local16___SelectHelper5__1760) == ("SPACER")) ? 1 : 0)) {
				
			} else if ((((local16___SelectHelper5__1760) == ("FRAME")) ? 1 : 0)) {
				
			} else if ((((local16___SelectHelper5__1760) == ("UNFRAME")) ? 1 : 0)) {
				
			} else if ((((local16___SelectHelper5__1760) == ("WIDGET")) ? 1 : 0)) {
				__debugInfo = "1673:\ddgui.gbas";
				if ((((param2_b1) != (1)) ? 1 : 0)) {
					__debugInfo = "1673:\ddgui.gbas";
					param2_b1 = 0;
					__debugInfo = "1673:\ddgui.gbas";
				};
				__debugInfo = "1674:\ddgui.gbas";
				param3_wdg.attr8_wclicked = param2_b1;
				__debugInfo = "1673:\ddgui.gbas";
			} else if ((((local16___SelectHelper5__1760) == ("BUTTON")) ? 1 : 0)) {
				__debugInfo = "1676:\ddgui.gbas";
				func18_DDgui_handlebutton(param10_ddgui_vals, param3_wdg, param2_mx, param2_my, param2_b1, param2_b2);
				__debugInfo = "1676:\ddgui.gbas";
			} else if ((((local16___SelectHelper5__1760) == ("SLIDER")) ? 1 : 0)) {
				__debugInfo = "1679:\ddgui.gbas";
				func18_DDgui_handleslider(param10_ddgui_vals, param3_wdg, param2_mx, param2_my, param2_b1, param2_b2);
				__debugInfo = "1679:\ddgui.gbas";
			} else if ((((local16___SelectHelper5__1760) == ("RADIO")) ? 1 : 0)) {
				__debugInfo = "1681:\ddgui.gbas";
				func17_DDgui_handleradio(param10_ddgui_vals, param3_wdg, param2_mx, param2_my, param2_b1, param2_b2);
				__debugInfo = "1681:\ddgui.gbas";
			} else if ((((local16___SelectHelper5__1760) == ("CHECKBOX")) ? 1 : 0)) {
				__debugInfo = "1683:\ddgui.gbas";
				func20_DDgui_handlecheckbox(param10_ddgui_vals, param3_wdg, param2_mx, param2_my, param2_b1, param2_b2);
				__debugInfo = "1683:\ddgui.gbas";
			} else if ((((local16___SelectHelper5__1760) == ("FILE")) ? 1 : 0)) {
				__debugInfo = "1685:\ddgui.gbas";
				func16_DDgui_handlefile(param10_ddgui_vals, param3_wdg, param2_mx, param2_my, param2_b1, param2_b2);
				__debugInfo = "1685:\ddgui.gbas";
			} else if ((((local16___SelectHelper5__1760) == ("LIST")) ? 1 : 0)) {
				__debugInfo = "1687:\ddgui.gbas";
				func16_DDgui_handlelist(param10_ddgui_vals, param3_wdg, param2_mx, param2_my, param2_b1, param2_b2);
				__debugInfo = "1687:\ddgui.gbas";
			} else if ((((local16___SelectHelper5__1760) == ("TAB")) ? 1 : 0)) {
				__debugInfo = "1689:\ddgui.gbas";
				func15_DDgui_handletab(param10_ddgui_vals, param3_wdg, param2_mx, param2_my, param2_b1, param2_b2);
				__debugInfo = "1689:\ddgui.gbas";
			} else if ((((local16___SelectHelper5__1760) == ("COMBO")) ? 1 : 0)) {
				__debugInfo = "1691:\ddgui.gbas";
				func17_DDgui_handlecombo(param10_ddgui_vals, param3_wdg, param2_mx, param2_my, param2_b1, param2_b2);
				__debugInfo = "1691:\ddgui.gbas";
			} else if ((((local16___SelectHelper5__1760) == ("SINGLETEXT")) ? 1 : 0)) {
				__debugInfo = "1693:\ddgui.gbas";
				func16_ddgui_handletext(param10_ddgui_vals, param3_wdg, param2_mx, param2_my, param2_b1, param2_b2, 1, 0);
				__debugInfo = "1693:\ddgui.gbas";
			} else if ((((local16___SelectHelper5__1760) == ("NUMBERTEXT")) ? 1 : 0)) {
				__debugInfo = "1695:\ddgui.gbas";
				func16_ddgui_handletext(param10_ddgui_vals, param3_wdg, param2_mx, param2_my, param2_b1, param2_b2, 1, 1);
				__debugInfo = "1695:\ddgui.gbas";
			} else if ((((local16___SelectHelper5__1760) == ("TEXT")) ? 1 : 0)) {
				__debugInfo = "1697:\ddgui.gbas";
				func16_ddgui_handletext(param10_ddgui_vals, param3_wdg, param2_mx, param2_my, param2_b1, param2_b2, 0, 0);
				__debugInfo = "1697:\ddgui.gbas";
			} else {
				__debugInfo = "1712:\ddgui.gbas";
				if (param3_wdg.attr8_wuserfoo_ref[0]) {
					__debugInfo = "1701:\ddgui.gbas";
					static9_DDgui_handlewidget_dummy_Str_ref[0] = "";
					__debugInfo = "1703:\ddgui.gbas";
					if ((((param2_b1) != (1)) ? 1 : 0)) {
						__debugInfo = "1703:\ddgui.gbas";
						param2_b1 = 0;
						__debugInfo = "1703:\ddgui.gbas";
					};
					__debugInfo = "1704:\ddgui.gbas";
					param3_wdg.attr8_wclicked = param2_b1;
					__debugInfo = "1709:\ddgui.gbas";
					if (param3_wdg.attr8_wclicked) {
						__debugInfo = "1707:\ddgui.gbas";
						static9_DDgui_handlewidget_dummy_Str_ref[0] = ((((((((FORMAT_Str(4, 0, param2_mx)) + (","))) + (FORMAT_Str(4, 0, param2_my)))) + (","))) + (FORMAT_Str(2, 0, param2_b1)));
						__debugInfo = "1708:\ddgui.gbas";
						param3_wdg.attr8_wuserfoo_ref[0](param3_wdg.attr7_wid_Str, "CLICKED", static9_DDgui_handlewidget_dummy_Str_ref);
						__debugInfo = "1707:\ddgui.gbas";
					};
					__debugInfo = "1701:\ddgui.gbas";
				} else {
					__debugInfo = "1711:\ddgui.gbas";
					func17_DDgui_handle_user(param3_wdg.attr7_wid_Str, param2_mx, param2_my, param2_b1, param2_b2);
					__debugInfo = "1711:\ddgui.gbas";
				};
				__debugInfo = "1712:\ddgui.gbas";
			};
			__debugInfo = "1667:\ddgui.gbas";
		};
		__debugInfo = "1714:\ddgui.gbas";
		return 0;
		__debugInfo = "1665:\ddgui.gbas";
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
		var local7_str_Str_1768 = "", local2_tx_ref_1769 = [0], local2_ty_ref_1770 = [0], local2_cx_1771 = 0, local2_cy_1772 = 0, local5_s_Str_1773 = "", local5_c_Str_1774 = "", local4_cpos_1775 = 0, local4_spos_1776 = 0, local4_slen_1777 = 0, local8_caretpos_1778 = 0, local9_has_caret_1779 = 0, local5_xseek_1780 = 0, local5_yseek_1781 = 0, local6_selcol_1782 = 0;
		__debugInfo = "1731:\ddgui.gbas";
		local6_selcol_1782 = global11_ddgui_stack_ref[0].arrAccess(-(1)).values[tmpPositionCache][0].attr14_col_hover_norm;
		__debugInfo = "1733:\ddgui.gbas";
		GETFONTSIZE(local2_tx_ref_1769, local2_ty_ref_1770);
		__debugInfo = "1735:\ddgui.gbas";
		if (param8_find_pos) {
			__debugInfo = "1735:\ddgui.gbas";
			param7_do_draw = 0;
			__debugInfo = "1735:\ddgui.gbas";
		};
		__debugInfo = "1737:\ddgui.gbas";
		local7_str_Str_1768 = param3_wdg.attr9_wtext_Str_ref[0];
		__debugInfo = "1761:\ddgui.gbas";
		if (param8_find_pos) {
			__debugInfo = "1739:\ddgui.gbas";
			local5_xseek_1780 = param1_x;
			__debugInfo = "1740:\ddgui.gbas";
			local5_yseek_1781 = param1_y;
			__debugInfo = "1740:\ddgui.gbas";
			param1_x = 0;
			__debugInfo = "1741:\ddgui.gbas";
			param1_y = 0;
			__debugInfo = "1739:\ddgui.gbas";
		} else {
			var local7_strleng_1783 = 0;
			__debugInfo = "1743:\ddgui.gbas";
			local7_strleng_1783 = (local7_str_Str_1768).length;
			__debugInfo = "1744:\ddgui.gbas";
			if ((((param3_wdg.attr7_wselend) > (local7_strleng_1783)) ? 1 : 0)) {
				__debugInfo = "1744:\ddgui.gbas";
				param3_wdg.attr7_wselend = local7_strleng_1783;
				__debugInfo = "1744:\ddgui.gbas";
			};
			__debugInfo = "1745:\ddgui.gbas";
			if ((((param3_wdg.attr9_wselstart) > (local7_strleng_1783)) ? 1 : 0)) {
				__debugInfo = "1745:\ddgui.gbas";
				param3_wdg.attr9_wselstart = local7_strleng_1783;
				__debugInfo = "1745:\ddgui.gbas";
			};
			__debugInfo = "1746:\ddgui.gbas";
			local8_caretpos_1778 = param3_wdg.attr7_wselend;
			__debugInfo = "1760:\ddgui.gbas";
			if ((((param10_ddgui_vals.attr9_focus_Str) == (param3_wdg.attr7_wid_Str)) ? 1 : 0)) {
				__debugInfo = "1755:\ddgui.gbas";
				local9_has_caret_1779 = 1;
				__debugInfo = "1755:\ddgui.gbas";
			} else {
				__debugInfo = "1757:\ddgui.gbas";
				local9_has_caret_1779 = 0;
				__debugInfo = "1758:\ddgui.gbas";
				param3_wdg.attr9_wselstart = -(1);
				__debugInfo = "1759:\ddgui.gbas";
				param3_wdg.attr7_wselend = -(1);
				__debugInfo = "1757:\ddgui.gbas";
			};
			__debugInfo = "1743:\ddgui.gbas";
		};
		__debugInfo = "1762:\ddgui.gbas";
		local2_cx_1771 = param1_x;
		__debugInfo = "1763:\ddgui.gbas";
		local2_cy_1772 = param1_y;
		__debugInfo = "1764:\ddgui.gbas";
		local7_str_Str_1768 = ((local7_str_Str_1768) + (" "));
		__debugInfo = "1765:\ddgui.gbas";
		local4_slen_1777 = (local7_str_Str_1768).length;
		__debugInfo = "1821:\ddgui.gbas";
		while ((((local4_cpos_1775) < (local4_slen_1777)) ? 1 : 0)) {
			__debugInfo = "1767:\ddgui.gbas";
			local5_c_Str_1774 = MID_Str(local7_str_Str_1768, local4_cpos_1775, 1);
			__debugInfo = "1769:\ddgui.gbas";
			local2_tx_ref_1769[0] = KERNLEN(local5_c_Str_1774, global18_ddgui_font_kerning.attr11_bHasKerning);
			__debugInfo = "1772:\ddgui.gbas";
			if (((((((param8_find_pos) && ((((local2_cy_1772) >= (((local5_yseek_1781) - (local2_ty_ref_1770[0])))) ? 1 : 0))) ? 1 : 0)) && (((((((local2_cx_1771) >= (((local5_xseek_1780) - (((local2_tx_ref_1769[0]) * (1.5)))))) ? 1 : 0)) || ((((local5_c_Str_1774) == ("\n")) ? 1 : 0))) ? 1 : 0))) ? 1 : 0)) {
				__debugInfo = "1772:\ddgui.gbas";
				return tryClone(local4_cpos_1775);
				__debugInfo = "1772:\ddgui.gbas";
			};
			__debugInfo = "1784:\ddgui.gbas";
			if (param7_do_draw) {
				__debugInfo = "1781:\ddgui.gbas";
				if ((((((((((param3_wdg.attr9_wselstart) != (param3_wdg.attr7_wselend)) ? 1 : 0)) && (((((((local4_cpos_1775) >= (param3_wdg.attr9_wselstart)) ? 1 : 0)) && ((((local4_cpos_1775) < (param3_wdg.attr7_wselend)) ? 1 : 0))) ? 1 : 0))) ? 1 : 0)) || (((((((local4_cpos_1775) < (param3_wdg.attr9_wselstart)) ? 1 : 0)) && ((((local4_cpos_1775) >= (param3_wdg.attr7_wselend)) ? 1 : 0))) ? 1 : 0))) ? 1 : 0)) {
					__debugInfo = "1779:\ddgui.gbas";
					DRAWRECT(local2_cx_1771, local2_cy_1772, unref(local2_tx_ref_1769[0]), unref(local2_ty_ref_1770[0]), local6_selcol_1782);
					__debugInfo = "1779:\ddgui.gbas";
				};
				__debugInfo = "1783:\ddgui.gbas";
				if ((((local5_c_Str_1774) != ("\n")) ? 1 : 0)) {
					__debugInfo = "1783:\ddgui.gbas";
					PRINT(local5_c_Str_1774, local2_cx_1771, local2_cy_1772, global18_ddgui_font_kerning.attr11_bHasKerning);
					__debugInfo = "1783:\ddgui.gbas";
				};
				__debugInfo = "1781:\ddgui.gbas";
			};
			__debugInfo = "1795:\ddgui.gbas";
			if ((((local9_has_caret_1779) && ((((local4_cpos_1775) == (local8_caretpos_1778)) ? 1 : 0))) ? 1 : 0)) {
				__debugInfo = "1794:\ddgui.gbas";
				if (param7_do_draw) {
					var local5_blink_1784 = 0;
					__debugInfo = "1788:\ddgui.gbas";
					local5_blink_1784 = (((MOD(GETTIMERALL(), 1024)) > (512)) ? 1 : 0);
					__debugInfo = "1789:\ddgui.gbas";
					if (local5_blink_1784) {
						__debugInfo = "1789:\ddgui.gbas";
						ALPHAMODE(-(0.5));
						__debugInfo = "1789:\ddgui.gbas";
					};
					__debugInfo = "1790:\ddgui.gbas";
					DRAWRECT(((local2_cx_1771) - (1)), local2_cy_1772, 2, unref(local2_ty_ref_1770[0]), global17_gDDguiCaretColour);
					__debugInfo = "1791:\ddgui.gbas";
					if (local5_blink_1784) {
						__debugInfo = "1791:\ddgui.gbas";
						ALPHAMODE(0);
						__debugInfo = "1791:\ddgui.gbas";
					};
					__debugInfo = "1792:\ddgui.gbas";
					param3_wdg.attr7_wcaretx = ((INTEGER(((local2_cx_1771) + (CAST2INT(((local2_tx_ref_1769[0]) / (2))))))) - (param1_x));
					__debugInfo = "1793:\ddgui.gbas";
					param3_wdg.attr7_wcarety = ((INTEGER(((local2_cy_1772) + (CAST2INT(((local2_ty_ref_1770[0]) / (2))))))) - (param1_y));
					__debugInfo = "1788:\ddgui.gbas";
				};
				__debugInfo = "1794:\ddgui.gbas";
			};
			__debugInfo = "1798:\ddgui.gbas";
			if ((((local5_c_Str_1774) == ("\n")) ? 1 : 0)) {
				__debugInfo = "1797:\ddgui.gbas";
				local2_cx_1771 = param1_x;
				__debugInfo = "1797:\ddgui.gbas";
				local2_cy_1772+=local2_ty_ref_1770[0];
				__debugInfo = "1797:\ddgui.gbas";
				local4_cpos_1775+=1;
				__debugInfo = "1797:\ddgui.gbas";
				continue;
				__debugInfo = "1797:\ddgui.gbas";
			};
			__debugInfo = "1800:\ddgui.gbas";
			local2_cx_1771 = ((local2_cx_1771) + (local2_tx_ref_1769[0]));
			__debugInfo = "1801:\ddgui.gbas";
			local4_cpos_1775 = ((local4_cpos_1775) + (1));
			__debugInfo = "1820:\ddgui.gbas";
			if (((((((local5_c_Str_1774) == (" ")) ? 1 : 0)) || ((((local5_c_Str_1774) == ("\t")) ? 1 : 0))) ? 1 : 0)) {
				var local10_next_w_len_1785 = 0, local4_code_1786 = 0, local6_co_Str_1787 = "";
				__debugInfo = "1806:\ddgui.gbas";
				local10_next_w_len_1785 = 0;
				__debugInfo = "1808:\ddgui.gbas";
				{
					__debugInfo = "1819:\ddgui.gbas";
					for (local4_spos_1776 = local4_cpos_1775;toCheck(local4_spos_1776, ((local4_slen_1777) - (1)), 1);local4_spos_1776 += 1) {
						__debugInfo = "1810:\ddgui.gbas";
						local6_co_Str_1787 = MID_Str(local7_str_Str_1768, local4_spos_1776, 1);
						__debugInfo = "1811:\ddgui.gbas";
						local4_code_1786 = ASC(local6_co_Str_1787, 0);
						__debugInfo = "1817:\ddgui.gbas";
						if (((((((local4_code_1786) == (ASC(" ", 0))) ? 1 : 0)) || ((((local4_code_1786) == (ASC("\t", 0))) ? 1 : 0))) ? 1 : 0)) {
							__debugInfo = "1815:\ddgui.gbas";
							if ((((((((local2_cx_1771) + (local10_next_w_len_1785))) - (param1_x))) > (param2_wx)) ? 1 : 0)) {
								__debugInfo = "1813:\ddgui.gbas";
								local2_cx_1771 = param1_x;
								__debugInfo = "1814:\ddgui.gbas";
								local2_cy_1772 = ((local2_cy_1772) + (local2_ty_ref_1770[0]));
								__debugInfo = "1813:\ddgui.gbas";
							};
							__debugInfo = "1816:\ddgui.gbas";
							break;
							__debugInfo = "1815:\ddgui.gbas";
						};
						__debugInfo = "1818:\ddgui.gbas";
						local10_next_w_len_1785+=KERNLEN(local6_co_Str_1787, global18_ddgui_font_kerning.attr11_bHasKerning);
						__debugInfo = "1810:\ddgui.gbas";
					};
					__debugInfo = "1819:\ddgui.gbas";
				};
				__debugInfo = "1806:\ddgui.gbas";
			};
			__debugInfo = "1767:\ddgui.gbas";
		};
		__debugInfo = "1822:\ddgui.gbas";
		if (param8_find_pos) {
			__debugInfo = "1822:\ddgui.gbas";
			return tryClone(local4_slen_1777);
			__debugInfo = "1822:\ddgui.gbas";
		};
		__debugInfo = "1823:\ddgui.gbas";
		return tryClone(((((local2_cy_1772) + (local2_ty_ref_1770[0]))) - (param1_y)));
		__debugInfo = "1824:\ddgui.gbas";
		return 0;
		__debugInfo = "1731:\ddgui.gbas";
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
		var local2_c1_1794 = 0, local2_c2_1795 = 0, local3_c1b_1796 = 0, local3_c2b_1797 = 0, local2_tx_ref_1798 = [0], local2_ty_ref_1799 = [0], local1_x_1800 = 0, local2_up_1801 = 0, local4_down_1802 = 0, local3_pos_1803 = 0, local4_smax_1804 = 0, local3_hsb_1805 = 0;
		__debugInfo = "1838:\ddgui.gbas";
		GETFONTSIZE(local2_tx_ref_1798, local2_ty_ref_1799);
		__debugInfo = "1839:\ddgui.gbas";
		local2_tx_ref_1798[0] = MAX(unref(local2_tx_ref_1798[0]), global20_gDDguiScrollbarWidth);
		__debugInfo = "1841:\ddgui.gbas";
		local1_x_1800 = ((((param5_width) - (local2_tx_ref_1798[0]))) - (1));
		__debugInfo = "1843:\ddgui.gbas";
		local4_smax_1804 = param3_wdg.attr10_wscrollmax;
		__debugInfo = "1844:\ddgui.gbas";
		if ((((local4_smax_1804) <= (0)) ? 1 : 0)) {
			__debugInfo = "1844:\ddgui.gbas";
			return 0;
			__debugInfo = "1844:\ddgui.gbas";
		};
		__debugInfo = "1852:\ddgui.gbas";
		if ((((param10_ddgui_vals.attr9_focus_Str) == ((("SB") + (param3_wdg.attr7_wid_Str)))) ? 1 : 0)) {
			__debugInfo = "1847:\ddgui.gbas";
			local2_c1_1794 = param10_ddgui_vals.attr16_col_hover_bright;
			__debugInfo = "1848:\ddgui.gbas";
			local2_c2_1795 = param10_ddgui_vals.attr14_col_hover_norm;
			__debugInfo = "1847:\ddgui.gbas";
		} else {
			__debugInfo = "1850:\ddgui.gbas";
			local2_c1_1794 = param10_ddgui_vals.attr10_col_bright;
			__debugInfo = "1851:\ddgui.gbas";
			local2_c2_1795 = param10_ddgui_vals.attr8_col_norm;
			__debugInfo = "1850:\ddgui.gbas";
		};
		__debugInfo = "1853:\ddgui.gbas";
		local3_c1b_1796 = param10_ddgui_vals.attr10_col_bright;
		__debugInfo = "1854:\ddgui.gbas";
		local3_c2b_1797 = param10_ddgui_vals.attr8_col_norm;
		__debugInfo = "1856:\ddgui.gbas";
		local3_pos_1803 = param3_wdg.attr7_wscroll;
		__debugInfo = "1857:\ddgui.gbas";
		if ((((local3_pos_1803) < (0)) ? 1 : 0)) {
			__debugInfo = "1857:\ddgui.gbas";
			local3_pos_1803 = 0;
			__debugInfo = "1857:\ddgui.gbas";
		};
		__debugInfo = "1858:\ddgui.gbas";
		if ((((local3_pos_1803) > (local4_smax_1804)) ? 1 : 0)) {
			__debugInfo = "1858:\ddgui.gbas";
			local3_pos_1803 = local4_smax_1804;
			__debugInfo = "1858:\ddgui.gbas";
		};
		__debugInfo = "1859:\ddgui.gbas";
		local2_up_1801 = (((local3_pos_1803) > (0)) ? 1 : 0);
		__debugInfo = "1860:\ddgui.gbas";
		local4_down_1802 = (((local3_pos_1803) < (((local4_smax_1804) + (1)))) ? 1 : 0);
		__debugInfo = "1863:\ddgui.gbas";
		DRAWRECT(local1_x_1800, param4_ytop, unref(local2_tx_ref_1798[0]), param6_height, local2_c1_1794);
		__debugInfo = "1864:\ddgui.gbas";
		func14_DDgui_backrect(local1_x_1800, param4_ytop, unref(local2_tx_ref_1798[0]), param6_height, local2_c2_1795);
		__debugInfo = "1867:\ddgui.gbas";
		param4_ytop+=1;
		__debugInfo = "1868:\ddgui.gbas";
		param6_height+=-(2);
		__debugInfo = "1869:\ddgui.gbas";
		local1_x_1800+=1;
		__debugInfo = "1870:\ddgui.gbas";
		local2_tx_ref_1798[0]+=-(2);
		__debugInfo = "1872:\ddgui.gbas";
		local3_hsb_1805 = MAX(2, CAST2INT(((((param6_height) * (128))) / (CAST2INT(((((((((local4_smax_1804) + (param11_page_height))) - (1))) * (128))) / (param11_page_height)))))));
		__debugInfo = "1873:\ddgui.gbas";
		if ((((local3_hsb_1805) > (((param6_height) - (20)))) ? 1 : 0)) {
			__debugInfo = "1873:\ddgui.gbas";
			local3_hsb_1805 = ((param6_height) - (20));
			__debugInfo = "1873:\ddgui.gbas";
		};
		__debugInfo = "1875:\ddgui.gbas";
		local3_pos_1803 = MAX(0, CAST2INT(((((local3_pos_1803) * (((param6_height) - (local3_hsb_1805))))) / (local4_smax_1804))));
		__debugInfo = "1877:\ddgui.gbas";
		local1_x_1800+=3;
		__debugInfo = "1878:\ddgui.gbas";
		local2_tx_ref_1798[0]+=-(6);
		__debugInfo = "1881:\ddgui.gbas";
		func13_DDgui_backgnd(local3_c1b_1796, local3_c2b_1797, local1_x_1800, ((param4_ytop) + (local3_pos_1803)), unref(local2_tx_ref_1798[0]), local3_hsb_1805);
		__debugInfo = "1882:\ddgui.gbas";
		func14_DDgui_backrect(((local1_x_1800) - (1)), ((((param4_ytop) + (local3_pos_1803))) - (1)), ((local2_tx_ref_1798[0]) + (2)), ((local3_hsb_1805) + (2)), local2_c2_1795);
		__debugInfo = "1884:\ddgui.gbas";
		return 0;
		__debugInfo = "1838:\ddgui.gbas";
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
		var local2_tx_ref_1813 = [0], local2_ty_ref_1814 = [0], local1_x_1815 = 0, local4_smax_1816 = 0, local3_hsb_1817 = 0, local3_pos_1818 = 0, local8_hasfocus_1819 = 0, local5_width_1820 = 0, local3_rmx_ref_1821 = [0], local3_rmy_ref_1822 = [0], local3_rb1_ref_1823 = [0], local3_rb2_ref_1824 = [0];
		__debugInfo = "1899:\ddgui.gbas";
		GETFONTSIZE(local2_tx_ref_1813, local2_ty_ref_1814);
		__debugInfo = "1900:\ddgui.gbas";
		local2_tx_ref_1813[0] = MAX(unref(local2_tx_ref_1813[0]), global20_gDDguiScrollbarWidth);
		__debugInfo = "1902:\ddgui.gbas";
		local5_width_1820 = param3_wdg.attr6_wwidth;
		__debugInfo = "1903:\ddgui.gbas";
		local1_x_1815 = ((local5_width_1820) - (local2_tx_ref_1813[0]));
		__debugInfo = "1905:\ddgui.gbas";
		local4_smax_1816 = param3_wdg.attr10_wscrollmax;
		__debugInfo = "1910:\ddgui.gbas";
		if ((((local4_smax_1816) <= (0)) ? 1 : 0)) {
			__debugInfo = "1907:\ddgui.gbas";
			param3_wdg.attr10_wscrollmax = 0;
			__debugInfo = "1908:\ddgui.gbas";
			param3_wdg.attr7_wscroll = 0;
			__debugInfo = "1909:\ddgui.gbas";
			return 0;
			__debugInfo = "1907:\ddgui.gbas";
		};
		__debugInfo = "1916:\ddgui.gbas";
		if ((((param3_wdg.attr7_wscroll) > (local4_smax_1816)) ? 1 : 0)) {
			__debugInfo = "1914:\ddgui.gbas";
			local3_pos_1818 = local4_smax_1816;
			__debugInfo = "1915:\ddgui.gbas";
			param3_wdg.attr7_wscroll = param3_wdg.attr10_wscrollmax;
			__debugInfo = "1914:\ddgui.gbas";
		};
		__debugInfo = "1919:\ddgui.gbas";
		MOUSESTATE(local3_rmx_ref_1821, local3_rmy_ref_1822, local3_rb1_ref_1823, local3_rb2_ref_1824);
		__debugInfo = "1921:\ddgui.gbas";
		if ((((param10_ddgui_vals.attr9_focus_Str) == ((("SB") + (param3_wdg.attr7_wid_Str)))) ? 1 : 0)) {
			__debugInfo = "1921:\ddgui.gbas";
			local8_hasfocus_1819 = 1;
			__debugInfo = "1921:\ddgui.gbas";
		};
		__debugInfo = "1935:\ddgui.gbas";
		if (((((((local3_rb1_ref_1823[0]) && (BOXCOLL(local1_x_1815, 0, unref(local2_tx_ref_1813[0]), param6_height, param2_mx, param2_my, 1, 1))) ? 1 : 0)) || (local8_hasfocus_1819)) ? 1 : 0)) {
			var local3_div_1825 = 0;
			__debugInfo = "1924:\ddgui.gbas";
			local8_hasfocus_1819 = 1;
			__debugInfo = "1925:\ddgui.gbas";
			param10_ddgui_vals.attr9_focus_Str = (("SB") + (param3_wdg.attr7_wid_Str));
			__debugInfo = "1927:\ddgui.gbas";
			local3_hsb_1817 = MAX(2, CAST2INT(((CAST2INT(((((param6_height) * (1024))) / (local4_smax_1816)))) / (1024))));
			__debugInfo = "1929:\ddgui.gbas";
			local3_div_1825 = ((param6_height) - (local3_hsb_1817));
			__debugInfo = "1934:\ddgui.gbas";
			if ((((local3_div_1825) > (0)) ? 1 : 0)) {
				__debugInfo = "1931:\ddgui.gbas";
				param3_wdg.attr7_wscroll = MAX(0, MIN(param3_wdg.attr10_wscrollmax, CAST2INT(((CAST2INT(((((((param2_my) * (param3_wdg.attr10_wscrollmax))) * (1024))) / (local3_div_1825)))) / (1024)))));
				__debugInfo = "1931:\ddgui.gbas";
			} else {
				__debugInfo = "1933:\ddgui.gbas";
				param3_wdg.attr7_wscroll = 0;
				__debugInfo = "1933:\ddgui.gbas";
			};
			__debugInfo = "1924:\ddgui.gbas";
		};
		__debugInfo = "1937:\ddgui.gbas";
		if ((((local8_hasfocus_1819) && ((((local3_rb1_ref_1823[0]) == (0)) ? 1 : 0))) ? 1 : 0)) {
			__debugInfo = "1937:\ddgui.gbas";
			param10_ddgui_vals.attr9_focus_Str = "";
			__debugInfo = "1937:\ddgui.gbas";
		};
		__debugInfo = "1939:\ddgui.gbas";
		return 1;
		__debugInfo = "1940:\ddgui.gbas";
		return 0;
		__debugInfo = "1899:\ddgui.gbas";
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
		var local6_id_Str_1828 = "";
		__debugInfo = "1949:\ddgui.gbas";
		local6_id_Str_1828 = (("ID_SPACER_") + (CAST2STRING(BOUNDS(global11_ddgui_stack_ref[0].arrAccess(-(1)).values[tmpPositionCache][0].attr7_widgets_ref[0], 0))));
		__debugInfo = "1950:\ddgui.gbas";
		func12_DDgui_widget(local6_id_Str_1828, "", param5_width, param6_height);
		__debugInfo = "1952:\ddgui.gbas";
		func9_DDgui_set(local6_id_Str_1828, "WIDTH", CAST2STRING(param5_width));
		__debugInfo = "1953:\ddgui.gbas";
		func9_DDgui_set(local6_id_Str_1828, "HEIGHT", CAST2STRING(param6_height));
		__debugInfo = "1956:\ddgui.gbas";
		func9_DDgui_set(local6_id_Str_1828, "TYPE", "SPACER");
		__debugInfo = "1957:\ddgui.gbas";
		return 0;
		__debugInfo = "1949:\ddgui.gbas";
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
window['func12_DDgui_button'] = function(param6_id_Str, param11_caption_Str, param5_width, param6_height) {
		var __labels = {"__DrawFrames__": 3449, "skip": 14466};
		
	stackPush("function: DDgui_button", __debugInfo);
	try {
		var local2_sx_ref_2270 = [0], local2_sy_ref_2271 = [0];
		var __pc = 14365;
		while(__pc >= 0) {
			switch(__pc) {
				case 14365:
					__debugInfo = "1965:\ddgui.gbas";
					func12_DDgui_widget(param6_id_Str, param11_caption_Str, param5_width, param6_height);
					
				case 14465:
					__debugInfo = "1980:\ddgui.gbas";
					if (!(((((((param5_width) == (0)) ? 1 : 0)) || ((((param6_height) == (0)) ? 1 : 0))) ? 1 : 0))) { __pc = 14373; break; }
					
					case 14417:
						__debugInfo = "1972:\ddgui.gbas";
						if (!((((INSTR(param11_caption_Str, "SPR_B", 0)) == (0)) ? 1 : 0))) { __pc = 14381; break; }
					
					case 14391:
						__debugInfo = "1968:\ddgui.gbas";
						GETSPRITESIZE(INTEGER(FLOAT2STR(MID_Str(param11_caption_Str, 5, (param11_caption_Str).length))), local2_sx_ref_2270, local2_sy_ref_2271);
						
					case 14403:
						__debugInfo = "1969:\ddgui.gbas";
						if (!((((param5_width) == (0)) ? 1 : 0))) { __pc = 14395; break; }
					
					case 14402:
						__debugInfo = "1969:\ddgui.gbas";
						func9_DDgui_set(param6_id_Str, "WIDTH", CAST2STRING(((local2_sx_ref_2270[0]) + (4))));
						
					__debugInfo = "1969:\ddgui.gbas";
					
				case 14395: //dummy jumper1
					;
						
					case 14415:
						__debugInfo = "1970:\ddgui.gbas";
						if (!((((param6_height) == (0)) ? 1 : 0))) { __pc = 14407; break; }
					
					case 14414:
						__debugInfo = "1970:\ddgui.gbas";
						func9_DDgui_set(param6_id_Str, "HEIGHT", CAST2STRING(((local2_sy_ref_2271[0]) + (4))));
						
					__debugInfo = "1970:\ddgui.gbas";
					
				case 14407: //dummy jumper1
					;
						
					case 14416:
						__debugInfo = "1971:\ddgui.gbas";
						__pc = __labels["skip"]; break;
						
					__debugInfo = "1968:\ddgui.gbas";
					
				case 14381: //dummy jumper1
					;
						
					case 14464:
						__debugInfo = "1979:\ddgui.gbas";
						if (!((((INSTR(param11_caption_Str, "SPR_C", 0)) == (0)) ? 1 : 0))) { __pc = 14424; break; }
					
					case 14435:
						__debugInfo = "1974:\ddgui.gbas";
						if (!((((param5_width) == (0)) ? 1 : 0))) { __pc = 14429; break; }
					
					case 14434:
						__debugInfo = "1974:\ddgui.gbas";
						func9_DDgui_set(param6_id_Str, "WIDTH", CAST2STRING(32));
						
					__debugInfo = "1974:\ddgui.gbas";
					
				case 14429: //dummy jumper1
					;
						
					case 14445:
						__debugInfo = "1975:\ddgui.gbas";
						if (!((((param6_height) == (0)) ? 1 : 0))) { __pc = 14439; break; }
					
					case 14444:
						__debugInfo = "1975:\ddgui.gbas";
						func9_DDgui_set(param6_id_Str, "HEIGHT", CAST2STRING(32));
						
					__debugInfo = "1975:\ddgui.gbas";
					
				case 14439: //dummy jumper1
					;
						
					__debugInfo = "1974:\ddgui.gbas";
					__pc = 16787;
					break;
					
				case 14424: //dummy jumper1
					
					case 14449:
						__debugInfo = "1977:\ddgui.gbas";
						GETFONTSIZE(local2_sx_ref_2270, local2_sy_ref_2271);
						
					case 14463:
						__debugInfo = "1978:\ddgui.gbas";
						if (!((((param6_height) == (0)) ? 1 : 0))) { __pc = 14453; break; }
					
					case 14462:
						__debugInfo = "1978:\ddgui.gbas";
						func9_DDgui_set(param6_id_Str, "HEIGHT", CAST2STRING(MAX(global25_gDDguiMinControlDimension, ((local2_sy_ref_2271[0]) + (4)))));
						
					__debugInfo = "1978:\ddgui.gbas";
					
				case 14453: //dummy jumper1
					;
						
					__debugInfo = "1977:\ddgui.gbas";
					
				case 16787: //dummy jumper2
					;
						
					__debugInfo = "1972:\ddgui.gbas";
					
				case 14373: //dummy jumper1
					;
					
				case 14466:
					__debugInfo = "1981:\ddgui.gbas";
					//label: skip;
					
				__debugInfo = "1982:\ddgui.gbas";
				func9_DDgui_set(param6_id_Str, "TYPE", "BUTTON");
				__debugInfo = "1983:\ddgui.gbas";
				return 0;
				__debugInfo = "1965:\ddgui.gbas";__pc = -1; break;
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
		var local2_c1_1832 = 0, local2_c2_1833 = 0, local5_hover_1834 = 0, local1_x_1835 = 0, local1_y_1836 = 0, local1_w_1837 = 0, local1_h_1838 = 0;
		__debugInfo = "1989:\ddgui.gbas";
		ALPHAMODE(0);
		__debugInfo = "1990:\ddgui.gbas";
		local5_hover_1834 = param3_wdg.attr6_whover;
		__debugInfo = "1998:\ddgui.gbas";
		if (((((((local5_hover_1834) > (0)) ? 1 : 0)) && ((((param3_wdg.attr9_wreadonly) == (0)) ? 1 : 0))) ? 1 : 0)) {
			__debugInfo = "1993:\ddgui.gbas";
			local2_c1_1832 = param10_ddgui_vals.attr16_col_hover_bright;
			__debugInfo = "1994:\ddgui.gbas";
			local2_c2_1833 = param10_ddgui_vals.attr14_col_hover_norm;
			__debugInfo = "1993:\ddgui.gbas";
		} else {
			__debugInfo = "1996:\ddgui.gbas";
			local2_c1_1832 = param10_ddgui_vals.attr10_col_bright;
			__debugInfo = "1997:\ddgui.gbas";
			local2_c2_1833 = param10_ddgui_vals.attr8_col_norm;
			__debugInfo = "1996:\ddgui.gbas";
		};
		__debugInfo = "1999:\ddgui.gbas";
		func13_DDgui_backgnd(local2_c1_1832, local2_c2_1833, 1, ((param4_ytop) + (1)), ((param3_wdg.attr6_wwidth) - (2)), ((param3_wdg.attr7_wheight) - (2)));
		__debugInfo = "2000:\ddgui.gbas";
		local1_x_1835 = 1;
		__debugInfo = "2000:\ddgui.gbas";
		local1_y_1836 = ((param4_ytop) + (1));
		__debugInfo = "2000:\ddgui.gbas";
		local1_w_1837 = ((param3_wdg.attr6_wwidth) - (2));
		__debugInfo = "2001:\ddgui.gbas";
		local1_h_1838 = ((param3_wdg.attr7_wheight) - (2));
		__debugInfo = "2009:\ddgui.gbas";
		if (param3_wdg.attr7_wselect) {
			__debugInfo = "2005:\ddgui.gbas";
			local1_x_1835+=1;
			__debugInfo = "2006:\ddgui.gbas";
			local1_y_1836+=1;
			__debugInfo = "2007:\ddgui.gbas";
			local1_w_1837+=-(2);
			__debugInfo = "2008:\ddgui.gbas";
			local1_h_1838+=-(2);
			__debugInfo = "2005:\ddgui.gbas";
		};
		__debugInfo = "2045:\ddgui.gbas";
		if ((((INSTR(unref(param3_wdg.attr9_wtext_Str_ref[0]), "SPR_B", 0)) == (0)) ? 1 : 0)) {
			__debugInfo = "2021:\ddgui.gbas";
			if (param3_wdg.attr9_wreadonly) {
				__debugInfo = "2014:\ddgui.gbas";
				ALPHAMODE(-(0.8));
				__debugInfo = "2014:\ddgui.gbas";
			} else {
				__debugInfo = "2020:\ddgui.gbas";
				if ((((local5_hover_1834) == (0)) ? 1 : 0)) {
					__debugInfo = "2017:\ddgui.gbas";
					ALPHAMODE(-(1));
					__debugInfo = "2017:\ddgui.gbas";
				} else {
					__debugInfo = "2019:\ddgui.gbas";
					ALPHAMODE(-(0.8));
					__debugInfo = "2019:\ddgui.gbas";
				};
				__debugInfo = "2020:\ddgui.gbas";
			};
			__debugInfo = "2023:\ddgui.gbas";
			local2_c1_1832 = INTEGER(FLOAT2STR(MID_Str(unref(param3_wdg.attr9_wtext_Str_ref[0]), 5, (param3_wdg.attr9_wtext_Str_ref[0]).length)));
			__debugInfo = "2024:\ddgui.gbas";
			func23_DDgui_fit_sprite_in_box(local2_c1_1832, ((local1_x_1835) + (1)), ((local1_y_1836) + (1)), ((local1_w_1837) - (2)), ((local1_h_1838) - (2)));
			__debugInfo = "2021:\ddgui.gbas";
		} else if ((((INSTR(unref(param3_wdg.attr9_wtext_Str_ref[0]), "SPR_C", 0)) == (0)) ? 1 : 0)) {
			__debugInfo = "2032:\ddgui.gbas";
			if ((((local5_hover_1834) == (0)) ? 1 : 0)) {
				__debugInfo = "2029:\ddgui.gbas";
				ALPHAMODE(-(1));
				__debugInfo = "2029:\ddgui.gbas";
			} else {
				__debugInfo = "2031:\ddgui.gbas";
				ALPHAMODE(-(0.8));
				__debugInfo = "2031:\ddgui.gbas";
			};
			__debugInfo = "2033:\ddgui.gbas";
			local2_c1_1832 = INTEGER(FLOAT2STR(MID_Str(unref(param3_wdg.attr9_wtext_Str_ref[0]), 5, (param3_wdg.attr9_wtext_Str_ref[0]).length)));
			__debugInfo = "2034:\ddgui.gbas";
			DRAWRECT(local1_x_1835, local1_y_1836, local1_w_1837, local1_h_1838, local2_c1_1832);
			__debugInfo = "2032:\ddgui.gbas";
		} else {
			var local2_fx_ref_1839 = [0], local2_fy_ref_1840 = [0];
			__debugInfo = "2041:\ddgui.gbas";
			if (param3_wdg.attr9_wreadonly) {
				__debugInfo = "2038:\ddgui.gbas";
				ALPHAMODE(-(0.5));
				__debugInfo = "2038:\ddgui.gbas";
			} else {
				__debugInfo = "2040:\ddgui.gbas";
				ALPHAMODE(0);
				__debugInfo = "2040:\ddgui.gbas";
			};
			__debugInfo = "2043:\ddgui.gbas";
			GETFONTSIZE(local2_fx_ref_1839, local2_fy_ref_1840);
			__debugInfo = "2044:\ddgui.gbas";
			func17_DDGui_PrintIntern(param3_wdg.attr9_wtext_Str_ref, CAST2INT(((((param3_wdg.attr6_wwidth) - (func21_DDGui_TextWidthIntern(param3_wdg.attr9_wtext_Str_ref)))) / (2))), ((param4_ytop) + (CAST2INT(((((param3_wdg.attr7_wheight) - (local2_fy_ref_1840[0]))) / (2))))), 0);
			__debugInfo = "2041:\ddgui.gbas";
		};
		__debugInfo = "2046:\ddgui.gbas";
		ALPHAMODE(0);
		__debugInfo = "2052:\ddgui.gbas";
		if (param3_wdg.attr7_wselect) {
			__debugInfo = "2049:\ddgui.gbas";
			func14_DDgui_backrect(0, param4_ytop, param3_wdg.attr6_wwidth, param3_wdg.attr7_wheight, param10_ddgui_vals.attr14_col_hover_norm);
			__debugInfo = "2049:\ddgui.gbas";
		} else {
			__debugInfo = "2051:\ddgui.gbas";
			func14_DDgui_backrect(0, param4_ytop, param3_wdg.attr6_wwidth, param3_wdg.attr7_wheight, local2_c2_1833);
			__debugInfo = "2051:\ddgui.gbas";
		};
		__debugInfo = "2053:\ddgui.gbas";
		return 0;
		__debugInfo = "1989:\ddgui.gbas";
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
		__debugInfo = "2056:\ddgui.gbas";
		if ((((param3_wdg.attr9_wreadonly) && ((((INSTR(unref(param3_wdg.attr9_wtext_Str_ref[0]), "SPR_C", 0)) != (0)) ? 1 : 0))) ? 1 : 0)) {
			__debugInfo = "2056:\ddgui.gbas";
			return 0;
			__debugInfo = "2056:\ddgui.gbas";
		};
		__debugInfo = "2057:\ddgui.gbas";
		if ((((param2_b1) != (1)) ? 1 : 0)) {
			__debugInfo = "2057:\ddgui.gbas";
			param2_b1 = 0;
			__debugInfo = "2057:\ddgui.gbas";
		};
		__debugInfo = "2058:\ddgui.gbas";
		param3_wdg.attr8_wclicked = param2_b1;
		__debugInfo = "2062:\ddgui.gbas";
		if (((((((param2_b1) && ((((INSTR(unref(param3_wdg.attr9_wtext_Str_ref[0]), "SPR_C", 0)) == (0)) ? 1 : 0))) ? 1 : 0)) && ((((param3_wdg.attr9_wreadonly) == (0)) ? 1 : 0))) ? 1 : 0)) {
			__debugInfo = "2060:\ddgui.gbas";
			param10_ddgui_vals.attr15_kick_intern_dlg = 1;
			__debugInfo = "2061:\ddgui.gbas";
			param10_ddgui_vals.attr18_kick_intern_id_Str = param3_wdg.attr7_wid_Str;
			__debugInfo = "2060:\ddgui.gbas";
		};
		__debugInfo = "2063:\ddgui.gbas";
		return 0;
		__debugInfo = "2056:\ddgui.gbas";
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
		__debugInfo = "2070:\ddgui.gbas";
		if ((((param5_width) == (0)) ? 1 : 0)) {
			__debugInfo = "2070:\ddgui.gbas";
			param5_width = 100;
			__debugInfo = "2070:\ddgui.gbas";
		};
		__debugInfo = "2071:\ddgui.gbas";
		if ((((param6_height) == (0)) ? 1 : 0)) {
			__debugInfo = "2071:\ddgui.gbas";
			param6_height = 16;
			__debugInfo = "2071:\ddgui.gbas";
		};
		__debugInfo = "2072:\ddgui.gbas";
		func12_DDgui_widget(param6_id_Str, CAST2STRING(0), param5_width, param6_height);
		__debugInfo = "2073:\ddgui.gbas";
		func9_DDgui_set(param6_id_Str, "TYPE", "SLIDER");
		__debugInfo = "2074:\ddgui.gbas";
		func9_DDgui_set(param6_id_Str, "TEXT", CAST2STRING(param5_value));
		__debugInfo = "2075:\ddgui.gbas";
		return 0;
		__debugInfo = "2070:\ddgui.gbas";
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
		var local2_c1_1850 = 0, local2_c2_1851 = 0, local1_x_1852 = 0.0, local1_w_1853 = 0, local1_h_1854 = 0, local5_t_Str_1855 = "", local5_sltop_1856 = 0;
		__debugInfo = "2080:\ddgui.gbas";
		local1_w_1853 = param3_wdg.attr6_wwidth;
		__debugInfo = "2081:\ddgui.gbas";
		local1_h_1854 = param3_wdg.attr7_wheight;
		__debugInfo = "2088:\ddgui.gbas";
		if ((((param3_wdg.attr6_whover) > (0)) ? 1 : 0)) {
			__debugInfo = "2083:\ddgui.gbas";
			local2_c1_1850 = param10_ddgui_vals.attr16_col_hover_bright;
			__debugInfo = "2084:\ddgui.gbas";
			local2_c2_1851 = param10_ddgui_vals.attr14_col_hover_norm;
			__debugInfo = "2083:\ddgui.gbas";
		} else {
			__debugInfo = "2086:\ddgui.gbas";
			local2_c1_1850 = param10_ddgui_vals.attr10_col_bright;
			__debugInfo = "2087:\ddgui.gbas";
			local2_c2_1851 = param10_ddgui_vals.attr8_col_norm;
			__debugInfo = "2086:\ddgui.gbas";
		};
		__debugInfo = "2091:\ddgui.gbas";
		DRAWRECT(0, ((param4_ytop) + (CAST2INT(((local1_h_1854) / (2))))), local1_w_1853, 3, local2_c2_1851);
		__debugInfo = "2093:\ddgui.gbas";
		local1_x_1852 = FLOAT2STR(param3_wdg.attr9_wtext_Str_ref[0]);
		__debugInfo = "2095:\ddgui.gbas";
		local1_x_1852+=-(param3_wdg.attr7_wminval);
		__debugInfo = "2096:\ddgui.gbas";
		local1_x_1852 = ((local1_x_1852) / (((param3_wdg.attr7_wmaxval) - (param3_wdg.attr7_wminval))));
		__debugInfo = "2098:\ddgui.gbas";
		local1_x_1852 = ((((((local1_w_1853) - (12))) * (local1_x_1852))) + (6));
		__debugInfo = "2099:\ddgui.gbas";
		local2_c1_1850 = param10_ddgui_vals.attr16_col_hover_bright;
		__debugInfo = "2100:\ddgui.gbas";
		local2_c2_1851 = param10_ddgui_vals.attr14_col_hover_norm;
		__debugInfo = "2102:\ddgui.gbas";
		local1_h_1854 = MIN(((local1_h_1854) - (2)), 24);
		__debugInfo = "2103:\ddgui.gbas";
		local5_sltop_1856 = ((((param4_ytop) + (CAST2INT(((((param3_wdg.attr7_wheight) - (local1_h_1854))) / (2)))))) + (1));
		__debugInfo = "2104:\ddgui.gbas";
		STARTPOLY(-(1), 0);
		__debugInfo = "2105:\ddgui.gbas";
		POLYVECTOR(local1_x_1852, local5_sltop_1856, 0, 0, local2_c1_1850);
		__debugInfo = "2107:\ddgui.gbas";
		POLYVECTOR(((local1_x_1852) - (5)), ((local5_sltop_1856) + (2)), 0, 0, local2_c2_1851);
		__debugInfo = "2108:\ddgui.gbas";
		POLYVECTOR(((local1_x_1852) - (5)), ((((local5_sltop_1856) + (local1_h_1854))) - (2)), 0, 0, local2_c2_1851);
		__debugInfo = "2109:\ddgui.gbas";
		POLYVECTOR(local1_x_1852, ((local5_sltop_1856) + (local1_h_1854)), 0, 0, local2_c1_1850);
		__debugInfo = "2112:\ddgui.gbas";
		POLYVECTOR(((local1_x_1852) + (5)), ((((local5_sltop_1856) + (local1_h_1854))) - (2)), 0, 0, local2_c2_1851);
		__debugInfo = "2113:\ddgui.gbas";
		POLYVECTOR(((local1_x_1852) + (5)), ((local5_sltop_1856) + (2)), 0, 0, local2_c2_1851);
		__debugInfo = "2114:\ddgui.gbas";
		ENDPOLY();
		__debugInfo = "2117:\ddgui.gbas";
		if ((((param3_wdg.attr6_whover) == (0)) ? 1 : 0)) {
			__debugInfo = "2117:\ddgui.gbas";
			local2_c2_1851 = param10_ddgui_vals.attr8_col_norm;
			__debugInfo = "2117:\ddgui.gbas";
		};
		__debugInfo = "2118:\ddgui.gbas";
		func14_DDgui_backrect(0, param4_ytop, param3_wdg.attr6_wwidth, param3_wdg.attr7_wheight, local2_c2_1851);
		__debugInfo = "2119:\ddgui.gbas";
		return 0;
		__debugInfo = "2080:\ddgui.gbas";
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
		__debugInfo = "2122:\ddgui.gbas";
		if (param3_wdg.attr9_wreadonly) {
			__debugInfo = "2122:\ddgui.gbas";
			return 0;
			__debugInfo = "2122:\ddgui.gbas";
		};
		__debugInfo = "2128:\ddgui.gbas";
		if ((((param2_b1) == (-(1))) ? 1 : 0)) {
			__debugInfo = "2127:\ddgui.gbas";
			if (((((((((((((param2_mx) >= (0)) ? 1 : 0)) && ((((param2_my) >= (0)) ? 1 : 0))) ? 1 : 0)) && ((((param2_mx) <= (param3_wdg.attr6_wwidth)) ? 1 : 0))) ? 1 : 0)) && ((((param2_my) <= (param3_wdg.attr7_wheight)) ? 1 : 0))) ? 1 : 0)) {
				__debugInfo = "2126:\ddgui.gbas";
				param10_ddgui_vals.attr9_focus_Str = param3_wdg.attr7_wid_Str;
				__debugInfo = "2126:\ddgui.gbas";
			};
			__debugInfo = "2127:\ddgui.gbas";
		};
		__debugInfo = "2130:\ddgui.gbas";
		param3_wdg.attr8_wclicked = 0;
		__debugInfo = "2152:\ddgui.gbas";
		if ((((param10_ddgui_vals.attr9_focus_Str) == (param3_wdg.attr7_wid_Str)) ? 1 : 0)) {
			__debugInfo = "2151:\ddgui.gbas";
			if (MOUSEAXIS(3)) {
				var local7_old_Str_1863 = "", local3_pos_1864 = 0.0;
				__debugInfo = "2134:\ddgui.gbas";
				local7_old_Str_1863 = param3_wdg.attr9_wtext_Str_ref[0];
				__debugInfo = "2136:\ddgui.gbas";
				local3_pos_1864 = MIN(1, MAX(0, ((((param2_mx) - (5))) / (((param3_wdg.attr6_wwidth) - (9))))));
				__debugInfo = "2138:\ddgui.gbas";
				local3_pos_1864 = ((param3_wdg.attr7_wminval) + (((local3_pos_1864) * (((param3_wdg.attr7_wmaxval) - (param3_wdg.attr7_wminval))))));
				__debugInfo = "2146:\ddgui.gbas";
				if ((((param3_wdg.attr5_wstep) > (0)) ? 1 : 0)) {
					var local6_iSteps_1865 = 0;
					__debugInfo = "2141:\ddgui.gbas";
					local6_iSteps_1865 = ~~(((((local3_pos_1864) / (param3_wdg.attr5_wstep))) + (0.4)));
					__debugInfo = "2142:\ddgui.gbas";
					local3_pos_1864 = ((param3_wdg.attr5_wstep) * (local6_iSteps_1865));
					__debugInfo = "2143:\ddgui.gbas";
					param3_wdg.attr9_wtext_Str_ref[0] = CAST2STRING(local3_pos_1864);
					__debugInfo = "2141:\ddgui.gbas";
				} else {
					__debugInfo = "2145:\ddgui.gbas";
					param3_wdg.attr9_wtext_Str_ref[0] = FORMAT_Str(0, 2, local3_pos_1864);
					__debugInfo = "2145:\ddgui.gbas";
				};
				__debugInfo = "2148:\ddgui.gbas";
				if ((((local7_old_Str_1863) != (param3_wdg.attr9_wtext_Str_ref[0])) ? 1 : 0)) {
					__debugInfo = "2148:\ddgui.gbas";
					param3_wdg.attr8_wclicked = 1;
					__debugInfo = "2148:\ddgui.gbas";
				};
				__debugInfo = "2134:\ddgui.gbas";
			} else {
				__debugInfo = "2150:\ddgui.gbas";
				param10_ddgui_vals.attr9_focus_Str = "";
				__debugInfo = "2150:\ddgui.gbas";
			};
			__debugInfo = "2151:\ddgui.gbas";
		};
		__debugInfo = "2154:\ddgui.gbas";
		return 0;
		__debugInfo = "2122:\ddgui.gbas";
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
		var local2_c1_1869 = 0, local2_c2_1870 = 0, local5_hover_1871 = 0, local5_check_1872 = 0, local1_r_1873 = 0, local2_tx_ref_1874 = [0], local2_ty_ref_1875 = [0], local7_txt_Str_ref_1876 = [""];
		__debugInfo = "2193:\ddgui.gbas";
		local7_txt_Str_ref_1876[0] = param3_wdg.attr9_wtext_Str_ref[0];
		__debugInfo = "2194:\ddgui.gbas";
		GETFONTSIZE(local2_tx_ref_1874, local2_ty_ref_1875);
		__debugInfo = "2196:\ddgui.gbas";
		if (param3_wdg.attr7_wselect) {
			__debugInfo = "2196:\ddgui.gbas";
			local5_check_1872 = 1;
			__debugInfo = "2196:\ddgui.gbas";
		};
		__debugInfo = "2197:\ddgui.gbas";
		if ((((param3_wdg.attr6_whover) && ((((param3_wdg.attr9_wreadonly) == (0)) ? 1 : 0))) ? 1 : 0)) {
			__debugInfo = "2197:\ddgui.gbas";
			local5_hover_1871 = 1;
			__debugInfo = "2197:\ddgui.gbas";
		};
		__debugInfo = "2210:\ddgui.gbas";
		if (local5_hover_1871) {
			__debugInfo = "2199:\ddgui.gbas";
			local2_c1_1869 = param10_ddgui_vals.attr16_col_hover_bright;
			__debugInfo = "2200:\ddgui.gbas";
			local2_c2_1870 = param10_ddgui_vals.attr14_col_hover_norm;
			__debugInfo = "2205:\ddgui.gbas";
			if ((((local5_hover_1871) == (0)) ? 1 : 0)) {
				__debugInfo = "2202:\ddgui.gbas";
				local1_r_1873 = local2_c1_1869;
				__debugInfo = "2203:\ddgui.gbas";
				local2_c1_1869 = local2_c2_1870;
				__debugInfo = "2204:\ddgui.gbas";
				local2_c2_1870 = local1_r_1873;
				__debugInfo = "2202:\ddgui.gbas";
			};
			__debugInfo = "2206:\ddgui.gbas";
			func14_DDgui_backrect(1, ((param4_ytop) + (1)), ((param3_wdg.attr6_wwidth) - (1)), ((local2_ty_ref_1875[0]) - (1)), local2_c1_1869);
			__debugInfo = "2199:\ddgui.gbas";
		} else {
			__debugInfo = "2208:\ddgui.gbas";
			local2_c1_1869 = param10_ddgui_vals.attr10_col_bright;
			__debugInfo = "2209:\ddgui.gbas";
			local2_c2_1870 = param10_ddgui_vals.attr8_col_norm;
			__debugInfo = "2208:\ddgui.gbas";
		};
		__debugInfo = "2211:\ddgui.gbas";
		func17_DDGui_PrintIntern(local7_txt_Str_ref_1876, ~~(((((local2_tx_ref_1874[0]) * (1.7))) + (1))), ((param4_ytop) + (1)), local5_check_1872);
		__debugInfo = "2217:\ddgui.gbas";
		if (local5_check_1872) {
			__debugInfo = "2213:\ddgui.gbas";
			local2_c1_1869 = param10_ddgui_vals.attr16_col_hover_bright;
			__debugInfo = "2214:\ddgui.gbas";
			local2_c2_1870 = param10_ddgui_vals.attr14_col_hover_norm;
			__debugInfo = "2213:\ddgui.gbas";
		} else {
			__debugInfo = "2215:\ddgui.gbas";
			local2_c1_1869 = param10_ddgui_vals.attr10_col_bright;
			__debugInfo = "2216:\ddgui.gbas";
			local2_c2_1870 = param10_ddgui_vals.attr8_col_norm;
			__debugInfo = "2215:\ddgui.gbas";
		};
		__debugInfo = "2218:\ddgui.gbas";
		func13_DDgui_backgnd(local2_c1_1869, local2_c2_1870, 3, ((param4_ytop) + (3)), ((local2_ty_ref_1875[0]) - (4)), ((local2_ty_ref_1875[0]) - (4)));
		__debugInfo = "2219:\ddgui.gbas";
		func14_DDgui_backrect(2, ((param4_ytop) + (2)), ((local2_ty_ref_1875[0]) - (2)), ((local2_ty_ref_1875[0]) - (2)), local2_c2_1870);
		__debugInfo = "2220:\ddgui.gbas";
		return 0;
		__debugInfo = "2193:\ddgui.gbas";
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
		__debugInfo = "2223:\ddgui.gbas";
		if (param3_wdg.attr9_wreadonly) {
			__debugInfo = "2223:\ddgui.gbas";
			return 0;
			__debugInfo = "2223:\ddgui.gbas";
		};
		__debugInfo = "2224:\ddgui.gbas";
		param3_wdg.attr8_wclicked = 0;
		__debugInfo = "2228:\ddgui.gbas";
		if ((((param2_b1) == (1)) ? 1 : 0)) {
			__debugInfo = "2226:\ddgui.gbas";
			param3_wdg.attr7_wselect = ((1) - (param3_wdg.attr7_wselect));
			__debugInfo = "2227:\ddgui.gbas";
			param3_wdg.attr8_wclicked = 1;
			__debugInfo = "2226:\ddgui.gbas";
		};
		__debugInfo = "2229:\ddgui.gbas";
		return 0;
		__debugInfo = "2223:\ddgui.gbas";
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
		var local1_i_1886 = 0, local2_tx_ref_1887 = [0], local2_ty_ref_1888 = [0], local1_h_1889 = 0, local5_hover_1890 = 0, local5_check_1891 = 0, local6_bright_1892 = 0, local4_dark_1893 = 0, local8_bright_h_1894 = 0, local6_dark_h_1895 = 0, local3_num_1896 = 0, local7_opt_Str_ref_1897 = [""];
		__debugInfo = "2261:\ddgui.gbas";
		local6_bright_1892 = param10_ddgui_vals.attr10_col_bright;
		__debugInfo = "2262:\ddgui.gbas";
		local4_dark_1893 = param10_ddgui_vals.attr8_col_norm;
		__debugInfo = "2263:\ddgui.gbas";
		local8_bright_h_1894 = param10_ddgui_vals.attr16_col_hover_bright;
		__debugInfo = "2264:\ddgui.gbas";
		local6_dark_h_1895 = param10_ddgui_vals.attr14_col_hover_norm;
		__debugInfo = "2267:\ddgui.gbas";
		GETFONTSIZE(local2_tx_ref_1887, local2_ty_ref_1888);
		__debugInfo = "2269:\ddgui.gbas";
		local2_tx_ref_1887[0] = MAX(12, unref(local2_tx_ref_1887[0]));
		__debugInfo = "2270:\ddgui.gbas";
		local2_ty_ref_1888[0] = MAX(12, unref(local2_ty_ref_1888[0]));
		__debugInfo = "2273:\ddgui.gbas";
		local3_num_1896 = param3_wdg.attr6_wcount;
		__debugInfo = "2274:\ddgui.gbas";
		local1_h_1889 = MAX(unref(local2_ty_ref_1888[0]), global25_gDDguiMinControlDimension);
		__debugInfo = "2276:\ddgui.gbas";
		param4_ytop+=CAST2INT(((((local1_h_1889) - (local2_ty_ref_1888[0]))) / (2)));
		__debugInfo = "2281:\ddgui.gbas";
		DRAWRECT(((CAST2INT(((local2_ty_ref_1888[0]) / (2)))) - (1)), ((param4_ytop) + (1)), 3, ((((((local3_num_1896) * (local1_h_1889))) - (4))) - (((local1_h_1889) - (local2_ty_ref_1888[0])))), local4_dark_1893);
		__debugInfo = "2283:\ddgui.gbas";
		{
			__debugInfo = "2306:\ddgui.gbas";
			for (local1_i_1886 = 0;toCheck(local1_i_1886, 9999, 1);local1_i_1886 += 1) {
				var local5_yitem_1898 = 0;
				__debugInfo = "2285:\ddgui.gbas";
				param3_wdg.attr6_wcount = local1_i_1886;
				__debugInfo = "2286:\ddgui.gbas";
				local7_opt_Str_ref_1897[0] = func31_DDgui_intern_list_item_text_Str(param3_wdg.attr9_wtext_Str_ref, local1_i_1886);
				__debugInfo = "2287:\ddgui.gbas";
				if (((((local7_opt_Str_ref_1897[0]).length) == (0)) ? 1 : 0)) {
					__debugInfo = "2287:\ddgui.gbas";
					break;
					__debugInfo = "2287:\ddgui.gbas";
				};
				__debugInfo = "2289:\ddgui.gbas";
				local5_yitem_1898 = ((param4_ytop) + (((local1_i_1886) * (local1_h_1889))));
				__debugInfo = "2290:\ddgui.gbas";
				local5_hover_1890 = 0;
				__debugInfo = "2291:\ddgui.gbas";
				local5_check_1891 = 0;
				__debugInfo = "2292:\ddgui.gbas";
				if ((((param3_wdg.attr7_wselect) == (local1_i_1886)) ? 1 : 0)) {
					__debugInfo = "2292:\ddgui.gbas";
					local5_check_1891 = 1;
					__debugInfo = "2292:\ddgui.gbas";
				};
				__debugInfo = "2293:\ddgui.gbas";
				if (((((((param3_wdg.attr6_whover) == (local1_i_1886)) ? 1 : 0)) && ((((param3_wdg.attr9_wreadonly) == (0)) ? 1 : 0))) ? 1 : 0)) {
					__debugInfo = "2293:\ddgui.gbas";
					local5_hover_1890 = 1;
					__debugInfo = "2293:\ddgui.gbas";
				};
				__debugInfo = "2298:\ddgui.gbas";
				if (local5_check_1891) {
					__debugInfo = "2296:\ddgui.gbas";
					func13_DDgui_backgnd(local8_bright_h_1894, local6_dark_h_1895, 3, ((local5_yitem_1898) + (2)), ((local2_ty_ref_1888[0]) - (6)), ((local2_ty_ref_1888[0]) - (6)));
					__debugInfo = "2297:\ddgui.gbas";
					func14_DDgui_backrect(2, ((local5_yitem_1898) + (1)), ((local2_ty_ref_1888[0]) - (4)), ((local2_ty_ref_1888[0]) - (4)), local6_dark_h_1895);
					__debugInfo = "2296:\ddgui.gbas";
				};
				__debugInfo = "2303:\ddgui.gbas";
				if (local5_hover_1890) {
					__debugInfo = "2302:\ddgui.gbas";
					if (local5_hover_1890) {
						__debugInfo = "2301:\ddgui.gbas";
						func14_DDgui_backrect(0, ((local5_yitem_1898) - (CAST2INT(((((local1_h_1889) - (local2_ty_ref_1888[0]))) / (2))))), ((param3_wdg.attr6_wwidth) - (1)), ((local1_h_1889) - (1)), local8_bright_h_1894);
						__debugInfo = "2301:\ddgui.gbas";
					};
					__debugInfo = "2302:\ddgui.gbas";
				};
				__debugInfo = "2305:\ddgui.gbas";
				func17_DDGui_PrintIntern(local7_opt_Str_ref_1897, ~~(((local2_tx_ref_1887[0]) * (1.7))), local5_yitem_1898, local5_check_1891);
				__debugInfo = "2285:\ddgui.gbas";
			};
			__debugInfo = "2306:\ddgui.gbas";
		};
		__debugInfo = "2310:\ddgui.gbas";
		return 0;
		__debugInfo = "2261:\ddgui.gbas";
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
		var local2_tx_ref_1905 = [0], local2_ty_ref_1906 = [0], local1_h_1907 = 0, local5_hover_1908 = 0, local6_oldsel_1909 = 0, local3_num_1910 = 0;
		__debugInfo = "2313:\ddgui.gbas";
		if (param3_wdg.attr9_wreadonly) {
			__debugInfo = "2313:\ddgui.gbas";
			return 0;
			__debugInfo = "2313:\ddgui.gbas";
		};
		__debugInfo = "2319:\ddgui.gbas";
		GETFONTSIZE(local2_tx_ref_1905, local2_ty_ref_1906);
		__debugInfo = "2320:\ddgui.gbas";
		local3_num_1910 = SPLITSTR(unref(param3_wdg.attr9_wtext_Str_ref[0]), unref(static7_DDgui_handleradio_txt_Str), "|", 1);
		__debugInfo = "2321:\ddgui.gbas";
		local1_h_1907 = MAX(unref(local2_ty_ref_1906[0]), global25_gDDguiMinControlDimension);
		__debugInfo = "2322:\ddgui.gbas";
		param3_wdg.attr7_wheight = ((local1_h_1907) * (local3_num_1910));
		__debugInfo = "2323:\ddgui.gbas";
		param3_wdg.attr8_wclicked = 0;
		__debugInfo = "2325:\ddgui.gbas";
		param3_wdg.attr6_whover = -(1);
		__debugInfo = "2337:\ddgui.gbas";
		if (((((((((((((param2_my) > (0)) ? 1 : 0)) && ((((param2_my) <= (param3_wdg.attr7_wheight)) ? 1 : 0))) ? 1 : 0)) && ((((param2_mx) > (0)) ? 1 : 0))) ? 1 : 0)) && ((((param2_mx) < (param3_wdg.attr6_wwidth)) ? 1 : 0))) ? 1 : 0)) {
			__debugInfo = "2327:\ddgui.gbas";
			param2_my = INTEGER(CAST2INT(((param2_my) / (local1_h_1907))));
			__debugInfo = "2335:\ddgui.gbas";
			if ((((param2_b1) == (1)) ? 1 : 0)) {
				__debugInfo = "2329:\ddgui.gbas";
				local6_oldsel_1909 = param3_wdg.attr7_wselect;
				__debugInfo = "2334:\ddgui.gbas";
				if ((((param2_my) != (local6_oldsel_1909)) ? 1 : 0)) {
					__debugInfo = "2331:\ddgui.gbas";
					param2_my = MIN(param2_my, ((local3_num_1910) - (1)));
					__debugInfo = "2332:\ddgui.gbas";
					param3_wdg.attr7_wselect = param2_my;
					__debugInfo = "2333:\ddgui.gbas";
					param3_wdg.attr8_wclicked = 1;
					__debugInfo = "2331:\ddgui.gbas";
				};
				__debugInfo = "2329:\ddgui.gbas";
			};
			__debugInfo = "2336:\ddgui.gbas";
			param3_wdg.attr6_whover = param2_my;
			__debugInfo = "2327:\ddgui.gbas";
		};
		__debugInfo = "2338:\ddgui.gbas";
		return 0;
		__debugInfo = "2313:\ddgui.gbas";
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
		var local2_c1_1915 = 0, local2_c2_1916 = 0, local2_tx_ref_1917 = [0], local2_ty_ref_1918 = [0], local7_txt_Str_ref_1919 = [""], local7_dheight_1920 = 0;
		__debugInfo = "2356:\ddgui.gbas";
		GETFONTSIZE(local2_tx_ref_1917, local2_ty_ref_1918);
		__debugInfo = "2363:\ddgui.gbas";
		if (((((((param3_wdg.attr6_whover) > (0)) ? 1 : 0)) && ((((param3_wdg.attr9_wreadonly) == (0)) ? 1 : 0))) ? 1 : 0)) {
			__debugInfo = "2358:\ddgui.gbas";
			local2_c1_1915 = param10_ddgui_vals.attr16_col_hover_bright;
			__debugInfo = "2359:\ddgui.gbas";
			local2_c2_1916 = param10_ddgui_vals.attr14_col_hover_norm;
			__debugInfo = "2358:\ddgui.gbas";
		} else {
			__debugInfo = "2361:\ddgui.gbas";
			local2_c1_1915 = param10_ddgui_vals.attr10_col_bright;
			__debugInfo = "2362:\ddgui.gbas";
			local2_c2_1916 = param10_ddgui_vals.attr8_col_norm;
			__debugInfo = "2361:\ddgui.gbas";
		};
		__debugInfo = "2364:\ddgui.gbas";
		func13_DDgui_backgnd(local2_c1_1915, local2_c2_1916, 0, param4_ytop, param3_wdg.attr6_wwidth, param3_wdg.attr7_wheight);
		__debugInfo = "2367:\ddgui.gbas";
		local7_dheight_1920 = ~~(((local2_ty_ref_1918[0]) * (1.2)));
		__debugInfo = "2370:\ddgui.gbas";
		DRAWRECT(1, ((param4_ytop) + (1)), local7_dheight_1920, local7_dheight_1920, RGB(71, 107, 254));
		__debugInfo = "2371:\ddgui.gbas";
		DRAWRECT(((1) + (((local7_dheight_1920) * (0.2)))), ((param4_ytop) + (1)), ((((local7_dheight_1920) * (0.8))) - (2)), ((((local7_dheight_1920) * (0.6))) - (1)), 16777215);
		__debugInfo = "2372:\ddgui.gbas";
		DRAWRECT(((1) + (((local7_dheight_1920) * (0.2)))), ((((param4_ytop) + (1))) + (((local7_dheight_1920) * (0.7)))), ((((local7_dheight_1920) * (0.8))) - (2)), ((((local7_dheight_1920) * (0.3))) + (1)), RGB(204, 204, 204));
		__debugInfo = "2374:\ddgui.gbas";
		local7_txt_Str_ref_1919[0] = param3_wdg.attr9_wtext_Str_ref[0];
		__debugInfo = "2375:\ddgui.gbas";
		local2_ty_ref_1918[0] = 0;
		__debugInfo = "2377:\ddgui.gbas";
		{
			__debugInfo = "2380:\ddgui.gbas";
			for (local2_tx_ref_1917[0] = (((local7_txt_Str_ref_1919[0]).length) - (1));toCheck(local2_tx_ref_1917[0], 0, -(1));local2_tx_ref_1917[0] += -(1)) {
				__debugInfo = "2379:\ddgui.gbas";
				if ((((MID_Str(unref(local7_txt_Str_ref_1919[0]), unref(local2_tx_ref_1917[0]), 1)) == ("/")) ? 1 : 0)) {
					__debugInfo = "2378:\ddgui.gbas";
					local2_ty_ref_1918[0] = ((local2_tx_ref_1917[0]) + (1));
					__debugInfo = "2378:\ddgui.gbas";
					break;
					__debugInfo = "2378:\ddgui.gbas";
				};
				__debugInfo = "2379:\ddgui.gbas";
			};
			__debugInfo = "2380:\ddgui.gbas";
		};
		__debugInfo = "2381:\ddgui.gbas";
		local7_txt_Str_ref_1919[0] = MID_Str(unref(local7_txt_Str_ref_1919[0]), unref(local2_ty_ref_1918[0]), (local7_txt_Str_ref_1919[0]).length);
		__debugInfo = "2383:\ddgui.gbas";
		func17_DDGui_PrintIntern(local7_txt_Str_ref_1919, ((local7_dheight_1920) + (3)), ((param4_ytop) + (3)), 0);
		__debugInfo = "2386:\ddgui.gbas";
		func14_DDgui_backrect(0, param4_ytop, param3_wdg.attr6_wwidth, param3_wdg.attr7_wheight, local2_c2_1916);
		__debugInfo = "2387:\ddgui.gbas";
		return 0;
		__debugInfo = "2356:\ddgui.gbas";
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
		var local5_a_Str_1927 = "";
		__debugInfo = "2390:\ddgui.gbas";
		if (param3_wdg.attr9_wreadonly) {
			__debugInfo = "2390:\ddgui.gbas";
			return 0;
			__debugInfo = "2390:\ddgui.gbas";
		};
		__debugInfo = "2393:\ddgui.gbas";
		if (((((param3_wdg.attr11_wfilter_Str).length) == (0)) ? 1 : 0)) {
			__debugInfo = "2393:\ddgui.gbas";
			param3_wdg.attr11_wfilter_Str = "*.*";
			__debugInfo = "2393:\ddgui.gbas";
		};
		__debugInfo = "2394:\ddgui.gbas";
		func9_DDgui_set(param3_wdg.attr7_wid_Str, "CLICKED", CAST2STRING(0));
		__debugInfo = "2408:\ddgui.gbas";
		if ((((param2_b1) == (1)) ? 1 : 0)) {
			__debugInfo = "2396:\ddgui.gbas";
			if (param3_wdg.attr9_wreadonly) {
				__debugInfo = "2396:\ddgui.gbas";
				return 0;
				__debugInfo = "2396:\ddgui.gbas";
			};
			__debugInfo = "2398:\ddgui.gbas";
			param10_ddgui_vals.attr15_kick_intern_dlg = 4;
			__debugInfo = "2399:\ddgui.gbas";
			param10_ddgui_vals.attr18_kick_intern_id_Str = param3_wdg.attr7_wid_Str;
			__debugInfo = "2396:\ddgui.gbas";
		};
		__debugInfo = "2409:\ddgui.gbas";
		return 0;
		__debugInfo = "2390:\ddgui.gbas";
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
		var local3_spx_ref_1933 = [0], local3_spy_ref_1934 = [0];
		__debugInfo = "2415:\ddgui.gbas";
		if (((((((param1_w) < (1)) ? 1 : 0)) || ((((param1_h) < (1)) ? 1 : 0))) ? 1 : 0)) {
			__debugInfo = "2415:\ddgui.gbas";
			return 0;
			__debugInfo = "2415:\ddgui.gbas";
		};
		__debugInfo = "2418:\ddgui.gbas";
		GETSPRITESIZE(param2_id, local3_spx_ref_1933, local3_spy_ref_1934);
		__debugInfo = "2419:\ddgui.gbas";
		if (((((((local3_spx_ref_1933[0]) == (0)) ? 1 : 0)) || ((((local3_spy_ref_1934[0]) == (0)) ? 1 : 0))) ? 1 : 0)) {
			__debugInfo = "2419:\ddgui.gbas";
			return 0;
			__debugInfo = "2419:\ddgui.gbas";
		};
		__debugInfo = "2435:\ddgui.gbas";
		if (((((((local3_spx_ref_1933[0]) <= (param1_w)) ? 1 : 0)) && ((((local3_spy_ref_1934[0]) <= (param1_h)) ? 1 : 0))) ? 1 : 0)) {
			__debugInfo = "2422:\ddgui.gbas";
			DRAWSPRITE(param2_id, ((param1_x) + (CAST2INT(((((param1_w) - (local3_spx_ref_1933[0]))) / (2))))), ((param1_y) + (CAST2INT(((((param1_h) - (local3_spy_ref_1934[0]))) / (2))))));
			__debugInfo = "2422:\ddgui.gbas";
		} else {
			var local4_facx_1935 = 0.0, local4_facy_1936 = 0.0, local2_dw_1937 = 0.0, local2_dh_1938 = 0.0;
			__debugInfo = "2423:\ddgui.gbas";
			local4_facx_1935 = param1_w;
			__debugInfo = "2424:\ddgui.gbas";
			local4_facx_1935 = ((local4_facx_1935) / (local3_spx_ref_1933[0]));
			__debugInfo = "2424:\ddgui.gbas";
			local4_facy_1936 = param1_h;
			__debugInfo = "2425:\ddgui.gbas";
			local4_facy_1936 = ((local4_facy_1936) / (local3_spy_ref_1934[0]));
			__debugInfo = "2433:\ddgui.gbas";
			if ((((local4_facx_1935) < (local4_facy_1936)) ? 1 : 0)) {
				__debugInfo = "2428:\ddgui.gbas";
				local2_dw_1937 = ((local3_spx_ref_1933[0]) * (local4_facx_1935));
				__debugInfo = "2429:\ddgui.gbas";
				local2_dh_1938 = ((local3_spy_ref_1934[0]) * (local4_facx_1935));
				__debugInfo = "2428:\ddgui.gbas";
			} else {
				__debugInfo = "2431:\ddgui.gbas";
				local2_dw_1937 = ((local3_spx_ref_1933[0]) * (local4_facy_1936));
				__debugInfo = "2432:\ddgui.gbas";
				local2_dh_1938 = ((local3_spy_ref_1934[0]) * (local4_facy_1936));
				__debugInfo = "2431:\ddgui.gbas";
			};
			__debugInfo = "2434:\ddgui.gbas";
			STRETCHSPRITE(param2_id, ((param1_x) + (((((param1_w) - (local2_dw_1937))) / (2)))), ((param1_y) + (((((param1_h) - (local2_dh_1938))) / (2)))), local2_dw_1937, local2_dh_1938);
			__debugInfo = "2423:\ddgui.gbas";
		};
		__debugInfo = "2436:\ddgui.gbas";
		return 0;
		__debugInfo = "2415:\ddgui.gbas";
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
		var local2_tx_ref_2280 = [0], local2_ty_ref_2281 = [0];
		__debugInfo = "2441:\ddgui.gbas";
		GETFONTSIZE(local2_tx_ref_2280, local2_ty_ref_2281);
		__debugInfo = "2442:\ddgui.gbas";
		if ((((param6_height) == (0)) ? 1 : 0)) {
			__debugInfo = "2442:\ddgui.gbas";
			param6_height = local2_ty_ref_2281[0];
			__debugInfo = "2442:\ddgui.gbas";
		};
		__debugInfo = "2443:\ddgui.gbas";
		func10_DDgui_list(param6_id_Str, param9_texts_Str, param5_width, param6_height);
		__debugInfo = "2444:\ddgui.gbas";
		func9_DDgui_set(param6_id_Str, "TYPE", "COMBO");
		__debugInfo = "2445:\ddgui.gbas";
		return 0;
		__debugInfo = "2441:\ddgui.gbas";
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
		var local2_fx_ref_1942 = [0], local2_fy_ref_1943 = [0], local2_c1_1944 = 0, local2_c2_1945 = 0, local5_hover_1946 = 0, local1_x_1947 = 0, local1_y_1948 = 0, local1_w_1949 = 0, local1_h_1950 = 0;
		__debugInfo = "2453:\ddgui.gbas";
		GETFONTSIZE(local2_fx_ref_1942, local2_fy_ref_1943);
		__debugInfo = "2458:\ddgui.gbas";
		local5_hover_1946 = param3_wdg.attr6_whover;
		__debugInfo = "2466:\ddgui.gbas";
		if (((((((local5_hover_1946) > (0)) ? 1 : 0)) && ((((param3_wdg.attr9_wreadonly) == (0)) ? 1 : 0))) ? 1 : 0)) {
			__debugInfo = "2461:\ddgui.gbas";
			local2_c1_1944 = param10_ddgui_vals.attr16_col_hover_bright;
			__debugInfo = "2462:\ddgui.gbas";
			local2_c2_1945 = param10_ddgui_vals.attr14_col_hover_norm;
			__debugInfo = "2461:\ddgui.gbas";
		} else {
			__debugInfo = "2464:\ddgui.gbas";
			local2_c1_1944 = param10_ddgui_vals.attr10_col_bright;
			__debugInfo = "2465:\ddgui.gbas";
			local2_c2_1945 = param10_ddgui_vals.attr8_col_norm;
			__debugInfo = "2464:\ddgui.gbas";
		};
		__debugInfo = "2467:\ddgui.gbas";
		func13_DDgui_backgnd(local2_c1_1944, local2_c2_1945, 1, ((param4_ytop) + (1)), ((param3_wdg.attr6_wwidth) - (2)), ((param3_wdg.attr7_wheight) - (2)));
		__debugInfo = "2468:\ddgui.gbas";
		func13_DDgui_backgnd(param10_ddgui_vals.attr16_col_hover_bright, param10_ddgui_vals.attr14_col_hover_norm, ((param3_wdg.attr6_wwidth) - (((local2_fx_ref_1942[0]) * (2)))), ((param4_ytop) + (1)), ((local2_fx_ref_1942[0]) * (2)), ((param3_wdg.attr7_wheight) - (2)));
		__debugInfo = "2470:\ddgui.gbas";
		STARTPOLY(-(1), 0);
		__debugInfo = "2471:\ddgui.gbas";
		POLYVECTOR(((param3_wdg.attr6_wwidth) - (((local2_fx_ref_1942[0]) * (1.7)))), ((param4_ytop) + (((param3_wdg.attr7_wheight) * (0.2)))), 0, 0, local2_c1_1944);
		__debugInfo = "2472:\ddgui.gbas";
		POLYVECTOR(((param3_wdg.attr6_wwidth) - (((local2_fx_ref_1942[0]) * (1)))), ((param4_ytop) + (((param3_wdg.attr7_wheight) * (0.8)))), 0, 0, local2_c1_1944);
		__debugInfo = "2473:\ddgui.gbas";
		POLYVECTOR(((param3_wdg.attr6_wwidth) - (((local2_fx_ref_1942[0]) * (0.3)))), ((param4_ytop) + (((param3_wdg.attr7_wheight) * (0.2)))), 0, 0, local2_c1_1944);
		__debugInfo = "2474:\ddgui.gbas";
		ENDPOLY();
		__debugInfo = "2475:\ddgui.gbas";
		local1_x_1947 = 1;
		__debugInfo = "2475:\ddgui.gbas";
		local1_y_1948 = ((param4_ytop) + (1));
		__debugInfo = "2475:\ddgui.gbas";
		local1_w_1949 = ((((param3_wdg.attr6_wwidth) - (2))) - (((2) * (local2_fx_ref_1942[0]))));
		__debugInfo = "2476:\ddgui.gbas";
		local1_h_1950 = ((param3_wdg.attr7_wheight) - (2));
		__debugInfo = "2484:\ddgui.gbas";
		if (param3_wdg.attr7_wselect) {
			__debugInfo = "2480:\ddgui.gbas";
			local1_x_1947+=1;
			__debugInfo = "2481:\ddgui.gbas";
			local1_y_1948+=1;
			__debugInfo = "2482:\ddgui.gbas";
			local1_w_1949+=-(2);
			__debugInfo = "2483:\ddgui.gbas";
			local1_h_1950+=-(2);
			__debugInfo = "2480:\ddgui.gbas";
		};
		__debugInfo = "2511:\ddgui.gbas";
		if ((((param3_wdg.attr7_wselect) >= (0)) ? 1 : 0)) {
			var local5_a_Str_ref_1951 = [""];
			__debugInfo = "2487:\ddgui.gbas";
			local5_a_Str_ref_1951[0] = func31_DDgui_intern_list_item_text_Str(param3_wdg.attr9_wtext_Str_ref, param3_wdg.attr7_wselect);
			__debugInfo = "2510:\ddgui.gbas";
			if ((((INSTR(unref(local5_a_Str_ref_1951[0]), "SPR_B", 0)) == (0)) ? 1 : 0)) {
				__debugInfo = "2495:\ddgui.gbas";
				if ((((local5_hover_1946) == (0)) ? 1 : 0)) {
					__debugInfo = "2492:\ddgui.gbas";
					ALPHAMODE(-(1));
					__debugInfo = "2492:\ddgui.gbas";
				} else {
					__debugInfo = "2494:\ddgui.gbas";
					ALPHAMODE(-(0.8));
					__debugInfo = "2494:\ddgui.gbas";
				};
				__debugInfo = "2496:\ddgui.gbas";
				local2_c1_1944 = INTEGER(FLOAT2STR(MID_Str(unref(local5_a_Str_ref_1951[0]), 5, -(1))));
				__debugInfo = "2497:\ddgui.gbas";
				func23_DDgui_fit_sprite_in_box(local2_c1_1944, ((local1_x_1947) + (1)), ((local1_y_1948) + (1)), ((local1_w_1949) - (2)), ((local1_h_1950) - (2)));
				__debugInfo = "2495:\ddgui.gbas";
			} else if ((((INSTR(unref(local5_a_Str_ref_1951[0]), "SPR_C", 0)) == (0)) ? 1 : 0)) {
				__debugInfo = "2504:\ddgui.gbas";
				if ((((local5_hover_1946) == (0)) ? 1 : 0)) {
					__debugInfo = "2501:\ddgui.gbas";
					ALPHAMODE(-(1));
					__debugInfo = "2501:\ddgui.gbas";
				} else {
					__debugInfo = "2503:\ddgui.gbas";
					ALPHAMODE(-(0.8));
					__debugInfo = "2503:\ddgui.gbas";
				};
				__debugInfo = "2505:\ddgui.gbas";
				local2_c1_1944 = INTEGER(FLOAT2STR(MID_Str(unref(local5_a_Str_ref_1951[0]), 5, -(1))));
				__debugInfo = "2506:\ddgui.gbas";
				DRAWRECT(local1_x_1947, local1_y_1948, local1_w_1949, local1_h_1950, local2_c1_1944);
				__debugInfo = "2504:\ddgui.gbas";
			} else {
				__debugInfo = "2508:\ddgui.gbas";
				if ((((local5_hover_1946) == (0)) ? 1 : 0)) {
					__debugInfo = "2508:\ddgui.gbas";
					ALPHAMODE(-(0.8));
					__debugInfo = "2508:\ddgui.gbas";
				};
				__debugInfo = "2509:\ddgui.gbas";
				func17_DDGui_PrintIntern(local5_a_Str_ref_1951, CAST2INT(((((local1_w_1949) - (func21_DDGui_TextWidthIntern(local5_a_Str_ref_1951)))) / (2))), ((param4_ytop) + (CAST2INT(((((param3_wdg.attr7_wheight) - (local2_fy_ref_1943[0]))) / (2))))), 0);
				__debugInfo = "2508:\ddgui.gbas";
			};
			__debugInfo = "2487:\ddgui.gbas";
		};
		__debugInfo = "2514:\ddgui.gbas";
		ALPHAMODE(0);
		__debugInfo = "2516:\ddgui.gbas";
		func14_DDgui_backrect(0, param4_ytop, param3_wdg.attr6_wwidth, param3_wdg.attr7_wheight, local2_c2_1945);
		__debugInfo = "2517:\ddgui.gbas";
		return 0;
		__debugInfo = "2453:\ddgui.gbas";
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
		__debugInfo = "2521:\ddgui.gbas";
		param3_wdg.attr8_wclicked = 0;
		__debugInfo = "2525:\ddgui.gbas";
		if ((((param2_b1) == (1)) ? 1 : 0)) {
			__debugInfo = "2523:\ddgui.gbas";
			param10_ddgui_vals.attr15_kick_intern_dlg = 3;
			__debugInfo = "2524:\ddgui.gbas";
			param10_ddgui_vals.attr18_kick_intern_id_Str = param3_wdg.attr7_wid_Str;
			__debugInfo = "2523:\ddgui.gbas";
		};
		__debugInfo = "2526:\ddgui.gbas";
		return 0;
		__debugInfo = "2521:\ddgui.gbas";
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
		var local2_tx_ref_1964 = [0], local2_ty_ref_1965 = [0], local8_numitems_1966 = 0, local8_vals_Str_1967 = new GLBArray(), local7_screenx_ref_1968 = [0], local7_screeny_ref_1969 = [0], local2_mx_ref_1970 = [0], local2_my_ref_1971 = [0], local2_b1_ref_1972 = [0], local2_b2_ref_1973 = [0], local4_down_1974 = 0, local2_px_1975 = 0, local2_py_1976 = 0;
		__debugInfo = "2533:\ddgui.gbas";
		GETFONTSIZE(local2_tx_ref_1964, local2_ty_ref_1965);
		__debugInfo = "2534:\ddgui.gbas";
		local2_tx_ref_1964[0] = MAX(unref(local2_tx_ref_1964[0]), global20_gDDguiScrollbarWidth);
		__debugInfo = "2535:\ddgui.gbas";
		local2_ty_ref_1965[0] = MAX(unref(local2_ty_ref_1965[0]), global25_gDDguiMinControlDimension);
		__debugInfo = "2539:\ddgui.gbas";
		SPLITSTR(param9_texts_Str, unref(local8_vals_Str_1967), "|", 1);
		__debugInfo = "2540:\ddgui.gbas";
		local8_numitems_1966 = BOUNDS(local8_vals_Str_1967, 0);
		__debugInfo = "2541:\ddgui.gbas";
		if ((((local8_numitems_1966) == (0)) ? 1 : 0)) {
			__debugInfo = "2541:\ddgui.gbas";
			return tryClone(-(1));
			__debugInfo = "2541:\ddgui.gbas";
		};
		__debugInfo = "2544:\ddgui.gbas";
		GETSCREENSIZE(local7_screenx_ref_1968, local7_screeny_ref_1969);
		__debugInfo = "2545:\ddgui.gbas";
		if ((((param1_h) > (((((local2_ty_ref_1965[0]) * (local8_numitems_1966))) + (8)))) ? 1 : 0)) {
			__debugInfo = "2545:\ddgui.gbas";
			param1_h = ((((local2_ty_ref_1965[0]) * (local8_numitems_1966))) + (8));
			__debugInfo = "2545:\ddgui.gbas";
		};
		__debugInfo = "2546:\ddgui.gbas";
		if ((((((param1_y) + (param1_h))) >= (local7_screeny_ref_1969[0])) ? 1 : 0)) {
			__debugInfo = "2546:\ddgui.gbas";
			param1_h = ((((local7_screeny_ref_1969[0]) - (param1_y))) - (1));
			__debugInfo = "2546:\ddgui.gbas";
		};
		__debugInfo = "2548:\ddgui.gbas";
		func16_DDgui_pushdialog(((param1_x) - (1)), ((param1_y) - (1)), ((param1_w) + (2)), ((param1_h) + (2)), 0);
		__debugInfo = "2550:\ddgui.gbas";
		func10_DDgui_list("lst", param9_texts_Str, ((param1_w) - (4)), param1_h);
		__debugInfo = "2551:\ddgui.gbas";
		func9_DDgui_set("lst", "SELECT", CAST2STRING(param6_cursel));
		__debugInfo = "2552:\ddgui.gbas";
		func9_DDgui_set("lst", "SCROLL", CAST2STRING(param6_cursel));
		__debugInfo = "2575:\ddgui.gbas";
		while (1) {
			__debugInfo = "2556:\ddgui.gbas";
			func10_DDgui_show(0);
			__debugInfo = "2557:\ddgui.gbas";
			MOUSESTATE(local2_mx_ref_1970, local2_my_ref_1971, local2_b1_ref_1972, local2_b2_ref_1973);
			__debugInfo = "2561:\ddgui.gbas";
			if (local2_b1_ref_1972[0]) {
				__debugInfo = "2559:\ddgui.gbas";
				local4_down_1974 = 1;
				__debugInfo = "2559:\ddgui.gbas";
				local2_px_1975 = local2_mx_ref_1970[0];
				__debugInfo = "2560:\ddgui.gbas";
				local2_py_1976 = local2_my_ref_1971[0];
				__debugInfo = "2559:\ddgui.gbas";
			};
			__debugInfo = "2567:\ddgui.gbas";
			if (((((((local2_b1_ref_1972[0]) == (0)) ? 1 : 0)) && (local4_down_1974)) ? 1 : 0)) {
				__debugInfo = "2566:\ddgui.gbas";
				if ((((BOXCOLL(~~(func9_DDgui_get("", "XPOS")), ~~(func9_DDgui_get("", "YPOS")), ~~(func9_DDgui_get("", "WIDTH")), ~~(func9_DDgui_get("", "HEIGHT")), local2_px_1975, local2_py_1976, 1, 1)) == (0)) ? 1 : 0)) {
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
				var local4_isel_1977 = 0;
				__debugInfo = "2569:\ddgui.gbas";
				local4_isel_1977 = ~~(func9_DDgui_get("lst", "SELECT"));
				__debugInfo = "2570:\ddgui.gbas";
				func15_DDgui_popdialog();
				__debugInfo = "2571:\ddgui.gbas";
				return tryClone(local4_isel_1977);
				__debugInfo = "2569:\ddgui.gbas";
			};
			__debugInfo = "2574:\ddgui.gbas";
			SHOWSCREEN();
			__debugInfo = "2556:\ddgui.gbas";
		};
		__debugInfo = "2576:\ddgui.gbas";
		return 0;
		__debugInfo = "2533:\ddgui.gbas";
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
		var local2_tx_ref_1982 = [0], local2_ty_ref_1983 = [0], local3_num_1984 = 0, local1_i_1985 = 0;
		__debugInfo = "2587:\ddgui.gbas";
		GETFONTSIZE(local2_tx_ref_1982, local2_ty_ref_1983);
		__debugInfo = "2588:\ddgui.gbas";
		local2_ty_ref_1983[0] = MAX(unref(local2_ty_ref_1983[0]), global25_gDDguiMinControlDimension);
		__debugInfo = "2590:\ddgui.gbas";
		local3_num_1984 = SPLITSTR(param9_texts_Str, unref(static7_DDgui_list_opt_Str), "|", 1);
		__debugInfo = "2591:\ddgui.gbas";
		if ((((local3_num_1984) == (0)) ? 1 : 0)) {
			__debugInfo = "2591:\ddgui.gbas";
			func9_DDgui_set(param6_id_Str, "SELECT", CAST2STRING(-(1)));
			__debugInfo = "2591:\ddgui.gbas";
		};
		__debugInfo = "2596:\ddgui.gbas";
		if ((((param6_height) == (0)) ? 1 : 0)) {
			__debugInfo = "2593:\ddgui.gbas";
			param6_height = ((((4) * (local2_ty_ref_1983[0]))) + (4));
			__debugInfo = "2593:\ddgui.gbas";
		} else {
			__debugInfo = "2595:\ddgui.gbas";
			param6_height = ((((param6_height) - (MOD(param6_height, unref(local2_ty_ref_1983[0]))))) + (4));
			__debugInfo = "2595:\ddgui.gbas";
		};
		__debugInfo = "2603:\ddgui.gbas";
		if ((((param5_width) == (0)) ? 1 : 0)) {
			__debugInfo = "2597:\ddgui.gbas";
			{
				__debugInfo = "2601:\ddgui.gbas";
				for (local1_i_1985 = 0;toCheck(local1_i_1985, ((local3_num_1984) - (1)), 1);local1_i_1985 += 1) {
					__debugInfo = "2599:\ddgui.gbas";
					local2_ty_ref_1983[0] = (static7_DDgui_list_opt_Str.arrAccess(local1_i_1985).values[tmpPositionCache]).length;
					__debugInfo = "2600:\ddgui.gbas";
					if ((((local2_ty_ref_1983[0]) > (param5_width)) ? 1 : 0)) {
						__debugInfo = "2600:\ddgui.gbas";
						param5_width = local2_ty_ref_1983[0];
						__debugInfo = "2600:\ddgui.gbas";
					};
					__debugInfo = "2599:\ddgui.gbas";
				};
				__debugInfo = "2601:\ddgui.gbas";
			};
			__debugInfo = "2602:\ddgui.gbas";
			param5_width = ((((param5_width) + (3))) * (local2_tx_ref_1982[0]));
			__debugInfo = "2597:\ddgui.gbas";
		};
		__debugInfo = "2604:\ddgui.gbas";
		func12_DDgui_widget(param6_id_Str, param9_texts_Str, param5_width, param6_height);
		__debugInfo = "2605:\ddgui.gbas";
		func9_DDgui_set(param6_id_Str, "TYPE", "LIST");
		__debugInfo = "2606:\ddgui.gbas";
		func9_DDgui_set(param6_id_Str, "COUNT", CAST2STRING(local3_num_1984));
		__debugInfo = "2607:\ddgui.gbas";
		global11_ddgui_stack_ref[0].arrAccess(-(1)).values[tmpPositionCache][0].attr7_widgets_ref[0].arrAccess(-(1)).values[tmpPositionCache][0].attr10_wscrollmax = local3_num_1984;
		__debugInfo = "2608:\ddgui.gbas";
		return 0;
		__debugInfo = "2587:\ddgui.gbas";
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
		var local2_c1_1990 = 0, local2_c2_1991 = 0, local7_txt_Str_1992 = "", local1_i_1993 = 0, local3_num_1994 = 0, local2_tx_ref_1995 = [0], local2_ty_ref_1996 = [0], local1_r_1997 = 0, local5_hover_1998 = 0, local5_check_1999 = 0, local6_offset_2000 = 0, local6_twidth_2002 = 0;
		__debugInfo = "2616:\ddgui.gbas";
		GETFONTSIZE(local2_tx_ref_1995, local2_ty_ref_1996);
		__debugInfo = "2617:\ddgui.gbas";
		local2_ty_ref_1996[0] = MAX(unref(local2_ty_ref_1996[0]), global25_gDDguiMinControlDimension);
		__debugInfo = "2618:\ddgui.gbas";
		local3_num_1994 = SPLITSTR(unref(param3_wdg.attr9_wtext_Str_ref[0]), unref(static7_DDgui_drawlist_opt_Str_ref[0]), "|", 1);
		__debugInfo = "2619:\ddgui.gbas";
		param3_wdg.attr6_wcount = local3_num_1994;
		__debugInfo = "2621:\ddgui.gbas";
		local6_twidth_2002 = ((param3_wdg.attr6_wwidth) - (8));
		__debugInfo = "2622:\ddgui.gbas";
		if (param3_wdg.attr10_wscrollmax) {
			__debugInfo = "2622:\ddgui.gbas";
			local6_twidth_2002+=-(MAX(unref(local2_tx_ref_1995[0]), global20_gDDguiScrollbarWidth));
			__debugInfo = "2622:\ddgui.gbas";
		};
		__debugInfo = "2626:\ddgui.gbas";
		local6_offset_2000 = param3_wdg.attr7_wscroll;
		__debugInfo = "2627:\ddgui.gbas";
		{
			__debugInfo = "2657:\ddgui.gbas";
			for (local1_i_1993 = local6_offset_2000;toCheck(local1_i_1993, ((local3_num_1994) - (1)), 1);local1_i_1993 += 1) {
				__debugInfo = "2629:\ddgui.gbas";
				local5_hover_1998 = 0;
				__debugInfo = "2630:\ddgui.gbas";
				local5_check_1999 = 0;
				__debugInfo = "2631:\ddgui.gbas";
				if ((((param3_wdg.attr7_wselect) == (local1_i_1993)) ? 1 : 0)) {
					__debugInfo = "2631:\ddgui.gbas";
					local5_check_1999 = 1;
					__debugInfo = "2631:\ddgui.gbas";
				};
				__debugInfo = "2632:\ddgui.gbas";
				if (((((((param3_wdg.attr6_whover) == (local1_i_1993)) ? 1 : 0)) && ((((param3_wdg.attr9_wreadonly) == (0)) ? 1 : 0))) ? 1 : 0)) {
					__debugInfo = "2632:\ddgui.gbas";
					local5_hover_1998 = 1;
					__debugInfo = "2632:\ddgui.gbas";
				};
				__debugInfo = "2649:\ddgui.gbas";
				if ((((local5_hover_1998) || (local5_check_1999)) ? 1 : 0)) {
					__debugInfo = "2634:\ddgui.gbas";
					local2_c1_1990 = param10_ddgui_vals.attr16_col_hover_bright;
					__debugInfo = "2635:\ddgui.gbas";
					local2_c2_1991 = param10_ddgui_vals.attr14_col_hover_norm;
					__debugInfo = "2640:\ddgui.gbas";
					if ((((local5_hover_1998) == (0)) ? 1 : 0)) {
						__debugInfo = "2637:\ddgui.gbas";
						local1_r_1997 = local2_c1_1990;
						__debugInfo = "2638:\ddgui.gbas";
						local2_c1_1990 = local2_c2_1991;
						__debugInfo = "2639:\ddgui.gbas";
						local2_c2_1991 = local1_r_1997;
						__debugInfo = "2637:\ddgui.gbas";
					};
					__debugInfo = "2645:\ddgui.gbas";
					if (local5_check_1999) {
						__debugInfo = "2642:\ddgui.gbas";
						func13_DDgui_backgnd(local2_c1_1990, local2_c2_1991, 0, ((param4_ytop) + (((((local1_i_1993) - (local6_offset_2000))) * (local2_ty_ref_1996[0])))), ((param3_wdg.attr6_wwidth) - (1)), ((local2_ty_ref_1996[0]) - (1)));
						__debugInfo = "2642:\ddgui.gbas";
					} else if (local5_hover_1998) {
						__debugInfo = "2644:\ddgui.gbas";
						func14_DDgui_backrect(1, ((param4_ytop) + (((((local1_i_1993) - (local6_offset_2000))) * (local2_ty_ref_1996[0])))), ((param3_wdg.attr6_wwidth) - (2)), ((local2_ty_ref_1996[0]) - (1)), local2_c1_1990);
						__debugInfo = "2644:\ddgui.gbas";
					};
					__debugInfo = "2634:\ddgui.gbas";
				} else {
					__debugInfo = "2647:\ddgui.gbas";
					local2_c1_1990 = param10_ddgui_vals.attr10_col_bright;
					__debugInfo = "2648:\ddgui.gbas";
					local2_c2_1991 = param10_ddgui_vals.attr8_col_norm;
					__debugInfo = "2647:\ddgui.gbas";
				};
				__debugInfo = "2656:\ddgui.gbas";
				if ((((INSTR(unref(static7_DDgui_drawlist_opt_Str_ref[0].arrAccess(local1_i_1993).values[tmpPositionCache][0]), "SPR_B", 0)) == (0)) ? 1 : 0)) {
					__debugInfo = "2652:\ddgui.gbas";
					local2_c1_1990 = INTEGER(FLOAT2STR(MID_Str(unref(static7_DDgui_drawlist_opt_Str_ref[0].arrAccess(local1_i_1993).values[tmpPositionCache][0]), 5, -(1))));
					__debugInfo = "2653:\ddgui.gbas";
					func23_DDgui_fit_sprite_in_box(local2_c1_1990, 5, ((((param4_ytop) + (((((local1_i_1993) - (local6_offset_2000))) * (local2_ty_ref_1996[0]))))) + (1)), ((local6_twidth_2002) - (2)), ((local2_ty_ref_1996[0]) - (2)));
					__debugInfo = "2652:\ddgui.gbas";
				} else {
					__debugInfo = "2655:\ddgui.gbas";
					func17_DDGui_PrintIntern(static7_DDgui_drawlist_opt_Str_ref[0].arrAccess(local1_i_1993).values[tmpPositionCache], 4, ((param4_ytop) + (((((local1_i_1993) - (local6_offset_2000))) * (local2_ty_ref_1996[0])))), local5_check_1999);
					__debugInfo = "2655:\ddgui.gbas";
				};
				__debugInfo = "2629:\ddgui.gbas";
			};
			__debugInfo = "2657:\ddgui.gbas";
		};
		__debugInfo = "2659:\ddgui.gbas";
		local2_c1_1990 = param10_ddgui_vals.attr8_col_norm;
		__debugInfo = "2660:\ddgui.gbas";
		func14_DDgui_backrect(0, param4_ytop, param3_wdg.attr6_wwidth, param3_wdg.attr7_wheight, local2_c1_1990);
		__debugInfo = "2663:\ddgui.gbas";
		func19_DDgui_drawscrollbar(param10_ddgui_vals, param3_wdg, param3_wdg.attr6_wwidth, param3_wdg.attr7_wheight, CAST2INT(((param3_wdg.attr7_wheight) / (local2_ty_ref_1996[0]))), param4_ytop);
		__debugInfo = "2664:\ddgui.gbas";
		return 0;
		__debugInfo = "2616:\ddgui.gbas";
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
		var local2_tx_ref_2009 = [0], local2_ty_ref_2010 = [0], local5_hover_2011 = 0, local5_width_2012 = 0, local6_height_2013 = 0, local2_sb_2014 = 0, local6_offset_2015 = 0, local6_oldsel_2016 = 0, local3_num_2017 = 0;
		__debugInfo = "2671:\ddgui.gbas";
		GETFONTSIZE(local2_tx_ref_2009, local2_ty_ref_2010);
		__debugInfo = "2672:\ddgui.gbas";
		local2_ty_ref_2010[0] = MAX(unref(local2_ty_ref_2010[0]), global25_gDDguiMinControlDimension);
		__debugInfo = "2673:\ddgui.gbas";
		local5_width_2012 = param3_wdg.attr6_wwidth;
		__debugInfo = "2674:\ddgui.gbas";
		local6_height_2013 = param3_wdg.attr7_wheight;
		__debugInfo = "2677:\ddgui.gbas";
		local3_num_2017 = param3_wdg.attr6_wcount;
		__debugInfo = "2678:\ddgui.gbas";
		param3_wdg.attr10_wscrollmax = ((local3_num_2017) - (INTEGER(CAST2INT(((local6_height_2013) / (local2_ty_ref_2010[0]))))));
		__debugInfo = "2680:\ddgui.gbas";
		local2_sb_2014 = func21_DDgui_handlescrollbar(param10_ddgui_vals, param3_wdg, param2_mx, param2_my, param2_b1, param2_b2, local6_height_2013);
		__debugInfo = "2681:\ddgui.gbas";
		local6_offset_2015 = param3_wdg.attr7_wscroll;
		__debugInfo = "2683:\ddgui.gbas";
		if (param3_wdg.attr9_wreadonly) {
			__debugInfo = "2683:\ddgui.gbas";
			return 0;
			__debugInfo = "2683:\ddgui.gbas";
		};
		__debugInfo = "2685:\ddgui.gbas";
		param3_wdg.attr8_wclicked = 0;
		__debugInfo = "2687:\ddgui.gbas";
		param3_wdg.attr6_whover = -(1);
		__debugInfo = "2701:\ddgui.gbas";
		if (((((((((((((param2_my) > (0)) ? 1 : 0)) && ((((param2_my) <= (local6_height_2013)) ? 1 : 0))) ? 1 : 0)) && ((((param2_mx) > (0)) ? 1 : 0))) ? 1 : 0)) && ((((param2_mx) < (((local5_width_2012) - (((local2_sb_2014) * (((local2_tx_ref_2009[0]) * (1.5)))))))) ? 1 : 0))) ? 1 : 0)) {
			__debugInfo = "2689:\ddgui.gbas";
			param2_my = ((INTEGER(CAST2INT(((param2_my) / (local2_ty_ref_2010[0]))))) + (local6_offset_2015));
			__debugInfo = "2699:\ddgui.gbas";
			if ((((param2_b1) == (1)) ? 1 : 0)) {
				__debugInfo = "2695:\ddgui.gbas";
				if ((((param2_my) >= (param3_wdg.attr6_wcount)) ? 1 : 0)) {
					__debugInfo = "2695:\ddgui.gbas";
					param2_my = -(1);
					__debugInfo = "2695:\ddgui.gbas";
				};
				__debugInfo = "2696:\ddgui.gbas";
				param3_wdg.attr7_wselect = param2_my;
				__debugInfo = "2697:\ddgui.gbas";
				param3_wdg.attr8_wclicked = 1;
				__debugInfo = "2695:\ddgui.gbas";
			};
			__debugInfo = "2700:\ddgui.gbas";
			param3_wdg.attr6_whover = param2_my;
			__debugInfo = "2689:\ddgui.gbas";
		};
		__debugInfo = "2702:\ddgui.gbas";
		return 0;
		__debugInfo = "2671:\ddgui.gbas";
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
		__debugInfo = "2710:\ddgui.gbas";
		func12_DDgui_widget(param6_id_Str, param8_text_Str, param5_width, param6_height);
		__debugInfo = "2711:\ddgui.gbas";
		func9_DDgui_set(param6_id_Str, "TYPE", "TEXT");
		__debugInfo = "2712:\ddgui.gbas";
		return 0;
		__debugInfo = "2710:\ddgui.gbas";
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
		__debugInfo = "2715:\ddgui.gbas";
		func12_DDgui_widget(param6_id_Str, param8_text_Str, param5_width, 0);
		__debugInfo = "2716:\ddgui.gbas";
		func9_DDgui_set(param6_id_Str, "TYPE", "SINGLETEXT");
		__debugInfo = "2717:\ddgui.gbas";
		return 0;
		__debugInfo = "2715:\ddgui.gbas";
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
		__debugInfo = "2720:\ddgui.gbas";
		func12_DDgui_widget(param6_id_Str, param8_text_Str, param5_width, 0);
		__debugInfo = "2721:\ddgui.gbas";
		func9_DDgui_set(param6_id_Str, "TYPE", "NUMBERTEXT");
		__debugInfo = "2722:\ddgui.gbas";
		return 0;
		__debugInfo = "2720:\ddgui.gbas";
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
		var local2_tx_ref_2022 = [0], local2_ty_ref_2023 = [0], local2_c1_2024 = 0, local2_c2_2025 = 0, local6_twidth_2026 = 0;
		__debugInfo = "2728:\ddgui.gbas";
		GETFONTSIZE(local2_tx_ref_2022, local2_ty_ref_2023);
		__debugInfo = "2729:\ddgui.gbas";
		local2_c1_2024 = param10_ddgui_vals.attr10_col_bright;
		__debugInfo = "2730:\ddgui.gbas";
		local2_c2_2025 = param10_ddgui_vals.attr8_col_norm;
		__debugInfo = "2732:\ddgui.gbas";
		local6_twidth_2026 = ((param3_wdg.attr6_wwidth) - (local2_tx_ref_2022[0]));
		__debugInfo = "2733:\ddgui.gbas";
		if (param3_wdg.attr10_wscrollmax) {
			__debugInfo = "2733:\ddgui.gbas";
			local6_twidth_2026 = ((local6_twidth_2026) - (MAX(unref(local2_tx_ref_2022[0]), global20_gDDguiScrollbarWidth)));
			__debugInfo = "2733:\ddgui.gbas";
		};
		__debugInfo = "2737:\ddgui.gbas";
		if (param3_wdg.attr9_wreadonly) {
			__debugInfo = "2736:\ddgui.gbas";
			func13_DDgui_backgnd(local2_c2_2025, local2_c2_2025, 1, ((param4_ytop) + (1)), ((param3_wdg.attr6_wwidth) - (2)), ((param3_wdg.attr7_wheight) - (2)));
			__debugInfo = "2736:\ddgui.gbas";
		};
		__debugInfo = "2743:\ddgui.gbas";
		if (param11_bSingleText) {
			__debugInfo = "2740:\ddgui.gbas";
			func14_DDgui_boxprint(param10_ddgui_vals, param3_wdg, CAST2INT(((local2_tx_ref_2022[0]) / (2))), ((param4_ytop) + (CAST2INT(((((param3_wdg.attr7_wheight) - (local2_ty_ref_2023[0]))) / (2))))), local6_twidth_2026, 1, 0);
			__debugInfo = "2740:\ddgui.gbas";
		} else {
			__debugInfo = "2742:\ddgui.gbas";
			func14_DDgui_boxprint(param10_ddgui_vals, param3_wdg, CAST2INT(((local2_tx_ref_2022[0]) / (2))), ((param4_ytop) - (((param3_wdg.attr7_wscroll) * (local2_ty_ref_2023[0])))), local6_twidth_2026, 1, 0);
			__debugInfo = "2742:\ddgui.gbas";
		};
		__debugInfo = "2744:\ddgui.gbas";
		func19_DDgui_drawscrollbar(param10_ddgui_vals, param3_wdg, param3_wdg.attr6_wwidth, param3_wdg.attr7_wheight, CAST2INT(((param3_wdg.attr7_wheight) / (local2_ty_ref_2023[0]))), param4_ytop);
		__debugInfo = "2745:\ddgui.gbas";
		func14_DDgui_backrect(0, param4_ytop, param3_wdg.attr6_wwidth, param3_wdg.attr7_wheight, local2_c2_2025);
		__debugInfo = "2746:\ddgui.gbas";
		return 0;
		__debugInfo = "2728:\ddgui.gbas";
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
		var local6_height_2035 = 0, local5_width_2036 = 0, local2_tx_ref_2037 = [0], local2_ty_ref_2038 = [0], local8_text_Str_2039 = "", local8_txheight_2040 = 0, local7_txwidth_2041 = 0, local9_has_focus_2042 = 0, local5_a_Str_2043 = "", local5_l_Str_2044 = "", local5_r_Str_2045 = "", local2_sb_2046 = 0, local8_selstart_2047 = 0, local6_selend_2048 = 0, local3_del_2049 = 0, local6_backsp_2050 = 0, local4_xkey_2051 = 0, local4_ykey_2052 = 0, local3_tab_2053 = 0, local7_lastkey_2054 = 0, local5_shift_2055 = 0, local6_offset_2056 = 0, local7_keycopy_2057 = 0, local8_keypaste_2058 = 0, local8_readonly_2059 = 0;
		__debugInfo = "2755:\ddgui.gbas";
		local8_readonly_2059 = param3_wdg.attr9_wreadonly;
		__debugInfo = "2758:\ddgui.gbas";
		GETFONTSIZE(local2_tx_ref_2037, local2_ty_ref_2038);
		__debugInfo = "2759:\ddgui.gbas";
		local8_text_Str_2039 = param3_wdg.attr9_wtext_Str_ref[0];
		__debugInfo = "2760:\ddgui.gbas";
		local5_width_2036 = param3_wdg.attr6_wwidth;
		__debugInfo = "2761:\ddgui.gbas";
		local6_offset_2056 = ((param3_wdg.attr7_wscroll) * (local2_ty_ref_2038[0]));
		__debugInfo = "2762:\ddgui.gbas";
		local7_txwidth_2041 = ((local5_width_2036) - (local2_tx_ref_2037[0]));
		__debugInfo = "2767:\ddgui.gbas";
		if (param11_bSingleText) {
			__debugInfo = "2766:\ddgui.gbas";
			if (((((((param2_my) > (0)) ? 1 : 0)) && ((((param2_my) < (local6_height_2035)) ? 1 : 0))) ? 1 : 0)) {
				__debugInfo = "2766:\ddgui.gbas";
				param2_my = 1;
				__debugInfo = "2766:\ddgui.gbas";
			};
			__debugInfo = "2766:\ddgui.gbas";
		};
		__debugInfo = "2769:\ddgui.gbas";
		if (param3_wdg.attr10_wscrollmax) {
			__debugInfo = "2769:\ddgui.gbas";
			local7_txwidth_2041 = ((local7_txwidth_2041) - (MAX(unref(local2_tx_ref_2037[0]), global20_gDDguiScrollbarWidth)));
			__debugInfo = "2769:\ddgui.gbas";
		};
		__debugInfo = "2770:\ddgui.gbas";
		local6_height_2035 = param3_wdg.attr7_wheight;
		__debugInfo = "2771:\ddgui.gbas";
		local8_txheight_2040 = func14_DDgui_boxprint(param10_ddgui_vals, param3_wdg, 0, 0, local7_txwidth_2041, 0, 0);
		__debugInfo = "2774:\ddgui.gbas";
		param3_wdg.attr10_wscrollmax = MAX(0, CAST2INT(((((local8_txheight_2040) - (local6_height_2035))) / (local2_ty_ref_2038[0]))));
		__debugInfo = "2775:\ddgui.gbas";
		if (param3_wdg.attr10_wscrollmax) {
			__debugInfo = "2775:\ddgui.gbas";
			param3_wdg.attr10_wscrollmax+=1;
			__debugInfo = "2775:\ddgui.gbas";
		};
		__debugInfo = "2776:\ddgui.gbas";
		local2_sb_2046 = func21_DDgui_handlescrollbar(param10_ddgui_vals, param3_wdg, param2_mx, param2_my, param2_b1, param2_b2, local6_height_2035);
		__debugInfo = "2803:\ddgui.gbas";
		if (((((((((((((param2_mx) >= (0)) ? 1 : 0)) && ((((param2_mx) < (((local5_width_2036) - (((local2_sb_2046) * (((local2_tx_ref_2037[0]) * (1.5)))))))) ? 1 : 0))) ? 1 : 0)) && ((((param2_my) >= (0)) ? 1 : 0))) ? 1 : 0)) && ((((param2_my) < (local6_height_2035)) ? 1 : 0))) ? 1 : 0)) {
			__debugInfo = "2800:\ddgui.gbas";
			if (((((((param2_b1) == (1)) ? 1 : 0)) && ((((param10_ddgui_vals.attr9_focus_Str) != (param3_wdg.attr7_wid_Str)) ? 1 : 0))) ? 1 : 0)) {
				__debugInfo = "2782:\ddgui.gbas";
				func14_DDgui_setfocus(param3_wdg.attr7_wid_Str);
				__debugInfo = "2789:\ddgui.gbas";
				if (((((((((((((param2_b1) == (1)) ? 1 : 0)) && ((((local8_readonly_2059) == (0)) ? 1 : 0))) ? 1 : 0)) && ((((global18_DDGUI_IN_INPUT_DLG) == (0)) ? 1 : 0))) ? 1 : 0)) && (global20_DDGUI_AUTO_INPUT_DLG)) ? 1 : 0)) {
					__debugInfo = "2786:\ddgui.gbas";
					param10_ddgui_vals.attr15_kick_intern_dlg = 2;
					__debugInfo = "2787:\ddgui.gbas";
					param10_ddgui_vals.attr18_kick_intern_id_Str = param3_wdg.attr7_wid_Str;
					__debugInfo = "2788:\ddgui.gbas";
					func14_DDgui_setfocus("");
					__debugInfo = "2786:\ddgui.gbas";
				};
				__debugInfo = "2782:\ddgui.gbas";
			} else {
				__debugInfo = "2791:\ddgui.gbas";
				if (((((((param2_b1) == (0)) ? 1 : 0)) && (MOUSEAXIS(3))) ? 1 : 0)) {
					__debugInfo = "2791:\ddgui.gbas";
					param2_b1 = 1;
					__debugInfo = "2791:\ddgui.gbas";
				};
				__debugInfo = "2792:\ddgui.gbas";
				if ((((param2_b1) != (0)) ? 1 : 0)) {
					__debugInfo = "2792:\ddgui.gbas";
					local2_tx_ref_2037[0] = func14_DDgui_boxprint(param10_ddgui_vals, param3_wdg, param2_mx, ((param2_my) + (local6_offset_2056)), local7_txwidth_2041, 0, 1);
					__debugInfo = "2792:\ddgui.gbas";
				};
				__debugInfo = "2796:\ddgui.gbas";
				if ((((param2_b1) == (-(1))) ? 1 : 0)) {
					__debugInfo = "2794:\ddgui.gbas";
					param3_wdg.attr9_wselstart = local2_tx_ref_2037[0];
					__debugInfo = "2795:\ddgui.gbas";
					param2_b1 = 1;
					__debugInfo = "2794:\ddgui.gbas";
				};
				__debugInfo = "2798:\ddgui.gbas";
				if ((((param2_b1) == (1)) ? 1 : 0)) {
					__debugInfo = "2798:\ddgui.gbas";
					param3_wdg.attr7_wselend = local2_tx_ref_2037[0];
					__debugInfo = "2798:\ddgui.gbas";
				};
				__debugInfo = "2791:\ddgui.gbas";
			};
			__debugInfo = "2800:\ddgui.gbas";
		};
		__debugInfo = "2804:\ddgui.gbas";
		if ((((param10_ddgui_vals.attr9_focus_Str) == (param3_wdg.attr7_wid_Str)) ? 1 : 0)) {
			__debugInfo = "2804:\ddgui.gbas";
			local9_has_focus_2042 = 1;
			__debugInfo = "2804:\ddgui.gbas";
		};
		__debugInfo = "2975:\ddgui.gbas";
		if (local9_has_focus_2042) {
			__debugInfo = "2808:\ddgui.gbas";
			local7_lastkey_2054 = static11_ddgui_handletext_st_lasttime;
			__debugInfo = "2813:\ddgui.gbas";
			if ((((((GETTIMERALL()) - (local7_lastkey_2054))) > (150)) ? 1 : 0)) {
				__debugInfo = "2810:\ddgui.gbas";
				local7_lastkey_2054 = 0;
				__debugInfo = "2810:\ddgui.gbas";
			} else {
				__debugInfo = "2812:\ddgui.gbas";
				local7_lastkey_2054 = static10_ddgui_handletext_st_lastkey;
				__debugInfo = "2812:\ddgui.gbas";
			};
			__debugInfo = "2815:\ddgui.gbas";
			local5_a_Str_2043 = param10_ddgui_vals.attr13_dlg_inkey_Str;
			__debugInfo = "2823:\ddgui.gbas";
			if ((local5_a_Str_2043).length) {
				__debugInfo = "2817:\ddgui.gbas";
				local7_lastkey_2054 = 0;
				__debugInfo = "2818:\ddgui.gbas";
				param10_ddgui_vals.attr13_dlg_inkey_Str = "";
				__debugInfo = "2819:\ddgui.gbas";
				DEBUG((((("ddgui_inpkey: ") + (local5_a_Str_2043))) + ("\n")));
				__debugInfo = "2817:\ddgui.gbas";
			} else {
				__debugInfo = "2821:\ddgui.gbas";
				local5_a_Str_2043 = INKEY_Str();
				__debugInfo = "2822:\ddgui.gbas";
				if ((local5_a_Str_2043).length) {
					__debugInfo = "2822:\ddgui.gbas";
					DEBUG((((("INKEY: ") + (local5_a_Str_2043))) + ("\n")));
					__debugInfo = "2822:\ddgui.gbas";
				};
				__debugInfo = "2821:\ddgui.gbas";
			};
			__debugInfo = "2825:\ddgui.gbas";
			if ((((local5_a_Str_2043) == ("\t")) ? 1 : 0)) {
				__debugInfo = "2825:\ddgui.gbas";
				local5_a_Str_2043 = "";
				__debugInfo = "2825:\ddgui.gbas";
			};
			__debugInfo = "2830:\ddgui.gbas";
			if ((((local5_a_Str_2043) == ("\b")) ? 1 : 0)) {
				__debugInfo = "2828:\ddgui.gbas";
				local5_a_Str_2043 = "";
				__debugInfo = "2829:\ddgui.gbas";
				local6_backsp_2050 = 1;
				__debugInfo = "2828:\ddgui.gbas";
			};
			__debugInfo = "2872:\ddgui.gbas";
			if (((((((local7_lastkey_2054) == (0)) ? 1 : 0)) || ((((KEY(local7_lastkey_2054)) == (0)) ? 1 : 0))) ? 1 : 0)) {
				__debugInfo = "2833:\ddgui.gbas";
				local7_lastkey_2054 = 0;
				__debugInfo = "2834:\ddgui.gbas";
				local4_ykey_2052 = ((KEY(208)) - (KEY(200)));
				__debugInfo = "2835:\ddgui.gbas";
				local4_xkey_2051 = ((KEY(205)) - (KEY(203)));
				__debugInfo = "2836:\ddgui.gbas";
				local3_del_2049 = KEY(211);
				__debugInfo = "2837:\ddgui.gbas";
				local3_tab_2053 = KEY(15);
				__debugInfo = "2838:\ddgui.gbas";
				local6_backsp_2050 = (((local6_backsp_2050) || (KEY(14))) ? 1 : 0);
				__debugInfo = "2839:\ddgui.gbas";
				local5_shift_2055 = (((KEY(42)) || (KEY(54))) ? 1 : 0);
				__debugInfo = "2840:\ddgui.gbas";
				local7_keycopy_2057 = (((KEY(29)) && (KEY(46))) ? 1 : 0);
				__debugInfo = "2841:\ddgui.gbas";
				local8_keypaste_2058 = (((KEY(29)) && (KEY(47))) ? 1 : 0);
				__debugInfo = "2843:\ddgui.gbas";
				if ((((local4_ykey_2052) > (0)) ? 1 : 0)) {
					__debugInfo = "2843:\ddgui.gbas";
					local7_lastkey_2054 = 208;
					__debugInfo = "2843:\ddgui.gbas";
				};
				__debugInfo = "2844:\ddgui.gbas";
				if ((((local4_ykey_2052) < (0)) ? 1 : 0)) {
					__debugInfo = "2844:\ddgui.gbas";
					local7_lastkey_2054 = 200;
					__debugInfo = "2844:\ddgui.gbas";
				};
				__debugInfo = "2845:\ddgui.gbas";
				if ((((local4_xkey_2051) < (0)) ? 1 : 0)) {
					__debugInfo = "2845:\ddgui.gbas";
					local7_lastkey_2054 = 203;
					__debugInfo = "2845:\ddgui.gbas";
				};
				__debugInfo = "2846:\ddgui.gbas";
				if ((((local4_xkey_2051) > (0)) ? 1 : 0)) {
					__debugInfo = "2846:\ddgui.gbas";
					local7_lastkey_2054 = 205;
					__debugInfo = "2846:\ddgui.gbas";
				};
				__debugInfo = "2847:\ddgui.gbas";
				if (local3_del_2049) {
					__debugInfo = "2847:\ddgui.gbas";
					local7_lastkey_2054 = 211;
					__debugInfo = "2847:\ddgui.gbas";
				};
				__debugInfo = "2848:\ddgui.gbas";
				if (local3_tab_2053) {
					__debugInfo = "2847:\ddgui.gbas";
					local7_lastkey_2054 = 15;
					__debugInfo = "2847:\ddgui.gbas";
					local5_a_Str_2043 = " ";
					__debugInfo = "2847:\ddgui.gbas";
				};
				__debugInfo = "2849:\ddgui.gbas";
				if (local6_backsp_2050) {
					__debugInfo = "2849:\ddgui.gbas";
					local7_lastkey_2054 = 14;
					__debugInfo = "2849:\ddgui.gbas";
				};
				__debugInfo = "2850:\ddgui.gbas";
				if (local7_keycopy_2057) {
					__debugInfo = "2850:\ddgui.gbas";
					local7_lastkey_2054 = 29;
					__debugInfo = "2850:\ddgui.gbas";
				};
				__debugInfo = "2851:\ddgui.gbas";
				if (local8_keypaste_2058) {
					__debugInfo = "2851:\ddgui.gbas";
					local7_lastkey_2054 = 29;
					__debugInfo = "2851:\ddgui.gbas";
				};
				__debugInfo = "2860:\ddgui.gbas";
				if (KEY(199)) {
					__debugInfo = "2854:\ddgui.gbas";
					local7_lastkey_2054 = 199;
					__debugInfo = "2855:\ddgui.gbas";
					param3_wdg.attr7_wcaretx = 0;
					__debugInfo = "2859:\ddgui.gbas";
					if (((param11_bSingleText) ? 0 : 1)) {
						__debugInfo = "2857:\ddgui.gbas";
						param3_wdg.attr7_wcarety+=local2_ty_ref_2038[0];
						__debugInfo = "2858:\ddgui.gbas";
						local4_ykey_2052 = -(1);
						__debugInfo = "2857:\ddgui.gbas";
					};
					__debugInfo = "2854:\ddgui.gbas";
				};
				__debugInfo = "2868:\ddgui.gbas";
				if (KEY(207)) {
					__debugInfo = "2862:\ddgui.gbas";
					local7_lastkey_2054 = 207;
					__debugInfo = "2863:\ddgui.gbas";
					param3_wdg.attr7_wcaretx = param3_wdg.attr6_wwidth;
					__debugInfo = "2867:\ddgui.gbas";
					if (((param11_bSingleText) ? 0 : 1)) {
						__debugInfo = "2865:\ddgui.gbas";
						param3_wdg.attr7_wcarety+=local2_ty_ref_2038[0];
						__debugInfo = "2866:\ddgui.gbas";
						local4_ykey_2052 = -(1);
						__debugInfo = "2865:\ddgui.gbas";
					};
					__debugInfo = "2862:\ddgui.gbas";
				};
				__debugInfo = "2870:\ddgui.gbas";
				static10_ddgui_handletext_st_lastkey = local7_lastkey_2054;
				__debugInfo = "2871:\ddgui.gbas";
				static11_ddgui_handletext_st_lasttime = GETTIMERALL();
				__debugInfo = "2833:\ddgui.gbas";
			};
			__debugInfo = "2882:\ddgui.gbas";
			if ((((local8_readonly_2059) == (1)) ? 1 : 0)) {
				__debugInfo = "2877:\ddgui.gbas";
				local5_a_Str_2043 = "";
				__debugInfo = "2878:\ddgui.gbas";
				local3_del_2049 = 0;
				__debugInfo = "2879:\ddgui.gbas";
				local3_tab_2053 = 0;
				__debugInfo = "2880:\ddgui.gbas";
				local6_backsp_2050 = 0;
				__debugInfo = "2881:\ddgui.gbas";
				local8_keypaste_2058 = 0;
				__debugInfo = "2877:\ddgui.gbas";
			};
			__debugInfo = "2896:\ddgui.gbas";
			if (param11_bSingleText) {
				__debugInfo = "2885:\ddgui.gbas";
				local4_ykey_2052 = 0;
				__debugInfo = "2886:\ddgui.gbas";
				if ((((local5_a_Str_2043) == ("\n")) ? 1 : 0)) {
					__debugInfo = "2886:\ddgui.gbas";
					local5_a_Str_2043 = "";
					__debugInfo = "2886:\ddgui.gbas";
				};
				__debugInfo = "2887:\ddgui.gbas";
				if ((((local5_a_Str_2043) == ("\r")) ? 1 : 0)) {
					__debugInfo = "2887:\ddgui.gbas";
					local5_a_Str_2043 = "";
					__debugInfo = "2887:\ddgui.gbas";
				};
				__debugInfo = "2895:\ddgui.gbas";
				if (local3_tab_2053) {
					__debugInfo = "2893:\ddgui.gbas";
					if (local5_shift_2055) {
						__debugInfo = "2890:\ddgui.gbas";
						func18_DDgui_advancefocus(-(1));
						__debugInfo = "2890:\ddgui.gbas";
					} else {
						__debugInfo = "2892:\ddgui.gbas";
						func18_DDgui_advancefocus(1);
						__debugInfo = "2892:\ddgui.gbas";
					};
					__debugInfo = "2894:\ddgui.gbas";
					return 0;
					__debugInfo = "2893:\ddgui.gbas";
				};
				__debugInfo = "2885:\ddgui.gbas";
			};
			__debugInfo = "2904:\ddgui.gbas";
			if (param9_bIsNumber) {
				__debugInfo = "2903:\ddgui.gbas";
				if ((((((((((((((((local5_a_Str_2043) >= ("0")) ? 1 : 0)) && ((((local5_a_Str_2043) <= ("9")) ? 1 : 0))) ? 1 : 0)) || ((((local5_a_Str_2043) == (".")) ? 1 : 0))) ? 1 : 0)) || ((((local5_a_Str_2043) == ("e")) ? 1 : 0))) ? 1 : 0)) || ((((local5_a_Str_2043) == ("-")) ? 1 : 0))) ? 1 : 0)) {
					
				} else {
					__debugInfo = "2902:\ddgui.gbas";
					local5_a_Str_2043 = "";
					__debugInfo = "2902:\ddgui.gbas";
				};
				__debugInfo = "2903:\ddgui.gbas";
			};
			__debugInfo = "2974:\ddgui.gbas";
			if ((((((((((((((((local5_a_Str_2043) != ("")) ? 1 : 0)) || (local3_del_2049)) ? 1 : 0)) || (local6_backsp_2050)) ? 1 : 0)) || (local4_xkey_2051)) ? 1 : 0)) || (local4_ykey_2052)) ? 1 : 0)) {
				__debugInfo = "2907:\ddgui.gbas";
				local8_selstart_2047 = param3_wdg.attr9_wselstart;
				__debugInfo = "2908:\ddgui.gbas";
				local6_selend_2048 = param3_wdg.attr7_wselend;
				__debugInfo = "2968:\ddgui.gbas";
				if ((((local5_shift_2055) && ((((local4_xkey_2051) || (local4_ykey_2052)) ? 1 : 0))) ? 1 : 0)) {
					__debugInfo = "2911:\ddgui.gbas";
					local6_selend_2048+=local4_xkey_2051;
					__debugInfo = "2915:\ddgui.gbas";
					if (local4_ykey_2052) {
						__debugInfo = "2914:\ddgui.gbas";
						local6_selend_2048 = func14_DDgui_boxprint(param10_ddgui_vals, param3_wdg, param3_wdg.attr7_wcaretx, ((param3_wdg.attr7_wcarety) + (((local4_ykey_2052) * (local2_ty_ref_2038[0])))), local7_txwidth_2041, 0, 1);
						__debugInfo = "2914:\ddgui.gbas";
					};
					__debugInfo = "2917:\ddgui.gbas";
					if ((((local6_selend_2048) < (0)) ? 1 : 0)) {
						__debugInfo = "2917:\ddgui.gbas";
						local6_selend_2048 = 0;
						__debugInfo = "2917:\ddgui.gbas";
					};
					__debugInfo = "2918:\ddgui.gbas";
					if ((((local6_selend_2048) > ((local8_text_Str_2039).length)) ? 1 : 0)) {
						__debugInfo = "2918:\ddgui.gbas";
						local6_selend_2048 = (local8_text_Str_2039).length;
						__debugInfo = "2918:\ddgui.gbas";
					};
					__debugInfo = "2920:\ddgui.gbas";
					param3_wdg.attr7_wselend = local6_selend_2048;
					__debugInfo = "2911:\ddgui.gbas";
				} else {
					__debugInfo = "2935:\ddgui.gbas";
					if (((((((local8_selstart_2047) != (local6_selend_2048)) ? 1 : 0)) && (((((((local3_del_2049) || (local6_backsp_2050)) ? 1 : 0)) || ((((local5_a_Str_2043) != ("")) ? 1 : 0))) ? 1 : 0))) ? 1 : 0)) {
						__debugInfo = "2928:\ddgui.gbas";
						if ((((local8_selstart_2047) > (local6_selend_2048)) ? 1 : 0)) {
							__debugInfo = "2925:\ddgui.gbas";
							local2_tx_ref_2037[0] = local8_selstart_2047;
							__debugInfo = "2926:\ddgui.gbas";
							local8_selstart_2047 = local6_selend_2048;
							__debugInfo = "2927:\ddgui.gbas";
							local6_selend_2048 = local2_tx_ref_2037[0];
							__debugInfo = "2925:\ddgui.gbas";
						};
						__debugInfo = "2929:\ddgui.gbas";
						local5_l_Str_2044 = MID_Str(local8_text_Str_2039, 0, local8_selstart_2047);
						__debugInfo = "2930:\ddgui.gbas";
						local5_r_Str_2045 = MID_Str(local8_text_Str_2039, local6_selend_2048, -(1));
						__debugInfo = "2931:\ddgui.gbas";
						local8_text_Str_2039 = ((local5_l_Str_2044) + (local5_r_Str_2045));
						__debugInfo = "2933:\ddgui.gbas";
						if (local3_del_2049) {
							__debugInfo = "2933:\ddgui.gbas";
							local3_del_2049 = 0;
							__debugInfo = "2933:\ddgui.gbas";
						};
						__debugInfo = "2934:\ddgui.gbas";
						if (local6_backsp_2050) {
							__debugInfo = "2934:\ddgui.gbas";
							local6_backsp_2050 = 0;
							__debugInfo = "2934:\ddgui.gbas";
						};
						__debugInfo = "2928:\ddgui.gbas";
					};
					__debugInfo = "2938:\ddgui.gbas";
					local5_l_Str_2044 = MID_Str(local8_text_Str_2039, 0, local8_selstart_2047);
					__debugInfo = "2939:\ddgui.gbas";
					local5_r_Str_2045 = MID_Str(local8_text_Str_2039, local8_selstart_2047, -(1));
					__debugInfo = "2942:\ddgui.gbas";
					local8_selstart_2047+=local4_xkey_2051;
					__debugInfo = "2946:\ddgui.gbas";
					if (local4_ykey_2052) {
						__debugInfo = "2945:\ddgui.gbas";
						local8_selstart_2047 = func14_DDgui_boxprint(param10_ddgui_vals, param3_wdg, param3_wdg.attr7_wcaretx, ((param3_wdg.attr7_wcarety) + (((local4_ykey_2052) * (local2_ty_ref_2038[0])))), local7_txwidth_2041, 0, 1);
						__debugInfo = "2945:\ddgui.gbas";
					};
					__debugInfo = "2949:\ddgui.gbas";
					if (local3_del_2049) {
						__debugInfo = "2949:\ddgui.gbas";
						local5_r_Str_2045 = MID_Str(local5_r_Str_2045, 1, -(1));
						__debugInfo = "2949:\ddgui.gbas";
					};
					__debugInfo = "2955:\ddgui.gbas";
					if (local6_backsp_2050) {
						__debugInfo = "2953:\ddgui.gbas";
						local5_l_Str_2044 = LEFT_Str(local5_l_Str_2044, (((local5_l_Str_2044).length) - (1)));
						__debugInfo = "2954:\ddgui.gbas";
						local8_selstart_2047+=-(1);
						__debugInfo = "2953:\ddgui.gbas";
					};
					__debugInfo = "2960:\ddgui.gbas";
					if ((((local5_a_Str_2043) != ("")) ? 1 : 0)) {
						__debugInfo = "2958:\ddgui.gbas";
						local5_l_Str_2044 = ((local5_l_Str_2044) + (local5_a_Str_2043));
						__debugInfo = "2959:\ddgui.gbas";
						local8_selstart_2047+=1;
						__debugInfo = "2958:\ddgui.gbas";
					};
					__debugInfo = "2961:\ddgui.gbas";
					local8_text_Str_2039 = ((local5_l_Str_2044) + (local5_r_Str_2045));
					__debugInfo = "2963:\ddgui.gbas";
					if ((((local8_selstart_2047) < (0)) ? 1 : 0)) {
						__debugInfo = "2963:\ddgui.gbas";
						local8_selstart_2047 = 0;
						__debugInfo = "2963:\ddgui.gbas";
					};
					__debugInfo = "2964:\ddgui.gbas";
					if ((((local8_selstart_2047) > ((local8_text_Str_2039).length)) ? 1 : 0)) {
						__debugInfo = "2964:\ddgui.gbas";
						local8_selstart_2047 = (local8_text_Str_2039).length;
						__debugInfo = "2964:\ddgui.gbas";
					};
					__debugInfo = "2965:\ddgui.gbas";
					param3_wdg.attr9_wselstart = local8_selstart_2047;
					__debugInfo = "2966:\ddgui.gbas";
					param3_wdg.attr7_wselend = local8_selstart_2047;
					__debugInfo = "2967:\ddgui.gbas";
					param3_wdg.attr9_wtext_Str_ref[0] = local8_text_Str_2039;
					__debugInfo = "2935:\ddgui.gbas";
				};
				__debugInfo = "2971:\ddgui.gbas";
				if (((((((((param3_wdg.attr7_wcarety) + (local2_ty_ref_2038[0]))) > (((((param3_wdg.attr7_wscroll) * (local2_ty_ref_2038[0]))) + (param3_wdg.attr7_wheight)))) ? 1 : 0)) && ((((param3_wdg.attr7_wscroll) < (param3_wdg.attr10_wscrollmax)) ? 1 : 0))) ? 1 : 0)) {
					__debugInfo = "2971:\ddgui.gbas";
					param3_wdg.attr7_wscroll+=1;
					__debugInfo = "2971:\ddgui.gbas";
				};
				__debugInfo = "2972:\ddgui.gbas";
				if (((((((((param3_wdg.attr7_wcarety) - (local2_ty_ref_2038[0]))) < (((param3_wdg.attr7_wscroll) * (local2_ty_ref_2038[0])))) ? 1 : 0)) && ((((param3_wdg.attr7_wscroll) > (0)) ? 1 : 0))) ? 1 : 0)) {
					__debugInfo = "2972:\ddgui.gbas";
					param3_wdg.attr7_wscroll+=-1;
					__debugInfo = "2972:\ddgui.gbas";
				};
				__debugInfo = "2907:\ddgui.gbas";
			};
			__debugInfo = "2808:\ddgui.gbas";
		};
		__debugInfo = "2976:\ddgui.gbas";
		return 0;
		__debugInfo = "2755:\ddgui.gbas";
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
		var local3_num_2295 = 0, local2_fx_ref_2296 = [0], local2_fy_ref_2297 = [0];
		__debugInfo = "2986:\ddgui.gbas";
		GETFONTSIZE(local2_fx_ref_2296, local2_fy_ref_2297);
		__debugInfo = "2995:\ddgui.gbas";
		if ((((param6_height) == (0)) ? 1 : 0)) {
			__debugInfo = "2995:\ddgui.gbas";
			param6_height = ((local2_fy_ref_2297[0]) + (7));
			__debugInfo = "2995:\ddgui.gbas";
		};
		__debugInfo = "2997:\ddgui.gbas";
		func12_DDgui_widget(param6_id_Str, param12_captions_Str, 10000, param6_height);
		__debugInfo = "2999:\ddgui.gbas";
		func9_DDgui_set(param6_id_Str, "TYPE", "TAB");
		__debugInfo = "3000:\ddgui.gbas";
		global11_ddgui_stack_ref[0].arrAccess(0.1).values[tmpPositionCache][0].attr7_widgets_ref[0].arrAccess(-(1)).values[tmpPositionCache][0].attr7_wselect = -(1);
		__debugInfo = "3002:\ddgui.gbas";
		return 0;
		__debugInfo = "2986:\ddgui.gbas";
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
		var local3_num_2065 = 0, local4_num2_2066 = 0, local1_i_2067 = 0, local4_isel_2068 = 0, local2_c1_2069 = 0, local2_c2_2070 = 0, local3_c1b_2071 = 0, local3_c2b_2072 = 0, local2_fx_ref_2073 = [0], local2_fy_ref_2074 = [0], local1_x_2075 = 0, local6_twidth_2076 = 0, local4_selx_2077 = 0, local4_selw_2078 = 0, local6_y_text_2081 = 0;
		__debugInfo = "3010:\ddgui.gbas";
		GETFONTSIZE(local2_fx_ref_2073, local2_fy_ref_2074);
		__debugInfo = "3012:\ddgui.gbas";
		local2_c1_2069 = param10_ddgui_vals.attr10_col_bright;
		__debugInfo = "3013:\ddgui.gbas";
		local2_c2_2070 = param10_ddgui_vals.attr8_col_norm;
		__debugInfo = "3014:\ddgui.gbas";
		local3_c1b_2071 = param10_ddgui_vals.attr16_col_hover_bright;
		__debugInfo = "3015:\ddgui.gbas";
		local3_c2b_2072 = param10_ddgui_vals.attr14_col_hover_norm;
		__debugInfo = "3017:\ddgui.gbas";
		func13_DDgui_backgnd(local2_c1_2069, local2_c1_2069, 0, param4_ytop, param3_wdg.attr6_wwidth, ((param3_wdg.attr7_wheight) - (1)));
		__debugInfo = "3019:\ddgui.gbas";
		local4_isel_2068 = param3_wdg.attr7_wselect;
		__debugInfo = "3021:\ddgui.gbas";
		local6_y_text_2081 = ((((((param4_ytop) + (param3_wdg.attr7_wheight))) - (2))) - (local2_fy_ref_2074[0]));
		__debugInfo = "3023:\ddgui.gbas";
		local1_x_2075 = 2;
		__debugInfo = "3024:\ddgui.gbas";
		local3_num_2065 = SPLITSTR(unref(param3_wdg.attr9_wtext_Str_ref[0]), unref(static7_DDgui_drawtab_str_Str), "|", 1);
		__debugInfo = "3024:\ddgui.gbas";
		{
			__debugInfo = "3038:\ddgui.gbas";
			for (local1_i_2067 = 0;toCheck(local1_i_2067, ((local3_num_2065) - (1)), 1);local1_i_2067 += 1) {
				__debugInfo = "3026:\ddgui.gbas";
				local4_num2_2066 = SPLITSTR(static7_DDgui_drawtab_str_Str.arrAccess(local1_i_2067).values[tmpPositionCache], unref(static8_DDgui_drawtab_str2_Str_ref[0]), ",", 1);
				__debugInfo = "3027:\ddgui.gbas";
				local6_twidth_2076 = MAX(global25_gDDguiMinControlDimension, ((func21_DDGui_TextWidthIntern(static8_DDgui_drawtab_str2_Str_ref[0].arrAccess(0).values[tmpPositionCache])) + (local2_fx_ref_2073[0])));
				__debugInfo = "3035:\ddgui.gbas";
				if ((((local1_i_2067) == (local4_isel_2068)) ? 1 : 0)) {
					__debugInfo = "3029:\ddgui.gbas";
					func13_DDgui_backgnd(local3_c1b_2071, local3_c2b_2072, local1_x_2075, ((param4_ytop) + (1)), local6_twidth_2076, param3_wdg.attr7_wheight);
					__debugInfo = "3030:\ddgui.gbas";
					local4_selx_2077 = ((local1_x_2075) - (1));
					__debugInfo = "3031:\ddgui.gbas";
					local4_selw_2078 = ((local6_twidth_2076) + (2));
					__debugInfo = "3029:\ddgui.gbas";
				} else {
					__debugInfo = "3033:\ddgui.gbas";
					func13_DDgui_backgnd(local2_c1_2069, local2_c2_2070, ((local1_x_2075) + (1)), ((param4_ytop) + (4)), ((local6_twidth_2076) - (1)), ((param3_wdg.attr7_wheight) - (4)));
					__debugInfo = "3034:\ddgui.gbas";
					func14_DDgui_backrect(local1_x_2075, ((param4_ytop) + (3)), ((local6_twidth_2076) + (1)), ((param3_wdg.attr7_wheight) - (2)), local2_c2_2070);
					__debugInfo = "3033:\ddgui.gbas";
				};
				__debugInfo = "3036:\ddgui.gbas";
				func17_DDGui_PrintIntern(static8_DDgui_drawtab_str2_Str_ref[0].arrAccess(0).values[tmpPositionCache], ((local1_x_2075) + (INTEGER(CAST2INT(((local2_fx_ref_2073[0]) / (2)))))), local6_y_text_2081, (((local1_i_2067) == (local4_isel_2068)) ? 1 : 0));
				__debugInfo = "3037:\ddgui.gbas";
				local1_x_2075+=local6_twidth_2076;
				__debugInfo = "3026:\ddgui.gbas";
			};
			__debugInfo = "3038:\ddgui.gbas";
		};
		__debugInfo = "3042:\ddgui.gbas";
		if ((((local4_selx_2077) > (0)) ? 1 : 0)) {
			__debugInfo = "3042:\ddgui.gbas";
			func14_DDgui_backrect(local4_selx_2077, ((param4_ytop) + (1)), local4_selw_2078, param3_wdg.attr7_wheight, local3_c2b_2072);
			__debugInfo = "3042:\ddgui.gbas";
		};
		__debugInfo = "3045:\ddgui.gbas";
		DRAWRECT(0, ((param3_wdg.attr7_wheight) - (1)), ((param3_wdg.attr6_wwidth) - (1)), 1, local2_c2_2070);
		__debugInfo = "3046:\ddgui.gbas";
		return 0;
		__debugInfo = "3010:\ddgui.gbas";
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
		var local5_width_2088 = 0, local3_num_2089 = 0, local4_num2_2090 = 0, local1_i_2091 = 0, local2_fx_ref_2092 = [0], local2_fy_ref_2093 = [0], local1_x_2094 = 0, local6_oldsel_2095 = 0, local11_must_update_2098 = 0;
		__debugInfo = "3052:\ddgui.gbas";
		GETFONTSIZE(local2_fx_ref_2092, local2_fy_ref_2093);
		__debugInfo = "3053:\ddgui.gbas";
		param3_wdg.attr8_wclicked = 0;
		__debugInfo = "3055:\ddgui.gbas";
		local2_fy_ref_2093[0] = param3_wdg.attr7_wheight;
		__debugInfo = "3057:\ddgui.gbas";
		local11_must_update_2098 = 0;
		__debugInfo = "3058:\ddgui.gbas";
		if (((((((param3_wdg.attr7_wselect) == (-(1))) ? 1 : 0)) || ((((((((((((((((param2_b1) == (1)) ? 1 : 0)) && ((((param2_my) > (0)) ? 1 : 0))) ? 1 : 0)) && ((((param2_mx) > (0)) ? 1 : 0))) ? 1 : 0)) && ((((param2_my) <= (local2_fy_ref_2093[0])) ? 1 : 0))) ? 1 : 0)) && ((((param2_mx) < (param3_wdg.attr6_wwidth)) ? 1 : 0))) ? 1 : 0))) ? 1 : 0)) {
			__debugInfo = "3058:\ddgui.gbas";
			local11_must_update_2098 = 1;
			__debugInfo = "3058:\ddgui.gbas";
		};
		__debugInfo = "3059:\ddgui.gbas";
		if ((((param3_wdg.attr7_wselect) == (-(1))) ? 1 : 0)) {
			__debugInfo = "3059:\ddgui.gbas";
			func15_DDgui_selecttab(param3_wdg.attr7_wid_Str, 0);
			__debugInfo = "3059:\ddgui.gbas";
		};
		__debugInfo = "3080:\ddgui.gbas";
		if (local11_must_update_2098) {
			__debugInfo = "3063:\ddgui.gbas";
			local6_oldsel_2095 = param3_wdg.attr7_wselect;
			__debugInfo = "3064:\ddgui.gbas";
			local3_num_2089 = SPLITSTR(unref(param3_wdg.attr9_wtext_Str_ref[0]), unref(static7_DDgui_handletab_str_Str), "|", 1);
			__debugInfo = "3065:\ddgui.gbas";
			{
				__debugInfo = "3079:\ddgui.gbas";
				for (local1_i_2091 = 0;toCheck(local1_i_2091, ((local3_num_2089) - (1)), 1);local1_i_2091 += 1) {
					__debugInfo = "3067:\ddgui.gbas";
					local4_num2_2090 = SPLITSTR(static7_DDgui_handletab_str_Str.arrAccess(local1_i_2091).values[tmpPositionCache], unref(static8_DDgui_handletab_str2_Str_ref[0]), ",", 1);
					__debugInfo = "3068:\ddgui.gbas";
					local5_width_2088 = MAX(global25_gDDguiMinControlDimension, ((func21_DDGui_TextWidthIntern(static8_DDgui_handletab_str2_Str_ref[0].arrAccess(0).values[tmpPositionCache])) + (local2_fx_ref_2092[0])));
					__debugInfo = "3077:\ddgui.gbas";
					if (BOXCOLL(param2_mx, param2_my, 1, 1, local1_x_2094, 1, local5_width_2088, unref(local2_fy_ref_2093[0]))) {
						__debugInfo = "3075:\ddgui.gbas";
						if ((((local1_i_2091) != (local6_oldsel_2095)) ? 1 : 0)) {
							__debugInfo = "3072:\ddgui.gbas";
							param3_wdg.attr7_wselect = local1_i_2091;
							__debugInfo = "3073:\ddgui.gbas";
							param3_wdg.attr8_wclicked = 1;
							__debugInfo = "3074:\ddgui.gbas";
							func15_DDgui_selecttab(param3_wdg.attr7_wid_Str, local1_i_2091);
							__debugInfo = "3072:\ddgui.gbas";
						};
						__debugInfo = "3076:\ddgui.gbas";
						break;
						__debugInfo = "3075:\ddgui.gbas";
					};
					__debugInfo = "3078:\ddgui.gbas";
					local1_x_2094+=local5_width_2088;
					__debugInfo = "3067:\ddgui.gbas";
				};
				__debugInfo = "3079:\ddgui.gbas";
			};
			__debugInfo = "3063:\ddgui.gbas";
		};
		__debugInfo = "3081:\ddgui.gbas";
		return 0;
		__debugInfo = "3052:\ddgui.gbas";
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
		var local5_count_2301 = 0;
		__debugInfo = "3096:\ddgui.gbas";
		if (((((param6_id_Str).length) == (0)) ? 1 : 0)) {
			__debugInfo = "3094:\ddgui.gbas";
			local5_count_2301 = ((1) + (BOUNDS(global11_ddgui_stack_ref[0].arrAccess(-(1)).values[tmpPositionCache][0].attr7_widgets_ref[0], 0)));
			__debugInfo = "3095:\ddgui.gbas";
			param6_id_Str = (("frm") + (CAST2STRING(local5_count_2301)));
			__debugInfo = "3094:\ddgui.gbas";
		};
		__debugInfo = "3097:\ddgui.gbas";
		func12_DDgui_widget(param6_id_Str, param11_caption_Str, param5_width, 100);
		__debugInfo = "3098:\ddgui.gbas";
		func9_DDgui_set(param6_id_Str, "TYPE", "FRAME");
		__debugInfo = "3099:\ddgui.gbas";
		if ((((param5_width) == (0)) ? 1 : 0)) {
			__debugInfo = "3099:\ddgui.gbas";
			func9_DDgui_set(param6_id_Str, "WIDTH", CAST2STRING(10000));
			__debugInfo = "3099:\ddgui.gbas";
		};
		__debugInfo = "3100:\ddgui.gbas";
		return 0;
		__debugInfo = "3096:\ddgui.gbas";
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
		var local5_count_2302 = 0, local6_id_Str_2303 = "";
		__debugInfo = "3109:\ddgui.gbas";
		local5_count_2302 = ((1) + (BOUNDS(global11_ddgui_stack_ref[0].arrAccess(-(1)).values[tmpPositionCache][0].attr7_widgets_ref[0], 0)));
		__debugInfo = "3110:\ddgui.gbas";
		local6_id_Str_2303 = (("frm") + (CAST2STRING(local5_count_2302)));
		__debugInfo = "3111:\ddgui.gbas";
		func12_DDgui_widget(local6_id_Str_2303, "", 1, 1);
		__debugInfo = "3112:\ddgui.gbas";
		func9_DDgui_set(local6_id_Str_2303, "TYPE", "UNFRAME");
		__debugInfo = "3113:\ddgui.gbas";
		func9_DDgui_set(local6_id_Str_2303, "WIDTH", CAST2STRING(0));
		__debugInfo = "3114:\ddgui.gbas";
		func9_DDgui_set(local6_id_Str_2303, "HEIGHT", CAST2STRING(0));
		__debugInfo = "3115:\ddgui.gbas";
		return 0;
		__debugInfo = "3109:\ddgui.gbas";
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
		var local9_focus_Str_2100 = "", local6_ifocus_2101 = 0, local6_iFirst_2102 = 0, local7_iBefore_2103 = 0, local6_iAfter_2104 = 0, local5_iLast_2105 = 0;
		__debugInfo = "3130:\ddgui.gbas";
		local9_focus_Str_2100 = func13_DDgui_get_Str("", "FOCUS");
		__debugInfo = "3131:\ddgui.gbas";
		local6_ifocus_2101 = -(1);
		__debugInfo = "3133:\ddgui.gbas";
		local6_iFirst_2102 = -(1);
		__debugInfo = "3134:\ddgui.gbas";
		local7_iBefore_2103 = -(1);
		__debugInfo = "3135:\ddgui.gbas";
		local6_iAfter_2104 = -(1);
		__debugInfo = "3136:\ddgui.gbas";
		local5_iLast_2105 = -(1);
		__debugInfo = "3136:\ddgui.gbas";
		{
			var local1_i_2106 = 0;
			__debugInfo = "3152:\ddgui.gbas";
			for (local1_i_2106 = 0;toCheck(local1_i_2106, ((BOUNDS(global11_ddgui_stack_ref[0].arrAccess(-(1)).values[tmpPositionCache][0].attr7_widgets_ref[0], 0)) - (1)), 1);local1_i_2106 += 1) {
				var alias3_wdg_ref_2107 = [new type9_DDGUI_WDG()];
				__debugInfo = "3138:\ddgui.gbas";
				alias3_wdg_ref_2107 = global11_ddgui_stack_ref[0].arrAccess(-(1)).values[tmpPositionCache][0].attr7_widgets_ref[0].arrAccess(local1_i_2106).values[tmpPositionCache] /* ALIAS */;
				__debugInfo = "3143:\ddgui.gbas";
				if ((((alias3_wdg_ref_2107[0].attr7_wid_Str) == (local9_focus_Str_2100)) ? 1 : 0)) {
					__debugInfo = "3142:\ddgui.gbas";
					if ((((local6_ifocus_2101) == (-(1))) ? 1 : 0)) {
						__debugInfo = "3141:\ddgui.gbas";
						local6_ifocus_2101 = local1_i_2106;
						__debugInfo = "3141:\ddgui.gbas";
					};
					__debugInfo = "3142:\ddgui.gbas";
				};
				__debugInfo = "3151:\ddgui.gbas";
				if ((((((((((alias3_wdg_ref_2107[0].attr9_wtype_Str) == ("TEXT")) ? 1 : 0)) || ((((alias3_wdg_ref_2107[0].attr9_wtype_Str) == ("SINGLETEXT")) ? 1 : 0))) ? 1 : 0)) || ((((alias3_wdg_ref_2107[0].attr9_wtype_Str) == ("NUMBERTEXT")) ? 1 : 0))) ? 1 : 0)) {
					__debugInfo = "3147:\ddgui.gbas";
					if ((((local6_iFirst_2102) == (-(1))) ? 1 : 0)) {
						__debugInfo = "3147:\ddgui.gbas";
						local6_iFirst_2102 = local1_i_2106;
						__debugInfo = "3147:\ddgui.gbas";
					};
					__debugInfo = "3148:\ddgui.gbas";
					if ((((local6_ifocus_2101) == (-(1))) ? 1 : 0)) {
						__debugInfo = "3148:\ddgui.gbas";
						local7_iBefore_2103 = local1_i_2106;
						__debugInfo = "3148:\ddgui.gbas";
					};
					__debugInfo = "3149:\ddgui.gbas";
					if ((((((((((local6_ifocus_2101) >= (0)) ? 1 : 0)) && ((((local6_iAfter_2104) == (-(1))) ? 1 : 0))) ? 1 : 0)) && ((((local6_ifocus_2101) != (local1_i_2106)) ? 1 : 0))) ? 1 : 0)) {
						__debugInfo = "3149:\ddgui.gbas";
						local6_iAfter_2104 = local1_i_2106;
						__debugInfo = "3149:\ddgui.gbas";
					};
					__debugInfo = "3150:\ddgui.gbas";
					local5_iLast_2105 = local1_i_2106;
					__debugInfo = "3147:\ddgui.gbas";
				};
				__debugInfo = "3138:\ddgui.gbas";
			};
			__debugInfo = "3152:\ddgui.gbas";
		};
		__debugInfo = "3160:\ddgui.gbas";
		if ((((param10_iDirection) < (0)) ? 1 : 0)) {
			__debugInfo = "3155:\ddgui.gbas";
			if ((((local7_iBefore_2103) >= (0)) ? 1 : 0)) {
				__debugInfo = "3155:\ddgui.gbas";
				local6_ifocus_2101 = local7_iBefore_2103;
				__debugInfo = "3155:\ddgui.gbas";
			};
			__debugInfo = "3156:\ddgui.gbas";
			if (((((((local7_iBefore_2103) < (0)) ? 1 : 0)) && ((((local5_iLast_2105) >= (0)) ? 1 : 0))) ? 1 : 0)) {
				__debugInfo = "3156:\ddgui.gbas";
				local6_ifocus_2101 = local5_iLast_2105;
				__debugInfo = "3156:\ddgui.gbas";
			};
			__debugInfo = "3155:\ddgui.gbas";
		} else {
			__debugInfo = "3158:\ddgui.gbas";
			if ((((local6_iAfter_2104) >= (0)) ? 1 : 0)) {
				__debugInfo = "3158:\ddgui.gbas";
				local6_ifocus_2101 = local6_iAfter_2104;
				__debugInfo = "3158:\ddgui.gbas";
			};
			__debugInfo = "3159:\ddgui.gbas";
			if (((((((local6_iAfter_2104) < (0)) ? 1 : 0)) && ((((local6_iFirst_2102) >= (0)) ? 1 : 0))) ? 1 : 0)) {
				__debugInfo = "3159:\ddgui.gbas";
				local6_ifocus_2101 = local6_iFirst_2102;
				__debugInfo = "3159:\ddgui.gbas";
			};
			__debugInfo = "3158:\ddgui.gbas";
		};
		__debugInfo = "3165:\ddgui.gbas";
		if (((((((local6_ifocus_2101) >= (0)) ? 1 : 0)) && ((((local6_ifocus_2101) < (BOUNDS(global11_ddgui_stack_ref[0].arrAccess(-(1)).values[tmpPositionCache][0].attr7_widgets_ref[0], 0))) ? 1 : 0))) ? 1 : 0)) {
			__debugInfo = "3163:\ddgui.gbas";
			local9_focus_Str_2100 = global11_ddgui_stack_ref[0].arrAccess(-(1)).values[tmpPositionCache][0].attr7_widgets_ref[0].arrAccess(local6_ifocus_2101).values[tmpPositionCache][0].attr7_wid_Str;
			__debugInfo = "3164:\ddgui.gbas";
			func14_DDgui_setfocus(local9_focus_Str_2100);
			__debugInfo = "3163:\ddgui.gbas";
		};
		__debugInfo = "3166:\ddgui.gbas";
		return 0;
		__debugInfo = "3130:\ddgui.gbas";
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
		__debugInfo = "3172:\ddgui.gbas";
		func9_DDgui_set("", "FOCUS", param6_id_Str);
		__debugInfo = "3173:\ddgui.gbas";
		{
			var local16___SelectHelper6__2109 = "";
			__debugInfo = "3173:\ddgui.gbas";
			local16___SelectHelper6__2109 = func13_DDgui_get_Str(param6_id_Str, "TYPE");
			__debugInfo = "3183:\ddgui.gbas";
			if ((((local16___SelectHelper6__2109) == ("TEXT")) ? 1 : 0)) {
				__debugInfo = "3175:\ddgui.gbas";
				func9_DDgui_set(param6_id_Str, "SELSTART", CAST2STRING(0));
				__debugInfo = "3176:\ddgui.gbas";
				func9_DDgui_set(param6_id_Str, "SELEND", CAST2STRING(0));
				__debugInfo = "3175:\ddgui.gbas";
			} else if ((((local16___SelectHelper6__2109) == ("SINGLETEXT")) ? 1 : 0)) {
				__debugInfo = "3178:\ddgui.gbas";
				func9_DDgui_set(param6_id_Str, "SELSTART", CAST2STRING(0));
				__debugInfo = "3179:\ddgui.gbas";
				func9_DDgui_set(param6_id_Str, "SELEND", CAST2STRING((func13_DDgui_get_Str(param6_id_Str, "TEXT")).length));
				__debugInfo = "3178:\ddgui.gbas";
			} else if ((((local16___SelectHelper6__2109) == ("NUMBERTEXT")) ? 1 : 0)) {
				__debugInfo = "3181:\ddgui.gbas";
				func9_DDgui_set(param6_id_Str, "SELSTART", CAST2STRING(0));
				__debugInfo = "3182:\ddgui.gbas";
				func9_DDgui_set(param6_id_Str, "SELEND", CAST2STRING((func13_DDgui_get_Str(param6_id_Str, "TEXT")).length));
				__debugInfo = "3181:\ddgui.gbas";
			};
			__debugInfo = "3173:\ddgui.gbas";
		};
		__debugInfo = "3185:\ddgui.gbas";
		return 0;
		__debugInfo = "3172:\ddgui.gbas";
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
		var local3_num_2112 = 0, local4_num2_2113 = 0, local1_i_2114 = 0, local1_j_2115 = 0, local9_oldselect_2118 = 0;
		__debugInfo = "3195:\ddgui.gbas";
		local9_oldselect_2118 = ~~(func9_DDgui_get(param6_id_Str, "SELECT"));
		__debugInfo = "3197:\ddgui.gbas";
		func9_DDgui_set(param6_id_Str, "SELECT", CAST2STRING(param4_isel));
		__debugInfo = "3198:\ddgui.gbas";
		local3_num_2112 = SPLITSTR(func13_DDgui_get_Str(param6_id_Str, "TEXT"), unref(static7_DDgui_selecttab_str_Str), "|", 1);
		__debugInfo = "3199:\ddgui.gbas";
		{
			var local5_iHide_2119 = 0;
			__debugInfo = "3221:\ddgui.gbas";
			for (local5_iHide_2119 = 0;toCheck(local5_iHide_2119, 1, 1);local5_iHide_2119 += 1) {
				__debugInfo = "3200:\ddgui.gbas";
				{
					__debugInfo = "3220:\ddgui.gbas";
					for (local1_i_2114 = 0;toCheck(local1_i_2114, ((local3_num_2112) - (1)), 1);local1_i_2114 += 1) {
						__debugInfo = "3202:\ddgui.gbas";
						local4_num2_2113 = SPLITSTR(static7_DDgui_selecttab_str_Str.arrAccess(local1_i_2114).values[tmpPositionCache], unref(static8_DDgui_selecttab_str2_Str_ref[0]), ",", 1);
						__debugInfo = "3203:\ddgui.gbas";
						{
							__debugInfo = "3219:\ddgui.gbas";
							for (local1_j_2115 = 1;toCheck(local1_j_2115, ((local4_num2_2113) - (1)), 1);local1_j_2115 += 1) {
								__debugInfo = "3212:\ddgui.gbas";
								if (((((((local9_oldselect_2118) == (-(1))) ? 1 : 0)) && ((((func11_DDgui_index(unref(global11_ddgui_stack_ref[0].arrAccess(-(1)).values[tmpPositionCache][0]), static8_DDgui_selecttab_str2_Str_ref[0].arrAccess(local1_j_2115).values[tmpPositionCache], 0)) < (0)) ? 1 : 0))) ? 1 : 0)) {
									__debugInfo = "3210:\ddgui.gbas";
									DEBUG((((("Invalid widget in Tab: ") + (static8_DDgui_selecttab_str2_Str_ref[0].arrAccess(local1_j_2115).values[tmpPositionCache][0]))) + (" - could crash!\n")));
									__debugInfo = "3211:\ddgui.gbas";
									continue;
									__debugInfo = "3210:\ddgui.gbas";
								};
								__debugInfo = "3218:\ddgui.gbas";
								if (((((((local1_i_2114) == (param4_isel)) ? 1 : 0)) && ((((local5_iHide_2119) == (1)) ? 1 : 0))) ? 1 : 0)) {
									__debugInfo = "3215:\ddgui.gbas";
									func10_DDgui_hide(unref(static8_DDgui_selecttab_str2_Str_ref[0].arrAccess(local1_j_2115).values[tmpPositionCache][0]), 0);
									__debugInfo = "3215:\ddgui.gbas";
								} else if ((((local5_iHide_2119) == (0)) ? 1 : 0)) {
									__debugInfo = "3217:\ddgui.gbas";
									func10_DDgui_hide(unref(static8_DDgui_selecttab_str2_Str_ref[0].arrAccess(local1_j_2115).values[tmpPositionCache][0]), 1);
									__debugInfo = "3217:\ddgui.gbas";
								};
								__debugInfo = "3212:\ddgui.gbas";
							};
							__debugInfo = "3219:\ddgui.gbas";
						};
						__debugInfo = "3202:\ddgui.gbas";
					};
					__debugInfo = "3220:\ddgui.gbas";
				};
				__debugInfo = "3200:\ddgui.gbas";
			};
			__debugInfo = "3221:\ddgui.gbas";
		};
		__debugInfo = "3222:\ddgui.gbas";
		return 0;
		__debugInfo = "3195:\ddgui.gbas";
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
		var local5_start_2122 = 0, local4_fine_2123 = 0;
		__debugInfo = "3298:\ddgui.gbas";
		if ((((param5_index) < (0)) ? 1 : 0)) {
			__debugInfo = "3298:\ddgui.gbas";
			return "";
			__debugInfo = "3298:\ddgui.gbas";
		};
		__debugInfo = "3300:\ddgui.gbas";
		local5_start_2122 = -(1);
		__debugInfo = "3305:\ddgui.gbas";
		while ((((param5_index) > (0)) ? 1 : 0)) {
			__debugInfo = "3302:\ddgui.gbas";
			local5_start_2122 = INSTR(unref(param7_txt_Str_ref[0]), "|", ((local5_start_2122) + (1)));
			__debugInfo = "3303:\ddgui.gbas";
			if ((((local5_start_2122) < (0)) ? 1 : 0)) {
				__debugInfo = "3303:\ddgui.gbas";
				return "";
				__debugInfo = "3303:\ddgui.gbas";
			};
			__debugInfo = "3304:\ddgui.gbas";
			param5_index+=-1;
			__debugInfo = "3302:\ddgui.gbas";
		};
		__debugInfo = "3306:\ddgui.gbas";
		local4_fine_2123 = INSTR(unref(param7_txt_Str_ref[0]), "|", ((local5_start_2122) + (1)));
		__debugInfo = "3307:\ddgui.gbas";
		if ((((local4_fine_2123) > (0)) ? 1 : 0)) {
			__debugInfo = "3307:\ddgui.gbas";
			local4_fine_2123 = ((((local4_fine_2123) - (local5_start_2122))) - (1));
			__debugInfo = "3307:\ddgui.gbas";
		};
		__debugInfo = "3308:\ddgui.gbas";
		return tryClone(MID_Str(unref(param7_txt_Str_ref[0]), ((local5_start_2122) + (1)), local4_fine_2123));
		__debugInfo = "3309:\ddgui.gbas";
		return "";
		__debugInfo = "3298:\ddgui.gbas";
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
		var local2_iw_2306 = 0;
		var local6_id_Str_ref_2304 = [param6_id_Str]; /* NEWCODEHERE */
		__debugInfo = "3322:\ddgui.gbas";
		if ((((BOUNDS(global11_ddgui_stack_ref[0], 0)) == (0)) ? 1 : 0)) {
			__debugInfo = "3320:\ddgui.gbas";
			DEBUG("DDgui_get: No active dialog!\n");
			__debugInfo = "3321:\ddgui.gbas";
			return "";
			__debugInfo = "3320:\ddgui.gbas";
		};
		__debugInfo = "3324:\ddgui.gbas";
		local2_iw_2306 = func11_DDgui_index(unref(global11_ddgui_stack_ref[0].arrAccess(-(1)).values[tmpPositionCache][0]), local6_id_Str_ref_2304, 0);
		__debugInfo = "3330:\ddgui.gbas";
		if ((((local2_iw_2306) >= (0)) ? 1 : 0)) {
			var alias3_wdg_ref_2307 = [new type9_DDGUI_WDG()], alias7_txt_Str_ref_2308 = [""];
			__debugInfo = "3327:\ddgui.gbas";
			alias3_wdg_ref_2307 = global11_ddgui_stack_ref[0].arrAccess(-(1)).values[tmpPositionCache][0].attr7_widgets_ref[0].arrAccess(local2_iw_2306).values[tmpPositionCache] /* ALIAS */;
			__debugInfo = "3328:\ddgui.gbas";
			alias7_txt_Str_ref_2308 = alias3_wdg_ref_2307[0].attr9_wtext_Str_ref /* ALIAS */;
			__debugInfo = "3329:\ddgui.gbas";
			return tryClone(func31_DDgui_intern_list_item_text_Str(alias7_txt_Str_ref_2308, param5_index));
			__debugInfo = "3327:\ddgui.gbas";
		};
		__debugInfo = "3331:\ddgui.gbas";
		DEBUG((((("DDgui_get: Widget not found ") + (local6_id_Str_ref_2304[0]))) + ("\n")));
		__debugInfo = "3332:\ddgui.gbas";
		return "";
		__debugInfo = "3322:\ddgui.gbas";
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
window['func15_DDgui_input_Str'] = function(param8_text_Str, param13_bSpecialChars, param11_bFullscreen, param11_bSingleLine, param9_bIsNumber) {
		var __labels = {"__DrawFrames__": 3449, "refresh": 10723};
		
	stackPush("function: DDgui_input_Str", __debugInfo);
	try {
		var local2_fx_ref_2129 = [0], local2_fy_ref_2130 = [0], local4_size_2131 = 0, local7_iTabSel_2132 = 0, local12_text_old_Str_2133 = "", local4_ssel_2134 = 0, local4_esel_2135 = 0, local8_widg_Str_2136 = new GLBArray(), local3_scx_ref_2137 = [0], local3_scy_ref_2138 = [0], local12_storeoldsize_2139 = 0, local5_texth_2140 = 0, local10_cancel_Str_2142 = "", local3_chr_2143 = 0;
		var __pc = 10586;
		while(__pc >= 0) {
			switch(__pc) {
				case 10586:
					__debugInfo = "3426:\ddgui.gbas";
					local12_text_old_Str_2133 = param8_text_Str;
					
				__debugInfo = "3429:\ddgui.gbas";
				GETSCREENSIZE(local3_scx_ref_2137, local3_scy_ref_2138);
				__debugInfo = "3430:\ddgui.gbas";
				GETFONTSIZE(local2_fx_ref_2129, local2_fy_ref_2130);
				__debugInfo = "3432:\ddgui.gbas";
				local12_storeoldsize_2139 = global25_gDDguiMinControlDimension;
				__debugInfo = "3433:\ddgui.gbas";
				global25_gDDguiMinControlDimension = 16;
				__debugInfo = "3435:\ddgui.gbas";
				local4_size_2131 = MIN(400, MIN(unref(local3_scx_ref_2137[0]), unref(local3_scy_ref_2138[0])));
				case 10678:
					__debugInfo = "3449:\ddgui.gbas";
					if (!(param11_bFullscreen)) { __pc = 10608; break; }
					
					case 10615:
						__debugInfo = "3438:\ddgui.gbas";
						func16_DDgui_pushdialog(0, 0, unref(local3_scx_ref_2137[0]), unref(local3_scy_ref_2138[0]), 1);
						
					__debugInfo = "3439:\ddgui.gbas";
					local4_size_2131 = 20;
					case 10627:
						__debugInfo = "3440:\ddgui.gbas";
						if (!((((local3_scx_ref_2137[0]) > (240)) ? 1 : 0))) { __pc = 10622; break; }
					
					case 10626:
						__debugInfo = "3440:\ddgui.gbas";
						local4_size_2131 = 28;
						
					__debugInfo = "3440:\ddgui.gbas";
					
				case 10622: //dummy jumper1
					;
						
					case 10636:
						__debugInfo = "3441:\ddgui.gbas";
						if (!((((local3_scx_ref_2137[0]) > (320)) ? 1 : 0))) { __pc = 10631; break; }
					
					case 10635:
						__debugInfo = "3441:\ddgui.gbas";
						local4_size_2131 = 36;
						
					__debugInfo = "3441:\ddgui.gbas";
					
				case 10631: //dummy jumper1
					;
						
					__debugInfo = "3438:\ddgui.gbas";
					__pc = 16791;
					break;
					
				case 10608: //dummy jumper1
					
					case 10650:
						__debugInfo = "3443:\ddgui.gbas";
						func16_DDgui_pushdialog(CAST2INT(((((local3_scx_ref_2137[0]) - (local4_size_2131))) / (2))), CAST2INT(((((local3_scy_ref_2138[0]) - (local4_size_2131))) / (2))), local4_size_2131, local4_size_2131, 0);
						
					__debugInfo = "3444:\ddgui.gbas";
					local3_scy_ref_2138[0] = local4_size_2131;
					__debugInfo = "3445:\ddgui.gbas";
					local3_scx_ref_2137[0] = local4_size_2131;
					__debugInfo = "3446:\ddgui.gbas";
					local4_size_2131 = 20;
					case 10668:
						__debugInfo = "3447:\ddgui.gbas";
						if (!((((local3_scx_ref_2137[0]) > (240)) ? 1 : 0))) { __pc = 10663; break; }
					
					case 10667:
						__debugInfo = "3447:\ddgui.gbas";
						local4_size_2131 = 28;
						
					__debugInfo = "3447:\ddgui.gbas";
					
				case 10663: //dummy jumper1
					;
						
					case 10677:
						__debugInfo = "3448:\ddgui.gbas";
						if (!((((local3_scx_ref_2137[0]) > (320)) ? 1 : 0))) { __pc = 10672; break; }
					
					case 10676:
						__debugInfo = "3448:\ddgui.gbas";
						local4_size_2131 = 36;
						
					__debugInfo = "3448:\ddgui.gbas";
					
				case 10672: //dummy jumper1
					;
						
					__debugInfo = "3443:\ddgui.gbas";
					
				case 16791: //dummy jumper2
					;
					
				__debugInfo = "3452:\ddgui.gbas";
				global18_DDGUI_IN_INPUT_DLG = 1;
				__debugInfo = "3454:\ddgui.gbas";
				func9_DDgui_set("tx_text", "TEXT", param8_text_Str);
				__debugInfo = "3455:\ddgui.gbas";
				func9_DDgui_set("tab", "SELECT", CAST2STRING(2));
				case 10698:
					__debugInfo = "3456:\ddgui.gbas";
					if (!(param9_bIsNumber)) { __pc = 10692; break; }
					
					case 10697:
						__debugInfo = "3456:\ddgui.gbas";
						func9_DDgui_set("tab", "SELECT", CAST2STRING(0));
						
					__debugInfo = "3456:\ddgui.gbas";
					
				case 10692: //dummy jumper1
					;
					
				case 10722:
					__debugInfo = "3461:\ddgui.gbas";
					if (!((((param11_bSingleLine) || (((((((INSTR(param8_text_Str, "\n", 0)) < (0)) ? 1 : 0)) && (((((param8_text_Str).length) < (40)) ? 1 : 0))) ? 1 : 0))) ? 1 : 0))) { __pc = 10711; break; }
					
					case 10716:
						__debugInfo = "3459:\ddgui.gbas";
						func9_DDgui_set("tx_text", "SELSTART", CAST2STRING(0));
						
					__debugInfo = "3460:\ddgui.gbas";
					func9_DDgui_set("tx_text", "SELEND", CAST2STRING((param8_text_Str).length));
					__debugInfo = "3459:\ddgui.gbas";
					
				case 10711: //dummy jumper1
					;
					
				case 10723:
					__debugInfo = "3464:\ddgui.gbas";
					//label: refresh;
					
				__debugInfo = "3465:\ddgui.gbas";
				param8_text_Str = func13_DDgui_get_Str("tx_text", "TEXT");
				__debugInfo = "3466:\ddgui.gbas";
				local4_ssel_2134 = ~~(func9_DDgui_get("tx_text", "SELSTART"));
				__debugInfo = "3467:\ddgui.gbas";
				local4_esel_2135 = ~~(func9_DDgui_get("tx_text", "SELEND"));
				__debugInfo = "3468:\ddgui.gbas";
				local7_iTabSel_2132 = ~~(func9_DDgui_get("tab", "SELECT"));
				__debugInfo = "3470:\ddgui.gbas";
				func10_DDgui_init();
				__debugInfo = "3471:\ddgui.gbas";
				local5_texth_2140 = ((((local3_scy_ref_2138[0]) - (((6) * (((local4_size_2131) + (2))))))) - (32));
				case 10797:
					__debugInfo = "3481:\ddgui.gbas";
					if (!(param11_bSingleLine)) { __pc = 10761; break; }
					
					case 10765:
						__debugInfo = "3473:\ddgui.gbas";
						local5_texth_2140 = 0;
						
					case 10786:
						__debugInfo = "3478:\ddgui.gbas";
						if (!(param9_bIsNumber)) { __pc = 10767; break; }
					
					case 10776:
						__debugInfo = "3475:\ddgui.gbas";
						func16_DDgui_numbertext("tx_text", param8_text_Str, ((local3_scx_ref_2137[0]) - (MAX(32, unref(local2_fx_ref_2129[0])))));
						
					__debugInfo = "3475:\ddgui.gbas";
					__pc = 16799;
					break;
					
				case 10767: //dummy jumper1
					
					case 10785:
						__debugInfo = "3477:\ddgui.gbas";
						func16_DDgui_singletext("tx_text", param8_text_Str, ((local3_scx_ref_2137[0]) - (MAX(32, unref(local2_fx_ref_2129[0])))));
						
					__debugInfo = "3477:\ddgui.gbas";
					
				case 16799: //dummy jumper2
					;
						
					__debugInfo = "3473:\ddgui.gbas";
					__pc = 16798;
					break;
					
				case 10761: //dummy jumper1
					
					case 10796:
						__debugInfo = "3480:\ddgui.gbas";
						func10_DDgui_text("tx_text", param8_text_Str, ((local3_scx_ref_2137[0]) - (MAX(32, unref(local2_fx_ref_2129[0])))), local5_texth_2140);
						
					__debugInfo = "3480:\ddgui.gbas";
					
				case 16798: //dummy jumper2
					;
					
				__debugInfo = "3483:\ddgui.gbas";
				func9_DDgui_set("tx_text", "ALIGN", CAST2STRING(0));
				__debugInfo = "3484:\ddgui.gbas";
				func12_DDgui_spacer(10000, 2);
				__debugInfo = "3487:\ddgui.gbas";
				func9_DDgui_set("tab", "SELECT", CAST2STRING(local7_iTabSel_2132));
				__debugInfo = "3488:\ddgui.gbas";
				func9_DDgui_set("tx_text", "SELSTART", CAST2STRING(local4_ssel_2134));
				__debugInfo = "3489:\ddgui.gbas";
				func9_DDgui_set("tx_text", "SELEND", CAST2STRING(local4_esel_2135));
				case 10838:
					__debugInfo = "3499:\ddgui.gbas";
					if (!(param9_bIsNumber)) { __pc = 10818; break; }
					
					case 10823:
						__debugInfo = "3492:\ddgui.gbas";
						func9_DDgui_tab("tab", "123", local4_size_2131);
						
					__debugInfo = "3492:\ddgui.gbas";
					__pc = 16800;
					break;
					
				case 10818: //dummy jumper1
					
					case 10837:
						__debugInfo = "3498:\ddgui.gbas";
						if (!(param13_bSpecialChars)) { __pc = 10826; break; }
					
					case 10831:
						__debugInfo = "3495:\ddgui.gbas";
						func9_DDgui_tab("tab", "123|ABC|abc|ÄÖÜ", local4_size_2131);
						
					__debugInfo = "3495:\ddgui.gbas";
					__pc = 16801;
					break;
					
				case 10826: //dummy jumper1
					
					case 10836:
						__debugInfo = "3497:\ddgui.gbas";
						func9_DDgui_tab("tab", "123|ABC|abc", local4_size_2131);
						
					__debugInfo = "3497:\ddgui.gbas";
					
				case 16801: //dummy jumper2
					;
						
					__debugInfo = "3498:\ddgui.gbas";
					
				case 16800: //dummy jumper2
					;
					
				__debugInfo = "3502:\ddgui.gbas";
				func16_DDgui_framestart("fr_keypad", "", 0);
				case 11726:
					__debugInfo = "3677:\ddgui.gbas";
					if (!(param9_bIsNumber)) { __pc = 10842; break; }
					
					case 10848:
						__debugInfo = "3504:\ddgui.gbas";
						func12_DDgui_button("b7", "7", local4_size_2131, local4_size_2131);
						
					__debugInfo = "3505:\ddgui.gbas";
					func12_DDgui_button("b8", "8", local4_size_2131, local4_size_2131);
					__debugInfo = "3506:\ddgui.gbas";
					func12_DDgui_button("b9", "9", local4_size_2131, local4_size_2131);
					__debugInfo = "3507:\ddgui.gbas";
					func12_DDgui_button("b-", "-", local4_size_2131, local4_size_2131);
					__debugInfo = "3508:\ddgui.gbas";
					func12_DDgui_spacer(10000, 0);
					__debugInfo = "3509:\ddgui.gbas";
					func12_DDgui_button("b4", "4", local4_size_2131, local4_size_2131);
					__debugInfo = "3510:\ddgui.gbas";
					func12_DDgui_button("b5", "5", local4_size_2131, local4_size_2131);
					__debugInfo = "3511:\ddgui.gbas";
					func12_DDgui_button("b6", "6", local4_size_2131, local4_size_2131);
					__debugInfo = "3512:\ddgui.gbas";
					func12_DDgui_button("be", "e", local4_size_2131, local4_size_2131);
					__debugInfo = "3513:\ddgui.gbas";
					func12_DDgui_spacer(10000, 0);
					__debugInfo = "3514:\ddgui.gbas";
					func12_DDgui_button("b1", "1", local4_size_2131, local4_size_2131);
					__debugInfo = "3515:\ddgui.gbas";
					func12_DDgui_button("b2", "2", local4_size_2131, local4_size_2131);
					__debugInfo = "3516:\ddgui.gbas";
					func12_DDgui_button("b3", "3", local4_size_2131, local4_size_2131);
					__debugInfo = "3517:\ddgui.gbas";
					func12_DDgui_spacer(10000, 0);
					__debugInfo = "3518:\ddgui.gbas";
					func12_DDgui_button("b0", "0", ((((local4_size_2131) * (2))) + (2)), local4_size_2131);
					__debugInfo = "3519:\ddgui.gbas";
					func12_DDgui_button("b.", ".", local4_size_2131, local4_size_2131);
					__debugInfo = "3520:\ddgui.gbas";
					func12_DDgui_button("b\b", "<-", ((((local4_size_2131) * (2))) + (2)), local4_size_2131);
					__debugInfo = "3504:\ddgui.gbas";
					__pc = 16802;
					break;
					
				case 10842: //dummy jumper1
					
					case 10933:
						__debugInfo = "3522:\ddgui.gbas";
						
					var local16___SelectHelper7__2141 = 0;
					case 10935:
						__debugInfo = "3522:\ddgui.gbas";
						local16___SelectHelper7__2141 = local7_iTabSel_2132;
						
					case 11725:
						__debugInfo = "3676:\ddgui.gbas";
						if (!((((local16___SelectHelper7__2141) == (0)) ? 1 : 0))) { __pc = 10937; break; }
					
					case 10943:
						__debugInfo = "3524:\ddgui.gbas";
						func12_DDgui_button("b@", "@", local4_size_2131, local4_size_2131);
						
					__debugInfo = "3525:\ddgui.gbas";
					func12_DDgui_button("b#", "#", local4_size_2131, local4_size_2131);
					__debugInfo = "3526:\ddgui.gbas";
					func12_DDgui_button("b[", "[", local4_size_2131, local4_size_2131);
					__debugInfo = "3527:\ddgui.gbas";
					func12_DDgui_button("b]", "]", local4_size_2131, local4_size_2131);
					__debugInfo = "3528:\ddgui.gbas";
					func12_DDgui_button("b~", "~", local4_size_2131, local4_size_2131);
					__debugInfo = "3529:\ddgui.gbas";
					func12_DDgui_button("b7", "7", local4_size_2131, local4_size_2131);
					__debugInfo = "3530:\ddgui.gbas";
					func12_DDgui_button("b8", "8", local4_size_2131, local4_size_2131);
					__debugInfo = "3531:\ddgui.gbas";
					func12_DDgui_button("b9", "9", local4_size_2131, local4_size_2131);
					__debugInfo = "3532:\ddgui.gbas";
					func12_DDgui_button("b/", "/", local4_size_2131, local4_size_2131);
					__debugInfo = "3533:\ddgui.gbas";
					func12_DDgui_button("b*", "*", local4_size_2131, local4_size_2131);
					__debugInfo = "3534:\ddgui.gbas";
					func12_DDgui_spacer(10000, 0);
					__debugInfo = "3535:\ddgui.gbas";
					func12_DDgui_button("b?", "?", local4_size_2131, local4_size_2131);
					__debugInfo = "3536:\ddgui.gbas";
					func12_DDgui_button("b!", "!", local4_size_2131, local4_size_2131);
					__debugInfo = "3537:\ddgui.gbas";
					func12_DDgui_button("b{", "{", local4_size_2131, local4_size_2131);
					__debugInfo = "3538:\ddgui.gbas";
					func12_DDgui_button("b}", "}", local4_size_2131, local4_size_2131);
					__debugInfo = "3539:\ddgui.gbas";
					func12_DDgui_button("b=", "=", local4_size_2131, local4_size_2131);
					__debugInfo = "3540:\ddgui.gbas";
					func12_DDgui_button("b4", "4", local4_size_2131, local4_size_2131);
					__debugInfo = "3541:\ddgui.gbas";
					func12_DDgui_button("b5", "5", local4_size_2131, local4_size_2131);
					__debugInfo = "3542:\ddgui.gbas";
					func12_DDgui_button("b6", "6", local4_size_2131, local4_size_2131);
					__debugInfo = "3543:\ddgui.gbas";
					func12_DDgui_button("b-", "-", local4_size_2131, local4_size_2131);
					__debugInfo = "3544:\ddgui.gbas";
					func12_DDgui_button("b+", "+", local4_size_2131, local4_size_2131);
					__debugInfo = "3545:\ddgui.gbas";
					func12_DDgui_spacer(10000, 0);
					__debugInfo = "3546:\ddgui.gbas";
					func12_DDgui_button("b:", ":", local4_size_2131, local4_size_2131);
					__debugInfo = "3547:\ddgui.gbas";
					func12_DDgui_button("b;", ";", local4_size_2131, local4_size_2131);
					__debugInfo = "3548:\ddgui.gbas";
					func12_DDgui_button("b(", "(", local4_size_2131, local4_size_2131);
					__debugInfo = "3549:\ddgui.gbas";
					func12_DDgui_button("b)", ")", local4_size_2131, local4_size_2131);
					__debugInfo = "3550:\ddgui.gbas";
					func12_DDgui_button("b0", "0", local4_size_2131, local4_size_2131);
					__debugInfo = "3551:\ddgui.gbas";
					func12_DDgui_button("b1", "1", local4_size_2131, local4_size_2131);
					__debugInfo = "3552:\ddgui.gbas";
					func12_DDgui_button("b2", "2", local4_size_2131, local4_size_2131);
					__debugInfo = "3553:\ddgui.gbas";
					func12_DDgui_button("b3", "3", local4_size_2131, local4_size_2131);
					__debugInfo = "3554:\ddgui.gbas";
					func12_DDgui_button("b\b", "<-", ((((local4_size_2131) * (2))) + (2)), local4_size_2131);
					__debugInfo = "3555:\ddgui.gbas";
					func12_DDgui_spacer(10000, 0);
					__debugInfo = "3556:\ddgui.gbas";
					func12_DDgui_button("b,", ",", local4_size_2131, local4_size_2131);
					__debugInfo = "3557:\ddgui.gbas";
					func12_DDgui_button("b.", ".", local4_size_2131, local4_size_2131);
					__debugInfo = "3558:\ddgui.gbas";
					func12_DDgui_button("b<", "<", local4_size_2131, local4_size_2131);
					__debugInfo = "3559:\ddgui.gbas";
					func12_DDgui_button("b>", ">", local4_size_2131, local4_size_2131);
					__debugInfo = "3560:\ddgui.gbas";
					func12_DDgui_button("b'", "'", local4_size_2131, local4_size_2131);
					__debugInfo = "3561:\ddgui.gbas";
					func12_DDgui_button("b\"", "\"", local4_size_2131, local4_size_2131);
					__debugInfo = "3562:\ddgui.gbas";
					func12_DDgui_button("b ", "", ((((local4_size_2131) * (2))) + (2)), local4_size_2131);
					__debugInfo = "3563:\ddgui.gbas";
					func12_DDgui_button("b\n", CHR_Str(182), ((((local4_size_2131) * (2))) + (2)), local4_size_2131);
					__debugInfo = "3524:\ddgui.gbas";
					
				case 10937: //dummy jumper1
					if (!((((local16___SelectHelper7__2141) == (1)) ? 1 : 0))) { __pc = 11147; break; }
					
					case 11153:
						__debugInfo = "3565:\ddgui.gbas";
						func12_DDgui_button("bQ", "Q", local4_size_2131, local4_size_2131);
						
					__debugInfo = "3566:\ddgui.gbas";
					func12_DDgui_button("bW", "W", local4_size_2131, local4_size_2131);
					__debugInfo = "3567:\ddgui.gbas";
					func12_DDgui_button("bE", "E", local4_size_2131, local4_size_2131);
					__debugInfo = "3568:\ddgui.gbas";
					func12_DDgui_button("bR", "R", local4_size_2131, local4_size_2131);
					__debugInfo = "3569:\ddgui.gbas";
					func12_DDgui_button("bT", "T", local4_size_2131, local4_size_2131);
					__debugInfo = "3570:\ddgui.gbas";
					func12_DDgui_button("bY", "Y", local4_size_2131, local4_size_2131);
					__debugInfo = "3571:\ddgui.gbas";
					func12_DDgui_button("bU", "U", local4_size_2131, local4_size_2131);
					__debugInfo = "3572:\ddgui.gbas";
					func12_DDgui_button("bI", "I", local4_size_2131, local4_size_2131);
					__debugInfo = "3573:\ddgui.gbas";
					func12_DDgui_button("bO", "O", local4_size_2131, local4_size_2131);
					__debugInfo = "3574:\ddgui.gbas";
					func12_DDgui_button("bP", "P", local4_size_2131, local4_size_2131);
					__debugInfo = "3575:\ddgui.gbas";
					func12_DDgui_spacer(10000, 0);
					__debugInfo = "3576:\ddgui.gbas";
					func12_DDgui_button("bA", "A", local4_size_2131, local4_size_2131);
					__debugInfo = "3577:\ddgui.gbas";
					func12_DDgui_button("bS", "S", local4_size_2131, local4_size_2131);
					__debugInfo = "3578:\ddgui.gbas";
					func12_DDgui_button("bD", "D", local4_size_2131, local4_size_2131);
					__debugInfo = "3579:\ddgui.gbas";
					func12_DDgui_button("bF", "F", local4_size_2131, local4_size_2131);
					__debugInfo = "3580:\ddgui.gbas";
					func12_DDgui_button("bG", "G", local4_size_2131, local4_size_2131);
					__debugInfo = "3581:\ddgui.gbas";
					func12_DDgui_button("bH", "H", local4_size_2131, local4_size_2131);
					__debugInfo = "3582:\ddgui.gbas";
					func12_DDgui_button("bJ", "J", local4_size_2131, local4_size_2131);
					__debugInfo = "3583:\ddgui.gbas";
					func12_DDgui_button("bK", "K", local4_size_2131, local4_size_2131);
					__debugInfo = "3584:\ddgui.gbas";
					func12_DDgui_button("bL", "L", local4_size_2131, local4_size_2131);
					__debugInfo = "3585:\ddgui.gbas";
					func12_DDgui_button("b,", ",", local4_size_2131, local4_size_2131);
					__debugInfo = "3586:\ddgui.gbas";
					func12_DDgui_spacer(10000, 0);
					__debugInfo = "3587:\ddgui.gbas";
					func12_DDgui_button("bShift", "^", local4_size_2131, local4_size_2131);
					__debugInfo = "3588:\ddgui.gbas";
					func12_DDgui_button("bZ", "Z", local4_size_2131, local4_size_2131);
					__debugInfo = "3589:\ddgui.gbas";
					func12_DDgui_button("bX", "X", local4_size_2131, local4_size_2131);
					__debugInfo = "3590:\ddgui.gbas";
					func12_DDgui_button("bC", "C", local4_size_2131, local4_size_2131);
					__debugInfo = "3591:\ddgui.gbas";
					func12_DDgui_button("bV", "V", local4_size_2131, local4_size_2131);
					__debugInfo = "3592:\ddgui.gbas";
					func12_DDgui_button("bB", "B", local4_size_2131, local4_size_2131);
					__debugInfo = "3593:\ddgui.gbas";
					func12_DDgui_button("bN", "N", local4_size_2131, local4_size_2131);
					__debugInfo = "3594:\ddgui.gbas";
					func12_DDgui_button("bM", "M", local4_size_2131, local4_size_2131);
					__debugInfo = "3595:\ddgui.gbas";
					func12_DDgui_button("b\b", "<-", ((((local4_size_2131) * (2))) + (2)), local4_size_2131);
					__debugInfo = "3596:\ddgui.gbas";
					func12_DDgui_spacer(10000, 0);
					__debugInfo = "3597:\ddgui.gbas";
					func12_DDgui_button("b,", ",", local4_size_2131, local4_size_2131);
					__debugInfo = "3598:\ddgui.gbas";
					func12_DDgui_button("b.", ".", local4_size_2131, local4_size_2131);
					__debugInfo = "3599:\ddgui.gbas";
					func12_DDgui_button("b ", "", ((((local4_size_2131) * (6))) + (10)), local4_size_2131);
					__debugInfo = "3600:\ddgui.gbas";
					func12_DDgui_button("b\n", CHR_Str(182), ((((local4_size_2131) * (2))) + (2)), local4_size_2131);
					__debugInfo = "3565:\ddgui.gbas";
					
				case 11147: //dummy jumper1
					if (!((((local16___SelectHelper7__2141) == (2)) ? 1 : 0))) { __pc = 11337; break; }
					
					case 11343:
						__debugInfo = "3602:\ddgui.gbas";
						func12_DDgui_button("bq", "q", local4_size_2131, local4_size_2131);
						
					__debugInfo = "3603:\ddgui.gbas";
					func12_DDgui_button("bw", "w", local4_size_2131, local4_size_2131);
					__debugInfo = "3604:\ddgui.gbas";
					func12_DDgui_button("be", "e", local4_size_2131, local4_size_2131);
					__debugInfo = "3605:\ddgui.gbas";
					func12_DDgui_button("br", "r", local4_size_2131, local4_size_2131);
					__debugInfo = "3606:\ddgui.gbas";
					func12_DDgui_button("bt", "t", local4_size_2131, local4_size_2131);
					__debugInfo = "3607:\ddgui.gbas";
					func12_DDgui_button("by", "y", local4_size_2131, local4_size_2131);
					__debugInfo = "3608:\ddgui.gbas";
					func12_DDgui_button("bu", "u", local4_size_2131, local4_size_2131);
					__debugInfo = "3609:\ddgui.gbas";
					func12_DDgui_button("bi", "i", local4_size_2131, local4_size_2131);
					__debugInfo = "3610:\ddgui.gbas";
					func12_DDgui_button("bo", "o", local4_size_2131, local4_size_2131);
					__debugInfo = "3611:\ddgui.gbas";
					func12_DDgui_button("bp", "p", local4_size_2131, local4_size_2131);
					__debugInfo = "3612:\ddgui.gbas";
					func12_DDgui_spacer(10000, 0);
					__debugInfo = "3613:\ddgui.gbas";
					func12_DDgui_button("ba", "a", local4_size_2131, local4_size_2131);
					__debugInfo = "3614:\ddgui.gbas";
					func12_DDgui_button("bs", "s", local4_size_2131, local4_size_2131);
					__debugInfo = "3615:\ddgui.gbas";
					func12_DDgui_button("bd", "d", local4_size_2131, local4_size_2131);
					__debugInfo = "3616:\ddgui.gbas";
					func12_DDgui_button("bf", "f", local4_size_2131, local4_size_2131);
					__debugInfo = "3617:\ddgui.gbas";
					func12_DDgui_button("bg", "g", local4_size_2131, local4_size_2131);
					__debugInfo = "3618:\ddgui.gbas";
					func12_DDgui_button("bh", "h", local4_size_2131, local4_size_2131);
					__debugInfo = "3619:\ddgui.gbas";
					func12_DDgui_button("bj", "j", local4_size_2131, local4_size_2131);
					__debugInfo = "3620:\ddgui.gbas";
					func12_DDgui_button("bk", "k", local4_size_2131, local4_size_2131);
					__debugInfo = "3621:\ddgui.gbas";
					func12_DDgui_button("bl", "l", local4_size_2131, local4_size_2131);
					__debugInfo = "3622:\ddgui.gbas";
					func12_DDgui_button("b,", ",", local4_size_2131, local4_size_2131);
					__debugInfo = "3623:\ddgui.gbas";
					func12_DDgui_spacer(10000, 0);
					__debugInfo = "3624:\ddgui.gbas";
					func12_DDgui_button("bShift", "^", local4_size_2131, local4_size_2131);
					__debugInfo = "3625:\ddgui.gbas";
					func12_DDgui_button("bz", "z", local4_size_2131, local4_size_2131);
					__debugInfo = "3626:\ddgui.gbas";
					func12_DDgui_button("bx", "x", local4_size_2131, local4_size_2131);
					__debugInfo = "3627:\ddgui.gbas";
					func12_DDgui_button("bc", "c", local4_size_2131, local4_size_2131);
					__debugInfo = "3628:\ddgui.gbas";
					func12_DDgui_button("bv", "v", local4_size_2131, local4_size_2131);
					__debugInfo = "3629:\ddgui.gbas";
					func12_DDgui_button("bb", "b", local4_size_2131, local4_size_2131);
					__debugInfo = "3630:\ddgui.gbas";
					func12_DDgui_button("bn", "n", local4_size_2131, local4_size_2131);
					__debugInfo = "3631:\ddgui.gbas";
					func12_DDgui_button("bm", "m", local4_size_2131, local4_size_2131);
					__debugInfo = "3632:\ddgui.gbas";
					func12_DDgui_button("b\b", "<-", ((((local4_size_2131) * (2))) + (2)), local4_size_2131);
					__debugInfo = "3633:\ddgui.gbas";
					func12_DDgui_spacer(10000, 0);
					__debugInfo = "3634:\ddgui.gbas";
					func12_DDgui_button("b,", ",", local4_size_2131, local4_size_2131);
					__debugInfo = "3635:\ddgui.gbas";
					func12_DDgui_button("b.", ".", local4_size_2131, local4_size_2131);
					__debugInfo = "3636:\ddgui.gbas";
					func12_DDgui_button("b ", "", ((((local4_size_2131) * (6))) + (10)), local4_size_2131);
					__debugInfo = "3637:\ddgui.gbas";
					func12_DDgui_button("b\n", CHR_Str(182), ((((local4_size_2131) * (2))) + (2)), local4_size_2131);
					__debugInfo = "3602:\ddgui.gbas";
					
				case 11337: //dummy jumper1
					if (!((((local16___SelectHelper7__2141) == (3)) ? 1 : 0))) { __pc = 11527; break; }
					
					case 11533:
						__debugInfo = "3639:\ddgui.gbas";
						func12_DDgui_button("bá", "á", local4_size_2131, local4_size_2131);
						
					__debugInfo = "3640:\ddgui.gbas";
					func12_DDgui_button("bé", "é", local4_size_2131, local4_size_2131);
					__debugInfo = "3641:\ddgui.gbas";
					func12_DDgui_button("bí", "í", local4_size_2131, local4_size_2131);
					__debugInfo = "3642:\ddgui.gbas";
					func12_DDgui_button("bó", "ó", local4_size_2131, local4_size_2131);
					__debugInfo = "3643:\ddgui.gbas";
					func12_DDgui_button("bú", "ú", local4_size_2131, local4_size_2131);
					__debugInfo = "3644:\ddgui.gbas";
					func12_DDgui_button("bÁ", "Á", local4_size_2131, local4_size_2131);
					__debugInfo = "3645:\ddgui.gbas";
					func12_DDgui_button("bÉ", "É", local4_size_2131, local4_size_2131);
					__debugInfo = "3646:\ddgui.gbas";
					func12_DDgui_button("bÍ", "Í", local4_size_2131, local4_size_2131);
					__debugInfo = "3647:\ddgui.gbas";
					func12_DDgui_button("bÓ", "Ó", local4_size_2131, local4_size_2131);
					__debugInfo = "3648:\ddgui.gbas";
					func12_DDgui_button("bÚ", "Ú", local4_size_2131, local4_size_2131);
					__debugInfo = "3649:\ddgui.gbas";
					func12_DDgui_spacer(10000, 0);
					__debugInfo = "3650:\ddgui.gbas";
					func12_DDgui_button("bà", "à", local4_size_2131, local4_size_2131);
					__debugInfo = "3651:\ddgui.gbas";
					func12_DDgui_button("bè", "è", local4_size_2131, local4_size_2131);
					__debugInfo = "3652:\ddgui.gbas";
					func12_DDgui_button("bì", "ì", local4_size_2131, local4_size_2131);
					__debugInfo = "3653:\ddgui.gbas";
					func12_DDgui_button("bò", "ò", local4_size_2131, local4_size_2131);
					__debugInfo = "3654:\ddgui.gbas";
					func12_DDgui_button("bù", "ù", local4_size_2131, local4_size_2131);
					__debugInfo = "3655:\ddgui.gbas";
					func12_DDgui_button("b2", "À", local4_size_2131, local4_size_2131);
					__debugInfo = "3656:\ddgui.gbas";
					func12_DDgui_button("b3", "È", local4_size_2131, local4_size_2131);
					__debugInfo = "3657:\ddgui.gbas";
					func12_DDgui_button("b2", "Ì", local4_size_2131, local4_size_2131);
					__debugInfo = "3658:\ddgui.gbas";
					func12_DDgui_button("b2", "Ò", local4_size_2131, local4_size_2131);
					__debugInfo = "3659:\ddgui.gbas";
					func12_DDgui_button("b3", "Ù", local4_size_2131, local4_size_2131);
					__debugInfo = "3660:\ddgui.gbas";
					func12_DDgui_spacer(10000, 0);
					__debugInfo = "3661:\ddgui.gbas";
					func12_DDgui_button("bä", "ä", local4_size_2131, local4_size_2131);
					__debugInfo = "3662:\ddgui.gbas";
					func12_DDgui_button("bö", "ö", local4_size_2131, local4_size_2131);
					__debugInfo = "3663:\ddgui.gbas";
					func12_DDgui_button("bü", "ü", local4_size_2131, local4_size_2131);
					__debugInfo = "3664:\ddgui.gbas";
					func12_DDgui_button("bÄ", "Ä", local4_size_2131, local4_size_2131);
					__debugInfo = "3665:\ddgui.gbas";
					func12_DDgui_button("bÖ", "Ö", local4_size_2131, local4_size_2131);
					__debugInfo = "3666:\ddgui.gbas";
					func12_DDgui_button("bÜ", "Ü", local4_size_2131, local4_size_2131);
					__debugInfo = "3667:\ddgui.gbas";
					func12_DDgui_button("bß", "ß", local4_size_2131, local4_size_2131);
					__debugInfo = "3668:\ddgui.gbas";
					func12_DDgui_button("bß", "ß", local4_size_2131, local4_size_2131);
					__debugInfo = "3669:\ddgui.gbas";
					func12_DDgui_button("b\b", "<-", ((((local4_size_2131) * (2))) + (2)), local4_size_2131);
					__debugInfo = "3670:\ddgui.gbas";
					func12_DDgui_spacer(10000, 0);
					__debugInfo = "3671:\ddgui.gbas";
					func12_DDgui_button("b´", "´", local4_size_2131, local4_size_2131);
					__debugInfo = "3672:\ddgui.gbas";
					func12_DDgui_button("b`", "`", local4_size_2131, local4_size_2131);
					__debugInfo = "3673:\ddgui.gbas";
					func12_DDgui_button("b° ", "°", local4_size_2131, local4_size_2131);
					__debugInfo = "3674:\ddgui.gbas";
					func12_DDgui_button("b ", "", ((((local4_size_2131) * (5))) + (8)), local4_size_2131);
					__debugInfo = "3674:\ddgui.gbas";
					func12_DDgui_button("b\n", CHR_Str(182), ((((local4_size_2131) * (2))) + (2)), local4_size_2131);
					__debugInfo = "3675:\ddgui.gbas";
					func9_DDgui_set("b\n", "TEXT", "Enter");
					__debugInfo = "3639:\ddgui.gbas";
					
				case 11527: //dummy jumper1
					;
						
					__debugInfo = "3522:\ddgui.gbas";
					;
						
					__debugInfo = "3522:\ddgui.gbas";
					
				case 16802: //dummy jumper2
					;
					
				__debugInfo = "3680:\ddgui.gbas";
				func14_DDgui_frameend();
				__debugInfo = "3681:\ddgui.gbas";
				func9_DDgui_set("fr_keypad", "ALIGN", CAST2STRING(0));
				__debugInfo = "3683:\ddgui.gbas";
				local10_cancel_Str_2142 = "Cancel";
				case 11745:
					__debugInfo = "3684:\ddgui.gbas";
					if (!((((PLATFORMINFO_Str("LOCALE")) == ("de")) ? 1 : 0))) { __pc = 11740; break; }
					
					case 11744:
						__debugInfo = "3684:\ddgui.gbas";
						local10_cancel_Str_2142 = "Abbrechen";
						
					__debugInfo = "3684:\ddgui.gbas";
					
				case 11740: //dummy jumper1
					;
					
				__debugInfo = "3686:\ddgui.gbas";
				func12_DDgui_spacer(10000, 0);
				__debugInfo = "3687:\ddgui.gbas";
				func16_DDgui_framestart("fr_okpad", "", 0);
				__debugInfo = "3688:\ddgui.gbas";
				func12_DDgui_button("btOK", "OK", 0, local4_size_2131);
				__debugInfo = "3689:\ddgui.gbas";
				func12_DDgui_spacer(16, 1);
				__debugInfo = "3690:\ddgui.gbas";
				func12_DDgui_button("btCancel", local10_cancel_Str_2142, 0, local4_size_2131);
				__debugInfo = "3691:\ddgui.gbas";
				func14_DDgui_frameend();
				__debugInfo = "3692:\ddgui.gbas";
				func9_DDgui_set("fr_okpad", "ALIGN", CAST2STRING(0));
				__debugInfo = "3697:\ddgui.gbas";
				DIM(local8_widg_Str_2136, [0], "");
				case 11819:
					__debugInfo = "3703:\ddgui.gbas";
					var forEachSaver11819 = global11_ddgui_stack_ref[0].arrAccess(((BOUNDS(global11_ddgui_stack_ref[0], 0)) - (1))).values[tmpPositionCache][0].attr7_widgets_ref[0];
					var forEachCounter11819 = 0
					
				case 11786: //dummy for1
					if (!(forEachCounter11819 < forEachSaver11819.values.length)) {__pc = 11775; break;}
					var local1_w_ref_2144 = forEachSaver11819.values[forEachCounter11819];
					
					
					case 11818:
						__debugInfo = "3702:\ddgui.gbas";
						if (!((((((((local1_w_ref_2144[0].attr7_wid_Str).length) == (2)) ? 1 : 0)) && ((((MID_Str(local1_w_ref_2144[0].attr7_wid_Str, 0, 1)) == ("b")) ? 1 : 0))) ? 1 : 0))) { __pc = 11803; break; }
					
					case 11810:
						__debugInfo = "3700:\ddgui.gbas";
						DIMPUSH(local8_widg_Str_2136, local1_w_ref_2144[0].attr7_wid_Str);
						
					__debugInfo = "3701:\ddgui.gbas";
					local1_w_ref_2144[0].attr11_tiptext_Str_ref[0] = local1_w_ref_2144[0].attr9_wtext_Str_ref[0];
					__debugInfo = "3700:\ddgui.gbas";
					
				case 11803: //dummy jumper1
					;
						
					__debugInfo = "3702:\ddgui.gbas";
					forEachSaver11819.values[forEachCounter11819] = local1_w_ref_2144;
					
					forEachCounter11819++
					__pc = 11786; break; //back jump
					
				case 11775: //dummy for
					;
					
				__debugInfo = "3705:\ddgui.gbas";
				func9_DDgui_set("", "FOCUS", "tx_text");
				__debugInfo = "3706:\ddgui.gbas";
				func10_DDgui_show(1);
				case 11954:
					__debugInfo = "3747:\ddgui.gbas";
					if (!(1)) {__pc = 16806; break;}
					
					var local10_tab_change_2145 = 0;
					case 11834:
						__debugInfo = "3709:\ddgui.gbas";
						local10_tab_change_2145 = ~~(func9_DDgui_get("tab", "CLICKED"));
						
					__debugInfo = "3710:\ddgui.gbas";
					func9_DDgui_set("", "FOCUS", "tx_text");
					__debugInfo = "3711:\ddgui.gbas";
					func10_DDgui_show(1);
					case 11846:
						__debugInfo = "3713:\ddgui.gbas";
						if (!(local10_tab_change_2145)) { __pc = 11843; break; }
					
					case 11845:
						__debugInfo = "3713:\ddgui.gbas";
						__pc = __labels["refresh"]; break;
						
					__debugInfo = "3713:\ddgui.gbas";
					
				case 11843: //dummy jumper1
					;
						
					case 11882:
						__debugInfo = "3724:\ddgui.gbas";
						var forEachSaver11882 = local8_widg_Str_2136;
					var forEachCounter11882 = 0
					
				case 11850: //dummy for1
					if (!(forEachCounter11882 < forEachSaver11882.values.length)) {__pc = 11848; break;}
					var local5_w_Str_2146 = forEachSaver11882.values[forEachCounter11882];
					
					
					case 11881:
						__debugInfo = "3723:\ddgui.gbas";
						if (!(func9_DDgui_get(local5_w_Str_2146, "CLICKED"))) { __pc = 11854; break; }
					
					case 11862:
						__debugInfo = "3717:\ddgui.gbas";
						func9_DDgui_set("", "INKEY", MID_Str(local5_w_Str_2146, 1, 1));
						
					case 11879:
						__debugInfo = "3721:\ddgui.gbas";
						if (!((((func9_DDgui_get("tab", "SELECT")) == (1)) ? 1 : 0))) { __pc = 11869; break; }
					
					case 11874:
						__debugInfo = "3719:\ddgui.gbas";
						func9_DDgui_set("tab", "SELECT", CAST2STRING(2));
						
					__debugInfo = "3720:\ddgui.gbas";
					func9_DDgui_set("tab", "CLICKED", CAST2STRING(1));
					__debugInfo = "3719:\ddgui.gbas";
					
				case 11869: //dummy jumper1
					;
						
					case 11880:
						__debugInfo = "3722:\ddgui.gbas";
						__pc = 11848; break;
						
					__debugInfo = "3717:\ddgui.gbas";
					
				case 11854: //dummy jumper1
					;
						
					__debugInfo = "3723:\ddgui.gbas";
					forEachSaver11882.values[forEachCounter11882] = local5_w_Str_2146;
					
					forEachCounter11882++
					__pc = 11850; break; //back jump
					
				case 11848: //dummy for
					;
						
					case 11932:
						__debugInfo = "3735:\ddgui.gbas";
						if (!((((((param9_bIsNumber) ? 0 : 1)) && (func9_DDgui_get("bShift", "CLICKED"))) ? 1 : 0))) { __pc = 11890; break; }
					
					var local4_isel_2147 = 0;
					case 11897:
						__debugInfo = "3727:\ddgui.gbas";
						local4_isel_2147 = ~~(func9_DDgui_get("tab", "SELECT"));
						
					case 11931:
						__debugInfo = "3734:\ddgui.gbas";
						if (!(((((((local4_isel_2147) < (3)) ? 1 : 0)) && ((((local4_isel_2147) > (0)) ? 1 : 0))) ? 1 : 0))) { __pc = 11906; break; }
					
					case 11912:
						__debugInfo = "3729:\ddgui.gbas";
						local4_isel_2147 = ((local4_isel_2147) - (1));
						
					__debugInfo = "3730:\ddgui.gbas";
					local4_isel_2147 = ((1) - (local4_isel_2147));
					__debugInfo = "3731:\ddgui.gbas";
					local4_isel_2147 = ((1) + (local4_isel_2147));
					__debugInfo = "3732:\ddgui.gbas";
					func9_DDgui_set("tab", "SELECT", CAST2STRING(local4_isel_2147));
					__debugInfo = "3733:\ddgui.gbas";
					func9_DDgui_set("tab", "CLICKED", CAST2STRING(1));
					__debugInfo = "3729:\ddgui.gbas";
					
				case 11906: //dummy jumper1
					;
						
					__debugInfo = "3727:\ddgui.gbas";
					
				case 11890: //dummy jumper1
					;
						
					case 11943:
						__debugInfo = "3740:\ddgui.gbas";
						if (!(func9_DDgui_get("btOK", "CLICKED"))) { __pc = 11935; break; }
					
					case 11941:
						__debugInfo = "3738:\ddgui.gbas";
						param8_text_Str = func13_DDgui_get_Str("tx_text", "TEXT");
						
					case 11942:
						__debugInfo = "3739:\ddgui.gbas";
						__pc = 16806; break;
						
					__debugInfo = "3738:\ddgui.gbas";
					
				case 11935: //dummy jumper1
					;
						
					case 11952:
						__debugInfo = "3744:\ddgui.gbas";
						if (!(func9_DDgui_get("btCancel", "CLICKED"))) { __pc = 11946; break; }
					
					case 11950:
						__debugInfo = "3742:\ddgui.gbas";
						param8_text_Str = local12_text_old_Str_2133;
						
					case 11951:
						__debugInfo = "3743:\ddgui.gbas";
						__pc = 16806; break;
						
					__debugInfo = "3742:\ddgui.gbas";
					
				case 11946: //dummy jumper1
					;
						
					__debugInfo = "3746:\ddgui.gbas";
					SHOWSCREEN();
					__debugInfo = "3709:\ddgui.gbas";
					__pc = 11954; break; //back jump
					
				case 16806:
					;
					
				__debugInfo = "3749:\ddgui.gbas";
				func15_DDgui_popdialog();
				__debugInfo = "3751:\ddgui.gbas";
				global18_DDGUI_IN_INPUT_DLG = 0;
				__debugInfo = "3754:\ddgui.gbas";
				global25_gDDguiMinControlDimension = local12_storeoldsize_2139;
				__debugInfo = "3756:\ddgui.gbas";
				return tryClone(param8_text_Str);
				__debugInfo = "3757:\ddgui.gbas";
				return "";
				__debugInfo = "3426:\ddgui.gbas";__pc = -1; break;
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
		var __labels = {"__DrawFrames__": 3449, "refresh_fd": 12018};
		
	stackPush("function: DDgui_FileDialog_Str", __debugInfo);
	try {
		var local12_startdir_Str_2151 = "", local8_cdir_Str_2152 = "", local9_bread_Str_2153 = new GLBArray(), local7_pre_Str_2154 = "", local9_files_Str_2155 = new GLBArray(), local8_num_file_2156 = 0, local7_num_dir_2157 = 0, local11_outfile_Str_2158 = "", local12_bBreadcrumbs_2159 = 0, local3_scx_ref_2160 = [0], local3_scy_ref_2161 = [0], local11_caption_Str_2162 = "", local7_tmp_Str_2164 = "", local2_ok_2167 = 0;
		var __pc = 11969;
		while(__pc >= 0) {
			switch(__pc) {
				case 11969:
					__debugInfo = "3766:\ddgui.gbas";
					local12_startdir_Str_2151 = GETCURRENTDIR_Str();
					
				__debugInfo = "3767:\ddgui.gbas";
				local8_cdir_Str_2152 = local12_startdir_Str_2151;
				__debugInfo = "3774:\ddgui.gbas";
				local12_bBreadcrumbs_2159 = 0;
				__debugInfo = "3776:\ddgui.gbas";
				GETSCREENSIZE(local3_scx_ref_2160, local3_scy_ref_2161);
				__debugInfo = "3779:\ddgui.gbas";
				local3_scx_ref_2160[0] = MIN(480, unref(local3_scx_ref_2160[0]));
				__debugInfo = "3780:\ddgui.gbas";
				local3_scy_ref_2161[0] = MIN(480, unref(local3_scy_ref_2161[0]));
				case 12011:
					__debugInfo = "3784:\ddgui.gbas";
					if (!(((((((local3_scx_ref_2160[0]) > (400)) ? 1 : 0)) && ((((local3_scy_ref_2161[0]) > (400)) ? 1 : 0))) ? 1 : 0))) { __pc = 12006; break; }
					
					case 12010:
						__debugInfo = "3783:\ddgui.gbas";
						local12_bBreadcrumbs_2159 = 1;
						
					__debugInfo = "3783:\ddgui.gbas";
					
				case 12006: //dummy jumper1
					;
					
				__debugInfo = "3785:\ddgui.gbas";
				func16_DDgui_pushdialog(0, 0, unref(local3_scx_ref_2160[0]), unref(local3_scy_ref_2161[0]), 1);
				case 12018:
					__debugInfo = "3787:\ddgui.gbas";
					//label: refresh_fd;
					
				__debugInfo = "3788:\ddgui.gbas";
				func10_DDgui_init();
				__debugInfo = "3789:\ddgui.gbas";
				func9_DDgui_set("", "MOVEABLE", CAST2STRING(1));
				__debugInfo = "3790:\ddgui.gbas";
				func9_DDgui_set("", "SCALEABLE", CAST2STRING(0));
				__debugInfo = "3791:\ddgui.gbas";
				local11_caption_Str_2162 = "Pick a file:";
				case 12041:
					__debugInfo = "3792:\ddgui.gbas";
					if (!((((PLATFORMINFO_Str("LOCALE")) == ("de")) ? 1 : 0))) { __pc = 12036; break; }
					
					case 12040:
						__debugInfo = "3792:\ddgui.gbas";
						local11_caption_Str_2162 = "Datei auswählen:";
						
					__debugInfo = "3792:\ddgui.gbas";
					
				case 12036: //dummy jumper1
					;
					
				__debugInfo = "3793:\ddgui.gbas";
				func9_DDgui_set("", "TEXT", local11_caption_Str_2162);
				__debugInfo = "3794:\ddgui.gbas";
				local8_cdir_Str_2152 = GETCURRENTDIR_Str();
				case 12055:
					__debugInfo = "3796:\ddgui.gbas";
					if (!((((param10_initialise) == (1)) ? 1 : 0))) { __pc = 12052; break; }
					
					case 12054:
						__debugInfo = "3796:\ddgui.gbas";
						func10_DDgui_init();
						
					__debugInfo = "3796:\ddgui.gbas";
					
				case 12052: //dummy jumper1
					;
					
				case 12110:
					__debugInfo = "3812:\ddgui.gbas";
					if (!((((MID_Str(local8_cdir_Str_2152, 1, 1)) == (":")) ? 1 : 0))) { __pc = 12062; break; }
					
					case 12069:
						__debugInfo = "3801:\ddgui.gbas";
						local7_pre_Str_2154 = MID_Str(local8_cdir_Str_2152, 0, 2);
						
					__debugInfo = "3802:\ddgui.gbas";
					local8_cdir_Str_2152 = MID_Str(local8_cdir_Str_2152, 2, -(1));
					__debugInfo = "3801:\ddgui.gbas";
					__pc = 16817;
					break;
					
				case 12062: //dummy jumper1
					if (!(((((((MID_Str(local8_cdir_Str_2152, 1, 1)) == ("/")) ? 1 : 0)) || ((((MID_Str(local8_cdir_Str_2152, 0, 1)) == ("~")) ? 1 : 0))) ? 1 : 0))) { __pc = 12088; break; }
					
					case 12095:
						__debugInfo = "3806:\ddgui.gbas";
						local7_pre_Str_2154 = MID_Str(local8_cdir_Str_2152, 0, 1);
						
					__debugInfo = "3807:\ddgui.gbas";
					local8_cdir_Str_2152 = MID_Str(local8_cdir_Str_2152, 1, -(1));
					__debugInfo = "3806:\ddgui.gbas";
					__pc = 16817;
					break;
					
				case 12088: //dummy jumper1
					
					case 12104:
						__debugInfo = "3810:\ddgui.gbas";
						local7_pre_Str_2154 = "";
						
					__debugInfo = "3811:\ddgui.gbas";
					local8_cdir_Str_2152 = MID_Str(local8_cdir_Str_2152, 1, -(1));
					__debugInfo = "3810:\ddgui.gbas";
					
				case 16817: //dummy jumper2
					;
					
				__debugInfo = "3813:\ddgui.gbas";
				SPLITSTR(local8_cdir_Str_2152, unref(local9_bread_Str_2153), "/", 1);
				case 12145:
					__debugInfo = "3820:\ddgui.gbas";
					if (!(local12_bBreadcrumbs_2159)) { __pc = 12117; break; }
					
					case 12119:
						__debugInfo = "3815:\ddgui.gbas";
						
					var local1_i_2163 = 0;
					case 12141:
						__debugInfo = "3818:\ddgui.gbas";
						local1_i_2163 = 0
					
				case 12122: //dummy for1
					if (!toCheck(local1_i_2163, ((BOUNDS(local9_bread_Str_2153, 0)) - (1)), 1)) {__pc = 12129; break;}
					
					case 12140:
						__debugInfo = "3817:\ddgui.gbas";
						func12_DDgui_button((("bt_br") + (CAST2STRING(local1_i_2163))), local9_bread_Str_2153.arrAccess(local1_i_2163).values[tmpPositionCache], 0, 0);
						
					__debugInfo = "3817:\ddgui.gbas";
					local1_i_2163 += 1;
					__pc = 12122; break; //back jump
					
				case 12129: //dummy for
					;
						
					__debugInfo = "3818:\ddgui.gbas";
					;
						
					__debugInfo = "3819:\ddgui.gbas";
					func12_DDgui_spacer(1000, 4);
					__debugInfo = "3815:\ddgui.gbas";
					
				case 12117: //dummy jumper1
					;
					
				__debugInfo = "3822:\ddgui.gbas";
				local8_num_file_2156 = ~~(GETFILELIST(param13_filterstr_Str, unref(local9_files_Str_2155)));
				__debugInfo = "3823:\ddgui.gbas";
				local7_num_dir_2157 = INTEGER(CAST2INT(((local8_num_file_2156) / (65536))));
				__debugInfo = "3824:\ddgui.gbas";
				local8_num_file_2156 = MOD(local8_num_file_2156, 65536);
				__debugInfo = "3826:\ddgui.gbas";
				
					var local1_i_2165 = 0;
					case 12210:
						__debugInfo = "3838:\ddgui.gbas";
						local1_i_2165 = 0
					
				case 12168: //dummy for1
					if (!toCheck(local1_i_2165, ((local7_num_dir_2157) - (1)), 1)) {__pc = 12172; break;}
					
					case 12196:
						__debugInfo = "3833:\ddgui.gbas";
						if (!((((local9_files_Str_2155.arrAccess(local1_i_2165).values[tmpPositionCache]) == (".")) ? 1 : 0))) { __pc = 12179; break; }
					
					case 12184:
						__debugInfo = "3829:\ddgui.gbas";
						DIMDEL(local9_files_Str_2155, local1_i_2165);
						
					__debugInfo = "3830:\ddgui.gbas";
					local7_num_dir_2157+=-(1);
					__debugInfo = "3831:\ddgui.gbas";
					local1_i_2165+=-(1);
					case 12195:
						__debugInfo = "3832:\ddgui.gbas";
						__pc = 12168; break;
						
					__debugInfo = "3829:\ddgui.gbas";
					
				case 12179: //dummy jumper1
					;
						
					case 12204:
						__debugInfo = "3836:\ddgui.gbas";
						if (!((local7_tmp_Str_2164).length)) { __pc = 12199; break; }
					
					case 12203:
						__debugInfo = "3835:\ddgui.gbas";
						local7_tmp_Str_2164+="|";
						
					__debugInfo = "3835:\ddgui.gbas";
					
				case 12199: //dummy jumper1
					;
						
					__debugInfo = "3837:\ddgui.gbas";
					local7_tmp_Str_2164+=local9_files_Str_2155.arrAccess(local1_i_2165).values[tmpPositionCache];
					__debugInfo = "3833:\ddgui.gbas";
					local1_i_2165 += 1;
					__pc = 12168; break; //back jump
					
				case 12172: //dummy for
					;
						
					__debugInfo = "3838:\ddgui.gbas";
					;
				__debugInfo = "3840:\ddgui.gbas";
				func11_DDgui_combo("ls_dir", local7_tmp_Str_2164, ((local3_scx_ref_2160[0]) - (20)), 0);
				__debugInfo = "3841:\ddgui.gbas";
				func9_DDgui_set("ls_dir", "SELECT", CAST2STRING(-(1)));
				__debugInfo = "3842:\ddgui.gbas";
				func12_DDgui_spacer(1000, 4);
				__debugInfo = "3844:\ddgui.gbas";
				local7_tmp_Str_2164 = "";
				__debugInfo = "3844:\ddgui.gbas";
				
					var local1_i_2166 = 0;
					case 12254:
						__debugInfo = "3848:\ddgui.gbas";
						local1_i_2166 = 0
					
				case 12232: //dummy for1
					if (!toCheck(local1_i_2166, ((local8_num_file_2156) - (1)), 1)) {__pc = 12236; break;}
					
					case 12246:
						__debugInfo = "3846:\ddgui.gbas";
						if (!((((local1_i_2166) > (0)) ? 1 : 0))) { __pc = 12241; break; }
					
					case 12245:
						__debugInfo = "3846:\ddgui.gbas";
						local7_tmp_Str_2164+="|";
						
					__debugInfo = "3846:\ddgui.gbas";
					
				case 12241: //dummy jumper1
					;
						
					__debugInfo = "3847:\ddgui.gbas";
					local7_tmp_Str_2164+=local9_files_Str_2155.arrAccess(((local1_i_2166) + (local7_num_dir_2157))).values[tmpPositionCache];
					__debugInfo = "3846:\ddgui.gbas";
					local1_i_2166 += 1;
					__pc = 12232; break; //back jump
					
				case 12236: //dummy for
					;
						
					__debugInfo = "3848:\ddgui.gbas";
					;
				__debugInfo = "3849:\ddgui.gbas";
				func10_DDgui_list("ls_file", local7_tmp_Str_2164, ((local3_scx_ref_2160[0]) - (20)), ((((local3_scy_ref_2161[0]) - (120))) - (((local12_bBreadcrumbs_2159) * (64)))));
				__debugInfo = "3850:\ddgui.gbas";
				func9_DDgui_set("ls_file", "SELECT", CAST2STRING(-(1)));
				__debugInfo = "3851:\ddgui.gbas";
				func12_DDgui_spacer(1000, 4);
				__debugInfo = "3852:\ddgui.gbas";
				func16_DDgui_singletext("tx_file", "", ((local3_scx_ref_2160[0]) - (20)));
				__debugInfo = "3853:\ddgui.gbas";
				func12_DDgui_spacer(1000, 4);
				__debugInfo = "3854:\ddgui.gbas";
				func12_DDgui_button("bt_ok", "OK", 0, 0);
				__debugInfo = "3855:\ddgui.gbas";
				func12_DDgui_button("bt_cancel", "Cancel", 0, 0);
				__debugInfo = "3857:\ddgui.gbas";
				local2_ok_2167 = 0;
				case 12603:
					__debugInfo = "3943:\ddgui.gbas";
					if (!(1)) {__pc = 16822; break;}
					
					case 12305:
						__debugInfo = "3859:\ddgui.gbas";
						func10_DDgui_show(0);
						
					case 12367:
						__debugInfo = "3876:\ddgui.gbas";
						if (!(local12_bBreadcrumbs_2159)) { __pc = 12307; break; }
					
					case 12309:
						__debugInfo = "3861:\ddgui.gbas";
						
					var local1_i_2168 = 0;
					case 12366:
						__debugInfo = "3875:\ddgui.gbas";
						local1_i_2168 = 0
					
				case 12312: //dummy for1
					if (!toCheck(local1_i_2168, ((BOUNDS(local9_bread_Str_2153, 0)) - (1)), 1)) {__pc = 12319; break;}
					
					case 12365:
						__debugInfo = "3874:\ddgui.gbas";
						if (!(func9_DDgui_get((("bt_br") + (CAST2STRING(local1_i_2168))), "CLICKED"))) { __pc = 12326; break; }
					
					case 12330:
						__debugInfo = "3864:\ddgui.gbas";
						local8_cdir_Str_2152 = local7_pre_Str_2154;
						
					__debugInfo = "3864:\ddgui.gbas";
					
					var local1_j_2169 = 0;
					case 12346:
						__debugInfo = "3868:\ddgui.gbas";
						local1_j_2169 = 0
					
				case 12334: //dummy for1
					if (!toCheck(local1_j_2169, local1_i_2168, 1)) {__pc = 12336; break;}
					
					case 12340:
						__debugInfo = "3866:\ddgui.gbas";
						local8_cdir_Str_2152+="/";
						
					__debugInfo = "3867:\ddgui.gbas";
					local8_cdir_Str_2152+=local9_bread_Str_2153.arrAccess(local1_j_2169).values[tmpPositionCache];
					__debugInfo = "3866:\ddgui.gbas";
					local1_j_2169 += 1;
					__pc = 12334; break; //back jump
					
				case 12336: //dummy for
					;
						
					__debugInfo = "3868:\ddgui.gbas";
					;
					case 12361:
						__debugInfo = "3870:\ddgui.gbas";
						if (!((((MID_Str(local8_cdir_Str_2152, (((local8_cdir_Str_2152).length) - (1)), 1)) == (":")) ? 1 : 0))) { __pc = 12356; break; }
					
					case 12360:
						__debugInfo = "3870:\ddgui.gbas";
						local8_cdir_Str_2152+="/";
						
					__debugInfo = "3870:\ddgui.gbas";
					
				case 12356: //dummy jumper1
					;
						
					__debugInfo = "3871:\ddgui.gbas";
					SETCURRENTDIR(local8_cdir_Str_2152);
					case 12364:
						__debugInfo = "3872:\ddgui.gbas";
						__pc = __labels["refresh_fd"]; break;
						
					__debugInfo = "3864:\ddgui.gbas";
					
				case 12326: //dummy jumper1
					;
						
					__debugInfo = "3874:\ddgui.gbas";
					local1_i_2168 += 1;
					__pc = 12312; break; //back jump
					
				case 12319: //dummy for
					;
						
					__debugInfo = "3875:\ddgui.gbas";
					;
						
					__debugInfo = "3861:\ddgui.gbas";
					
				case 12307: //dummy jumper1
					;
						
					case 12465:
						__debugInfo = "3894:\ddgui.gbas";
						if (!(func9_DDgui_get("ls_dir", "CLICKED"))) { __pc = 12370; break; }
					
					var local3_sel_2170 = 0;
					case 12377:
						__debugInfo = "3879:\ddgui.gbas";
						local3_sel_2170 = ~~(func9_DDgui_get("ls_dir", "SELECT"));
						
					__debugInfo = "3880:\ddgui.gbas";
					local8_cdir_Str_2152 = local7_pre_Str_2154;
					__debugInfo = "3880:\ddgui.gbas";
					
					var local1_i_2171 = 0;
					case 12402:
						__debugInfo = "3884:\ddgui.gbas";
						local1_i_2171 = 0
					
				case 12385: //dummy for1
					if (!toCheck(local1_i_2171, ((BOUNDS(local9_bread_Str_2153, 0)) - (2)), 1)) {__pc = 12392; break;}
					
					case 12396:
						__debugInfo = "3882:\ddgui.gbas";
						local8_cdir_Str_2152+="/";
						
					__debugInfo = "3883:\ddgui.gbas";
					local8_cdir_Str_2152+=local9_bread_Str_2153.arrAccess(local1_i_2171).values[tmpPositionCache];
					__debugInfo = "3882:\ddgui.gbas";
					local1_i_2171 += 1;
					__pc = 12385; break; //back jump
					
				case 12392: //dummy for
					;
						
					__debugInfo = "3884:\ddgui.gbas";
					;
					case 12446:
						__debugInfo = "3889:\ddgui.gbas";
						if (!((((local9_files_Str_2155.arrAccess(local3_sel_2170).values[tmpPositionCache]) != ("..")) ? 1 : 0))) { __pc = 12408; break; }
					
					case 12425:
						__debugInfo = "3886:\ddgui.gbas";
						if (!(BOUNDS(local9_bread_Str_2153, 0))) { __pc = 12414; break; }
					
					case 12424:
						__debugInfo = "3886:\ddgui.gbas";
						local8_cdir_Str_2152+=(("/") + (local9_bread_Str_2153.arrAccess(-(1)).values[tmpPositionCache]));
						
					__debugInfo = "3886:\ddgui.gbas";
					
				case 12414: //dummy jumper1
					;
						
					__debugInfo = "3887:\ddgui.gbas";
					DEBUG((((((((("sel: ") + (CAST2STRING(local3_sel_2170)))) + (" = "))) + (func21_DDgui_getitemtext_Str("ls_dir", local3_sel_2170)))) + ("\n")));
					__debugInfo = "3888:\ddgui.gbas";
					local8_cdir_Str_2152+=(("/") + (func21_DDgui_getitemtext_Str("ls_dir", local3_sel_2170)));
					__debugInfo = "3886:\ddgui.gbas";
					
				case 12408: //dummy jumper1
					;
						
					case 12461:
						__debugInfo = "3891:\ddgui.gbas";
						if (!((((MID_Str(local8_cdir_Str_2152, (((local8_cdir_Str_2152).length) - (1)), 1)) == (":")) ? 1 : 0))) { __pc = 12456; break; }
					
					case 12460:
						__debugInfo = "3891:\ddgui.gbas";
						local8_cdir_Str_2152+="/";
						
					__debugInfo = "3891:\ddgui.gbas";
					
				case 12456: //dummy jumper1
					;
						
					__debugInfo = "3892:\ddgui.gbas";
					SETCURRENTDIR(local8_cdir_Str_2152);
					case 12464:
						__debugInfo = "3893:\ddgui.gbas";
						__pc = __labels["refresh_fd"]; break;
						
					__debugInfo = "3879:\ddgui.gbas";
					
				case 12370: //dummy jumper1
					;
						
					case 12478:
						__debugInfo = "3898:\ddgui.gbas";
						if (!(func9_DDgui_get("ls_file", "CLICKED"))) { __pc = 12468; break; }
					
					case 12477:
						__debugInfo = "3897:\ddgui.gbas";
						func9_DDgui_set("tx_file", "TEXT", func21_DDgui_getitemtext_Str("ls_file", ~~(func9_DDgui_get("ls_file", "SELECT"))));
						
					__debugInfo = "3897:\ddgui.gbas";
					
				case 12468: //dummy jumper1
					;
						
					case 12595:
						__debugInfo = "3936:\ddgui.gbas";
						if (!(func9_DDgui_get("bt_ok", "CLICKED"))) { __pc = 12481; break; }
					
					case 12487:
						__debugInfo = "3903:\ddgui.gbas";
						local11_outfile_Str_2158 = func13_DDgui_get_Str("tx_file", "TEXT");
						
					case 12593:
						__debugInfo = "3933:\ddgui.gbas";
						if (!((local11_outfile_Str_2158).length)) { __pc = 12490; break; }
					
					case 12494:
						__debugInfo = "3906:\ddgui.gbas";
						local8_cdir_Str_2152 = GETCURRENTDIR_Str();
						
					case 12519:
						__debugInfo = "3911:\ddgui.gbas";
						if (!((((MID_Str(local8_cdir_Str_2152, (((local8_cdir_Str_2152).length) - (1)), 1)) == ("/")) ? 1 : 0))) { __pc = 12504; break; }
					
					case 12510:
						__debugInfo = "3908:\ddgui.gbas";
						local11_outfile_Str_2158 = ((local8_cdir_Str_2152) + (local11_outfile_Str_2158));
						
					__debugInfo = "3908:\ddgui.gbas";
					__pc = 16833;
					break;
					
				case 12504: //dummy jumper1
					
					case 12518:
						__debugInfo = "3910:\ddgui.gbas";
						local11_outfile_Str_2158 = ((((local8_cdir_Str_2152) + ("/"))) + (local11_outfile_Str_2158));
						
					__debugInfo = "3910:\ddgui.gbas";
					
				case 16833: //dummy jumper2
					;
						
					case 12592:
						__debugInfo = "3932:\ddgui.gbas";
						if (!(param5_bOpen)) { __pc = 12521; break; }
					
					case 12530:
						__debugInfo = "3914:\ddgui.gbas";
						if (!(DOESFILEEXIST(local11_outfile_Str_2158))) { __pc = 12525; break; }
					
					case 12529:
						__debugInfo = "3914:\ddgui.gbas";
						local2_ok_2167 = 1;
						
					__debugInfo = "3914:\ddgui.gbas";
					
				case 12525: //dummy jumper1
					;
						
					__debugInfo = "3914:\ddgui.gbas";
					__pc = 16834;
					break;
					
				case 12521: //dummy jumper1
					
					var local7_ext_Str_2172 = "", local8_cext_Str_2173 = "";
					case 12541:
						__debugInfo = "3918:\ddgui.gbas";
						local7_ext_Str_2172 = MID_Str(param13_filterstr_Str, ((INSTR(param13_filterstr_Str, ".", 0)) + (1)), -(1));
						
					__debugInfo = "3919:\ddgui.gbas";
					local8_cext_Str_2173 = MID_Str(local11_outfile_Str_2158, (((local11_outfile_Str_2158).length) - ((local7_ext_Str_2172).length)), (local7_ext_Str_2172).length);
					case 12570:
						__debugInfo = "3922:\ddgui.gbas";
						if (!(((((((local7_ext_Str_2172) != ("*")) ? 1 : 0)) && ((((LCASE_Str(local8_cext_Str_2173)) != (LCASE_Str(local7_ext_Str_2172))) ? 1 : 0))) ? 1 : 0))) { __pc = 12563; break; }
					
					case 12569:
						__debugInfo = "3921:\ddgui.gbas";
						local11_outfile_Str_2158+=((".") + (local7_ext_Str_2172));
						
					__debugInfo = "3921:\ddgui.gbas";
					
				case 12563: //dummy jumper1
					;
						
					case 12591:
						__debugInfo = "3931:\ddgui.gbas";
						if (!(DOESFILEEXIST(local11_outfile_Str_2158))) { __pc = 12573; break; }
					
					case 12577:
						__debugInfo = "3925:\ddgui.gbas";
						local2_ok_2167 = 1;
						
					__debugInfo = "3925:\ddgui.gbas";
					__pc = 16837;
					break;
					
				case 12573: //dummy jumper1
					
					case 12590:
						__debugInfo = "3930:\ddgui.gbas";
						if (!(OPENFILE(1, local11_outfile_Str_2158, 0))) { __pc = 12583; break; }
					
					case 12586:
						__debugInfo = "3928:\ddgui.gbas";
						CLOSEFILE(1);
						
					__debugInfo = "3929:\ddgui.gbas";
					local2_ok_2167 = 1;
					__debugInfo = "3928:\ddgui.gbas";
					
				case 12583: //dummy jumper1
					;
						
					__debugInfo = "3930:\ddgui.gbas";
					
				case 16837: //dummy jumper2
					;
						
					__debugInfo = "3918:\ddgui.gbas";
					
				case 16834: //dummy jumper2
					;
						
					__debugInfo = "3906:\ddgui.gbas";
					
				case 12490: //dummy jumper1
					;
						
					case 12594:
						__debugInfo = "3935:\ddgui.gbas";
						__pc = 16822; break;
						
					__debugInfo = "3903:\ddgui.gbas";
					
				case 12481: //dummy jumper1
					;
						
					case 12601:
						__debugInfo = "3940:\ddgui.gbas";
						if (!(func9_DDgui_get("bt_cancel", "CLICKED"))) { __pc = 12598; break; }
					
					case 12600:
						__debugInfo = "3939:\ddgui.gbas";
						__pc = 16822; break;
						
					__debugInfo = "3939:\ddgui.gbas";
					
				case 12598: //dummy jumper1
					;
						
					__debugInfo = "3942:\ddgui.gbas";
					SHOWSCREEN();
					__debugInfo = "3859:\ddgui.gbas";
					__pc = 12603; break; //back jump
					
				case 16822:
					;
					
				__debugInfo = "3945:\ddgui.gbas";
				func15_DDgui_popdialog();
				__debugInfo = "3947:\ddgui.gbas";
				SETCURRENTDIR(local12_startdir_Str_2151);
				case 12612:
					__debugInfo = "3948:\ddgui.gbas";
					if (!(local2_ok_2167)) { __pc = 12608; break; }
					
					case 12611:
						__debugInfo = "3948:\ddgui.gbas";
						return tryClone(local11_outfile_Str_2158);
						
					__debugInfo = "3948:\ddgui.gbas";
					
				case 12608: //dummy jumper1
					;
					
				__debugInfo = "3950:\ddgui.gbas";
				return "";
				__debugInfo = "3951:\ddgui.gbas";
				return "";
				__debugInfo = "3766:\ddgui.gbas";__pc = -1; break;
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
		var local7_screenx_ref_2175 = [0], local7_screeny_ref_2176 = [0], local2_tx_ref_2177 = [0], local2_ty_ref_2178 = [0], local1_x_2179 = 0, local1_y_2180 = 0, local1_w_2181 = 0, local1_r_2182 = 0.0, local1_g_2183 = 0.0, local1_b_2184 = 0.0, local1_h_2185 = 0.0, local8_oldcolor_2186 = 0;
		__debugInfo = "4012:\ddgui.gbas";
		local8_oldcolor_2186 = param5_color;
		__debugInfo = "4014:\ddgui.gbas";
		local1_r_2182 = ((bAND(param5_color, 255)) / (255));
		__debugInfo = "4015:\ddgui.gbas";
		local1_g_2183 = ((bAND(param5_color, 65280)) / (65280));
		__debugInfo = "4016:\ddgui.gbas";
		local1_b_2184 = ((bAND(param5_color, 16711680)) / (16711680));
		__debugInfo = "4017:\ddgui.gbas";
		local1_h_2185 = 0.5;
		__debugInfo = "4019:\ddgui.gbas";
		GETFONTSIZE(local2_tx_ref_2177, local2_ty_ref_2178);
		__debugInfo = "4020:\ddgui.gbas";
		GETSCREENSIZE(local7_screenx_ref_2175, local7_screeny_ref_2176);
		__debugInfo = "4022:\ddgui.gbas";
		func16_DDgui_pushdialog(0, 0, 240, 240, 0);
		__debugInfo = "4023:\ddgui.gbas";
		func9_DDgui_set("", "MOVEABLE", CAST2STRING(1));
		__debugInfo = "4024:\ddgui.gbas";
		func9_DDgui_set("", "TEXT", "Color Picker");
		__debugInfo = "4025:\ddgui.gbas";
		func16_DDgui_framestart("", "", 0);
		__debugInfo = "4026:\ddgui.gbas";
		func12_DDgui_widget("", "R", 0, 0);
		__debugInfo = "4027:\ddgui.gbas";
		func12_DDgui_slider("sl_R", local1_r_2182, 0, 0);
		__debugInfo = "4028:\ddgui.gbas";
		func16_DDgui_numbertext("tx_R", CAST2STRING(INTEGER(((local1_r_2182) * (255.1)))), ((local2_tx_ref_2177[0]) * (3)));
		__debugInfo = "4029:\ddgui.gbas";
		func9_DDgui_set("tx_R", "READONLY", CAST2STRING(1));
		__debugInfo = "4030:\ddgui.gbas";
		func9_DDgui_set("tx_R", "STEP", CAST2STRING(16));
		__debugInfo = "4031:\ddgui.gbas";
		func12_DDgui_spacer(10000, 0);
		__debugInfo = "4032:\ddgui.gbas";
		func12_DDgui_widget("", "G", 0, 0);
		__debugInfo = "4033:\ddgui.gbas";
		func12_DDgui_slider("sl_G", local1_g_2183, 0, 0);
		__debugInfo = "4034:\ddgui.gbas";
		func16_DDgui_numbertext("tx_G", CAST2STRING(INTEGER(((local1_g_2183) * (255.1)))), ((local2_tx_ref_2177[0]) * (3)));
		__debugInfo = "4035:\ddgui.gbas";
		func9_DDgui_set("tx_G", "READONLY", CAST2STRING(1));
		__debugInfo = "4036:\ddgui.gbas";
		func9_DDgui_set("tx_G", "STEP", CAST2STRING(16));
		__debugInfo = "4037:\ddgui.gbas";
		func12_DDgui_spacer(10000, 0);
		__debugInfo = "4038:\ddgui.gbas";
		func12_DDgui_widget("", "B", 0, 0);
		__debugInfo = "4039:\ddgui.gbas";
		func12_DDgui_slider("sl_B", local1_b_2184, 0, 0);
		__debugInfo = "4040:\ddgui.gbas";
		func16_DDgui_numbertext("tx_B", CAST2STRING(INTEGER(((local1_b_2184) * (255.1)))), ((local2_tx_ref_2177[0]) * (3)));
		__debugInfo = "4041:\ddgui.gbas";
		func9_DDgui_set("tx_B", "READONLY", CAST2STRING(1));
		__debugInfo = "4042:\ddgui.gbas";
		func9_DDgui_set("tx_B", "STEP", CAST2STRING(16));
		__debugInfo = "4043:\ddgui.gbas";
		func12_DDgui_spacer(10000, 0);
		__debugInfo = "4044:\ddgui.gbas";
		func12_DDgui_widget("", "H", 0, 0);
		__debugInfo = "4045:\ddgui.gbas";
		func12_DDgui_slider("sl_H", local1_h_2185, 0, 0);
		__debugInfo = "4046:\ddgui.gbas";
		func16_DDgui_numbertext("tx_H", CAST2STRING(INTEGER(((local1_h_2185) * (100.1)))), ((local2_tx_ref_2177[0]) * (3)));
		__debugInfo = "4047:\ddgui.gbas";
		func9_DDgui_set("tx_H", "READONLY", CAST2STRING(1));
		__debugInfo = "4048:\ddgui.gbas";
		func9_DDgui_set("tx_H", "STEP", CAST2STRING(6.25));
		__debugInfo = "4049:\ddgui.gbas";
		func14_DDgui_frameend();
		__debugInfo = "4051:\ddgui.gbas";
		func12_DDgui_button("bt_col", (("SPR_C") + (CAST2STRING(param5_color))), 32, 128);
		__debugInfo = "4052:\ddgui.gbas";
		func9_DDgui_set("bt_col", "WIDTH", CAST2STRING(32));
		__debugInfo = "4053:\ddgui.gbas";
		func9_DDgui_set("bt_col", "READONLY", CAST2STRING(1));
		__debugInfo = "4055:\ddgui.gbas";
		func12_DDgui_spacer(10000, 0);
		__debugInfo = "4057:\ddgui.gbas";
		func16_DDgui_framestart("fr_center", "", 0);
		__debugInfo = "4058:\ddgui.gbas";
		func12_DDgui_button("bt_ok", "OK", 64, 32);
		__debugInfo = "4059:\ddgui.gbas";
		func12_DDgui_button("bt_cancel", "Cancel", 128, 32);
		__debugInfo = "4060:\ddgui.gbas";
		func14_DDgui_frameend();
		__debugInfo = "4061:\ddgui.gbas";
		func9_DDgui_set("fr_center", "ALIGN", CAST2STRING(0));
		__debugInfo = "4106:\ddgui.gbas";
		while (1) {
			__debugInfo = "4064:\ddgui.gbas";
			func10_DDgui_show(0);
			__debugInfo = "4087:\ddgui.gbas";
			if ((((((((((func9_DDgui_get("sl_R", "CLICKED")) || (func9_DDgui_get("sl_G", "CLICKED"))) ? 1 : 0)) || (func9_DDgui_get("sl_B", "CLICKED"))) ? 1 : 0)) || (func9_DDgui_get("sl_H", "CLICKED"))) ? 1 : 0)) {
				__debugInfo = "4066:\ddgui.gbas";
				local1_r_2182 = func9_DDgui_get("sl_R", "TEXT");
				__debugInfo = "4067:\ddgui.gbas";
				local1_g_2183 = func9_DDgui_get("sl_G", "TEXT");
				__debugInfo = "4068:\ddgui.gbas";
				local1_b_2184 = func9_DDgui_get("sl_B", "TEXT");
				__debugInfo = "4069:\ddgui.gbas";
				local1_h_2185 = ((2) * (func9_DDgui_get("sl_H", "TEXT")));
				__debugInfo = "4080:\ddgui.gbas";
				if ((((local1_h_2185) <= (1)) ? 1 : 0)) {
					__debugInfo = "4072:\ddgui.gbas";
					local1_r_2182 = ((local1_h_2185) * (local1_r_2182));
					__debugInfo = "4073:\ddgui.gbas";
					local1_g_2183 = ((local1_h_2185) * (local1_g_2183));
					__debugInfo = "4074:\ddgui.gbas";
					local1_b_2184 = ((local1_h_2185) * (local1_b_2184));
					__debugInfo = "4072:\ddgui.gbas";
				} else {
					__debugInfo = "4076:\ddgui.gbas";
					local1_h_2185 = ((local1_h_2185) - (1));
					__debugInfo = "4077:\ddgui.gbas";
					local1_r_2182 = MIN(1, MAX(0, ((((local1_h_2185) * (((1) - (local1_r_2182))))) + (local1_r_2182))));
					__debugInfo = "4078:\ddgui.gbas";
					local1_g_2183 = MIN(1, MAX(0, ((((local1_h_2185) * (((1) - (local1_g_2183))))) + (local1_g_2183))));
					__debugInfo = "4079:\ddgui.gbas";
					local1_b_2184 = MIN(1, MAX(0, ((((local1_h_2185) * (((1) - (local1_b_2184))))) + (local1_b_2184))));
					__debugInfo = "4076:\ddgui.gbas";
				};
				__debugInfo = "4081:\ddgui.gbas";
				param5_color = RGB(~~(((local1_r_2182) * (255))), ~~(((local1_g_2183) * (255))), ~~(((local1_b_2184) * (255))));
				__debugInfo = "4082:\ddgui.gbas";
				func9_DDgui_set("tx_R", "TEXT", CAST2STRING(INTEGER(((local1_r_2182) * (255.1)))));
				__debugInfo = "4083:\ddgui.gbas";
				func9_DDgui_set("tx_G", "TEXT", CAST2STRING(INTEGER(((local1_g_2183) * (255.1)))));
				__debugInfo = "4084:\ddgui.gbas";
				func9_DDgui_set("tx_B", "TEXT", CAST2STRING(INTEGER(((local1_b_2184) * (255.1)))));
				__debugInfo = "4085:\ddgui.gbas";
				func9_DDgui_set("tx_H", "TEXT", CAST2STRING(INTEGER(((local1_h_2185) * (100.1)))));
				__debugInfo = "4086:\ddgui.gbas";
				func9_DDgui_set("bt_col", "TEXT", (("SPR_C") + (CAST2STRING(param5_color))));
				__debugInfo = "4066:\ddgui.gbas";
			};
			__debugInfo = "4089:\ddgui.gbas";
			local1_x_2179 = ((global11_ddgui_stack_ref[0].arrAccess(-(1)).values[tmpPositionCache][0].attr4_xpos) + (((local2_tx_ref_2177[0]) * (2))));
			__debugInfo = "4090:\ddgui.gbas";
			local1_y_2180 = ((global11_ddgui_stack_ref[0].arrAccess(-(1)).values[tmpPositionCache][0].attr4_ypos) + (((local2_ty_ref_2178[0]) * (2))));
			__debugInfo = "4091:\ddgui.gbas";
			local1_w_2181 = 128;
			__debugInfo = "4092:\ddgui.gbas";
			local1_h_2185 = 48;
			__debugInfo = "4097:\ddgui.gbas";
			SHOWSCREEN();
			__debugInfo = "4099:\ddgui.gbas";
			if (func9_DDgui_get("bt_ok", "CLICKED")) {
				__debugInfo = "4099:\ddgui.gbas";
				break;
				__debugInfo = "4099:\ddgui.gbas";
			};
			__debugInfo = "4103:\ddgui.gbas";
			if (func9_DDgui_get("bt_cancel", "CLICKED")) {
				__debugInfo = "4101:\ddgui.gbas";
				param5_color = local8_oldcolor_2186;
				__debugInfo = "4102:\ddgui.gbas";
				break;
				__debugInfo = "4101:\ddgui.gbas";
			};
			__debugInfo = "4105:\ddgui.gbas";
			HIBERNATE();
			__debugInfo = "4064:\ddgui.gbas";
		};
		__debugInfo = "4108:\ddgui.gbas";
		func15_DDgui_popdialog();
		__debugInfo = "4109:\ddgui.gbas";
		return tryClone(param5_color);
		__debugInfo = "4110:\ddgui.gbas";
		return 0;
		__debugInfo = "4012:\ddgui.gbas";
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
		var local3_scx_ref_2187 = [0], local3_scy_ref_2188 = [0], local1_w_2189 = 0, local1_h_2190 = 0;
		__debugInfo = "4114:\ddgui.gbas";
		GETSCREENSIZE(local3_scx_ref_2187, local3_scy_ref_2188);
		__debugInfo = "4116:\ddgui.gbas";
		local1_w_2189 = ~~(func9_DDgui_get("", "WIDTH"));
		__debugInfo = "4117:\ddgui.gbas";
		local1_h_2190 = ~~(func9_DDgui_get("", "HEIGHT"));
		__debugInfo = "4118:\ddgui.gbas";
		func9_DDgui_set("", "XPOS", CAST2STRING(CAST2INT(((((local3_scx_ref_2187[0]) - (local1_w_2189))) / (2)))));
		__debugInfo = "4119:\ddgui.gbas";
		func9_DDgui_set("", "YPOS", CAST2STRING(CAST2INT(((((local3_scy_ref_2188[0]) - (local1_h_2190))) / (2)))));
		__debugInfo = "4120:\ddgui.gbas";
		return 0;
		__debugInfo = "4114:\ddgui.gbas";
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
		__debugInfo = "4132:\ddgui.gbas";
		return "Object";
		__debugInfo = "4133:\ddgui.gbas";
		return "";
		__debugInfo = "4132:\ddgui.gbas";
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
		__debugInfo = "4139:\ddgui.gbas";
		if ((((param3_Obj) == (param4_self)) ? 1 : 0)) {
			__debugInfo = "4136:\ddgui.gbas";
			return 1;
			__debugInfo = "4136:\ddgui.gbas";
		} else {
			__debugInfo = "4138:\ddgui.gbas";
			return tryClone(0);
			__debugInfo = "4138:\ddgui.gbas";
		};
		__debugInfo = "4140:\ddgui.gbas";
		return 0;
		__debugInfo = "4139:\ddgui.gbas";
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
		__debugInfo = "4142:\ddgui.gbas";
		return 0;
		__debugInfo = "4143:\ddgui.gbas";
		return 0;
		__debugInfo = "4142:\ddgui.gbas";
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
	this.attr5_autos = new GLBArray();
	this.attr7_widgets_ref = [new GLBArray()];
	this.attr9_draworder = new GLBArray();
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
	this.attr4_left = new GLBArray();
	this.attr5_width = new GLBArray();
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
var const19_GL_DEPTH_BUFFER_BIT = 256, const21_GL_STENCIL_BUFFER_BIT = 1024, const19_GL_COLOR_BUFFER_BIT = 16384, const8_GL_FALSE = 0, const7_GL_TRUE = 1, const9_GL_POINTS = 0, const8_GL_LINES = 1, const12_GL_LINE_LOOP = 2, const13_GL_LINE_STRIP = 3, const12_GL_TRIANGLES = 4, const17_GL_TRIANGLE_STRIP = 5, const15_GL_TRIANGLE_FAN = 6, const7_GL_ZERO = 0, const6_GL_ONE = 1, const12_GL_SRC_COLOR = 768, const22_GL_ONE_MINUS_SRC_COLOR = 769, const12_GL_SRC_ALPHA = 770, const22_GL_ONE_MINUS_SRC_ALPHA = 771, const12_GL_DST_ALPHA = 772, const22_GL_ONE_MINUS_DST_ALPHA = 773, const12_GL_DST_COLOR = 774, const22_GL_ONE_MINUS_DST_COLOR = 775, const21_GL_SRC_ALPHA_SATURATE = 776, const11_GL_FUNC_ADD = 32774, const17_GL_BLEND_EQUATION = 32777, const21_GL_BLEND_EQUATION_RGB = 32777, const23_GL_BLEND_EQUATION_ALPHA = 34877, const16_GL_FUNC_SUBTRACT = 32778, const24_GL_FUNC_REVERSE_SUBTRACT = 32779, const16_GL_BLEND_DST_RGB = 32968, const16_GL_BLEND_SRC_RGB = 32969, const18_GL_BLEND_DST_ALPHA = 32970, const18_GL_BLEND_SRC_ALPHA = 32971, const17_GL_CONSTANT_COLOR = 32769, const27_GL_ONE_MINUS_CONSTANT_COLOR = 32770, const17_GL_CONSTANT_ALPHA = 32771, const27_GL_ONE_MINUS_CONSTANT_ALPHA = 32772, const14_GL_BLEND_COLOR = 32773, const15_GL_ARRAY_BUFFER = 34962, const23_GL_ELEMENT_ARRAY_BUFFER = 34963, const23_GL_ARRAY_BUFFER_BINDING = 34964, const31_GL_ELEMENT_ARRAY_BUFFER_BINDING = 34965, const14_GL_STREAM_DRAW = 35040, const14_GL_STATIC_DRAW = 35044, const15_GL_DYNAMIC_DRAW = 35048, const14_GL_BUFFER_SIZE = 34660, const15_GL_BUFFER_USAGE = 34661, const24_GL_CURRENT_VERTEX_ATTRIB = 34342, const8_GL_FRONT = 1028, const7_GL_BACK = 1029, const17_GL_FRONT_AND_BACK = 1032, const13_GL_TEXTURE_2D = 3553, const12_GL_CULL_FACE = 2884, const8_GL_BLEND = 3042, const9_GL_DITHER = 3024, const15_GL_STENCIL_TEST = 2960, const13_GL_DEPTH_TEST = 2929, const15_GL_SCISSOR_TEST = 3089, const22_GL_POLYGON_OFFSET_FILL = 32823, const27_GL_SAMPLE_ALPHA_TO_COVERAGE = 32926, const18_GL_SAMPLE_COVERAGE = 32928, const11_GL_NO_ERROR = 0, const15_GL_INVALID_ENUM = 1280, const16_GL_INVALID_VALUE = 1281, const20_GL_INVALID_OPERATION = 1282, const16_GL_OUT_OF_MEMORY = 1285, const5_GL_CW = 2304, const6_GL_CCW = 2305, const13_GL_LINE_WIDTH = 2849, const27_GL_ALIASED_POINT_SIZE_RANGE = 33901, const27_GL_ALIASED_LINE_WIDTH_RANGE = 33902, const17_GL_CULL_FACE_MODE = 2885, const13_GL_FRONT_FACE = 2886, const14_GL_DEPTH_RANGE = 2928, const18_GL_DEPTH_WRITEMASK = 2930, const20_GL_DEPTH_CLEAR_VALUE = 2931, const13_GL_DEPTH_FUNC = 2932, const22_GL_STENCIL_CLEAR_VALUE = 2961, const15_GL_STENCIL_FUNC = 2962, const15_GL_STENCIL_FAIL = 2964, const26_GL_STENCIL_PASS_DEPTH_FAIL = 2965, const26_GL_STENCIL_PASS_DEPTH_PASS = 2966, const14_GL_STENCIL_REF = 2967, const21_GL_STENCIL_VALUE_MASK = 2963, const20_GL_STENCIL_WRITEMASK = 2968, const20_GL_STENCIL_BACK_FUNC = 34816, const20_GL_STENCIL_BACK_FAIL = 34817, const31_GL_STENCIL_BACK_PASS_DEPTH_FAIL = 34818, const31_GL_STENCIL_BACK_PASS_DEPTH_PASS = 34819, const19_GL_STENCIL_BACK_REF = 36003, const26_GL_STENCIL_BACK_VALUE_MASK = 36004, const25_GL_STENCIL_BACK_WRITEMASK = 36005, const11_GL_VIEWPORT = 2978, const14_GL_SCISSOR_BOX = 3088, const20_GL_COLOR_CLEAR_VALUE = 3106, const18_GL_COLOR_WRITEMASK = 3107, const19_GL_UNPACK_ALIGNMENT = 3317, const17_GL_PACK_ALIGNMENT = 3333, const19_GL_MAX_TEXTURE_SIZE = 3379, const20_GL_MAX_VIEWPORT_DIMS = 3386, const16_GL_SUBPIXEL_BITS = 3408, const11_GL_RED_BITS = 3410, const13_GL_GREEN_BITS = 3411, const12_GL_BLUE_BITS = 3412, const13_GL_ALPHA_BITS = 3413, const13_GL_DEPTH_BITS = 3414, const15_GL_STENCIL_BITS = 3415, const23_GL_POLYGON_OFFSET_UNITS = 10752, const24_GL_POLYGON_OFFSET_FACTOR = 32824, const21_GL_TEXTURE_BINDING_2D = 32873, const17_GL_SAMPLE_BUFFERS = 32936, const10_GL_SAMPLES = 32937, const24_GL_SAMPLE_COVERAGE_VALUE = 32938, const25_GL_SAMPLE_COVERAGE_INVERT = 32939, const33_GL_NUM_COMPRESSED_TEXTURE_FORMATS = 34466, const29_GL_COMPRESSED_TEXTURE_FORMATS = 34467, const12_GL_DONT_CARE = 4352, const10_GL_FASTEST = 4353, const9_GL_NICEST = 4354, const23_GL_GENERATE_MIPMAP_HINT = 33170, const7_GL_BYTE = 5120, const16_GL_UNSIGNED_BYTE = 5121, const8_GL_SHORT = 5122, const17_GL_UNSIGNED_SHORT = 5123, const6_GL_INT = 5124, const15_GL_UNSIGNED_INT = 5125, const8_GL_FLOAT = 5126, const8_GL_FIXED = 5132, const18_GL_DEPTH_COMPONENT = 6402, const8_GL_ALPHA = 6406, const6_GL_RGB = 6407, const7_GL_RGBA = 6408, const12_GL_LUMINANCE = 6409, const18_GL_LUMINANCE_ALPHA = 6410, const25_GL_UNSIGNED_SHORT_4_4_4_4 = 32819, const25_GL_UNSIGNED_SHORT_5_5_5_1 = 32820, const23_GL_UNSIGNED_SHORT_5_6_5 = 33635, const18_GL_FRAGMENT_SHADER = 35632, const16_GL_VERTEX_SHADER = 35633, const21_GL_MAX_VERTEX_ATTRIBS = 34921, const29_GL_MAX_VERTEX_UNIFORM_VECTORS = 36347, const22_GL_MAX_VARYING_VECTORS = 36348, const35_GL_MAX_COMBINED_TEXTURE_IMAGE_UNITS = 35661, const33_GL_MAX_VERTEX_TEXTURE_IMAGE_UNITS = 35660, const26_GL_MAX_TEXTURE_IMAGE_UNITS = 34930, const31_GL_MAX_FRAGMENT_UNIFORM_VECTORS = 36349, const14_GL_SHADER_TYPE = 35663, const16_GL_DELETE_STATUS = 35712, const14_GL_LINK_STATUS = 35714, const18_GL_VALIDATE_STATUS = 35715, const19_GL_ATTACHED_SHADERS = 35717, const18_GL_ACTIVE_UNIFORMS = 35718, const28_GL_ACTIVE_UNIFORM_MAX_LENGTH = 35719, const20_GL_ACTIVE_ATTRIBUTES = 35721, const30_GL_ACTIVE_ATTRIBUTE_MAX_LENGTH = 35722, const27_GL_SHADING_LANGUAGE_VERSION = 35724, const18_GL_CURRENT_PROGRAM = 35725, const8_GL_NEVER = 512, const7_GL_LESS = 513, const8_GL_EQUAL = 514, const9_GL_LEQUAL = 515, const10_GL_GREATER = 516, const11_GL_NOTEQUAL = 517, const9_GL_GEQUAL = 518, const9_GL_ALWAYS = 519, const7_GL_KEEP = 7680, const10_GL_REPLACE = 7681, const7_GL_INCR = 7682, const7_GL_DECR = 7683, const9_GL_INVERT = 5386, const12_GL_INCR_WRAP = 34055, const12_GL_DECR_WRAP = 34056, const9_GL_VENDOR = 7936, const11_GL_RENDERER = 7937, const10_GL_VERSION = 7938, const13_GL_EXTENSIONS = 7939, const10_GL_NEAREST = 9728, const9_GL_LINEAR = 9729, const25_GL_NEAREST_MIPMAP_NEAREST = 9984, const24_GL_LINEAR_MIPMAP_NEAREST = 9985, const24_GL_NEAREST_MIPMAP_LINEAR = 9986, const23_GL_LINEAR_MIPMAP_LINEAR = 9987, const21_GL_TEXTURE_MAG_FILTER = 10240, const21_GL_TEXTURE_MIN_FILTER = 10241, const17_GL_TEXTURE_WRAP_S = 10242, const17_GL_TEXTURE_WRAP_T = 10243, const10_GL_TEXTURE = 5890, const19_GL_TEXTURE_CUBE_MAP = 34067, const27_GL_TEXTURE_BINDING_CUBE_MAP = 34068, const30_GL_TEXTURE_CUBE_MAP_POSITIVE_X = 34069, const30_GL_TEXTURE_CUBE_MAP_NEGATIVE_X = 34070, const30_GL_TEXTURE_CUBE_MAP_POSITIVE_Y = 34071, const30_GL_TEXTURE_CUBE_MAP_NEGATIVE_Y = 34072, const30_GL_TEXTURE_CUBE_MAP_POSITIVE_Z = 34073, const30_GL_TEXTURE_CUBE_MAP_NEGATIVE_Z = 34074, const28_GL_MAX_CUBE_MAP_TEXTURE_SIZE = 34076, const11_GL_TEXTURE0 = 33984, const11_GL_TEXTURE1 = 33985, const11_GL_TEXTURE2 = 33986, const11_GL_TEXTURE3 = 33987, const11_GL_TEXTURE4 = 33988, const11_GL_TEXTURE5 = 33989, const11_GL_TEXTURE6 = 33990, const11_GL_TEXTURE7 = 33991, const11_GL_TEXTURE8 = 33992, const11_GL_TEXTURE9 = 33993, const12_GL_TEXTURE10 = 33994, const12_GL_TEXTURE11 = 33995, const12_GL_TEXTURE12 = 33996, const12_GL_TEXTURE13 = 33997, const12_GL_TEXTURE14 = 33998, const12_GL_TEXTURE15 = 33999, const12_GL_TEXTURE16 = 34000, const12_GL_TEXTURE17 = 34001, const12_GL_TEXTURE18 = 34002, const12_GL_TEXTURE19 = 34003, const12_GL_TEXTURE20 = 34004, const12_GL_TEXTURE21 = 34005, const12_GL_TEXTURE22 = 34006, const12_GL_TEXTURE23 = 34007, const12_GL_TEXTURE24 = 34008, const12_GL_TEXTURE25 = 34009, const12_GL_TEXTURE26 = 34010, const12_GL_TEXTURE27 = 34011, const12_GL_TEXTURE28 = 34012, const12_GL_TEXTURE29 = 34013, const12_GL_TEXTURE30 = 34014, const12_GL_TEXTURE31 = 34015, const17_GL_ACTIVE_TEXTURE = 34016, const9_GL_REPEAT = 10497, const16_GL_CLAMP_TO_EDGE = 33071, const18_GL_MIRRORED_REPEAT = 33648, const13_GL_FLOAT_VEC2 = 35664, const13_GL_FLOAT_VEC3 = 35665, const13_GL_FLOAT_VEC4 = 35666, const11_GL_INT_VEC2 = 35667, const11_GL_INT_VEC3 = 35668, const11_GL_INT_VEC4 = 35669, const7_GL_BOOL = 35670, const12_GL_BOOL_VEC2 = 35671, const12_GL_BOOL_VEC3 = 35672, const12_GL_BOOL_VEC4 = 35673, const13_GL_FLOAT_MAT2 = 35674, const13_GL_FLOAT_MAT3 = 35675, const13_GL_FLOAT_MAT4 = 35676, const13_GL_SAMPLER_2D = 35678, const15_GL_SAMPLER_CUBE = 35680, const30_GL_VERTEX_ATTRIB_ARRAY_ENABLED = 34338, const27_GL_VERTEX_ATTRIB_ARRAY_SIZE = 34339, const29_GL_VERTEX_ATTRIB_ARRAY_STRIDE = 34340, const27_GL_VERTEX_ATTRIB_ARRAY_TYPE = 34341, const33_GL_VERTEX_ATTRIB_ARRAY_NORMALIZED = 34922, const30_GL_VERTEX_ATTRIB_ARRAY_POINTER = 34373, const37_GL_VERTEX_ATTRIB_ARRAY_BUFFER_BINDING = 34975, const33_GL_IMPLEMENTATION_COLOR_READ_TYPE = 35738, const35_GL_IMPLEMENTATION_COLOR_READ_FORMAT = 35739, const17_GL_COMPILE_STATUS = 35713, const18_GL_INFO_LOG_LENGTH = 35716, const23_GL_SHADER_SOURCE_LENGTH = 35720, const18_GL_SHADER_COMPILER = 36346, const24_GL_SHADER_BINARY_FORMATS = 36344, const28_GL_NUM_SHADER_BINARY_FORMATS = 36345, const12_GL_LOW_FLOAT = 36336, const15_GL_MEDIUM_FLOAT = 36337, const13_GL_HIGH_FLOAT = 36338, const10_GL_LOW_INT = 36339, const13_GL_MEDIUM_INT = 36340, const11_GL_HIGH_INT = 36341, const14_GL_FRAMEBUFFER = 36160, const15_GL_RENDERBUFFER = 36161, const8_GL_RGBA4 = 32854, const10_GL_RGB5_A1 = 32855, const9_GL_RGB565 = 36194, const20_GL_DEPTH_COMPONENT16 = 33189, const16_GL_STENCIL_INDEX = 6401, const17_GL_STENCIL_INDEX8 = 36168, const21_GL_RENDERBUFFER_WIDTH = 36162, const22_GL_RENDERBUFFER_HEIGHT = 36163, const31_GL_RENDERBUFFER_INTERNAL_FORMAT = 36164, const24_GL_RENDERBUFFER_RED_SIZE = 36176, const26_GL_RENDERBUFFER_GREEN_SIZE = 36177, const25_GL_RENDERBUFFER_BLUE_SIZE = 36178, const26_GL_RENDERBUFFER_ALPHA_SIZE = 36179, const26_GL_RENDERBUFFER_DEPTH_SIZE = 36180, const28_GL_RENDERBUFFER_STENCIL_SIZE = 36181, const37_GL_FRAMEBUFFER_ATTACHMENT_OBJECT_TYPE = 36048, const37_GL_FRAMEBUFFER_ATTACHMENT_OBJECT_NAME = 36049, const39_GL_FRAMEBUFFER_ATTACHMENT_TEXTURE_LEVEL = 36050, const47_GL_FRAMEBUFFER_ATTACHMENT_TEXTURE_CUBE_MAP_FACE = 36051, const20_GL_COLOR_ATTACHMENT0 = 36064, const19_GL_DEPTH_ATTACHMENT = 36096, const21_GL_STENCIL_ATTACHMENT = 36128, const7_GL_NONE = 0, const23_GL_FRAMEBUFFER_COMPLETE = 36053, const36_GL_FRAMEBUFFER_INCOMPLETE_ATTACHMENT = 36054, const44_GL_FRAMEBUFFER_INCOMPLETE_MISSING_ATTACHMENT = 36055, const36_GL_FRAMEBUFFER_INCOMPLETE_DIMENSIONS = 36057, const26_GL_FRAMEBUFFER_UNSUPPORTED = 36061, const22_GL_FRAMEBUFFER_BINDING = 36006, const23_GL_RENDERBUFFER_BINDING = 36007, const24_GL_MAX_RENDERBUFFER_SIZE = 34024, const32_GL_INVALID_FRAMEBUFFER_OPERATION = 1286, global5_delta = 0.0, global2_nt = 0, global3_old = 0, global3_fps = 0, global5_flips = 0, global17_gDDguiCaretColour = 0, global25_gDDguiMinControlDimension = 0, global20_gDDguiScrollbarWidth = 0, global11_ddgui_stack_ref = [new GLBArray()], global18_ddgui_font_kerning = new type10_DDGUI_FONT(), global20_DDGUI_AUTO_INPUT_DLG = 0.0, global18_DDGUI_IN_INPUT_DLG = 0.0, global6_Objs3D = new GLBArray();
// set default statics:
window['initStatics'] = function() {
	static10_DDgui_show_intern_mouse_down = 0, static10_DDgui_show_intern_movemousex = 0, static10_DDgui_show_intern_movemousey = 0, static12_DDgui_show_intern_ToolTipDelay = 0, static9_DDgui_show_intern_ToolTipMx = 0, static9_DDgui_show_intern_ToolTipMy = 0;
static9_DDgui_draw_widget_intern_lines_Str = new GLBArray();
static7_DDgui_backgnd_QuickGL = -(1);
static9_DDgui_drawwidget_dummy_Str_ref = [""];
static9_DDgui_handlewidget_dummy_Str_ref = [""];
static7_DDgui_handleradio_txt_Str = new GLBArray();
static7_DDgui_list_opt_Str = new GLBArray();
static7_DDgui_drawlist_opt_Str_ref = [new GLBArray()];
static11_ddgui_handletext_st_lasttime = 0, static10_ddgui_handletext_st_lastkey = 0;
static7_DDgui_drawtab_str_Str = new GLBArray(), static8_DDgui_drawtab_str2_Str_ref = [new GLBArray()];
static7_DDgui_handletab_str_Str = new GLBArray(), static8_DDgui_handletab_str2_Str_ref = [new GLBArray()];
static7_DDgui_selecttab_str_Str = new GLBArray(), static8_DDgui_selecttab_str2_Str_ref = [new GLBArray()];

}
for (var __init = 0; __init < preInitFuncs.length; __init++) preInitFuncs[__init]();
