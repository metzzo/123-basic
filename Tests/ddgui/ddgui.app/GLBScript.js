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
	return eval("if (!!window['"+name+"']) window."+name+"(); else ret = 0;");
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
		if (ex instanceof GLBExitException) throw(formatError(ex));
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
var inFullscreen= false;

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
	
	// gamepad listener
	gamepads = navigator.getGamepads || navigator.webkitGetGamepads || navigator.webkitGamepads || navigator.gamepads || navigator.mozGetGamepads || navigator.mozGamepads;
	
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
	if (mode < 0) {
		context.globalCompositeOperation = 'darker';
		mode = ABS((1 - mode) - 1);
	} else if (mode > 0) {
		context.globalCompositeOperation = 'lighter';
	} else {
		context.globalCompositeOperation = 'source-over';
		mode = 1;
	}
	canvas.globalAlpha = mode;
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

function SETSCREEN(width, height, fullscreen) {
	if (fullscreen && !inFullscreen) {
		if (!!canvas.requestFullScreen) canvas.requestFullScreen();
		inFullscreen = true;
	} else if (!fullscreen && inFullscreen) {
		if (!!canvas.cancelFullScreen) canvas.cancelFullScreen();
		inFullscreen = false;
	}
	var e = frontbuffer.canvas;
	e.width = width;
	e.height = height;
	e = backbuffer.canvas;
	e.width = width;
	e.height = height;
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
var static7_DDgui_radio_opt_Str = new GLBArray();
var static7_DDgui_handleradio_txt_Str = new GLBArray();
var static7_DDgui_list_opt_Str = new GLBArray();
var static7_DDgui_drawlist_opt_Str_ref = [new GLBArray()];
var static11_ddgui_handletext_st_lasttime = 0, static10_ddgui_handletext_st_lastkey = 0;
var static7_DDgui_drawtab_str_Str = new GLBArray(), static8_DDgui_drawtab_str2_Str_ref = [new GLBArray()];
var static7_DDgui_handletab_str_Str = new GLBArray(), static8_DDgui_handletab_str2_Str_ref = [new GLBArray()];
var static7_DDgui_selecttab_str_Str = new GLBArray(), static8_DDgui_selecttab_str2_Str_ref = [new GLBArray()];
var debugMode = false;
window['main'] = function(){
	global25_gDDguiMinControlDimension = 32;
	global20_DDGUI_AUTO_INPUT_DLG = 1;
	GLB_ON_INIT();
	global17_gDDguiCaretColour = 0;
	
}
window['GLB_ON_LOOP'] = function() {
	var local3_now_1608 = 0;
	global3_old = GETTIMERALL();
	func10_DDgui_show(0);
	local3_now_1608 = GETTIMERALL();
	global5_delta+=((local3_now_1608) - (global3_old));
	global5_flips+=1;
	if ((((global5_flips) > (300)) ? 1 : 0)) {
		global2_nt = 1000;
		global3_fps = ~~(global5_delta);
		global5_delta = 0;
		global5_flips = 0;
		
	};
	PRINT((("fps:") + (CAST2STRING(INTEGER(global3_fps)))), 0, 0, 0);
	SHOWSCREEN();
	
};
window['GLB_ON_LOOP'] = GLB_ON_LOOP;
window['GLB_ON_INIT'] = function() {
	func16_DDgui_pushdialog(0, 0, 300, 300, 0);
	func9_DDgui_set("", "MOVEABLE", CAST2STRING(1));
	func12_DDgui_widget("", "Static Text", 0, 0);
	func12_DDgui_spacer(10000, 20);
	func9_DDgui_tab("tab1", (((("Lig_sts,ls_test,ra_test|") + ("Buttons,fr_buttons|"))) + ("Texts,st_text,tx_test")), 0);
	func11_DDgui_combo("ls_test", "one|two|three", 0, 0);
	func12_DDgui_spacer(10000, 0);
	func11_DDgui_radio("ra_test", "red|green|blue", 0);
	func12_DDgui_slider("sl_test", 0.5, 0, 0);
	func12_DDgui_spacer(10000, 0);
	
};
window['GLB_ON_INIT'] = GLB_ON_INIT;
window['func11_DDgui_index'] = function(param10_ddgui_vals, param8_name_Str_ref, param6_create) {
	var local2_up_2225 = 0, local2_dn_2226 = 0, local3_mid_2227 = 0;
	local2_up_2225 = 0;
	local2_dn_2226 = ((BOUNDS(param10_ddgui_vals.attr7_widgets_ref[0], 0)) - (1));
	while ((((local2_up_2225) < (local2_dn_2226)) ? 1 : 0)) {
		local3_mid_2227 = CAST2INT(((((local2_up_2225) + (local2_dn_2226))) / (2)));
		if ((((param10_ddgui_vals.attr7_widgets_ref[0].arrAccess(local3_mid_2227).values[tmpPositionCache][0].attr7_wid_Str) > (param8_name_Str_ref[0])) ? 1 : 0)) {
			local2_dn_2226 = MAX(((local3_mid_2227) - (1)), local2_up_2225);
			
		} else {
			if ((((param10_ddgui_vals.attr7_widgets_ref[0].arrAccess(local3_mid_2227).values[tmpPositionCache][0].attr7_wid_Str) < (param8_name_Str_ref[0])) ? 1 : 0)) {
				local2_up_2225 = MIN(local2_dn_2226, ((local3_mid_2227) + (1)));
				
			} else {
				return tryClone(local3_mid_2227);
				
			};
			
		};
		
	};
	if ((((BOUNDS(param10_ddgui_vals.attr7_widgets_ref[0], 0)) && ((((param10_ddgui_vals.attr7_widgets_ref[0].arrAccess(local2_up_2225).values[tmpPositionCache][0].attr7_wid_Str) == (param8_name_Str_ref[0])) ? 1 : 0))) ? 1 : 0)) {
		return tryClone(local2_up_2225);
		
	};
	if (param6_create) {
		var local4_widg_2228 = new type9_DDGUI_WDG(), local5_order_2229 = new type11_DDGUI_ORDER();
		local2_dn_2226 = BOUNDS(param10_ddgui_vals.attr7_widgets_ref[0], 0);
		REDIM(unref(param10_ddgui_vals.attr7_widgets_ref[0]), [((local2_dn_2226) + (1))], [new type9_DDGUI_WDG()] );
		{
			for (local3_mid_2227 = local2_dn_2226;toCheck(local3_mid_2227, ((local2_up_2225) + (1)), -(1));local3_mid_2227 += -(1)) {
				param10_ddgui_vals.attr7_widgets_ref[0].arrAccess(local3_mid_2227).values[tmpPositionCache][0] = param10_ddgui_vals.attr7_widgets_ref[0].arrAccess(((local3_mid_2227) - (1))).values[tmpPositionCache][0].clone(/* In Assign */);
				
			};
			
		};
		if (((((((local2_dn_2226) > (0)) ? 1 : 0)) && ((((param10_ddgui_vals.attr7_widgets_ref[0].arrAccess(local2_up_2225).values[tmpPositionCache][0].attr7_wid_Str) < (param8_name_Str_ref[0])) ? 1 : 0))) ? 1 : 0)) {
			local2_up_2225 = ((local2_up_2225) + (1));
			
		};
		local4_widg_2228.attr7_wid_Str = param8_name_Str_ref[0];
		param10_ddgui_vals.attr7_widgets_ref[0].arrAccess(local2_up_2225).values[tmpPositionCache][0] = local4_widg_2228.clone(/* In Assign */);
		local5_order_2229.attr6_id_Str_ref[0] = param8_name_Str_ref[0];
		DIMPUSH(param10_ddgui_vals.attr9_draworder, local5_order_2229);
		var forEachSaver13510 = param10_ddgui_vals.attr9_draworder;
		for(var forEachCounter13510 = 0 ; forEachCounter13510 < forEachSaver13510.values.length ; forEachCounter13510++) {
			var local2_od_2230 = forEachSaver13510.values[forEachCounter13510];
		{
				local2_od_2230.attr5_index = func11_DDgui_index(param10_ddgui_vals, local2_od_2230.attr6_id_Str_ref, 0);
				
			}
			forEachSaver13510.values[forEachCounter13510] = local2_od_2230;
		
		};
		return tryClone(local2_up_2225);
		
	};
	return tryClone(-(1));
	return 0;
	
};
window['func20_DDgui_get_intern_Str'] = function(param3_wdg, param8_name_Str_ref) {
	{
		var local17___SelectHelper10__2319 = "";
		local17___SelectHelper10__2319 = param8_name_Str_ref[0];
		if ((((local17___SelectHelper10__2319) == ("CLICKED")) ? 1 : 0)) {
			return tryClone(CAST2STRING(param3_wdg.attr8_wclicked));
			
		} else if ((((local17___SelectHelper10__2319) == ("TEXT")) ? 1 : 0)) {
			return tryClone(unref(param3_wdg.attr9_wtext_Str_ref[0]));
			
		} else if ((((local17___SelectHelper10__2319) == ("WIDTH")) ? 1 : 0)) {
			return tryClone(CAST2STRING(param3_wdg.attr6_wwidth));
			
		} else if ((((local17___SelectHelper10__2319) == ("HEIGHT")) ? 1 : 0)) {
			return tryClone(CAST2STRING(param3_wdg.attr7_wheight));
			
		} else if ((((local17___SelectHelper10__2319) == ("SELECT")) ? 1 : 0)) {
			return tryClone(CAST2STRING(param3_wdg.attr7_wselect));
			
		} else if ((((local17___SelectHelper10__2319) == ("COUNT")) ? 1 : 0)) {
			return tryClone(CAST2STRING(param3_wdg.attr6_wcount));
			
		} else if ((((local17___SelectHelper10__2319) == ("HOVER")) ? 1 : 0)) {
			return tryClone(CAST2STRING(param3_wdg.attr6_whover));
			
		} else if ((((local17___SelectHelper10__2319) == ("READONLY")) ? 1 : 0)) {
			return tryClone(CAST2STRING(param3_wdg.attr9_wreadonly));
			
		} else if ((((local17___SelectHelper10__2319) == ("SELSTART")) ? 1 : 0)) {
			return tryClone(CAST2STRING(param3_wdg.attr9_wselstart));
			
		} else if ((((local17___SelectHelper10__2319) == ("SELEND")) ? 1 : 0)) {
			return tryClone(CAST2STRING(param3_wdg.attr7_wselend));
			
		} else if ((((local17___SelectHelper10__2319) == ("HIDE")) ? 1 : 0)) {
			return tryClone(CAST2STRING(param3_wdg.attr5_whide));
			
		} else if ((((local17___SelectHelper10__2319) == ("TYPE")) ? 1 : 0)) {
			return tryClone(param3_wdg.attr9_wtype_Str);
			
		} else if ((((local17___SelectHelper10__2319) == ("FILTER")) ? 1 : 0)) {
			return tryClone(param3_wdg.attr11_wfilter_Str);
			
		} else if ((((local17___SelectHelper10__2319) == ("TIPTEXT")) ? 1 : 0)) {
			return tryClone(unref(param3_wdg.attr11_tiptext_Str_ref[0]));
			
		} else if ((((local17___SelectHelper10__2319) == ("MINVAL")) ? 1 : 0)) {
			return tryClone(CAST2STRING(param3_wdg.attr7_wminval));
			
		} else if ((((local17___SelectHelper10__2319) == ("MAXVAL")) ? 1 : 0)) {
			return tryClone(CAST2STRING(param3_wdg.attr7_wmaxval));
			
		} else if ((((local17___SelectHelper10__2319) == ("STEP")) ? 1 : 0)) {
			return tryClone(CAST2STRING(param3_wdg.attr5_wstep));
			
		} else if ((((local17___SelectHelper10__2319) == ("SCROLL")) ? 1 : 0)) {
			return tryClone(CAST2STRING(param3_wdg.attr7_wscroll));
			
		} else if ((((local17___SelectHelper10__2319) == ("ALIGN")) ? 1 : 0)) {
			return tryClone(CAST2STRING(param3_wdg.attr6_walign));
			
		} else if ((((local17___SelectHelper10__2319) == ("XPOS")) ? 1 : 0)) {
			return tryClone(CAST2STRING(param3_wdg.attr5_wxpos));
			
		} else if ((((local17___SelectHelper10__2319) == ("YPOS")) ? 1 : 0)) {
			return tryClone(CAST2STRING(param3_wdg.attr5_wypos));
			
		} else {
			
		};
		
	};
	return "";
	
};
window['func13_DDgui_get_Str'] = function(param6_id_Str, param8_name_Str) {
	var local6_id_Str_ref_2231 = [param6_id_Str]; /* NEWCODEHERE */
	var local8_name_Str_ref_2232 = [param8_name_Str]; /* NEWCODEHERE */
	if ((((BOUNDS(global11_ddgui_stack_ref[0], 0)) == (0)) ? 1 : 0)) {
		return "";
		
	};
	if (((((local6_id_Str_ref_2231[0]).length) == (0)) ? 1 : 0)) {
		{
			var local16___SelectHelper8__2233 = "";
			local16___SelectHelper8__2233 = local8_name_Str_ref_2232[0];
			if ((((local16___SelectHelper8__2233) == ("FOCUS")) ? 1 : 0)) {
				return tryClone(global11_ddgui_stack_ref[0].arrAccess(-(1)).values[tmpPositionCache][0].attr9_focus_Str);
				
			} else if ((((local16___SelectHelper8__2233) == ("INKEY")) ? 1 : 0)) {
				return tryClone(global11_ddgui_stack_ref[0].arrAccess(-(1)).values[tmpPositionCache][0].attr13_dlg_inkey_Str);
				
			} else if ((((local16___SelectHelper8__2233) == ("TEXT")) ? 1 : 0)) {
				return tryClone(unref(global11_ddgui_stack_ref[0].arrAccess(-(1)).values[tmpPositionCache][0].attr4_main.attr9_wtext_Str_ref[0]));
				
			} else if ((((local16___SelectHelper8__2233) == ("COL_BRIGHT")) ? 1 : 0)) {
				return tryClone(CAST2STRING(global11_ddgui_stack_ref[0].arrAccess(-(1)).values[tmpPositionCache][0].attr10_col_bright));
				
			} else if ((((local16___SelectHelper8__2233) == ("COL_NORM")) ? 1 : 0)) {
				return tryClone(CAST2STRING(global11_ddgui_stack_ref[0].arrAccess(-(1)).values[tmpPositionCache][0].attr8_col_norm));
				
			} else if ((((local16___SelectHelper8__2233) == ("COL_HOVER_BRIGHT")) ? 1 : 0)) {
				return tryClone(CAST2STRING(global11_ddgui_stack_ref[0].arrAccess(-(1)).values[tmpPositionCache][0].attr16_col_hover_bright));
				
			} else if ((((local16___SelectHelper8__2233) == ("COL_HOVER_NORM")) ? 1 : 0)) {
				return tryClone(CAST2STRING(global11_ddgui_stack_ref[0].arrAccess(-(1)).values[tmpPositionCache][0].attr14_col_hover_norm));
				
			} else if ((((local16___SelectHelper8__2233) == ("XPOS")) ? 1 : 0)) {
				return tryClone(CAST2STRING(global11_ddgui_stack_ref[0].arrAccess(-(1)).values[tmpPositionCache][0].attr4_xpos));
				
			} else if ((((local16___SelectHelper8__2233) == ("YPOS")) ? 1 : 0)) {
				return tryClone(CAST2STRING(global11_ddgui_stack_ref[0].arrAccess(-(1)).values[tmpPositionCache][0].attr4_ypos));
				
			} else if ((((local16___SelectHelper8__2233) == ("WIDTH")) ? 1 : 0)) {
				return tryClone(CAST2STRING(global11_ddgui_stack_ref[0].arrAccess(-(1)).values[tmpPositionCache][0].attr4_main.attr6_wwidth));
				
			} else if ((((local16___SelectHelper8__2233) == ("HEIGHT")) ? 1 : 0)) {
				return tryClone(CAST2STRING(global11_ddgui_stack_ref[0].arrAccess(-(1)).values[tmpPositionCache][0].attr4_main.attr7_wheight));
				
			} else if ((((local16___SelectHelper8__2233) == ("MOVEABLE")) ? 1 : 0)) {
				return tryClone(CAST2STRING(global11_ddgui_stack_ref[0].arrAccess(-(1)).values[tmpPositionCache][0].attr8_moveable));
				
			} else if ((((local16___SelectHelper8__2233) == ("SCALEABLE")) ? 1 : 0)) {
				return tryClone(CAST2STRING(global11_ddgui_stack_ref[0].arrAccess(-(1)).values[tmpPositionCache][0].attr9_scaleable));
				
			} else if ((((local16___SelectHelper8__2233) == ("MOVING")) ? 1 : 0)) {
				return tryClone(CAST2STRING(global11_ddgui_stack_ref[0].arrAccess(-(1)).values[tmpPositionCache][0].attr6_moving));
				
			} else if ((((local16___SelectHelper8__2233) == ("SCALEING")) ? 1 : 0)) {
				return tryClone(CAST2STRING(global11_ddgui_stack_ref[0].arrAccess(-(1)).values[tmpPositionCache][0].attr8_scaleing));
				
			};
			
		};
		
	} else {
		var local2_iw_2234 = 0;
		local2_iw_2234 = func11_DDgui_index(unref(global11_ddgui_stack_ref[0].arrAccess(-(1)).values[tmpPositionCache][0]), local6_id_Str_ref_2231, 0);
		if ((((local2_iw_2234) >= (0)) ? 1 : 0)) {
			return tryClone(func20_DDgui_get_intern_Str(unref(global11_ddgui_stack_ref[0].arrAccess(-(1)).values[tmpPositionCache][0].attr7_widgets_ref[0].arrAccess(local2_iw_2234).values[tmpPositionCache][0]), local8_name_Str_ref_2232));
			
		};
		
	};
	return "";
	return "";
	
};
window['func9_DDgui_get'] = function(param6_id_Str, param8_name_Str) {
	var local6_id_Str_ref_2235 = [param6_id_Str]; /* NEWCODEHERE */
	var local8_name_Str_ref_2236 = [param8_name_Str]; /* NEWCODEHERE */
	if ((((BOUNDS(global11_ddgui_stack_ref[0], 0)) == (0)) ? 1 : 0)) {
		return tryClone(0);
		
	};
	if (((((local6_id_Str_ref_2235[0]).length) == (0)) ? 1 : 0)) {
		return tryClone(FLOAT2STR(func13_DDgui_get_Str(unref(local6_id_Str_ref_2235[0]), unref(local8_name_Str_ref_2236[0]))));
		
	} else {
		var local2_iw_2237 = 0;
		local2_iw_2237 = func11_DDgui_index(unref(global11_ddgui_stack_ref[0].arrAccess(-(1)).values[tmpPositionCache][0]), local6_id_Str_ref_2235, 0);
		if ((((local2_iw_2237) >= (0)) ? 1 : 0)) {
			var alias3_wdg_ref_2238 = [new type9_DDGUI_WDG()];
			alias3_wdg_ref_2238 = global11_ddgui_stack_ref[0].arrAccess(-(1)).values[tmpPositionCache][0].attr7_widgets_ref[0].arrAccess(local2_iw_2237).values[tmpPositionCache] /* ALIAS */;
			{
				var local16___SelectHelper9__2239 = "";
				local16___SelectHelper9__2239 = local8_name_Str_ref_2236[0];
				if ((((local16___SelectHelper9__2239) == ("CLICKED")) ? 1 : 0)) {
					return tryClone(alias3_wdg_ref_2238[0].attr8_wclicked);
					
				} else if ((((local16___SelectHelper9__2239) == ("SELECT")) ? 1 : 0)) {
					return tryClone(alias3_wdg_ref_2238[0].attr7_wselect);
					
				} else if ((((local16___SelectHelper9__2239) == ("COUNT")) ? 1 : 0)) {
					return tryClone(alias3_wdg_ref_2238[0].attr6_wcount);
					
				} else if ((((local16___SelectHelper9__2239) == ("SELSTART")) ? 1 : 0)) {
					return tryClone(alias3_wdg_ref_2238[0].attr9_wselstart);
					
				} else if ((((local16___SelectHelper9__2239) == ("SELEND")) ? 1 : 0)) {
					return tryClone(alias3_wdg_ref_2238[0].attr7_wselend);
					
				};
				
			};
			return tryClone(FLOAT2STR(func20_DDgui_get_intern_Str(unref(alias3_wdg_ref_2238[0]), local8_name_Str_ref_2236)));
			
		};
		
	};
	return 0;
	
};
window['func9_DDgui_set'] = function(param6_id_Str, param8_name_Str, param7_val_Str) {
	var local6_id_Str_ref_1609 = [param6_id_Str]; /* NEWCODEHERE */
	if (((((local6_id_Str_ref_1609[0]).length) == (0)) ? 1 : 0)) {
		{
			var local16___SelectHelper1__1612 = "";
			local16___SelectHelper1__1612 = param8_name_Str;
			if ((((local16___SelectHelper1__1612) == ("FOCUS")) ? 1 : 0)) {
				global11_ddgui_stack_ref[0].arrAccess(-(1)).values[tmpPositionCache][0].attr9_focus_Str = param7_val_Str;
				
			} else if ((((local16___SelectHelper1__1612) == ("INKEY")) ? 1 : 0)) {
				global11_ddgui_stack_ref[0].arrAccess(-(1)).values[tmpPositionCache][0].attr13_dlg_inkey_Str = param7_val_Str;
				
			} else if ((((local16___SelectHelper1__1612) == ("COL_BRIGHT")) ? 1 : 0)) {
				global11_ddgui_stack_ref[0].arrAccess(-(1)).values[tmpPositionCache][0].attr10_col_bright = INT2STR(param7_val_Str);
				
			} else if ((((local16___SelectHelper1__1612) == ("COL_NORM")) ? 1 : 0)) {
				global11_ddgui_stack_ref[0].arrAccess(-(1)).values[tmpPositionCache][0].attr8_col_norm = INT2STR(param7_val_Str);
				
			} else if ((((local16___SelectHelper1__1612) == ("COL_HOVER_BRIGHT")) ? 1 : 0)) {
				global11_ddgui_stack_ref[0].arrAccess(-(1)).values[tmpPositionCache][0].attr16_col_hover_bright = INT2STR(param7_val_Str);
				
			} else if ((((local16___SelectHelper1__1612) == ("COL_HOVER_NORM")) ? 1 : 0)) {
				global11_ddgui_stack_ref[0].arrAccess(-(1)).values[tmpPositionCache][0].attr14_col_hover_norm = INT2STR(param7_val_Str);
				
			} else if ((((local16___SelectHelper1__1612) == ("TEXT")) ? 1 : 0)) {
				global11_ddgui_stack_ref[0].arrAccess(-(1)).values[tmpPositionCache][0].attr4_main.attr9_wtext_Str_ref[0] = param7_val_Str;
				
			} else if ((((local16___SelectHelper1__1612) == ("XPOS")) ? 1 : 0)) {
				global11_ddgui_stack_ref[0].arrAccess(-(1)).values[tmpPositionCache][0].attr4_xpos = INT2STR(param7_val_Str);
				
			} else if ((((local16___SelectHelper1__1612) == ("YPOS")) ? 1 : 0)) {
				global11_ddgui_stack_ref[0].arrAccess(-(1)).values[tmpPositionCache][0].attr4_ypos = INT2STR(param7_val_Str);
				
			} else if ((((local16___SelectHelper1__1612) == ("WIDTH")) ? 1 : 0)) {
				global11_ddgui_stack_ref[0].arrAccess(-(1)).values[tmpPositionCache][0].attr4_main.attr6_wwidth = INT2STR(param7_val_Str);
				
			} else if ((((local16___SelectHelper1__1612) == ("HEIGHT")) ? 1 : 0)) {
				global11_ddgui_stack_ref[0].arrAccess(-(1)).values[tmpPositionCache][0].attr4_main.attr7_wheight = INT2STR(param7_val_Str);
				
			} else if ((((local16___SelectHelper1__1612) == ("MOVEABLE")) ? 1 : 0)) {
				global11_ddgui_stack_ref[0].arrAccess(-(1)).values[tmpPositionCache][0].attr8_moveable = INT2STR(param7_val_Str);
				
			} else if ((((local16___SelectHelper1__1612) == ("SCALEABLE")) ? 1 : 0)) {
				global11_ddgui_stack_ref[0].arrAccess(-(1)).values[tmpPositionCache][0].attr9_scaleable = INT2STR(param7_val_Str);
				
			} else {
				
			};
			
		};
		
	} else {
		var local2_iw_1613 = 0.0, alias3_wdg_ref_1614 = [new type9_DDGUI_WDG()];
		local2_iw_1613 = func11_DDgui_index(unref(global11_ddgui_stack_ref[0].arrAccess(-(1)).values[tmpPositionCache][0]), local6_id_Str_ref_1609, 1);
		alias3_wdg_ref_1614 = global11_ddgui_stack_ref[0].arrAccess(-(1)).values[tmpPositionCache][0].attr7_widgets_ref[0].arrAccess(~~(local2_iw_1613)).values[tmpPositionCache] /* ALIAS */;
		{
			var local16___SelectHelper2__1615 = "";
			local16___SelectHelper2__1615 = param8_name_Str;
			if ((((local16___SelectHelper2__1615) == ("TEXT")) ? 1 : 0)) {
				alias3_wdg_ref_1614[0].attr9_wtext_Str_ref[0] = param7_val_Str;
				
			} else if ((((local16___SelectHelper2__1615) == ("CLICKED")) ? 1 : 0)) {
				alias3_wdg_ref_1614[0].attr8_wclicked = INT2STR(param7_val_Str);
				
			} else if ((((local16___SelectHelper2__1615) == ("WIDTH")) ? 1 : 0)) {
				alias3_wdg_ref_1614[0].attr6_wwidth = INT2STR(param7_val_Str);
				
			} else if ((((local16___SelectHelper2__1615) == ("HEIGHT")) ? 1 : 0)) {
				alias3_wdg_ref_1614[0].attr7_wheight = INT2STR(param7_val_Str);
				
			} else if ((((local16___SelectHelper2__1615) == ("SELECT")) ? 1 : 0)) {
				alias3_wdg_ref_1614[0].attr7_wselect = INT2STR(param7_val_Str);
				
			} else if ((((local16___SelectHelper2__1615) == ("COUNT")) ? 1 : 0)) {
				alias3_wdg_ref_1614[0].attr6_wcount = INT2STR(param7_val_Str);
				
			} else if ((((local16___SelectHelper2__1615) == ("HOVER")) ? 1 : 0)) {
				alias3_wdg_ref_1614[0].attr6_whover = INT2STR(param7_val_Str);
				
			} else if ((((local16___SelectHelper2__1615) == ("READONLY")) ? 1 : 0)) {
				alias3_wdg_ref_1614[0].attr9_wreadonly = INT2STR(param7_val_Str);
				
			} else if ((((local16___SelectHelper2__1615) == ("SELSTART")) ? 1 : 0)) {
				alias3_wdg_ref_1614[0].attr9_wselstart = INT2STR(param7_val_Str);
				
			} else if ((((local16___SelectHelper2__1615) == ("SELEND")) ? 1 : 0)) {
				alias3_wdg_ref_1614[0].attr7_wselend = INT2STR(param7_val_Str);
				
			} else if ((((local16___SelectHelper2__1615) == ("HIDE")) ? 1 : 0)) {
				alias3_wdg_ref_1614[0].attr5_whide = INT2STR(param7_val_Str);
				
			} else if ((((local16___SelectHelper2__1615) == ("TYPE")) ? 1 : 0)) {
				alias3_wdg_ref_1614[0].attr9_wtype_Str = param7_val_Str;
				
			} else if ((((local16___SelectHelper2__1615) == ("FILTER")) ? 1 : 0)) {
				alias3_wdg_ref_1614[0].attr11_wfilter_Str = param7_val_Str;
				
			} else if ((((local16___SelectHelper2__1615) == ("TIPTEXT")) ? 1 : 0)) {
				alias3_wdg_ref_1614[0].attr11_tiptext_Str_ref[0] = param7_val_Str;
				
			} else if ((((local16___SelectHelper2__1615) == ("MINVAL")) ? 1 : 0)) {
				alias3_wdg_ref_1614[0].attr7_wminval = FLOAT2STR(param7_val_Str);
				
			} else if ((((local16___SelectHelper2__1615) == ("MAXVAL")) ? 1 : 0)) {
				alias3_wdg_ref_1614[0].attr7_wmaxval = FLOAT2STR(param7_val_Str);
				
			} else if ((((local16___SelectHelper2__1615) == ("STEP")) ? 1 : 0)) {
				alias3_wdg_ref_1614[0].attr5_wstep = FLOAT2STR(param7_val_Str);
				
			} else if ((((local16___SelectHelper2__1615) == ("SCROLL")) ? 1 : 0)) {
				alias3_wdg_ref_1614[0].attr7_wscroll = INT2STR(param7_val_Str);
				
			} else if ((((local16___SelectHelper2__1615) == ("ALIGN")) ? 1 : 0)) {
				alias3_wdg_ref_1614[0].attr6_walign = INT2STR(param7_val_Str);
				
			} else {
				
			};
			
		};
		
	};
	return 0;
	
};
window['func17_DDGui_PrintIntern'] = function(param5_t_Str_ref, param1_x, param1_y, param5_bBold) {
	if (param5_bBold) {
		ALPHAMODE(-(0.5));
		func17_DDGui_PrintIntern(param5_t_Str_ref, ((param1_x) + (1)), param1_y, 0);
		ALPHAMODE(0);
		
	};
	PRINT(unref(param5_t_Str_ref[0]), param1_x, param1_y, global18_ddgui_font_kerning.attr11_bHasKerning);
	return 0;
	if (global18_ddgui_font_kerning.attr11_bHasKerning) {
		var local2_fx_2244 = 0, local2_lt_2245 = 0, local5_c_Str_2246 = "", local4_kern_2247 = 0, local2_ac_2248 = 0;
		local2_lt_2245 = (((param5_t_Str_ref[0]).length) - (1));
		{
			var local1_c_2249 = 0;
			for (local1_c_2249 = 0;toCheck(local1_c_2249, local2_lt_2245, 1);local1_c_2249 += 1) {
				local5_c_Str_2246 = MID_Str(unref(param5_t_Str_ref[0]), local1_c_2249, 1);
				local2_ac_2248 = ASC(local5_c_Str_2246, 0);
				local4_kern_2247 = global18_ddgui_font_kerning.attr4_left.arrAccess(local2_ac_2248).values[tmpPositionCache];
				PRINT(local5_c_Str_2246, ((param1_x) - (local4_kern_2247)), param1_y, 0);
				param1_x+=global18_ddgui_font_kerning.attr5_width.arrAccess(local2_ac_2248).values[tmpPositionCache];
				
			};
			
		};
		
	} else {
		PRINT(unref(param5_t_Str_ref[0]), param1_x, param1_y, 0);
		
	};
	return 0;
	
};
window['func21_DDGui_TextWidthIntern'] = function(param5_t_Str_ref) {
	return tryClone(KERNLEN(param5_t_Str_ref[0], global18_ddgui_font_kerning.attr11_bHasKerning));
	if (global18_ddgui_font_kerning.attr11_bHasKerning) {
		var local2_fx_2251 = 0, local2_lt_2252 = 0, local5_c_Str_2253 = "", local1_x_2254 = 0, local2_ac_2255 = 0;
		local2_lt_2252 = (((param5_t_Str_ref[0]).length) - (1));
		{
			var local1_c_2256 = 0;
			for (local1_c_2256 = 0;toCheck(local1_c_2256, local2_lt_2252, 1);local1_c_2256 += 1) {
				local2_ac_2255 = ASC(MID_Str(unref(param5_t_Str_ref[0]), local1_c_2256, 1), 0);
				local1_x_2254+=global18_ddgui_font_kerning.attr5_width.arrAccess(local2_ac_2255).values[tmpPositionCache];
				
			};
			
		};
		return tryClone(local1_x_2254);
		
	} else {
		var local2_fx_ref_2257 = [0], local2_fy_ref_2258 = [0];
		GETFONTSIZE(local2_fx_ref_2257, local2_fy_ref_2258);
		return tryClone((((param5_t_Str_ref[0]).length) * (local2_fx_ref_2257[0])));
		
	};
	return 0;
	
};
window['func10_DDgui_init'] = function() {
	if ((((BOUNDS(global11_ddgui_stack_ref[0], 0)) == (0)) ? 1 : 0)) {
		DIM(unref(global11_ddgui_stack_ref[0]), [1], [new type9_DDGUI_DLG()]);
		
	};
	if (((((((global11_ddgui_stack_ref[0].arrAccess(-(1)).values[tmpPositionCache][0].attr8_col_norm) == (0)) ? 1 : 0)) && ((((global11_ddgui_stack_ref[0].arrAccess(-(1)).values[tmpPositionCache][0].attr10_col_bright) == (0)) ? 1 : 0))) ? 1 : 0)) {
		global11_ddgui_stack_ref[0].arrAccess(-(1)).values[tmpPositionCache][0].attr8_col_norm = RGB(192, 192, 192);
		global11_ddgui_stack_ref[0].arrAccess(-(1)).values[tmpPositionCache][0].attr10_col_bright = RGB(255, 255, 255);
		global11_ddgui_stack_ref[0].arrAccess(-(1)).values[tmpPositionCache][0].attr14_col_hover_norm = RGB(64, 144, 255);
		global11_ddgui_stack_ref[0].arrAccess(-(1)).values[tmpPositionCache][0].attr16_col_hover_bright = RGB(160, 240, 255);
		
	};
	DIM(unref(global11_ddgui_stack_ref[0].arrAccess(-(1)).values[tmpPositionCache][0].attr7_widgets_ref[0]), [0], [new type9_DDGUI_WDG()]);
	DIM(global11_ddgui_stack_ref[0].arrAccess(-(1)).values[tmpPositionCache][0].attr9_draworder, [0], new type11_DDGUI_ORDER());
	DIM(global11_ddgui_stack_ref[0].arrAccess(-(1)).values[tmpPositionCache][0].attr5_autos, [0], new type10_DDGUI_AUTO());
	if ((((((((((((((((((((((PLATFORMINFO_Str("")) == ("WINCE")) ? 1 : 0)) || ((((PLATFORMINFO_Str("")) == ("GP2X")) ? 1 : 0))) ? 1 : 0)) || ((((PLATFORMINFO_Str("")) == ("ANDROID")) ? 1 : 0))) ? 1 : 0)) || ((((PLATFORMINFO_Str("")) == ("IPHONE")) ? 1 : 0))) ? 1 : 0)) || ((((PLATFORMINFO_Str("")) == ("PANDORA")) ? 1 : 0))) ? 1 : 0)) || ((((PLATFORMINFO_Str("")) == ("WEBOS")) ? 1 : 0))) ? 1 : 0)) || ((((PLATFORMINFO_Str("")) == ("PALM_PIXI")) ? 1 : 0))) ? 1 : 0)) {
		global20_DDGUI_AUTO_INPUT_DLG = 1;
		if ((((global20_gDDguiScrollbarWidth) == (0)) ? 1 : 0)) {
			global20_gDDguiScrollbarWidth = 30;
			
		};
		
	};
	if ((((global20_gDDguiScrollbarWidth) == (0)) ? 1 : 0)) {
		global20_gDDguiScrollbarWidth = 20;
		
	};
	return 0;
	
};
window['func16_DDgui_pushdialog'] = function(param1_x, param1_y, param5_width, param6_height, param16_center_to_screen) {
	var local2_sx_ref_1621 = [0], local2_sy_ref_1622 = [0], local3_dlg_ref_1623 = [new type9_DDGUI_DLG()];
	if ((((global25_gDDguiMinControlDimension) <= (0)) ? 1 : 0)) {
		global25_gDDguiMinControlDimension = 16;
		
	};
	DIMPUSH(global11_ddgui_stack_ref[0], local3_dlg_ref_1623);
	GETSCREENSIZE(local2_sx_ref_1621, local2_sy_ref_1622);
	func10_DDgui_init();
	global11_ddgui_stack_ref[0].arrAccess(-(1)).values[tmpPositionCache][0].attr4_xpos = MIN(param1_x, ((local2_sx_ref_1621[0]) - (1)));
	global11_ddgui_stack_ref[0].arrAccess(-(1)).values[tmpPositionCache][0].attr4_ypos = MIN(param1_y, ((local2_sy_ref_1622[0]) - (1)));
	global11_ddgui_stack_ref[0].arrAccess(-(1)).values[tmpPositionCache][0].attr4_main.attr6_wwidth = MIN(param5_width, ((local2_sx_ref_1621[0]) - (param1_x)));
	global11_ddgui_stack_ref[0].arrAccess(-(1)).values[tmpPositionCache][0].attr4_main.attr7_wheight = MIN(param6_height, ((local2_sy_ref_1622[0]) - (param1_y)));
	global11_ddgui_stack_ref[0].arrAccess(-(1)).values[tmpPositionCache][0].attr8_col_norm = global11_ddgui_stack_ref[0].arrAccess(0).values[tmpPositionCache][0].attr8_col_norm;
	global11_ddgui_stack_ref[0].arrAccess(-(1)).values[tmpPositionCache][0].attr10_col_bright = global11_ddgui_stack_ref[0].arrAccess(0).values[tmpPositionCache][0].attr10_col_bright;
	global11_ddgui_stack_ref[0].arrAccess(-(1)).values[tmpPositionCache][0].attr14_col_hover_norm = global11_ddgui_stack_ref[0].arrAccess(0).values[tmpPositionCache][0].attr14_col_hover_norm;
	global11_ddgui_stack_ref[0].arrAccess(-(1)).values[tmpPositionCache][0].attr16_col_hover_bright = global11_ddgui_stack_ref[0].arrAccess(0).values[tmpPositionCache][0].attr16_col_hover_bright;
	if (param16_center_to_screen) {
		func18_DDgui_CenterDialog();
		
	};
	return 0;
	
};
window['func15_DDgui_popdialog'] = function() {
	if ((((BOUNDS(global11_ddgui_stack_ref[0], 0)) > (0)) ? 1 : 0)) {
		var local1_n_2259 = 0, local9_dummy_Str_ref_2260 = [""];
		local1_n_2259 = ((BOUNDS(global11_ddgui_stack_ref[0], 0)) - (1));
		var forEachSaver14239 = global11_ddgui_stack_ref[0].arrAccess(local1_n_2259).values[tmpPositionCache][0].attr7_widgets_ref[0];
		for(var forEachCounter14239 = 0 ; forEachCounter14239 < forEachSaver14239.values.length ; forEachCounter14239++) {
			var local3_wdg_ref_2261 = forEachSaver14239.values[forEachCounter14239];
		{
				if (local3_wdg_ref_2261[0].attr8_wuserfoo_ref[0]) {
					func12_DDgui_signal(local3_wdg_ref_2261[0].attr7_wid_Str, "DESTROY", local9_dummy_Str_ref_2260);
					
				};
				
			}
			forEachSaver14239.values[forEachCounter14239] = local3_wdg_ref_2261;
		
		};
		DIMDEL(global11_ddgui_stack_ref[0], local1_n_2259);
		
	};
	if (BOUNDS(global11_ddgui_stack_ref[0], 0)) {
		func18_DDgui_resizedialog(0, 0, 0, 0);
		
	};
	return 0;
	
};
window['func10_DDgui_show'] = function(param17_only_show_current) {
	if ((((BOUNDS(global11_ddgui_stack_ref[0], 0)) == (0)) ? 1 : 0)) {
		return tryClone(0);
		
	};
	if ((((param17_only_show_current) == (0)) ? 1 : 0)) {
		var local1_i_1625 = 0;
		{
			for (local1_i_1625 = 0;toCheck(local1_i_1625, ((BOUNDS(global11_ddgui_stack_ref[0], 0)) - (2)), 1);local1_i_1625 += 1) {
				var alias3_dlg_ref_1626 = [new type9_DDGUI_DLG()];
				alias3_dlg_ref_1626 = global11_ddgui_stack_ref[0].arrAccess(local1_i_1625).values[tmpPositionCache] /* ALIAS */;
				func17_DDgui_show_intern(unref(alias3_dlg_ref_1626[0]), 0);
				
			};
			
		};
		
	};
	func17_DDgui_show_intern(unref(global11_ddgui_stack_ref[0].arrAccess(-(1)).values[tmpPositionCache][0]), 1);
	var forEachSaver2243 = global11_ddgui_stack_ref[0].arrAccess(-(1)).values[tmpPositionCache][0].attr5_autos;
	for(var forEachCounter2243 = 0 ; forEachCounter2243 < forEachSaver2243.values.length ; forEachCounter2243++) {
		var local5_autom_1627 = forEachSaver2243.values[forEachCounter2243];
	{
			func9_DDgui_set(local5_autom_1627.attr8_idto_Str, local5_autom_1627.attr9_objto_Str, func13_DDgui_get_Str(local5_autom_1627.attr10_idfrom_Str, local5_autom_1627.attr11_objfrom_Str));
			
		}
		forEachSaver2243.values[forEachCounter2243] = local5_autom_1627;
	
	};
	return 0;
	
};
window['func17_DDgui_show_intern'] = function(param10_ddgui_vals, param10_is_current) {
	var local1_x_1630 = 0, local1_y_1631 = 0, local5_width_1632 = 0, local6_height_1633 = 0, local2_c1_1634 = 0, local2_c2_1635 = 0, local1_i_1636 = 0, local6_id_Str_1637 = "", local7_dy_line_ref_1638 = [0], local4_xpos_ref_1639 = [0], local4_ypos_ref_1640 = [0], local4_ytop_1641 = 0, local5_yclip_1642 = 0, local2_mx_ref_1643 = [0], local2_my_ref_1644 = [0], local2_b1_1645 = 0, local2_b2_1646 = 0, local6_realb1_ref_1647 = [0], local6_realb2_ref_1648 = [0], local2_tx_ref_1649 = [0], local2_ty_ref_1650 = [0], local7_spacing_1651 = 0, local7_movable_1652 = 0, local3_col_1653 = 0, local14_caption_height_1660 = 0, local10_sizer_size_1661 = 0, local9_show_tips_1663 = 0, local5_xclip_1664 = 0, local6_ybclip_1665 = 0, local6_retval_1667 = 0, local10_KickId_Str_1668 = "";
	local7_spacing_1651 = 2;
	MOUSESTATE(local2_mx_ref_1643, local2_my_ref_1644, local6_realb1_ref_1647, local6_realb2_ref_1648);
	GETFONTSIZE(local2_tx_ref_1649, local2_ty_ref_1650);
	local14_caption_height_1660 = MAX(unref(local2_ty_ref_1650[0]), global25_gDDguiMinControlDimension);
	if (((((((ABS(((local2_mx_ref_1643[0]) - (static9_DDgui_show_intern_ToolTipMx)))) > (4)) ? 1 : 0)) || ((((ABS(((local2_my_ref_1644[0]) - (static9_DDgui_show_intern_ToolTipMy)))) > (4)) ? 1 : 0))) ? 1 : 0)) {
		static12_DDgui_show_intern_ToolTipDelay = GETTIMERALL();
		static9_DDgui_show_intern_ToolTipMx = local2_mx_ref_1643[0];
		static9_DDgui_show_intern_ToolTipMy = local2_my_ref_1644[0];
		
	};
	if (param10_is_current) {
		local2_b1_1645 = 0;
		if ((((local6_realb1_ref_1647[0]) && ((((static10_DDgui_show_intern_mouse_down) == (0)) ? 1 : 0))) ? 1 : 0)) {
			local2_b1_1645 = -(1);
			static10_DDgui_show_intern_mouse_down = 1;
			static10_DDgui_show_intern_movemousex = local2_mx_ref_1643[0];
			static10_DDgui_show_intern_movemousey = local2_my_ref_1644[0];
			
		};
		if (((((((local6_realb1_ref_1647[0]) == (0)) ? 1 : 0)) && ((((static10_DDgui_show_intern_mouse_down) > (0)) ? 1 : 0))) ? 1 : 0)) {
			local2_b1_1645 = 1;
			static10_DDgui_show_intern_mouse_down = 0;
			
		};
		
	};
	VIEWPORT(0, 0, 0, 0);
	local2_c1_1634 = param10_ddgui_vals.attr10_col_bright;
	local2_c2_1635 = param10_ddgui_vals.attr8_col_norm;
	local1_x_1630 = param10_ddgui_vals.attr4_xpos;
	local1_y_1631 = param10_ddgui_vals.attr4_ypos;
	local5_width_1632 = param10_ddgui_vals.attr4_main.attr6_wwidth;
	local6_height_1633 = param10_ddgui_vals.attr4_main.attr7_wheight;
	if (param10_is_current) {
		if (param10_ddgui_vals.attr8_moveable) {
			if (local6_realb1_ref_1647[0]) {
				local1_i_1636 = BOXCOLL(local1_x_1630, local1_y_1631, local5_width_1632, local14_caption_height_1660, unref(local2_mx_ref_1643[0]), unref(local2_my_ref_1644[0]), 1, 1);
				if (((((((local1_i_1636) || (param10_ddgui_vals.attr6_moving)) ? 1 : 0)) && (((((param10_ddgui_vals.attr9_focus_Str).length) == (0)) ? 1 : 0))) ? 1 : 0)) {
					param10_ddgui_vals.attr6_moving = 1;
					local1_x_1630 = MAX(0, ((((local1_x_1630) + (local2_mx_ref_1643[0]))) - (static10_DDgui_show_intern_movemousex)));
					local1_y_1631 = MAX(0, ((((local1_y_1631) + (local2_my_ref_1644[0]))) - (static10_DDgui_show_intern_movemousey)));
					param10_ddgui_vals.attr4_xpos = local1_x_1630;
					param10_ddgui_vals.attr4_ypos = local1_y_1631;
					
				} else if (local1_i_1636) {
					param10_ddgui_vals.attr9_focus_Str = "";
					
				};
				
			} else {
				param10_ddgui_vals.attr6_moving = 0;
				
			};
			
		};
		
	};
	if ((((param10_ddgui_vals.attr8_moveable) || ((param10_ddgui_vals.attr4_main.attr9_wtext_Str_ref[0]).length)) ? 1 : 0)) {
		local7_movable_1652 = 1;
		local1_y_1631 = ((((local1_y_1631) + (local14_caption_height_1660))) + (4));
		func13_DDgui_backgnd(local2_c1_1634, local2_c2_1635, ((local1_x_1630) + (1)), ((((local1_y_1631) - (local14_caption_height_1660))) - (3)), ((local5_width_1632) - (2)), ((local14_caption_height_1660) + (4)));
		func17_DDGui_PrintIntern(param10_ddgui_vals.attr4_main.attr9_wtext_Str_ref, ((local1_x_1630) + (3)), ((((local1_y_1631) - (local14_caption_height_1660))) - (2)), 1);
		func14_DDgui_backrect(local1_x_1630, ((((local1_y_1631) - (local14_caption_height_1660))) - (4)), local5_width_1632, ((((local6_height_1633) + (local14_caption_height_1660))) + (4)), local2_c2_1635);
		param10_ddgui_vals.attr5_rectx = local1_x_1630;
		param10_ddgui_vals.attr5_recty = ((((local1_y_1631) - (local14_caption_height_1660))) - (4));
		param10_ddgui_vals.attr5_rectw = local5_width_1632;
		param10_ddgui_vals.attr5_recth = ((((local6_height_1633) + (local14_caption_height_1660))) + (4));
		
	} else {
		func14_DDgui_backrect(local1_x_1630, local1_y_1631, local5_width_1632, local6_height_1633, local2_c2_1635);
		param10_ddgui_vals.attr5_rectx = local1_x_1630;
		param10_ddgui_vals.attr5_recty = local1_y_1631;
		param10_ddgui_vals.attr5_rectw = local5_width_1632;
		param10_ddgui_vals.attr5_recth = local6_height_1633;
		
	};
	func13_DDgui_backgnd(local2_c1_1634, local2_c1_1634, ((local1_x_1630) + (1)), ((local1_y_1631) + (1)), ((local5_width_1632) - (2)), ((local6_height_1633) - (2)));
	local4_ytop_1641 = local1_y_1631;
	local5_yclip_1642 = local4_ytop_1641;
	local10_sizer_size_1661 = MAX(((local2_tx_ref_1649[0]) * (2)), global20_gDDguiScrollbarWidth);
	if (param10_is_current) {
		if ((((param10_ddgui_vals.attr9_scaleable) || (param10_ddgui_vals.attr8_scaleing)) ? 1 : 0)) {
			if (local6_realb1_ref_1647[0]) {
				local1_i_1636 = BOXCOLL(((((((local1_x_1630) + (local5_width_1632))) - (local10_sizer_size_1661))) - (4)), ((((((local1_y_1631) + (local6_height_1633))) - (local10_sizer_size_1661))) - (4)), ((local10_sizer_size_1661) + (4)), ((local10_sizer_size_1661) + (4)), unref(local2_mx_ref_1643[0]), unref(local2_my_ref_1644[0]), 1, 1);
				if ((((local1_i_1636) || (param10_ddgui_vals.attr8_scaleing)) ? 1 : 0)) {
					param10_ddgui_vals.attr8_scaleing = 1;
					local5_width_1632 = MAX(0, ((((local5_width_1632) + (local2_mx_ref_1643[0]))) - (static10_DDgui_show_intern_movemousex)));
					local6_height_1633 = MAX(0, ((((local6_height_1633) + (local2_my_ref_1644[0]))) - (static10_DDgui_show_intern_movemousey)));
					param10_ddgui_vals.attr4_main.attr6_wwidth = local5_width_1632;
					param10_ddgui_vals.attr4_main.attr7_wheight = local6_height_1633;
					
				};
				
			} else {
				param10_ddgui_vals.attr8_scaleing = 0;
				
			};
			
		};
		
	};
	if ((((param10_ddgui_vals.attr9_scaleable) || (param10_ddgui_vals.attr8_scaleing)) ? 1 : 0)) {
		local3_col_1653 = BOXCOLL(((((((local1_x_1630) + (local5_width_1632))) - (local10_sizer_size_1661))) - (4)), ((((((local1_y_1631) + (local6_height_1633))) - (local10_sizer_size_1661))) - (4)), ((local10_sizer_size_1661) + (4)), ((local10_sizer_size_1661) + (4)), unref(local2_mx_ref_1643[0]), unref(local2_my_ref_1644[0]), 1, 1);
		if (local3_col_1653) {
			local2_c2_1635 = param10_ddgui_vals.attr14_col_hover_norm;
			
		};
		local1_i_1636 = ((((((local1_y_1631) + (local6_height_1633))) - (local10_sizer_size_1661))) - (3));
		DRAWRECT(((((((local1_x_1630) + (local5_width_1632))) - (CAST2INT(((local10_sizer_size_1661) / (3)))))) - (5)), local1_i_1636, CAST2INT(((local10_sizer_size_1661) / (3))), 2, local2_c2_1635);
		local1_i_1636+=CAST2INT(((local10_sizer_size_1661) / (3)));
		DRAWRECT(((((((local1_x_1630) + (local5_width_1632))) - (CAST2INT(((((2) * (local10_sizer_size_1661))) / (3)))))) - (5)), local1_i_1636, CAST2INT(((((2) * (local10_sizer_size_1661))) / (3))), 2, local2_c2_1635);
		local1_i_1636+=CAST2INT(((local10_sizer_size_1661) / (3)));
		DRAWRECT(((((((local1_x_1630) + (local5_width_1632))) - (local10_sizer_size_1661))) - (5)), local1_i_1636, local10_sizer_size_1661, 2, local2_c2_1635);
		if (local3_col_1653) {
			local2_c2_1635 = param10_ddgui_vals.attr8_col_norm;
			
		};
		
	};
	if (param10_is_current) {
		static10_DDgui_show_intern_movemousex = local2_mx_ref_1643[0];
		static10_DDgui_show_intern_movemousey = local2_my_ref_1644[0];
		
	};
	local1_x_1630+=3;
	local1_y_1631+=3;
	local4_ytop_1641+=3;
	local5_yclip_1642+=3;
	local5_width_1632+=-(6);
	local6_height_1633+=-(6);
	local4_ypos_ref_1640[0] = local1_y_1631;
	local4_xpos_ref_1639[0] = local1_x_1630;
	if (param10_is_current) {
		var local4_hgrp_1662 = 0;
		param10_ddgui_vals.attr4_main.attr10_wscrollmax = MAX(0, ((((param10_ddgui_vals.attr10_realheight) - (local6_height_1633))) - (12)));
		if (param10_ddgui_vals.attr4_main.attr10_wscrollmax) {
			param10_ddgui_vals.attr4_main.attr10_wscrollmax+=24;
			
		};
		if (param10_ddgui_vals.attr9_scaleable) {
			local4_hgrp_1662 = MAX(32, local10_sizer_size_1661);
			
		};
		if ((((param10_is_current) && (func21_DDgui_handlescrollbar(param10_ddgui_vals, param10_ddgui_vals.attr4_main, ((((local2_mx_ref_1643[0]) - (local1_x_1630))) + (10)), ((local2_my_ref_1644[0]) - (local1_y_1631)), local2_b1_1645, local2_b2_1646, ((local6_height_1633) - (local4_hgrp_1662))))) ? 1 : 0)) {
			VIEWPORT(local1_x_1630, local1_y_1631, local5_width_1632, local6_height_1633);
			func19_DDgui_drawscrollbar(param10_ddgui_vals, param10_ddgui_vals.attr4_main, local5_width_1632, ((local6_height_1633) - (local4_hgrp_1662)), local6_height_1633, 0);
			VIEWPORT(0, 0, 0, 0);
			local5_width_1632+=-(local10_sizer_size_1661);
			local1_i_1636 = param10_ddgui_vals.attr4_main.attr7_wscroll;
			local4_ypos_ref_1640[0] = ((local4_ypos_ref_1640[0]) - (local1_i_1636));
			local4_ytop_1641 = ((local4_ytop_1641) - (local1_i_1636));
			
		};
		
	};
	local7_dy_line_ref_1638[0] = 0;
	if ((((BOUNDS(param10_ddgui_vals.attr9_draworder, 0)) != (BOUNDS(param10_ddgui_vals.attr7_widgets_ref[0], 0))) ? 1 : 0)) {
		
	};
	if ((((((GETTIMERALL()) - (static12_DDgui_show_intern_ToolTipDelay))) > (500)) ? 1 : 0)) {
		local9_show_tips_1663 = 1;
		
	};
	local5_xclip_1664 = ((local4_xpos_ref_1639[0]) + (local5_width_1632));
	local6_ybclip_1665 = ((local5_yclip_1642) + (local6_height_1633));
	{
		var local2_od_ref_1666 = [0];
		for (local2_od_ref_1666[0] = 0;toCheck(local2_od_ref_1666[0], ((BOUNDS(param10_ddgui_vals.attr9_draworder, 0)) - (1)), 1);local2_od_ref_1666[0] += 1) {
			func24_DDgui_draw_widget_intern(param10_ddgui_vals, local2_od_ref_1666, local4_xpos_ref_1639, local4_ypos_ref_1640, local7_dy_line_ref_1638, local5_width_1632, param10_is_current, local7_spacing_1651, local5_xclip_1664, local5_yclip_1642, local6_ybclip_1665, unref(local2_mx_ref_1643[0]), unref(local2_my_ref_1644[0]), local2_b1_1645, local2_b2_1646, local1_x_1630, local1_y_1631, local9_show_tips_1663);
			
		};
		
	};
	VIEWPORT(0, 0, 0, 0);
	if ((((param10_is_current) == (0)) ? 1 : 0)) {
		ALPHAMODE(-(0.5));
		local1_x_1630 = param10_ddgui_vals.attr4_xpos;
		local1_y_1631 = param10_ddgui_vals.attr4_ypos;
		local5_width_1632 = param10_ddgui_vals.attr4_main.attr6_wwidth;
		local6_height_1633 = param10_ddgui_vals.attr4_main.attr7_wheight;
		if (local7_movable_1652) {
			local6_height_1633+=((local14_caption_height_1660) + (4));
			
		};
		DRAWRECT(local1_x_1630, local1_y_1631, local5_width_1632, local6_height_1633, RGB(0, 0, 0));
		ALPHAMODE(0);
		
	};
	SYSTEMPOINTER(1);
	local6_height_1633 = ((((((local4_ypos_ref_1640[0]) + (local7_spacing_1651))) + (local7_dy_line_ref_1638[0]))) - (local4_ytop_1641));
	if (param10_is_current) {
		param10_ddgui_vals.attr10_realheight = local6_height_1633;
		
	};
	local6_retval_1667 = MAX(local6_height_1633, param10_ddgui_vals.attr4_main.attr7_wheight);
	local1_x_1630 = param10_ddgui_vals.attr15_kick_intern_dlg;
	param10_ddgui_vals.attr15_kick_intern_dlg = 0;
	local10_KickId_Str_1668 = param10_ddgui_vals.attr18_kick_intern_id_Str;
	{
		var local16___SelectHelper3__1669 = 0;
		local16___SelectHelper3__1669 = local1_x_1630;
		if ((((local16___SelectHelper3__1669) == (1)) ? 1 : 0)) {
			local3_col_1653;
			local3_col_1653 = func14_DDgui_ColorDlg(INT2STR(MID_Str(func13_DDgui_get_Str(local10_KickId_Str_1668, "TEXT"), 5, 64)));
			func9_DDgui_set(local10_KickId_Str_1668, "TEXT", (("SPR_C") + (CAST2STRING(local3_col_1653))));
			func9_DDgui_set(local10_KickId_Str_1668, "CLICKED", CAST2STRING(1));
			
		} else if ((((local16___SelectHelper3__1669) == (2)) ? 1 : 0)) {
			var local11_bSingleText_1670 = 0, local9_bIsNumber_1671 = 0, local8_text_Str_1672 = "";
			local11_bSingleText_1670 = 0;
			local9_bIsNumber_1671 = 0;
			if ((((func13_DDgui_get_Str(local10_KickId_Str_1668, "TYPE")) == ("SINGLETEXT")) ? 1 : 0)) {
				local11_bSingleText_1670 = 1;
				
			};
			if ((((func13_DDgui_get_Str(local10_KickId_Str_1668, "TYPE")) == ("NUMBERTEXT")) ? 1 : 0)) {
				local11_bSingleText_1670 = 1;
				local9_bIsNumber_1671 = 1;
				
			};
			local8_text_Str_1672 = func15_DDgui_input_Str(func13_DDgui_get_Str(local10_KickId_Str_1668, "TEXT"), 0, 0, local11_bSingleText_1670, local9_bIsNumber_1671);
			func9_DDgui_set(local10_KickId_Str_1668, "TEXT", local8_text_Str_1672);
			
		} else if ((((local16___SelectHelper3__1669) == (3)) ? 1 : 0)) {
			var local3_scx_ref_1673 = [0], local3_scy_ref_1674 = [0], local4_isel_1675 = 0;
			GETSCREENSIZE(local3_scx_ref_1673, local3_scy_ref_1674);
			local4_isel_1675 = func24_DDgui_button_list_picker(MIN(((local3_scy_ref_1674[0]) - (16)), func9_DDgui_get(local10_KickId_Str_1668, "XPOS")), ~~(func9_DDgui_get(local10_KickId_Str_1668, "YPOS")), ~~(func9_DDgui_get(local10_KickId_Str_1668, "WIDTH")), MAX(16, ((local3_scy_ref_1674[0]) - (func9_DDgui_get(local10_KickId_Str_1668, "YPOS")))), func13_DDgui_get_Str(local10_KickId_Str_1668, "TEXT"), ~~(func9_DDgui_get(local10_KickId_Str_1668, "SELECT")));
			if ((((local4_isel_1675) >= (0)) ? 1 : 0)) {
				func9_DDgui_set(local10_KickId_Str_1668, "SELECT", CAST2STRING(local4_isel_1675));
				func9_DDgui_set(local10_KickId_Str_1668, "CLICKED", CAST2STRING(1));
				
			};
			
		} else if ((((local16___SelectHelper3__1669) == (4)) ? 1 : 0)) {
			var local7_ret_Str_1676 = "";
			local7_ret_Str_1676 = func20_DDgui_FileDialog_Str(1, "*.*", 0);
			func9_DDgui_set(local10_KickId_Str_1668, "TEXT", local7_ret_Str_1676);
			
		};
		
	};
	return tryClone(local6_retval_1667);
	return 0;
	
};
window['func24_DDgui_draw_widget_intern'] = function(param10_ddgui_vals, param11_order_index_ref, param4_xpos_ref, param4_ypos_ref, param7_dy_line_ref, param5_width, param10_is_current, param7_spacing, param5_xclip, param5_yclip, param6_ybclip, param2_mx, param2_my, param2_b1, param2_b2, param1_x, param1_y, param9_show_tips) {
	var local3_vpx_1695 = 0, local3_vpy_1696 = 0, local2_dx_1697 = 0, local2_dy_1698 = 0, local5_vptop_1700 = 0, local4_ytop_1701 = 0, alias3_wdg_ref_1702 = [new type9_DDGUI_WDG()];
	alias3_wdg_ref_1702 = param10_ddgui_vals.attr7_widgets_ref[0].arrAccess(param10_ddgui_vals.attr9_draworder.arrAccess(param11_order_index_ref[0]).values[tmpPositionCache].attr5_index).values[tmpPositionCache] /* ALIAS */;
	if (alias3_wdg_ref_1702[0].attr5_whide) {
		return 1;
		
	};
	local2_dx_1697 = alias3_wdg_ref_1702[0].attr6_wwidth;
	local2_dy_1698 = alias3_wdg_ref_1702[0].attr7_wheight;
	if ((((((param4_xpos_ref[0]) + (local2_dx_1697))) > (((param5_width) + (param1_x)))) ? 1 : 0)) {
		param4_xpos_ref[0] = param1_x;
		param4_ypos_ref[0] = ((((param4_ypos_ref[0]) + (param7_dy_line_ref[0]))) + (param7_spacing));
		param7_dy_line_ref[0] = local2_dy_1698;
		if (((((((local2_dx_1697) >= (param5_width)) ? 1 : 0)) && ((((alias3_wdg_ref_1702[0].attr9_wtype_Str) == ("SPACER")) ? 1 : 0))) ? 1 : 0)) {
			return 1;
			
		};
		
	};
	if ((((((((((alias3_wdg_ref_1702[0].attr6_walign) == (0)) ? 1 : 0)) && ((((local2_dx_1697) < (param5_width)) ? 1 : 0))) ? 1 : 0)) && ((((param5_width) < (10000)) ? 1 : 0))) ? 1 : 0)) {
		param4_xpos_ref[0] = ((param4_xpos_ref[0]) + (CAST2INT(((((((((param5_width) + (param1_x))) - (param4_xpos_ref[0]))) - (local2_dx_1697))) / (2)))));
		
	};
	if ((((((((((alias3_wdg_ref_1702[0].attr6_walign) > (0)) ? 1 : 0)) && ((((local2_dx_1697) < (param5_width)) ? 1 : 0))) ? 1 : 0)) && ((((param5_width) < (10000)) ? 1 : 0))) ? 1 : 0)) {
		param4_xpos_ref[0] = ((((param1_x) + (param5_width))) - (local2_dx_1697));
		
	};
	//label: __DrawFrames__;
	if ((((alias3_wdg_ref_1702[0].attr9_wtype_Str) == ("FRAME")) ? 1 : 0)) {
		var local6_border_1703 = 0, local13_dy_line_frame_ref_1704 = [0], local6_xstart_1705 = 0, local6_ystart_1706 = 0, local4_iord_ref_1709 = [0], local8_fr_width_1710 = 0, local6_wwidth_1711 = 0;
		local6_border_1703 = 0;
		if ((((local2_dx_1697) == (10000)) ? 1 : 0)) {
			local6_border_1703 = 1;
			
		};
		local13_dy_line_frame_ref_1704[0] = 0;
		local6_xstart_1705 = param4_xpos_ref[0];
		local6_ystart_1706 = param4_ypos_ref[0];
		if ((alias3_wdg_ref_1702[0].attr9_wtext_Str_ref[0]).length) {
			var local2_fx_ref_1707 = [0], local2_fy_ref_1708 = [0];
			local6_border_1703 = 4;
			GETFONTSIZE(local2_fx_ref_1707, local2_fy_ref_1708);
			local3_vpx_1695 = alias3_wdg_ref_1702[0].attr6_wwidth;
			local3_vpy_1696 = alias3_wdg_ref_1702[0].attr7_wheight;
			local5_vptop_1700 = param4_ypos_ref[0];
			local4_ytop_1701 = 0;
			if ((((param4_ypos_ref[0]) < (param5_yclip)) ? 1 : 0)) {
				local4_ytop_1701 = ((param4_ypos_ref[0]) - (param5_yclip));
				local5_vptop_1700+=-(local4_ytop_1701);
				local3_vpy_1696+=local4_ytop_1701;
				
			};
			if ((((((local3_vpx_1695) + (param4_xpos_ref[0]))) > (param5_xclip)) ? 1 : 0)) {
				local3_vpx_1695 = ((param5_xclip) - (param4_xpos_ref[0]));
				
			};
			if ((((((local3_vpy_1696) + (local5_vptop_1700))) > (param6_ybclip)) ? 1 : 0)) {
				local3_vpy_1696 = ((param6_ybclip) - (local5_vptop_1700));
				
			};
			if (((((((local3_vpx_1695) > (0)) ? 1 : 0)) && ((((local3_vpy_1696) > (0)) ? 1 : 0))) ? 1 : 0)) {
				VIEWPORT(unref(param4_xpos_ref[0]), local5_vptop_1700, local3_vpx_1695, local3_vpy_1696);
				ALPHAMODE(-(0.5));
				func14_DDgui_backrect(1, ((((local4_ytop_1701) + (CAST2INT(((local2_fy_ref_1708[0]) / (2)))))) + (1)), ((alias3_wdg_ref_1702[0].attr6_wwidth) - (2)), ((((alias3_wdg_ref_1702[0].attr7_wheight) - (CAST2INT(((local2_fy_ref_1708[0]) / (2)))))) - (2)), param10_ddgui_vals.attr8_col_norm);
				ALPHAMODE(0);
				func14_DDgui_backrect(0, ((local4_ytop_1701) + (CAST2INT(((local2_fy_ref_1708[0]) / (2))))), alias3_wdg_ref_1702[0].attr6_wwidth, ((alias3_wdg_ref_1702[0].attr7_wheight) - (CAST2INT(((local2_fy_ref_1708[0]) / (2))))), param10_ddgui_vals.attr8_col_norm);
				DRAWRECT(local6_border_1703, local4_ytop_1701, ((((local6_border_1703) * (4))) + (func21_DDGui_TextWidthIntern(alias3_wdg_ref_1702[0].attr9_wtext_Str_ref))), unref(local2_fy_ref_1708[0]), param10_ddgui_vals.attr10_col_bright);
				func17_DDGui_PrintIntern(alias3_wdg_ref_1702[0].attr9_wtext_Str_ref, ((local6_border_1703) * (2)), local4_ytop_1701, 0);
				
			};
			param4_ypos_ref[0]+=((local2_fy_ref_1708[0]) + (local6_border_1703));
			param4_xpos_ref[0]+=local6_border_1703;
			param4_ypos_ref[0]+=local6_border_1703;
			local6_xstart_1705+=local6_border_1703;
			
		};
		local8_fr_width_1710 = 0;
		local6_wwidth_1711 = alias3_wdg_ref_1702[0].attr6_wwidth;
		if ((((local6_wwidth_1711) < (10000)) ? 1 : 0)) {
			local6_wwidth_1711+=-(((2) * (local6_border_1703)));
			
		};
		{
			for (local4_iord_ref_1709[0] = ((param11_order_index_ref[0]) + (1));toCheck(local4_iord_ref_1709[0], ((BOUNDS(param10_ddgui_vals.attr9_draworder, 0)) - (1)), 1);local4_iord_ref_1709[0] += 1) {
				var local9_simplewdg_1712 = 0, local4_icur_1713 = 0;
				local4_icur_1713 = local4_iord_ref_1709[0];
				local9_simplewdg_1712 = func24_DDgui_draw_widget_intern(param10_ddgui_vals, local4_iord_ref_1709, param4_xpos_ref, param4_ypos_ref, local13_dy_line_frame_ref_1704, local6_wwidth_1711, param10_is_current, param7_spacing, param5_xclip, param5_yclip, param6_ybclip, param2_mx, param2_my, param2_b1, param2_b2, local6_xstart_1705, local6_ystart_1706, param9_show_tips);
				local8_fr_width_1710 = MAX(local8_fr_width_1710, ((param4_xpos_ref[0]) - (local6_xstart_1705)));
				if ((((local9_simplewdg_1712) == (0)) ? 1 : 0)) {
					param11_order_index_ref[0] = local4_iord_ref_1709[0];
					break;
					
				};
				
			};
			
		};
		if ((((alias3_wdg_ref_1702[0].attr6_wwidth) == (10000)) ? 1 : 0)) {
			alias3_wdg_ref_1702[0].attr6_wwidth = ((local8_fr_width_1710) + (((2) * (local6_border_1703))));
			local2_dx_1697 = alias3_wdg_ref_1702[0].attr6_wwidth;
			
		};
		alias3_wdg_ref_1702[0].attr7_wheight = ((((((param4_ypos_ref[0]) - (local6_ystart_1706))) + (local13_dy_line_frame_ref_1704[0]))) + (((local6_border_1703) * (2))));
		param4_xpos_ref[0] = local6_xstart_1705;
		param4_ypos_ref[0] = local6_ystart_1706;
		
	} else if ((((alias3_wdg_ref_1702[0].attr9_wtype_Str) == ("UNFRAME")) ? 1 : 0)) {
		return tryClone(0);
		
	};
	if (param10_is_current) {
		func18_DDgui_handlewidget(param10_ddgui_vals, unref(alias3_wdg_ref_1702[0]), ((param2_mx) - (param4_xpos_ref[0])), ((param2_my) - (param4_ypos_ref[0])), param2_b1, param2_b2);
		
	};
	local3_vpx_1695 = local2_dx_1697;
	local3_vpy_1696 = local2_dy_1698;
	local5_vptop_1700 = param4_ypos_ref[0];
	local4_ytop_1701 = 0;
	if ((((param4_ypos_ref[0]) < (param5_yclip)) ? 1 : 0)) {
		local4_ytop_1701 = ((param4_ypos_ref[0]) - (param5_yclip));
		local5_vptop_1700+=-(local4_ytop_1701);
		local3_vpy_1696+=local4_ytop_1701;
		
	};
	if ((((((local3_vpx_1695) + (param4_xpos_ref[0]))) > (param5_xclip)) ? 1 : 0)) {
		local3_vpx_1695 = ((param5_xclip) - (param4_xpos_ref[0]));
		
	};
	if ((((((local3_vpy_1696) + (local5_vptop_1700))) > (param6_ybclip)) ? 1 : 0)) {
		local3_vpy_1696 = ((param6_ybclip) - (local5_vptop_1700));
		
	};
	alias3_wdg_ref_1702[0].attr5_wxpos = param4_xpos_ref[0];
	alias3_wdg_ref_1702[0].attr5_wypos = local5_vptop_1700;
	if (((((((local3_vpx_1695) > (0)) ? 1 : 0)) && ((((local3_vpy_1696) > (0)) ? 1 : 0))) ? 1 : 0)) {
		VIEWPORT(unref(param4_xpos_ref[0]), local5_vptop_1700, local3_vpx_1695, local3_vpy_1696);
		func16_DDgui_drawwidget(param10_ddgui_vals, unref(alias3_wdg_ref_1702[0]), local4_ytop_1701);
		
	};
	if (((((((param9_show_tips) && (alias3_wdg_ref_1702[0].attr6_whover)) ? 1 : 0)) && ((alias3_wdg_ref_1702[0].attr11_tiptext_Str_ref[0]).length)) ? 1 : 0)) {
		var local4_boxx_ref_1714 = [0.0], local4_boxy_ref_1715 = [0.0], local5_frame_1716 = 0, local5_truew_1717 = 0, local12_is_multiline_1718 = 0;
		local5_frame_1716 = 1;
		VIEWPORT(0, 0, 0, 0);
		GETFONTSIZE(local4_boxx_ref_1714, local4_boxy_ref_1715);
		local12_is_multiline_1718 = INSTR(unref(alias3_wdg_ref_1702[0].attr11_tiptext_Str_ref[0]), "\n", 0);
		if ((((local12_is_multiline_1718) != (-(1))) ? 1 : 0)) {
			SPLITSTR(unref(alias3_wdg_ref_1702[0].attr11_tiptext_Str_ref[0]), unref(static9_DDgui_draw_widget_intern_lines_Str), "\n", 1);
			local4_boxy_ref_1715[0] = ((local4_boxy_ref_1715[0]) * (BOUNDS(static9_DDgui_draw_widget_intern_lines_Str, 0)));
			local5_truew_1717 = 0;
			var forEachSaver3997 = static9_DDgui_draw_widget_intern_lines_Str;
			for(var forEachCounter3997 = 0 ; forEachCounter3997 < forEachSaver3997.values.length ; forEachCounter3997++) {
				var local5_l_Str_1719 = forEachSaver3997.values[forEachCounter3997];
			{
					local5_truew_1717 = MAX(local5_truew_1717, func21_DDGui_TextWidthIntern(local5_l_Str_1719));
					
				}
				forEachSaver3997.values[forEachCounter3997] = local5_l_Str_1719;
			
			};
			local4_boxx_ref_1714[0] = local5_truew_1717;
			
		} else {
			local5_truew_1717 = func21_DDGui_TextWidthIntern(alias3_wdg_ref_1702[0].attr11_tiptext_Str_ref);
			local4_boxx_ref_1714[0] = MAX(local3_vpx_1695, local5_truew_1717);
			DIM(static9_DDgui_draw_widget_intern_lines_Str, [1], "");
			static9_DDgui_draw_widget_intern_lines_Str.arrAccess(0).values[tmpPositionCache] = alias3_wdg_ref_1702[0].attr11_tiptext_Str_ref[0];
			
		};
		param1_x;
		param1_y;
		param1_x = MAX(0, ((((param4_xpos_ref[0]) + (((((local3_vpx_1695) - (local4_boxx_ref_1714[0]))) / (2))))) - (local5_frame_1716)));
		param1_y = MAX(0, ((((param4_ypos_ref[0]) - (local4_boxy_ref_1715[0]))) - (((local5_frame_1716) * (2)))));
		param1_y+=-(global25_gDDguiMinControlDimension);
		if ((((param1_y) < (0)) ? 1 : 0)) {
			param1_y = 0;
			
		};
		ALPHAMODE(-(0.8));
		DRAWRECT(param1_x, param1_y, ((local4_boxx_ref_1714[0]) + (((local5_frame_1716) * (2)))), ((local4_boxy_ref_1715[0]) + (((local5_frame_1716) * (2)))), param10_ddgui_vals.attr16_col_hover_bright);
		ALPHAMODE(0);
		func14_DDgui_backrect(param1_x, param1_y, ~~(((local4_boxx_ref_1714[0]) + (((local5_frame_1716) * (2))))), ~~(((local4_boxy_ref_1715[0]) + (((local5_frame_1716) * (2))))), param10_ddgui_vals.attr8_col_norm);
		param1_x+=local5_frame_1716;
		param1_y+=local5_frame_1716;
		if (BOUNDS(static9_DDgui_draw_widget_intern_lines_Str, 0)) {
			var local1_w_ref_1720 = [0], local1_h_ref_1721 = [0];
			GETFONTSIZE(local1_w_ref_1720, local1_h_ref_1721);
			var forEachSaver4154 = static9_DDgui_draw_widget_intern_lines_Str;
			for(var forEachCounter4154 = 0 ; forEachCounter4154 < forEachSaver4154.values.length ; forEachCounter4154++) {
				var local5_l_Str_1722 = forEachSaver4154.values[forEachCounter4154];
			{
					func17_DDGui_PrintIntern(local5_l_Str_1722, ~~(((param1_x) + (((((local4_boxx_ref_1714[0]) - (func21_DDGui_TextWidthIntern(local5_l_Str_1722)))) / (2))))), param1_y, 0);
					param1_y+=local1_h_ref_1721[0];
					
				}
				forEachSaver4154.values[forEachCounter4154] = local5_l_Str_1722;
			
			};
			
		} else {
			func17_DDGui_PrintIntern(alias3_wdg_ref_1702[0].attr11_tiptext_Str_ref, ~~(((param1_x) + (((((local4_boxx_ref_1714[0]) - (local5_truew_1717))) / (2))))), param1_y, 0);
			
		};
		
	};
	param4_xpos_ref[0] = ((((param4_xpos_ref[0]) + (local3_vpx_1695))) + (param7_spacing));
	if ((((param7_dy_line_ref[0]) < (local2_dy_1698)) ? 1 : 0)) {
		param7_dy_line_ref[0] = local2_dy_1698;
		
	};
	return 1;
	return 0;
	
};
window['func18_DDgui_resizedialog'] = function(param1_x, param1_y, param5_width, param6_height) {
	var local1_i_2266 = 0, local6_id_Str_2267 = "", local3_scx_ref_2268 = [0], local3_scy_ref_2269 = [0];
	GETSCREENSIZE(local3_scx_ref_2268, local3_scy_ref_2269);
	if (((((((param5_width) > (0)) ? 1 : 0)) && ((((param6_height) > (0)) ? 1 : 0))) ? 1 : 0)) {
		func9_DDgui_set("", "XPOS", CAST2STRING(param1_x));
		func9_DDgui_set("", "YPOS", CAST2STRING(param1_y));
		if ((((param5_width) > (0)) ? 1 : 0)) {
			func9_DDgui_set("", "WIDTH", CAST2STRING(MIN(unref(local3_scx_ref_2268[0]), param5_width)));
			
		};
		if ((((param6_height) > (0)) ? 1 : 0)) {
			func9_DDgui_set("", "HEIGHT", CAST2STRING(MIN(unref(local3_scy_ref_2269[0]), param6_height)));
			
		};
		
	};
	var forEachSaver14333 = global11_ddgui_stack_ref[0].arrAccess(-(1)).values[tmpPositionCache][0].attr7_widgets_ref[0];
	for(var forEachCounter14333 = 0 ; forEachCounter14333 < forEachSaver14333.values.length ; forEachCounter14333++) {
		var local3_wdg_ref_2270 = forEachSaver14333.values[forEachCounter14333];
	{
			func18_DDgui_handlewidget(unref(global11_ddgui_stack_ref[0].arrAccess(-(1)).values[tmpPositionCache][0]), unref(local3_wdg_ref_2270[0]), -(1), -(1), 0, 0);
			
		}
		forEachSaver14333.values[forEachCounter14333] = local3_wdg_ref_2270;
	
	};
	return 0;
	
};
window['func10_DDgui_hide'] = function(param6_id_Str, param5_bHide) {
	func9_DDgui_set(param6_id_Str, "HIDE", CAST2STRING(param5_bHide));
	if ((((func13_DDgui_get_Str(param6_id_Str, "TYPE")) == ("FRAME")) ? 1 : 0)) {
		var local2_od_2273 = 0, local7_inframe_2274 = 0;
		{
			for (local2_od_2273 = 0;toCheck(local2_od_2273, ((BOUNDS(global11_ddgui_stack_ref[0].arrAccess(-(1)).values[tmpPositionCache][0].attr9_draworder, 0)) - (1)), 1);local2_od_2273 += 1) {
				if (((((((local7_inframe_2274) == (0)) ? 1 : 0)) && ((((global11_ddgui_stack_ref[0].arrAccess(-(1)).values[tmpPositionCache][0].attr9_draworder.arrAccess(local2_od_2273).values[tmpPositionCache].attr6_id_Str_ref[0]) == (param6_id_Str)) ? 1 : 0))) ? 1 : 0)) {
					local7_inframe_2274+=1;
					
				};
				if (local7_inframe_2274) {
					var alias3_wdg_ref_2275 = [new type9_DDGUI_WDG()];
					alias3_wdg_ref_2275 = global11_ddgui_stack_ref[0].arrAccess(-(1)).values[tmpPositionCache][0].attr7_widgets_ref[0].arrAccess(global11_ddgui_stack_ref[0].arrAccess(-(1)).values[tmpPositionCache][0].attr9_draworder.arrAccess(local2_od_2273).values[tmpPositionCache].attr5_index).values[tmpPositionCache] /* ALIAS */;
					if ((((alias3_wdg_ref_2275[0].attr9_wtype_Str) == ("UNFRAME")) ? 1 : 0)) {
						local7_inframe_2274+=-1;
						if ((((local7_inframe_2274) < (2)) ? 1 : 0)) {
							break;
							
						};
						
					};
					if ((((alias3_wdg_ref_2275[0].attr9_wtype_Str) == ("FRAME")) ? 1 : 0)) {
						local7_inframe_2274+=1;
						
					};
					alias3_wdg_ref_2275[0].attr5_whide = param5_bHide;
					if (param5_bHide) {
						alias3_wdg_ref_2275[0].attr8_wclicked = 0;
						
					};
					
				};
				
			};
			
		};
		
	};
	return 0;
	
};
window['__DDgui_Callbacks__'] = function() {
	
};
window['__DDgui_Callbacks__'] = __DDgui_Callbacks__;
window['func15_DDgui_draw_user'] = function(param6_id_Str_ref, param5_width, param6_height, param4_ytop) {
	func13_DDgui_backgnd(RGB(0, 0, 0), RGB(255, 255, 255), 0, 0, param5_width, param6_height);
	PRINT((("user: id=") + (param6_id_Str_ref[0])), 0, 0, 0);
	return 0;
	
};
window['func17_DDgui_handle_user'] = function(param6_id_Str_ref, param2_mx, param2_my, param2_b1, param2_b2) {
	VIEWPORT(0, 0, 0, 0);
	DRAWRECT(0, 0, 1024, 1024, RGB(255, 128, 64));
	PRINT("Must overwrite: ddgui_handle_user", 0, 0, 0);
	PRINT((("for item: ") + (param6_id_Str_ref[0])), 0, 20, 0);
	PRINT((("type=") + (func13_DDgui_get_Str(unref(param6_id_Str_ref[0]), "TYPE"))), 0, 40, 0);
	SHOWSCREEN();
	return 0;
	
};
window['func14_DDgui_backrect'] = function(param1_x, param1_y, param2_dx, param2_dy, param3_col) {
	DRAWRECT(((param1_x) + (1)), param1_y, ((param2_dx) - (2)), 1, param3_col);
	DRAWRECT(param1_x, ((param1_y) + (1)), 1, ((param2_dy) - (2)), param3_col);
	DRAWRECT(((((param1_x) + (param2_dx))) - (1)), ((param1_y) + (1)), 1, ((param2_dy) - (2)), param3_col);
	DRAWRECT(((param1_x) + (1)), ((((param1_y) + (param2_dy))) - (1)), ((param2_dx) - (2)), 1, param3_col);
	return 0;
	
};
window['func13_DDgui_backgnd'] = function(param4_col1, param4_col2, param1_x, param1_y, param2_dx, param2_dy) {
	if ((((static7_DDgui_backgnd_QuickGL) == (-(1))) ? 1 : 0)) {
		if ((((INTEGER(FLOAT2STR(PLATFORMINFO_Str("GLEXT:glDrawRangeElements")))) != (0)) ? 1 : 0)) {
			static7_DDgui_backgnd_QuickGL = 1;
			
		} else {
			static7_DDgui_backgnd_QuickGL = 0;
			
		};
		
	};
	if ((((param4_col1) == (param4_col2)) ? 1 : 0)) {
		DRAWRECT(param1_x, param1_y, param2_dx, param2_dy, param4_col1);
		return 0;
		
	};
	if (static7_DDgui_backgnd_QuickGL) {
		var local4_hpos_1735 = 0.0;
		local4_hpos_1735 = 0.35;
		STARTPOLY(-(1), 2);
		if ((((param2_dx) >= (((param2_dy) * (0.65)))) ? 1 : 0)) {
			POLYVECTOR(((param1_x) + (param2_dx)), param1_y, 0, 0, param4_col1);
			POLYVECTOR(param1_x, param1_y, 0, 0, param4_col1);
			POLYVECTOR(((param1_x) + (param2_dx)), ((param1_y) + (((param2_dy) * (local4_hpos_1735)))), 0, 0, param4_col2);
			POLYVECTOR(param1_x, ((param1_y) + (((param2_dy) * (local4_hpos_1735)))), 0, 0, param4_col2);
			POLYVECTOR(((param1_x) + (param2_dx)), ((param1_y) + (param2_dy)), 0, 0, param4_col2);
			POLYVECTOR(param1_x, ((param1_y) + (param2_dy)), 0, 0, param4_col2);
			
		} else {
			POLYVECTOR(param1_x, param1_y, 0, 0, param4_col1);
			POLYVECTOR(param1_x, ((param1_y) + (param2_dy)), 0, 0, param4_col1);
			POLYVECTOR(((param1_x) + (((param2_dx) * (local4_hpos_1735)))), param1_y, 0, 0, param4_col2);
			POLYVECTOR(((param1_x) + (((param2_dx) * (local4_hpos_1735)))), ((param1_y) + (param2_dy)), 0, 0, param4_col2);
			POLYVECTOR(((param1_x) + (param2_dx)), param1_y, 0, 0, param4_col2);
			POLYVECTOR(((param1_x) + (param2_dx)), ((param1_y) + (param2_dy)), 0, 0, param4_col1);
			
		};
		ENDPOLY();
		
	} else {
		var local4_hpos_1736 = 0.0;
		local4_hpos_1736 = 0.35;
		if ((((param2_dx) >= (((param2_dy) * (0.65)))) ? 1 : 0)) {
			DRAWRECT(param1_x, param1_y, param2_dx, ((param2_dy) * (local4_hpos_1736)), param4_col1);
			DRAWRECT(param1_x, ((param1_y) + (((param2_dy) * (local4_hpos_1736)))), param2_dx, ((((param2_dy) * (((1) - (local4_hpos_1736))))) + (0.99)), param4_col2);
			
		} else {
			DRAWRECT(param1_x, param1_y, ((param2_dx) * (local4_hpos_1736)), param2_dy, param4_col1);
			DRAWRECT(((param1_x) + (((param2_dx) * (local4_hpos_1736)))), param1_y, ((((param2_dx) * (((1) - (local4_hpos_1736))))) + (0.99)), param2_dy, param4_col2);
			
		};
		
	};
	return 0;
	
};
window['__DDgui_Widgets___'] = function() {
	
};
window['__DDgui_Widgets___'] = __DDgui_Widgets___;
window['func12_DDgui_widget'] = function(param6_id_Str, param11_caption_Str, param5_width, param6_height) {
	var local5_count_1741 = 0, local2_fx_ref_1742 = [0], local2_fy_ref_1743 = [0], local3_wdg_1744 = new type9_DDGUI_WDG(), local1_i_1745 = 0;
	var local6_id_Str_ref_1737 = [param6_id_Str]; /* NEWCODEHERE */
	var local11_caption_Str_ref_1738 = [param11_caption_Str]; /* NEWCODEHERE */
	local5_count_1741 = ((1) + (BOUNDS(global11_ddgui_stack_ref[0].arrAccess(-(1)).values[tmpPositionCache][0].attr7_widgets_ref[0], 0)));
	if ((((local6_id_Str_ref_1737[0]) == ("")) ? 1 : 0)) {
		local6_id_Str_ref_1737[0] = (("iwdg%") + (CAST2STRING(local5_count_1741)));
		
	};
	GETFONTSIZE(local2_fx_ref_1742, local2_fy_ref_1743);
	if ((((param5_width) <= (global25_gDDguiMinControlDimension)) ? 1 : 0)) {
		param5_width = MAX(global25_gDDguiMinControlDimension, MAX(param5_width, ((func21_DDGui_TextWidthIntern(local11_caption_Str_ref_1738)) + (local2_fx_ref_1742[0]))));
		
	};
	if ((((param6_height) <= (global25_gDDguiMinControlDimension)) ? 1 : 0)) {
		param6_height = MAX(global25_gDDguiMinControlDimension, MAX(param6_height, ((local2_fy_ref_1743[0]) + (6))));
		
	};
	local1_i_1745 = func11_DDgui_index(unref(global11_ddgui_stack_ref[0].arrAccess(-(1)).values[tmpPositionCache][0]), local6_id_Str_ref_1737, 1);
	global11_ddgui_stack_ref[0].arrAccess(-(1)).values[tmpPositionCache][0].attr7_widgets_ref[0].arrAccess(local1_i_1745).values[tmpPositionCache][0].attr7_wid_Str = local6_id_Str_ref_1737[0];
	global11_ddgui_stack_ref[0].arrAccess(-(1)).values[tmpPositionCache][0].attr7_widgets_ref[0].arrAccess(local1_i_1745).values[tmpPositionCache][0].attr6_wwidth = param5_width;
	global11_ddgui_stack_ref[0].arrAccess(-(1)).values[tmpPositionCache][0].attr7_widgets_ref[0].arrAccess(local1_i_1745).values[tmpPositionCache][0].attr7_wheight = param6_height;
	global11_ddgui_stack_ref[0].arrAccess(-(1)).values[tmpPositionCache][0].attr7_widgets_ref[0].arrAccess(local1_i_1745).values[tmpPositionCache][0].attr9_wtype_Str = "WIDGET";
	global11_ddgui_stack_ref[0].arrAccess(-(1)).values[tmpPositionCache][0].attr7_widgets_ref[0].arrAccess(local1_i_1745).values[tmpPositionCache][0].attr9_wtext_Str_ref[0] = local11_caption_Str_ref_1738[0];
	return 0;
	
};
window['func12_DDgui_signal'] = function(param6_id_Str, param8_verb_Str, param8_info_Str_ref) {
	var local2_id_2288 = 0, alias3_foo_ref_2289 = [DDgui_userfunction];
	var local6_id_Str_ref_2285 = [param6_id_Str]; /* NEWCODEHERE */
	local2_id_2288 = func11_DDgui_index(unref(global11_ddgui_stack_ref[0].arrAccess(-(1)).values[tmpPositionCache][0]), local6_id_Str_ref_2285, 0);
	if ((((local2_id_2288) < (0)) ? 1 : 0)) {
		return tryClone(0);
		
	};
	alias3_foo_ref_2289 = global11_ddgui_stack_ref[0].arrAccess(-(1)).values[tmpPositionCache][0].attr7_widgets_ref[0].arrAccess(local2_id_2288).values[tmpPositionCache][0].attr8_wuserfoo_ref /* ALIAS */;
	if (alias3_foo_ref_2289[0]) {
		alias3_foo_ref_2289[0](local6_id_Str_ref_2285, param8_verb_Str, param8_info_Str_ref);
		
	};
	return 0;
	
};
window['func16_DDgui_drawwidget'] = function(param10_ddgui_vals, param3_wdg, param4_ytop) {
	{
		var local16___SelectHelper4__1750 = "";
		local16___SelectHelper4__1750 = param3_wdg.attr9_wtype_Str;
		if ((((local16___SelectHelper4__1750) == ("FRAME")) ? 1 : 0)) {
			
		} else if ((((local16___SelectHelper4__1750) == ("UNFRAME")) ? 1 : 0)) {
			
		} else if ((((local16___SelectHelper4__1750) == ("SPACER")) ? 1 : 0)) {
			
		} else if ((((local16___SelectHelper4__1750) == ("WIDGET")) ? 1 : 0)) {
			var local1_w_ref_1751 = [0], local1_h_ref_1752 = [0];
			ALPHAMODE(-(0.7));
			GETFONTSIZE(local1_w_ref_1751, local1_h_ref_1752);
			if ((((INSTR(unref(param3_wdg.attr9_wtext_Str_ref[0]), "\ny", 0)) < (0)) ? 1 : 0)) {
				local1_h_ref_1752[0] = func14_DDgui_boxprint(param10_ddgui_vals, param3_wdg, 0, ((param4_ytop) + (CAST2INT(((((param3_wdg.attr7_wheight) - (local1_h_ref_1752[0]))) / (2))))), param3_wdg.attr6_wwidth, 1, 0);
				
			} else {
				local1_h_ref_1752[0] = func14_DDgui_boxprint(param10_ddgui_vals, param3_wdg, 0, param4_ytop, param3_wdg.attr6_wwidth, 1, 0);
				
			};
			param3_wdg.attr7_wheight = MAX(global25_gDDguiMinControlDimension, unref(local1_h_ref_1752[0]));
			ALPHAMODE(0);
			
		} else if ((((local16___SelectHelper4__1750) == ("BUTTON")) ? 1 : 0)) {
			func16_DDgui_drawbutton(param10_ddgui_vals, param3_wdg, param4_ytop);
			
		} else if ((((local16___SelectHelper4__1750) == ("SLIDER")) ? 1 : 0)) {
			func16_DDgui_drawslider(param10_ddgui_vals, param3_wdg, param4_ytop);
			
		} else if ((((local16___SelectHelper4__1750) == ("RADIO")) ? 1 : 0)) {
			func15_DDgui_drawradio(param10_ddgui_vals, param3_wdg, param4_ytop);
			
		} else if ((((local16___SelectHelper4__1750) == ("CHECKBOX")) ? 1 : 0)) {
			func18_DDgui_drawcheckbox(param10_ddgui_vals, param3_wdg, param4_ytop);
			
		} else if ((((local16___SelectHelper4__1750) == ("TAB")) ? 1 : 0)) {
			func13_DDgui_drawtab(param10_ddgui_vals, param3_wdg, param4_ytop);
			
		} else if ((((local16___SelectHelper4__1750) == ("COMBO")) ? 1 : 0)) {
			func15_DDgui_drawcombo(param10_ddgui_vals, param3_wdg, param4_ytop);
			
		} else if ((((local16___SelectHelper4__1750) == ("LIST")) ? 1 : 0)) {
			func14_DDgui_drawlist(param10_ddgui_vals, param3_wdg, param4_ytop);
			
		} else if ((((local16___SelectHelper4__1750) == ("SINGLETEXT")) ? 1 : 0)) {
			func14_DDgui_drawtext(param10_ddgui_vals, param3_wdg, param4_ytop, 1);
			
		} else if ((((local16___SelectHelper4__1750) == ("NUMBERTEXT")) ? 1 : 0)) {
			func14_DDgui_drawtext(param10_ddgui_vals, param3_wdg, param4_ytop, 1);
			
		} else if ((((local16___SelectHelper4__1750) == ("TEXT")) ? 1 : 0)) {
			func14_DDgui_drawtext(param10_ddgui_vals, param3_wdg, param4_ytop, 0);
			
		} else if ((((local16___SelectHelper4__1750) == ("FILE")) ? 1 : 0)) {
			func14_DDgui_drawfile(param10_ddgui_vals, param3_wdg, param4_ytop);
			
		} else {
			if (param3_wdg.attr8_wuserfoo_ref[0]) {
				param3_wdg.attr8_wuserfoo_ref[0](param3_wdg.attr7_wid_Str, "DRAW", static9_DDgui_drawwidget_dummy_Str_ref);
				
			} else {
				func15_DDgui_draw_user(param3_wdg.attr7_wid_Str, param3_wdg.attr6_wwidth, param3_wdg.attr7_wheight, param4_ytop);
				
			};
			
		};
		
	};
	return 0;
	
};
window['func18_DDgui_handlewidget'] = function(param10_ddgui_vals, param3_wdg, param2_mx, param2_my, param2_b1, param2_b2) {
	if (((((((((((((param2_mx) >= (0)) ? 1 : 0)) && ((((param2_my) >= (0)) ? 1 : 0))) ? 1 : 0)) && ((((param2_mx) < (param3_wdg.attr6_wwidth)) ? 1 : 0))) ? 1 : 0)) && ((((param2_my) < (param3_wdg.attr7_wheight)) ? 1 : 0))) ? 1 : 0)) {
		param3_wdg.attr6_whover = 1;
		
	} else {
		param2_b1 = 0;
		param2_b2 = 0;
		param3_wdg.attr6_whover = 0;
		
	};
	{
		var local16___SelectHelper5__1760 = "";
		local16___SelectHelper5__1760 = param3_wdg.attr9_wtype_Str;
		if ((((local16___SelectHelper5__1760) == ("SPACER")) ? 1 : 0)) {
			
		} else if ((((local16___SelectHelper5__1760) == ("FRAME")) ? 1 : 0)) {
			
		} else if ((((local16___SelectHelper5__1760) == ("UNFRAME")) ? 1 : 0)) {
			
		} else if ((((local16___SelectHelper5__1760) == ("WIDGET")) ? 1 : 0)) {
			if ((((param2_b1) != (1)) ? 1 : 0)) {
				param2_b1 = 0;
				
			};
			param3_wdg.attr8_wclicked = param2_b1;
			
		} else if ((((local16___SelectHelper5__1760) == ("BUTTON")) ? 1 : 0)) {
			func18_DDgui_handlebutton(param10_ddgui_vals, param3_wdg, param2_mx, param2_my, param2_b1, param2_b2);
			
		} else if ((((local16___SelectHelper5__1760) == ("SLIDER")) ? 1 : 0)) {
			func18_DDgui_handleslider(param10_ddgui_vals, param3_wdg, param2_mx, param2_my, param2_b1, param2_b2);
			
		} else if ((((local16___SelectHelper5__1760) == ("RADIO")) ? 1 : 0)) {
			func17_DDgui_handleradio(param10_ddgui_vals, param3_wdg, param2_mx, param2_my, param2_b1, param2_b2);
			
		} else if ((((local16___SelectHelper5__1760) == ("CHECKBOX")) ? 1 : 0)) {
			func20_DDgui_handlecheckbox(param10_ddgui_vals, param3_wdg, param2_mx, param2_my, param2_b1, param2_b2);
			
		} else if ((((local16___SelectHelper5__1760) == ("FILE")) ? 1 : 0)) {
			func16_DDgui_handlefile(param10_ddgui_vals, param3_wdg, param2_mx, param2_my, param2_b1, param2_b2);
			
		} else if ((((local16___SelectHelper5__1760) == ("LIST")) ? 1 : 0)) {
			func16_DDgui_handlelist(param10_ddgui_vals, param3_wdg, param2_mx, param2_my, param2_b1, param2_b2);
			
		} else if ((((local16___SelectHelper5__1760) == ("TAB")) ? 1 : 0)) {
			func15_DDgui_handletab(param10_ddgui_vals, param3_wdg, param2_mx, param2_my, param2_b1, param2_b2);
			
		} else if ((((local16___SelectHelper5__1760) == ("COMBO")) ? 1 : 0)) {
			func17_DDgui_handlecombo(param10_ddgui_vals, param3_wdg, param2_mx, param2_my, param2_b1, param2_b2);
			
		} else if ((((local16___SelectHelper5__1760) == ("SINGLETEXT")) ? 1 : 0)) {
			func16_ddgui_handletext(param10_ddgui_vals, param3_wdg, param2_mx, param2_my, param2_b1, param2_b2, 1, 0);
			
		} else if ((((local16___SelectHelper5__1760) == ("NUMBERTEXT")) ? 1 : 0)) {
			func16_ddgui_handletext(param10_ddgui_vals, param3_wdg, param2_mx, param2_my, param2_b1, param2_b2, 1, 1);
			
		} else if ((((local16___SelectHelper5__1760) == ("TEXT")) ? 1 : 0)) {
			func16_ddgui_handletext(param10_ddgui_vals, param3_wdg, param2_mx, param2_my, param2_b1, param2_b2, 0, 0);
			
		} else {
			if (param3_wdg.attr8_wuserfoo_ref[0]) {
				static9_DDgui_handlewidget_dummy_Str_ref[0] = "";
				if ((((param2_b1) != (1)) ? 1 : 0)) {
					param2_b1 = 0;
					
				};
				param3_wdg.attr8_wclicked = param2_b1;
				if (param3_wdg.attr8_wclicked) {
					static9_DDgui_handlewidget_dummy_Str_ref[0] = ((((((((FORMAT_Str(4, 0, param2_mx)) + (","))) + (FORMAT_Str(4, 0, param2_my)))) + (","))) + (FORMAT_Str(2, 0, param2_b1)));
					param3_wdg.attr8_wuserfoo_ref[0](param3_wdg.attr7_wid_Str, "CLICKED", static9_DDgui_handlewidget_dummy_Str_ref);
					
				};
				
			} else {
				func17_DDgui_handle_user(param3_wdg.attr7_wid_Str, param2_mx, param2_my, param2_b1, param2_b2);
				
			};
			
		};
		
	};
	return 0;
	
};
window['func14_DDgui_boxprint'] = function(param10_ddgui_vals, param3_wdg, param1_x, param1_y, param2_wx, param7_do_draw, param8_find_pos) {
	var local7_str_Str_1768 = "", local2_tx_ref_1769 = [0], local2_ty_ref_1770 = [0], local2_cx_1771 = 0, local2_cy_1772 = 0, local5_s_Str_1773 = "", local5_c_Str_1774 = "", local4_cpos_1775 = 0, local4_spos_1776 = 0, local4_slen_1777 = 0, local8_caretpos_1778 = 0, local9_has_caret_1779 = 0, local5_xseek_1780 = 0, local5_yseek_1781 = 0, local6_selcol_1782 = 0;
	local6_selcol_1782 = global11_ddgui_stack_ref[0].arrAccess(-(1)).values[tmpPositionCache][0].attr14_col_hover_norm;
	GETFONTSIZE(local2_tx_ref_1769, local2_ty_ref_1770);
	if (param8_find_pos) {
		param7_do_draw = 0;
		
	};
	local7_str_Str_1768 = param3_wdg.attr9_wtext_Str_ref[0];
	if (param8_find_pos) {
		local5_xseek_1780 = param1_x;
		local5_yseek_1781 = param1_y;
		param1_x = 0;
		param1_y = 0;
		
	} else {
		var local7_strleng_1783 = 0;
		local7_strleng_1783 = (local7_str_Str_1768).length;
		if ((((param3_wdg.attr7_wselend) > (local7_strleng_1783)) ? 1 : 0)) {
			param3_wdg.attr7_wselend = local7_strleng_1783;
			
		};
		if ((((param3_wdg.attr9_wselstart) > (local7_strleng_1783)) ? 1 : 0)) {
			param3_wdg.attr9_wselstart = local7_strleng_1783;
			
		};
		local8_caretpos_1778 = param3_wdg.attr7_wselend;
		if ((((param10_ddgui_vals.attr9_focus_Str) == (param3_wdg.attr7_wid_Str)) ? 1 : 0)) {
			local9_has_caret_1779 = 1;
			
		} else {
			local9_has_caret_1779 = 0;
			param3_wdg.attr9_wselstart = -(1);
			param3_wdg.attr7_wselend = -(1);
			
		};
		
	};
	local2_cx_1771 = param1_x;
	local2_cy_1772 = param1_y;
	local7_str_Str_1768 = ((local7_str_Str_1768) + (" "));
	local4_slen_1777 = (local7_str_Str_1768).length;
	while ((((local4_cpos_1775) < (local4_slen_1777)) ? 1 : 0)) {
		local5_c_Str_1774 = MID_Str(local7_str_Str_1768, local4_cpos_1775, 1);
		local2_tx_ref_1769[0] = KERNLEN(local5_c_Str_1774, global18_ddgui_font_kerning.attr11_bHasKerning);
		if (((((((param8_find_pos) && ((((local2_cy_1772) >= (((local5_yseek_1781) - (local2_ty_ref_1770[0])))) ? 1 : 0))) ? 1 : 0)) && (((((((local2_cx_1771) >= (((local5_xseek_1780) - (((local2_tx_ref_1769[0]) * (1.5)))))) ? 1 : 0)) || ((((local5_c_Str_1774) == ("\n")) ? 1 : 0))) ? 1 : 0))) ? 1 : 0)) {
			return tryClone(local4_cpos_1775);
			
		};
		if (param7_do_draw) {
			if ((((((((((param3_wdg.attr9_wselstart) != (param3_wdg.attr7_wselend)) ? 1 : 0)) && (((((((local4_cpos_1775) >= (param3_wdg.attr9_wselstart)) ? 1 : 0)) && ((((local4_cpos_1775) < (param3_wdg.attr7_wselend)) ? 1 : 0))) ? 1 : 0))) ? 1 : 0)) || (((((((local4_cpos_1775) < (param3_wdg.attr9_wselstart)) ? 1 : 0)) && ((((local4_cpos_1775) >= (param3_wdg.attr7_wselend)) ? 1 : 0))) ? 1 : 0))) ? 1 : 0)) {
				DRAWRECT(local2_cx_1771, local2_cy_1772, unref(local2_tx_ref_1769[0]), unref(local2_ty_ref_1770[0]), local6_selcol_1782);
				
			};
			if ((((local5_c_Str_1774) != ("\n")) ? 1 : 0)) {
				PRINT(local5_c_Str_1774, local2_cx_1771, local2_cy_1772, global18_ddgui_font_kerning.attr11_bHasKerning);
				
			};
			
		};
		if ((((local9_has_caret_1779) && ((((local4_cpos_1775) == (local8_caretpos_1778)) ? 1 : 0))) ? 1 : 0)) {
			if (param7_do_draw) {
				var local5_blink_1784 = 0;
				local5_blink_1784 = (((MOD(GETTIMERALL(), 1024)) > (512)) ? 1 : 0);
				if (local5_blink_1784) {
					ALPHAMODE(-(0.5));
					
				};
				DRAWRECT(((local2_cx_1771) - (1)), local2_cy_1772, 2, unref(local2_ty_ref_1770[0]), global17_gDDguiCaretColour);
				if (local5_blink_1784) {
					ALPHAMODE(0);
					
				};
				param3_wdg.attr7_wcaretx = ((INTEGER(((local2_cx_1771) + (CAST2INT(((local2_tx_ref_1769[0]) / (2))))))) - (param1_x));
				param3_wdg.attr7_wcarety = ((INTEGER(((local2_cy_1772) + (CAST2INT(((local2_ty_ref_1770[0]) / (2))))))) - (param1_y));
				
			};
			
		};
		if ((((local5_c_Str_1774) == ("\n")) ? 1 : 0)) {
			local2_cx_1771 = param1_x;
			local2_cy_1772+=local2_ty_ref_1770[0];
			local4_cpos_1775+=1;
			continue;
			
		};
		local2_cx_1771 = ((local2_cx_1771) + (local2_tx_ref_1769[0]));
		local4_cpos_1775 = ((local4_cpos_1775) + (1));
		if (((((((local5_c_Str_1774) == (" ")) ? 1 : 0)) || ((((local5_c_Str_1774) == ("\t")) ? 1 : 0))) ? 1 : 0)) {
			var local10_next_w_len_1785 = 0, local4_code_1786 = 0, local6_co_Str_1787 = "";
			local10_next_w_len_1785 = 0;
			{
				for (local4_spos_1776 = local4_cpos_1775;toCheck(local4_spos_1776, ((local4_slen_1777) - (1)), 1);local4_spos_1776 += 1) {
					local6_co_Str_1787 = MID_Str(local7_str_Str_1768, local4_spos_1776, 1);
					local4_code_1786 = ASC(local6_co_Str_1787, 0);
					if (((((((local4_code_1786) == (ASC(" ", 0))) ? 1 : 0)) || ((((local4_code_1786) == (ASC("\t", 0))) ? 1 : 0))) ? 1 : 0)) {
						if ((((((((local2_cx_1771) + (local10_next_w_len_1785))) - (param1_x))) > (param2_wx)) ? 1 : 0)) {
							local2_cx_1771 = param1_x;
							local2_cy_1772 = ((local2_cy_1772) + (local2_ty_ref_1770[0]));
							
						};
						break;
						
					};
					local10_next_w_len_1785+=KERNLEN(local6_co_Str_1787, global18_ddgui_font_kerning.attr11_bHasKerning);
					
				};
				
			};
			
		};
		
	};
	if (param8_find_pos) {
		return tryClone(local4_slen_1777);
		
	};
	return tryClone(((((local2_cy_1772) + (local2_ty_ref_1770[0]))) - (param1_y)));
	return 0;
	
};
window['func19_DDgui_drawscrollbar'] = function(param10_ddgui_vals, param3_wdg, param5_width, param6_height, param11_page_height, param4_ytop) {
	var local2_c1_1794 = 0, local2_c2_1795 = 0, local3_c1b_1796 = 0, local3_c2b_1797 = 0, local2_tx_ref_1798 = [0], local2_ty_ref_1799 = [0], local1_x_1800 = 0, local2_up_1801 = 0, local4_down_1802 = 0, local3_pos_1803 = 0, local4_smax_1804 = 0, local3_hsb_1805 = 0;
	GETFONTSIZE(local2_tx_ref_1798, local2_ty_ref_1799);
	local2_tx_ref_1798[0] = MAX(unref(local2_tx_ref_1798[0]), global20_gDDguiScrollbarWidth);
	local1_x_1800 = ((((param5_width) - (local2_tx_ref_1798[0]))) - (1));
	local4_smax_1804 = param3_wdg.attr10_wscrollmax;
	if ((((local4_smax_1804) <= (0)) ? 1 : 0)) {
		return 0;
		
	};
	if ((((param10_ddgui_vals.attr9_focus_Str) == ((("SB") + (param3_wdg.attr7_wid_Str)))) ? 1 : 0)) {
		local2_c1_1794 = param10_ddgui_vals.attr16_col_hover_bright;
		local2_c2_1795 = param10_ddgui_vals.attr14_col_hover_norm;
		
	} else {
		local2_c1_1794 = param10_ddgui_vals.attr10_col_bright;
		local2_c2_1795 = param10_ddgui_vals.attr8_col_norm;
		
	};
	local3_c1b_1796 = param10_ddgui_vals.attr10_col_bright;
	local3_c2b_1797 = param10_ddgui_vals.attr8_col_norm;
	local3_pos_1803 = param3_wdg.attr7_wscroll;
	if ((((local3_pos_1803) < (0)) ? 1 : 0)) {
		local3_pos_1803 = 0;
		
	};
	if ((((local3_pos_1803) > (local4_smax_1804)) ? 1 : 0)) {
		local3_pos_1803 = local4_smax_1804;
		
	};
	local2_up_1801 = (((local3_pos_1803) > (0)) ? 1 : 0);
	local4_down_1802 = (((local3_pos_1803) < (((local4_smax_1804) + (1)))) ? 1 : 0);
	DRAWRECT(local1_x_1800, param4_ytop, unref(local2_tx_ref_1798[0]), param6_height, local2_c1_1794);
	func14_DDgui_backrect(local1_x_1800, param4_ytop, unref(local2_tx_ref_1798[0]), param6_height, local2_c2_1795);
	param4_ytop+=1;
	param6_height+=-(2);
	local1_x_1800+=1;
	local2_tx_ref_1798[0]+=-(2);
	local3_hsb_1805 = MAX(2, CAST2INT(((((param6_height) * (128))) / (CAST2INT(((((((((local4_smax_1804) + (param11_page_height))) - (1))) * (128))) / (param11_page_height)))))));
	if ((((local3_hsb_1805) > (((param6_height) - (20)))) ? 1 : 0)) {
		local3_hsb_1805 = ((param6_height) - (20));
		
	};
	local3_pos_1803 = MAX(0, CAST2INT(((((local3_pos_1803) * (((param6_height) - (local3_hsb_1805))))) / (local4_smax_1804))));
	local1_x_1800+=3;
	local2_tx_ref_1798[0]+=-(6);
	func13_DDgui_backgnd(local3_c1b_1796, local3_c2b_1797, local1_x_1800, ((param4_ytop) + (local3_pos_1803)), unref(local2_tx_ref_1798[0]), local3_hsb_1805);
	func14_DDgui_backrect(((local1_x_1800) - (1)), ((((param4_ytop) + (local3_pos_1803))) - (1)), ((local2_tx_ref_1798[0]) + (2)), ((local3_hsb_1805) + (2)), local2_c2_1795);
	return 0;
	
};
window['func21_DDgui_handlescrollbar'] = function(param10_ddgui_vals, param3_wdg, param2_mx, param2_my, param2_b1, param2_b2, param6_height) {
	var local2_tx_ref_1813 = [0], local2_ty_ref_1814 = [0], local1_x_1815 = 0, local4_smax_1816 = 0, local3_hsb_1817 = 0, local3_pos_1818 = 0, local8_hasfocus_1819 = 0, local5_width_1820 = 0, local3_rmx_ref_1821 = [0], local3_rmy_ref_1822 = [0], local3_rb1_ref_1823 = [0], local3_rb2_ref_1824 = [0];
	GETFONTSIZE(local2_tx_ref_1813, local2_ty_ref_1814);
	local2_tx_ref_1813[0] = MAX(unref(local2_tx_ref_1813[0]), global20_gDDguiScrollbarWidth);
	local5_width_1820 = param3_wdg.attr6_wwidth;
	local1_x_1815 = ((local5_width_1820) - (local2_tx_ref_1813[0]));
	local4_smax_1816 = param3_wdg.attr10_wscrollmax;
	if ((((local4_smax_1816) <= (0)) ? 1 : 0)) {
		param3_wdg.attr10_wscrollmax = 0;
		param3_wdg.attr7_wscroll = 0;
		return 0;
		
	};
	if ((((param3_wdg.attr7_wscroll) > (local4_smax_1816)) ? 1 : 0)) {
		local3_pos_1818 = local4_smax_1816;
		param3_wdg.attr7_wscroll = param3_wdg.attr10_wscrollmax;
		
	};
	MOUSESTATE(local3_rmx_ref_1821, local3_rmy_ref_1822, local3_rb1_ref_1823, local3_rb2_ref_1824);
	if ((((param10_ddgui_vals.attr9_focus_Str) == ((("SB") + (param3_wdg.attr7_wid_Str)))) ? 1 : 0)) {
		local8_hasfocus_1819 = 1;
		
	};
	if (((((((local3_rb1_ref_1823[0]) && (BOXCOLL(local1_x_1815, 0, unref(local2_tx_ref_1813[0]), param6_height, param2_mx, param2_my, 1, 1))) ? 1 : 0)) || (local8_hasfocus_1819)) ? 1 : 0)) {
		var local3_div_1825 = 0;
		local8_hasfocus_1819 = 1;
		param10_ddgui_vals.attr9_focus_Str = (("SB") + (param3_wdg.attr7_wid_Str));
		local3_hsb_1817 = MAX(2, CAST2INT(((CAST2INT(((((param6_height) * (1024))) / (local4_smax_1816)))) / (1024))));
		local3_div_1825 = ((param6_height) - (local3_hsb_1817));
		if ((((local3_div_1825) > (0)) ? 1 : 0)) {
			param3_wdg.attr7_wscroll = MAX(0, MIN(param3_wdg.attr10_wscrollmax, CAST2INT(((CAST2INT(((((((param2_my) * (param3_wdg.attr10_wscrollmax))) * (1024))) / (local3_div_1825)))) / (1024)))));
			
		} else {
			param3_wdg.attr7_wscroll = 0;
			
		};
		
	};
	if ((((local8_hasfocus_1819) && ((((local3_rb1_ref_1823[0]) == (0)) ? 1 : 0))) ? 1 : 0)) {
		param10_ddgui_vals.attr9_focus_Str = "";
		
	};
	return 1;
	return 0;
	
};
window['func12_DDgui_spacer'] = function(param5_width, param6_height) {
	var local6_id_Str_1828 = "";
	local6_id_Str_1828 = (("ID_SPACER_") + (CAST2STRING(BOUNDS(global11_ddgui_stack_ref[0].arrAccess(-(1)).values[tmpPositionCache][0].attr7_widgets_ref[0], 0))));
	func12_DDgui_widget(local6_id_Str_1828, "", param5_width, param6_height);
	func9_DDgui_set(local6_id_Str_1828, "WIDTH", CAST2STRING(param5_width));
	func9_DDgui_set(local6_id_Str_1828, "HEIGHT", CAST2STRING(param6_height));
	func9_DDgui_set(local6_id_Str_1828, "TYPE", "SPACER");
	return 0;
	
};
window['func12_DDgui_button'] = function(param6_id_Str, param11_caption_Str, param5_width, param6_height) {
	var __labels = {"__DrawFrames__": 3476, "skip": 14670};
	
	var local2_sx_ref_2294 = [0], local2_sy_ref_2295 = [0];
	var __pc = 14569;
	while(__pc >= 0) {
		switch(__pc) {
			case 14569:
				func12_DDgui_widget(param6_id_Str, param11_caption_Str, param5_width, param6_height);
				
			case 14669:
				if (!(((((((param5_width) == (0)) ? 1 : 0)) || ((((param6_height) == (0)) ? 1 : 0))) ? 1 : 0))) { __pc = 14577; break; }
				
				case 14621:
					if (!((((INSTR(param11_caption_Str, "SPR_B", 0)) == (0)) ? 1 : 0))) { __pc = 14585; break; }
				
				case 14595:
					GETSPRITESIZE(INTEGER(FLOAT2STR(MID_Str(param11_caption_Str, 5, (param11_caption_Str).length))), local2_sx_ref_2294, local2_sy_ref_2295);
					
				case 14607:
					if (!((((param5_width) == (0)) ? 1 : 0))) { __pc = 14599; break; }
				
				case 14606:
					func9_DDgui_set(param6_id_Str, "WIDTH", CAST2STRING(((local2_sx_ref_2294[0]) + (4))));
					
				
				
			case 14599: //dummy jumper1
				;
					
				case 14619:
					if (!((((param6_height) == (0)) ? 1 : 0))) { __pc = 14611; break; }
				
				case 14618:
					func9_DDgui_set(param6_id_Str, "HEIGHT", CAST2STRING(((local2_sy_ref_2295[0]) + (4))));
					
				
				
			case 14611: //dummy jumper1
				;
					
				case 14620:
					__pc = __labels["skip"]; break;
					
				
				
			case 14585: //dummy jumper1
				;
					
				case 14668:
					if (!((((INSTR(param11_caption_Str, "SPR_C", 0)) == (0)) ? 1 : 0))) { __pc = 14628; break; }
				
				case 14639:
					if (!((((param5_width) == (0)) ? 1 : 0))) { __pc = 14633; break; }
				
				case 14638:
					func9_DDgui_set(param6_id_Str, "WIDTH", CAST2STRING(32));
					
				
				
			case 14633: //dummy jumper1
				;
					
				case 14649:
					if (!((((param6_height) == (0)) ? 1 : 0))) { __pc = 14643; break; }
				
				case 14648:
					func9_DDgui_set(param6_id_Str, "HEIGHT", CAST2STRING(32));
					
				
				
			case 14643: //dummy jumper1
				;
					
				
				__pc = 16889;
				break;
				
			case 14628: //dummy jumper1
				
				case 14653:
					GETFONTSIZE(local2_sx_ref_2294, local2_sy_ref_2295);
					
				case 14667:
					if (!((((param6_height) == (0)) ? 1 : 0))) { __pc = 14657; break; }
				
				case 14666:
					func9_DDgui_set(param6_id_Str, "HEIGHT", CAST2STRING(MAX(global25_gDDguiMinControlDimension, ((local2_sy_ref_2295[0]) + (4)))));
					
				
				
			case 14657: //dummy jumper1
				;
					
				
				
			case 16889: //dummy jumper2
				;
					
				
				
			case 14577: //dummy jumper1
				;
				
			case 14670:
				//label: skip;
				
			func9_DDgui_set(param6_id_Str, "TYPE", "BUTTON");
			return 0;
			__pc = -1; break;
			default:
				throwError("Gotocounter exception pc: "+__pc);
			
		}
	}
};
window['func16_DDgui_drawbutton'] = function(param10_ddgui_vals, param3_wdg, param4_ytop) {
	var local2_c1_1832 = 0, local2_c2_1833 = 0, local5_hover_1834 = 0, local1_x_1835 = 0, local1_y_1836 = 0, local1_w_1837 = 0, local1_h_1838 = 0;
	ALPHAMODE(0);
	local5_hover_1834 = param3_wdg.attr6_whover;
	if (((((((local5_hover_1834) > (0)) ? 1 : 0)) && ((((param3_wdg.attr9_wreadonly) == (0)) ? 1 : 0))) ? 1 : 0)) {
		local2_c1_1832 = param10_ddgui_vals.attr16_col_hover_bright;
		local2_c2_1833 = param10_ddgui_vals.attr14_col_hover_norm;
		
	} else {
		local2_c1_1832 = param10_ddgui_vals.attr10_col_bright;
		local2_c2_1833 = param10_ddgui_vals.attr8_col_norm;
		
	};
	func13_DDgui_backgnd(local2_c1_1832, local2_c2_1833, 1, ((param4_ytop) + (1)), ((param3_wdg.attr6_wwidth) - (2)), ((param3_wdg.attr7_wheight) - (2)));
	local1_x_1835 = 1;
	local1_y_1836 = ((param4_ytop) + (1));
	local1_w_1837 = ((param3_wdg.attr6_wwidth) - (2));
	local1_h_1838 = ((param3_wdg.attr7_wheight) - (2));
	if (param3_wdg.attr7_wselect) {
		local1_x_1835+=1;
		local1_y_1836+=1;
		local1_w_1837+=-(2);
		local1_h_1838+=-(2);
		
	};
	if ((((INSTR(unref(param3_wdg.attr9_wtext_Str_ref[0]), "SPR_B", 0)) == (0)) ? 1 : 0)) {
		if (param3_wdg.attr9_wreadonly) {
			ALPHAMODE(-(0.8));
			
		} else {
			if ((((local5_hover_1834) == (0)) ? 1 : 0)) {
				ALPHAMODE(-(1));
				
			} else {
				ALPHAMODE(-(0.8));
				
			};
			
		};
		local2_c1_1832 = INTEGER(FLOAT2STR(MID_Str(unref(param3_wdg.attr9_wtext_Str_ref[0]), 5, (param3_wdg.attr9_wtext_Str_ref[0]).length)));
		func23_DDgui_fit_sprite_in_box(local2_c1_1832, ((local1_x_1835) + (1)), ((local1_y_1836) + (1)), ((local1_w_1837) - (2)), ((local1_h_1838) - (2)));
		
	} else if ((((INSTR(unref(param3_wdg.attr9_wtext_Str_ref[0]), "SPR_C", 0)) == (0)) ? 1 : 0)) {
		if ((((local5_hover_1834) == (0)) ? 1 : 0)) {
			ALPHAMODE(-(1));
			
		} else {
			ALPHAMODE(-(0.8));
			
		};
		local2_c1_1832 = INTEGER(FLOAT2STR(MID_Str(unref(param3_wdg.attr9_wtext_Str_ref[0]), 5, (param3_wdg.attr9_wtext_Str_ref[0]).length)));
		DRAWRECT(local1_x_1835, local1_y_1836, local1_w_1837, local1_h_1838, local2_c1_1832);
		
	} else {
		var local2_fx_ref_1839 = [0], local2_fy_ref_1840 = [0];
		if (param3_wdg.attr9_wreadonly) {
			ALPHAMODE(-(0.5));
			
		} else {
			ALPHAMODE(0);
			
		};
		GETFONTSIZE(local2_fx_ref_1839, local2_fy_ref_1840);
		func17_DDGui_PrintIntern(param3_wdg.attr9_wtext_Str_ref, CAST2INT(((((param3_wdg.attr6_wwidth) - (func21_DDGui_TextWidthIntern(param3_wdg.attr9_wtext_Str_ref)))) / (2))), ((param4_ytop) + (CAST2INT(((((param3_wdg.attr7_wheight) - (local2_fy_ref_1840[0]))) / (2))))), 0);
		
	};
	ALPHAMODE(0);
	if (param3_wdg.attr7_wselect) {
		func14_DDgui_backrect(0, param4_ytop, param3_wdg.attr6_wwidth, param3_wdg.attr7_wheight, param10_ddgui_vals.attr14_col_hover_norm);
		
	} else {
		func14_DDgui_backrect(0, param4_ytop, param3_wdg.attr6_wwidth, param3_wdg.attr7_wheight, local2_c2_1833);
		
	};
	return 0;
	
};
window['func18_DDgui_handlebutton'] = function(param10_ddgui_vals, param3_wdg, param2_mx, param2_my, param2_b1, param2_b2) {
	if ((((param3_wdg.attr9_wreadonly) && ((((INSTR(unref(param3_wdg.attr9_wtext_Str_ref[0]), "SPR_C", 0)) != (0)) ? 1 : 0))) ? 1 : 0)) {
		return 0;
		
	};
	if ((((param2_b1) != (1)) ? 1 : 0)) {
		param2_b1 = 0;
		
	};
	param3_wdg.attr8_wclicked = param2_b1;
	if (((((((param2_b1) && ((((INSTR(unref(param3_wdg.attr9_wtext_Str_ref[0]), "SPR_C", 0)) == (0)) ? 1 : 0))) ? 1 : 0)) && ((((param3_wdg.attr9_wreadonly) == (0)) ? 1 : 0))) ? 1 : 0)) {
		param10_ddgui_vals.attr15_kick_intern_dlg = 1;
		param10_ddgui_vals.attr18_kick_intern_id_Str = param3_wdg.attr7_wid_Str;
		
	};
	return 0;
	
};
window['func12_DDgui_slider'] = function(param6_id_Str, param5_value, param5_width, param6_height) {
	if ((((param5_width) == (0)) ? 1 : 0)) {
		param5_width = 100;
		
	};
	if ((((param6_height) == (0)) ? 1 : 0)) {
		param6_height = 16;
		
	};
	func12_DDgui_widget(param6_id_Str, CAST2STRING(0), param5_width, param6_height);
	func9_DDgui_set(param6_id_Str, "TYPE", "SLIDER");
	func9_DDgui_set(param6_id_Str, "TEXT", CAST2STRING(param5_value));
	return 0;
	
};
window['func16_DDgui_drawslider'] = function(param10_ddgui_vals, param3_wdg, param4_ytop) {
	var local2_c1_1854 = 0, local2_c2_1855 = 0, local1_x_1856 = 0.0, local1_w_1857 = 0, local1_h_1858 = 0, local5_t_Str_1859 = "", local5_sltop_1860 = 0;
	local1_w_1857 = param3_wdg.attr6_wwidth;
	local1_h_1858 = param3_wdg.attr7_wheight;
	if ((((param3_wdg.attr6_whover) > (0)) ? 1 : 0)) {
		local2_c1_1854 = param10_ddgui_vals.attr16_col_hover_bright;
		local2_c2_1855 = param10_ddgui_vals.attr14_col_hover_norm;
		
	} else {
		local2_c1_1854 = param10_ddgui_vals.attr10_col_bright;
		local2_c2_1855 = param10_ddgui_vals.attr8_col_norm;
		
	};
	DRAWRECT(0, ((param4_ytop) + (CAST2INT(((local1_h_1858) / (2))))), local1_w_1857, 3, local2_c2_1855);
	local1_x_1856 = FLOAT2STR(param3_wdg.attr9_wtext_Str_ref[0]);
	local1_x_1856+=-(param3_wdg.attr7_wminval);
	local1_x_1856 = ((local1_x_1856) / (((param3_wdg.attr7_wmaxval) - (param3_wdg.attr7_wminval))));
	local1_x_1856 = ((((((local1_w_1857) - (12))) * (local1_x_1856))) + (6));
	local2_c1_1854 = param10_ddgui_vals.attr16_col_hover_bright;
	local2_c2_1855 = param10_ddgui_vals.attr14_col_hover_norm;
	local1_h_1858 = MIN(((local1_h_1858) - (2)), 24);
	local5_sltop_1860 = ((((param4_ytop) + (CAST2INT(((((param3_wdg.attr7_wheight) - (local1_h_1858))) / (2)))))) + (1));
	STARTPOLY(-(1), 0);
	POLYVECTOR(local1_x_1856, local5_sltop_1860, 0, 0, local2_c1_1854);
	POLYVECTOR(((local1_x_1856) - (5)), ((local5_sltop_1860) + (2)), 0, 0, local2_c2_1855);
	POLYVECTOR(((local1_x_1856) - (5)), ((((local5_sltop_1860) + (local1_h_1858))) - (2)), 0, 0, local2_c2_1855);
	POLYVECTOR(local1_x_1856, ((local5_sltop_1860) + (local1_h_1858)), 0, 0, local2_c1_1854);
	POLYVECTOR(((local1_x_1856) + (5)), ((((local5_sltop_1860) + (local1_h_1858))) - (2)), 0, 0, local2_c2_1855);
	POLYVECTOR(((local1_x_1856) + (5)), ((local5_sltop_1860) + (2)), 0, 0, local2_c2_1855);
	ENDPOLY();
	if ((((param3_wdg.attr6_whover) == (0)) ? 1 : 0)) {
		local2_c2_1855 = param10_ddgui_vals.attr8_col_norm;
		
	};
	func14_DDgui_backrect(0, param4_ytop, param3_wdg.attr6_wwidth, param3_wdg.attr7_wheight, local2_c2_1855);
	return 0;
	
};
window['func18_DDgui_handleslider'] = function(param10_ddgui_vals, param3_wdg, param2_mx, param2_my, param2_b1, param2_b2) {
	if (param3_wdg.attr9_wreadonly) {
		return 0;
		
	};
	if ((((param2_b1) == (-(1))) ? 1 : 0)) {
		if (((((((((((((param2_mx) >= (0)) ? 1 : 0)) && ((((param2_my) >= (0)) ? 1 : 0))) ? 1 : 0)) && ((((param2_mx) <= (param3_wdg.attr6_wwidth)) ? 1 : 0))) ? 1 : 0)) && ((((param2_my) <= (param3_wdg.attr7_wheight)) ? 1 : 0))) ? 1 : 0)) {
			param10_ddgui_vals.attr9_focus_Str = param3_wdg.attr7_wid_Str;
			
		};
		
	};
	param3_wdg.attr8_wclicked = 0;
	if ((((param10_ddgui_vals.attr9_focus_Str) == (param3_wdg.attr7_wid_Str)) ? 1 : 0)) {
		if (MOUSEAXIS(3)) {
			var local7_old_Str_1867 = "", local3_pos_1868 = 0.0;
			local7_old_Str_1867 = param3_wdg.attr9_wtext_Str_ref[0];
			local3_pos_1868 = MIN(1, MAX(0, ((((param2_mx) - (5))) / (((param3_wdg.attr6_wwidth) - (9))))));
			local3_pos_1868 = ((param3_wdg.attr7_wminval) + (((local3_pos_1868) * (((param3_wdg.attr7_wmaxval) - (param3_wdg.attr7_wminval))))));
			if ((((param3_wdg.attr5_wstep) > (0)) ? 1 : 0)) {
				var local6_iSteps_1869 = 0;
				local6_iSteps_1869 = ~~(((((local3_pos_1868) / (param3_wdg.attr5_wstep))) + (0.4)));
				local3_pos_1868 = ((param3_wdg.attr5_wstep) * (local6_iSteps_1869));
				param3_wdg.attr9_wtext_Str_ref[0] = CAST2STRING(local3_pos_1868);
				
			} else {
				param3_wdg.attr9_wtext_Str_ref[0] = FORMAT_Str(0, 2, local3_pos_1868);
				
			};
			if ((((local7_old_Str_1867) != (param3_wdg.attr9_wtext_Str_ref[0])) ? 1 : 0)) {
				param3_wdg.attr8_wclicked = 1;
				
			};
			
		} else {
			param10_ddgui_vals.attr9_focus_Str = "";
			
		};
		
	};
	return 0;
	
};
window['func18_DDgui_drawcheckbox'] = function(param10_ddgui_vals, param3_wdg, param4_ytop) {
	var local2_c1_1873 = 0, local2_c2_1874 = 0, local5_hover_1875 = 0, local5_check_1876 = 0, local1_r_1877 = 0, local2_tx_ref_1878 = [0], local2_ty_ref_1879 = [0], local7_txt_Str_ref_1880 = [""];
	local7_txt_Str_ref_1880[0] = param3_wdg.attr9_wtext_Str_ref[0];
	GETFONTSIZE(local2_tx_ref_1878, local2_ty_ref_1879);
	if (param3_wdg.attr7_wselect) {
		local5_check_1876 = 1;
		
	};
	if ((((param3_wdg.attr6_whover) && ((((param3_wdg.attr9_wreadonly) == (0)) ? 1 : 0))) ? 1 : 0)) {
		local5_hover_1875 = 1;
		
	};
	if (local5_hover_1875) {
		local2_c1_1873 = param10_ddgui_vals.attr16_col_hover_bright;
		local2_c2_1874 = param10_ddgui_vals.attr14_col_hover_norm;
		if ((((local5_hover_1875) == (0)) ? 1 : 0)) {
			local1_r_1877 = local2_c1_1873;
			local2_c1_1873 = local2_c2_1874;
			local2_c2_1874 = local1_r_1877;
			
		};
		func14_DDgui_backrect(1, ((param4_ytop) + (1)), ((param3_wdg.attr6_wwidth) - (1)), ((local2_ty_ref_1879[0]) - (1)), local2_c1_1873);
		
	} else {
		local2_c1_1873 = param10_ddgui_vals.attr10_col_bright;
		local2_c2_1874 = param10_ddgui_vals.attr8_col_norm;
		
	};
	func17_DDGui_PrintIntern(local7_txt_Str_ref_1880, ~~(((((local2_tx_ref_1878[0]) * (1.7))) + (1))), ((param4_ytop) + (1)), local5_check_1876);
	if (local5_check_1876) {
		local2_c1_1873 = param10_ddgui_vals.attr16_col_hover_bright;
		local2_c2_1874 = param10_ddgui_vals.attr14_col_hover_norm;
		
	} else {
		local2_c1_1873 = param10_ddgui_vals.attr10_col_bright;
		local2_c2_1874 = param10_ddgui_vals.attr8_col_norm;
		
	};
	func13_DDgui_backgnd(local2_c1_1873, local2_c2_1874, 3, ((param4_ytop) + (3)), ((local2_ty_ref_1879[0]) - (4)), ((local2_ty_ref_1879[0]) - (4)));
	func14_DDgui_backrect(2, ((param4_ytop) + (2)), ((local2_ty_ref_1879[0]) - (2)), ((local2_ty_ref_1879[0]) - (2)), local2_c2_1874);
	return 0;
	
};
window['func20_DDgui_handlecheckbox'] = function(param10_ddgui_vals, param3_wdg, param2_mx, param2_my, param2_b1, param2_b2) {
	if (param3_wdg.attr9_wreadonly) {
		return 0;
		
	};
	param3_wdg.attr8_wclicked = 0;
	if ((((param2_b1) == (1)) ? 1 : 0)) {
		param3_wdg.attr7_wselect = ((1) - (param3_wdg.attr7_wselect));
		param3_wdg.attr8_wclicked = 1;
		
	};
	return 0;
	
};
window['func11_DDgui_radio'] = function(param6_id_Str, param9_texts_Str, param5_width) {
	var local2_tx_ref_1890 = [0], local2_ty_ref_1891 = [0], local3_num_1892 = 0, local1_i_1893 = 0;
	GETFONTSIZE(local2_tx_ref_1890, local2_ty_ref_1891);
	local3_num_1892 = SPLITSTR(param9_texts_Str, unref(static7_DDgui_radio_opt_Str), "|", 1);
	if ((((local3_num_1892) == (0)) ? 1 : 0)) {
		func9_DDgui_set(param6_id_Str, "SELECT", CAST2STRING(-(1)));
		
	};
	if ((((param5_width) == (0)) ? 1 : 0)) {
		{
			for (local1_i_1893 = 0;toCheck(local1_i_1893, ((local3_num_1892) - (1)), 1);local1_i_1893 += 1) {
				local2_ty_ref_1891[0] = (static7_DDgui_radio_opt_Str.arrAccess(local1_i_1893).values[tmpPositionCache]).length;
				if ((((local2_ty_ref_1891[0]) > (param5_width)) ? 1 : 0)) {
					param5_width = local2_ty_ref_1891[0];
					
				};
				
			};
			
		};
		param5_width = ((((param5_width) + (2))) * (local2_tx_ref_1890[0]));
		
	};
	func12_DDgui_widget(param6_id_Str, param9_texts_Str, param5_width, 0);
	func9_DDgui_set(param6_id_Str, "TYPE", "RADIO");
	return 0;
	
};
window['func15_DDgui_drawradio'] = function(param10_ddgui_vals, param3_wdg, param4_ytop) {
	var local1_i_1898 = 0, local2_tx_ref_1899 = [0], local2_ty_ref_1900 = [0], local1_h_1901 = 0, local5_hover_1902 = 0, local5_check_1903 = 0, local6_bright_1904 = 0, local4_dark_1905 = 0, local8_bright_h_1906 = 0, local6_dark_h_1907 = 0, local3_num_1908 = 0, local7_opt_Str_ref_1909 = [""];
	local6_bright_1904 = param10_ddgui_vals.attr10_col_bright;
	local4_dark_1905 = param10_ddgui_vals.attr8_col_norm;
	local8_bright_h_1906 = param10_ddgui_vals.attr16_col_hover_bright;
	local6_dark_h_1907 = param10_ddgui_vals.attr14_col_hover_norm;
	GETFONTSIZE(local2_tx_ref_1899, local2_ty_ref_1900);
	local2_tx_ref_1899[0] = MAX(12, unref(local2_tx_ref_1899[0]));
	local2_ty_ref_1900[0] = MAX(12, unref(local2_ty_ref_1900[0]));
	local3_num_1908 = param3_wdg.attr6_wcount;
	local1_h_1901 = MAX(unref(local2_ty_ref_1900[0]), global25_gDDguiMinControlDimension);
	param4_ytop+=CAST2INT(((((local1_h_1901) - (local2_ty_ref_1900[0]))) / (2)));
	DRAWRECT(((CAST2INT(((local2_ty_ref_1900[0]) / (2)))) - (1)), ((param4_ytop) + (1)), 3, ((((((local3_num_1908) * (local1_h_1901))) - (4))) - (((local1_h_1901) - (local2_ty_ref_1900[0])))), local4_dark_1905);
	{
		for (local1_i_1898 = 0;toCheck(local1_i_1898, 9999, 1);local1_i_1898 += 1) {
			var local5_yitem_1910 = 0;
			param3_wdg.attr6_wcount = local1_i_1898;
			local7_opt_Str_ref_1909[0] = func31_DDgui_intern_list_item_text_Str(param3_wdg.attr9_wtext_Str_ref, local1_i_1898);
			if (((((local7_opt_Str_ref_1909[0]).length) == (0)) ? 1 : 0)) {
				break;
				
			};
			local5_yitem_1910 = ((param4_ytop) + (((local1_i_1898) * (local1_h_1901))));
			local5_hover_1902 = 0;
			local5_check_1903 = 0;
			if ((((param3_wdg.attr7_wselect) == (local1_i_1898)) ? 1 : 0)) {
				local5_check_1903 = 1;
				
			};
			if (((((((param3_wdg.attr6_whover) == (local1_i_1898)) ? 1 : 0)) && ((((param3_wdg.attr9_wreadonly) == (0)) ? 1 : 0))) ? 1 : 0)) {
				local5_hover_1902 = 1;
				
			};
			if (local5_check_1903) {
				func13_DDgui_backgnd(local8_bright_h_1906, local6_dark_h_1907, 3, ((local5_yitem_1910) + (2)), ((local2_ty_ref_1900[0]) - (6)), ((local2_ty_ref_1900[0]) - (6)));
				func14_DDgui_backrect(2, ((local5_yitem_1910) + (1)), ((local2_ty_ref_1900[0]) - (4)), ((local2_ty_ref_1900[0]) - (4)), local6_dark_h_1907);
				
			};
			if (local5_hover_1902) {
				if (local5_hover_1902) {
					func14_DDgui_backrect(0, ((local5_yitem_1910) - (CAST2INT(((((local1_h_1901) - (local2_ty_ref_1900[0]))) / (2))))), ((param3_wdg.attr6_wwidth) - (1)), ((local1_h_1901) - (1)), local8_bright_h_1906);
					
				};
				
			};
			func17_DDGui_PrintIntern(local7_opt_Str_ref_1909, ~~(((local2_tx_ref_1899[0]) * (1.7))), local5_yitem_1910, local5_check_1903);
			
		};
		
	};
	return 0;
	
};
window['func17_DDgui_handleradio'] = function(param10_ddgui_vals, param3_wdg, param2_mx, param2_my, param2_b1, param2_b2) {
	var local2_tx_ref_1917 = [0], local2_ty_ref_1918 = [0], local1_h_1919 = 0, local5_hover_1920 = 0, local6_oldsel_1921 = 0, local3_num_1922 = 0;
	if (param3_wdg.attr9_wreadonly) {
		return 0;
		
	};
	GETFONTSIZE(local2_tx_ref_1917, local2_ty_ref_1918);
	local3_num_1922 = SPLITSTR(unref(param3_wdg.attr9_wtext_Str_ref[0]), unref(static7_DDgui_handleradio_txt_Str), "|", 1);
	local1_h_1919 = MAX(unref(local2_ty_ref_1918[0]), global25_gDDguiMinControlDimension);
	param3_wdg.attr7_wheight = ((local1_h_1919) * (local3_num_1922));
	param3_wdg.attr8_wclicked = 0;
	param3_wdg.attr6_whover = -(1);
	if (((((((((((((param2_my) > (0)) ? 1 : 0)) && ((((param2_my) <= (param3_wdg.attr7_wheight)) ? 1 : 0))) ? 1 : 0)) && ((((param2_mx) > (0)) ? 1 : 0))) ? 1 : 0)) && ((((param2_mx) < (param3_wdg.attr6_wwidth)) ? 1 : 0))) ? 1 : 0)) {
		param2_my = INTEGER(CAST2INT(((param2_my) / (local1_h_1919))));
		if ((((param2_b1) == (1)) ? 1 : 0)) {
			local6_oldsel_1921 = param3_wdg.attr7_wselect;
			if ((((param2_my) != (local6_oldsel_1921)) ? 1 : 0)) {
				param2_my = MIN(param2_my, ((local3_num_1922) - (1)));
				param3_wdg.attr7_wselect = param2_my;
				param3_wdg.attr8_wclicked = 1;
				
			};
			
		};
		param3_wdg.attr6_whover = param2_my;
		
	};
	return 0;
	
};
window['func14_DDgui_drawfile'] = function(param10_ddgui_vals, param3_wdg, param4_ytop) {
	var local2_c1_1927 = 0, local2_c2_1928 = 0, local2_tx_ref_1929 = [0], local2_ty_ref_1930 = [0], local7_txt_Str_ref_1931 = [""], local7_dheight_1932 = 0;
	GETFONTSIZE(local2_tx_ref_1929, local2_ty_ref_1930);
	if (((((((param3_wdg.attr6_whover) > (0)) ? 1 : 0)) && ((((param3_wdg.attr9_wreadonly) == (0)) ? 1 : 0))) ? 1 : 0)) {
		local2_c1_1927 = param10_ddgui_vals.attr16_col_hover_bright;
		local2_c2_1928 = param10_ddgui_vals.attr14_col_hover_norm;
		
	} else {
		local2_c1_1927 = param10_ddgui_vals.attr10_col_bright;
		local2_c2_1928 = param10_ddgui_vals.attr8_col_norm;
		
	};
	func13_DDgui_backgnd(local2_c1_1927, local2_c2_1928, 0, param4_ytop, param3_wdg.attr6_wwidth, param3_wdg.attr7_wheight);
	local7_dheight_1932 = ~~(((local2_ty_ref_1930[0]) * (1.2)));
	DRAWRECT(1, ((param4_ytop) + (1)), local7_dheight_1932, local7_dheight_1932, RGB(71, 107, 254));
	DRAWRECT(((1) + (((local7_dheight_1932) * (0.2)))), ((param4_ytop) + (1)), ((((local7_dheight_1932) * (0.8))) - (2)), ((((local7_dheight_1932) * (0.6))) - (1)), 16777215);
	DRAWRECT(((1) + (((local7_dheight_1932) * (0.2)))), ((((param4_ytop) + (1))) + (((local7_dheight_1932) * (0.7)))), ((((local7_dheight_1932) * (0.8))) - (2)), ((((local7_dheight_1932) * (0.3))) + (1)), RGB(204, 204, 204));
	local7_txt_Str_ref_1931[0] = param3_wdg.attr9_wtext_Str_ref[0];
	local2_ty_ref_1930[0] = 0;
	{
		for (local2_tx_ref_1929[0] = (((local7_txt_Str_ref_1931[0]).length) - (1));toCheck(local2_tx_ref_1929[0], 0, -(1));local2_tx_ref_1929[0] += -(1)) {
			if ((((MID_Str(unref(local7_txt_Str_ref_1931[0]), unref(local2_tx_ref_1929[0]), 1)) == ("/")) ? 1 : 0)) {
				local2_ty_ref_1930[0] = ((local2_tx_ref_1929[0]) + (1));
				break;
				
			};
			
		};
		
	};
	local7_txt_Str_ref_1931[0] = MID_Str(unref(local7_txt_Str_ref_1931[0]), unref(local2_ty_ref_1930[0]), (local7_txt_Str_ref_1931[0]).length);
	func17_DDGui_PrintIntern(local7_txt_Str_ref_1931, ((local7_dheight_1932) + (3)), ((param4_ytop) + (3)), 0);
	func14_DDgui_backrect(0, param4_ytop, param3_wdg.attr6_wwidth, param3_wdg.attr7_wheight, local2_c2_1928);
	return 0;
	
};
window['func16_DDgui_handlefile'] = function(param10_ddgui_vals, param3_wdg, param2_mx, param2_my, param2_b1, param2_b2) {
	var local5_a_Str_1939 = "";
	if (param3_wdg.attr9_wreadonly) {
		return 0;
		
	};
	if (((((param3_wdg.attr11_wfilter_Str).length) == (0)) ? 1 : 0)) {
		param3_wdg.attr11_wfilter_Str = "*.*";
		
	};
	func9_DDgui_set(param3_wdg.attr7_wid_Str, "CLICKED", CAST2STRING(0));
	if ((((param2_b1) == (1)) ? 1 : 0)) {
		if (param3_wdg.attr9_wreadonly) {
			return 0;
			
		};
		param10_ddgui_vals.attr15_kick_intern_dlg = 4;
		param10_ddgui_vals.attr18_kick_intern_id_Str = param3_wdg.attr7_wid_Str;
		
	};
	return 0;
	
};
window['func23_DDgui_fit_sprite_in_box'] = function(param2_id, param1_x, param1_y, param1_w, param1_h) {
	var local3_spx_ref_1945 = [0], local3_spy_ref_1946 = [0];
	if (((((((param1_w) < (1)) ? 1 : 0)) || ((((param1_h) < (1)) ? 1 : 0))) ? 1 : 0)) {
		return 0;
		
	};
	GETSPRITESIZE(param2_id, local3_spx_ref_1945, local3_spy_ref_1946);
	if (((((((local3_spx_ref_1945[0]) == (0)) ? 1 : 0)) || ((((local3_spy_ref_1946[0]) == (0)) ? 1 : 0))) ? 1 : 0)) {
		return 0;
		
	};
	if (((((((local3_spx_ref_1945[0]) <= (param1_w)) ? 1 : 0)) && ((((local3_spy_ref_1946[0]) <= (param1_h)) ? 1 : 0))) ? 1 : 0)) {
		DRAWSPRITE(param2_id, ((param1_x) + (CAST2INT(((((param1_w) - (local3_spx_ref_1945[0]))) / (2))))), ((param1_y) + (CAST2INT(((((param1_h) - (local3_spy_ref_1946[0]))) / (2))))));
		
	} else {
		var local4_facx_1947 = 0.0, local4_facy_1948 = 0.0, local2_dw_1949 = 0.0, local2_dh_1950 = 0.0;
		local4_facx_1947 = param1_w;
		local4_facx_1947 = ((local4_facx_1947) / (local3_spx_ref_1945[0]));
		local4_facy_1948 = param1_h;
		local4_facy_1948 = ((local4_facy_1948) / (local3_spy_ref_1946[0]));
		if ((((local4_facx_1947) < (local4_facy_1948)) ? 1 : 0)) {
			local2_dw_1949 = ((local3_spx_ref_1945[0]) * (local4_facx_1947));
			local2_dh_1950 = ((local3_spy_ref_1946[0]) * (local4_facx_1947));
			
		} else {
			local2_dw_1949 = ((local3_spx_ref_1945[0]) * (local4_facy_1948));
			local2_dh_1950 = ((local3_spy_ref_1946[0]) * (local4_facy_1948));
			
		};
		STRETCHSPRITE(param2_id, ((param1_x) + (((((param1_w) - (local2_dw_1949))) / (2)))), ((param1_y) + (((((param1_h) - (local2_dh_1950))) / (2)))), local2_dw_1949, local2_dh_1950);
		
	};
	return 0;
	
};
window['func11_DDgui_combo'] = function(param6_id_Str, param9_texts_Str, param5_width, param6_height) {
	var local2_tx_ref_1955 = [0], local2_ty_ref_1956 = [0];
	GETFONTSIZE(local2_tx_ref_1955, local2_ty_ref_1956);
	if ((((param6_height) == (0)) ? 1 : 0)) {
		param6_height = local2_ty_ref_1956[0];
		
	};
	func10_DDgui_list(param6_id_Str, param9_texts_Str, param5_width, param6_height);
	func9_DDgui_set(param6_id_Str, "TYPE", "COMBO");
	return 0;
	
};
window['func15_DDgui_drawcombo'] = function(param10_ddgui_vals, param3_wdg, param4_ytop) {
	var local2_fx_ref_1960 = [0], local2_fy_ref_1961 = [0], local2_c1_1962 = 0, local2_c2_1963 = 0, local5_hover_1964 = 0, local1_x_1965 = 0, local1_y_1966 = 0, local1_w_1967 = 0, local1_h_1968 = 0;
	GETFONTSIZE(local2_fx_ref_1960, local2_fy_ref_1961);
	local5_hover_1964 = param3_wdg.attr6_whover;
	if (((((((local5_hover_1964) > (0)) ? 1 : 0)) && ((((param3_wdg.attr9_wreadonly) == (0)) ? 1 : 0))) ? 1 : 0)) {
		local2_c1_1962 = param10_ddgui_vals.attr16_col_hover_bright;
		local2_c2_1963 = param10_ddgui_vals.attr14_col_hover_norm;
		
	} else {
		local2_c1_1962 = param10_ddgui_vals.attr10_col_bright;
		local2_c2_1963 = param10_ddgui_vals.attr8_col_norm;
		
	};
	func13_DDgui_backgnd(local2_c1_1962, local2_c2_1963, 1, ((param4_ytop) + (1)), ((param3_wdg.attr6_wwidth) - (2)), ((param3_wdg.attr7_wheight) - (2)));
	func13_DDgui_backgnd(param10_ddgui_vals.attr16_col_hover_bright, param10_ddgui_vals.attr14_col_hover_norm, ((param3_wdg.attr6_wwidth) - (((local2_fx_ref_1960[0]) * (2)))), ((param4_ytop) + (1)), ((local2_fx_ref_1960[0]) * (2)), ((param3_wdg.attr7_wheight) - (2)));
	STARTPOLY(-(1), 0);
	POLYVECTOR(((param3_wdg.attr6_wwidth) - (((local2_fx_ref_1960[0]) * (1.7)))), ((param4_ytop) + (((param3_wdg.attr7_wheight) * (0.2)))), 0, 0, local2_c1_1962);
	POLYVECTOR(((param3_wdg.attr6_wwidth) - (((local2_fx_ref_1960[0]) * (1)))), ((param4_ytop) + (((param3_wdg.attr7_wheight) * (0.8)))), 0, 0, local2_c1_1962);
	POLYVECTOR(((param3_wdg.attr6_wwidth) - (((local2_fx_ref_1960[0]) * (0.3)))), ((param4_ytop) + (((param3_wdg.attr7_wheight) * (0.2)))), 0, 0, local2_c1_1962);
	ENDPOLY();
	local1_x_1965 = 1;
	local1_y_1966 = ((param4_ytop) + (1));
	local1_w_1967 = ((((param3_wdg.attr6_wwidth) - (2))) - (((2) * (local2_fx_ref_1960[0]))));
	local1_h_1968 = ((param3_wdg.attr7_wheight) - (2));
	if (param3_wdg.attr7_wselect) {
		local1_x_1965+=1;
		local1_y_1966+=1;
		local1_w_1967+=-(2);
		local1_h_1968+=-(2);
		
	};
	if ((((param3_wdg.attr7_wselect) >= (0)) ? 1 : 0)) {
		var local5_a_Str_ref_1969 = [""];
		local5_a_Str_ref_1969[0] = func31_DDgui_intern_list_item_text_Str(param3_wdg.attr9_wtext_Str_ref, param3_wdg.attr7_wselect);
		if ((((INSTR(unref(local5_a_Str_ref_1969[0]), "SPR_B", 0)) == (0)) ? 1 : 0)) {
			if ((((local5_hover_1964) == (0)) ? 1 : 0)) {
				ALPHAMODE(-(1));
				
			} else {
				ALPHAMODE(-(0.8));
				
			};
			local2_c1_1962 = INTEGER(FLOAT2STR(MID_Str(unref(local5_a_Str_ref_1969[0]), 5, -(1))));
			func23_DDgui_fit_sprite_in_box(local2_c1_1962, ((local1_x_1965) + (1)), ((local1_y_1966) + (1)), ((local1_w_1967) - (2)), ((local1_h_1968) - (2)));
			
		} else if ((((INSTR(unref(local5_a_Str_ref_1969[0]), "SPR_C", 0)) == (0)) ? 1 : 0)) {
			if ((((local5_hover_1964) == (0)) ? 1 : 0)) {
				ALPHAMODE(-(1));
				
			} else {
				ALPHAMODE(-(0.8));
				
			};
			local2_c1_1962 = INTEGER(FLOAT2STR(MID_Str(unref(local5_a_Str_ref_1969[0]), 5, -(1))));
			DRAWRECT(local1_x_1965, local1_y_1966, local1_w_1967, local1_h_1968, local2_c1_1962);
			
		} else {
			if ((((local5_hover_1964) == (0)) ? 1 : 0)) {
				ALPHAMODE(-(0.8));
				
			};
			func17_DDGui_PrintIntern(local5_a_Str_ref_1969, CAST2INT(((((local1_w_1967) - (func21_DDGui_TextWidthIntern(local5_a_Str_ref_1969)))) / (2))), ((param4_ytop) + (CAST2INT(((((param3_wdg.attr7_wheight) - (local2_fy_ref_1961[0]))) / (2))))), 0);
			
		};
		
	};
	ALPHAMODE(0);
	func14_DDgui_backrect(0, param4_ytop, param3_wdg.attr6_wwidth, param3_wdg.attr7_wheight, local2_c2_1963);
	return 0;
	
};
window['func17_DDgui_handlecombo'] = function(param10_ddgui_vals, param3_wdg, param2_mx, param2_my, param2_b1, param2_b2) {
	param3_wdg.attr8_wclicked = 0;
	if ((((param2_b1) == (1)) ? 1 : 0)) {
		param10_ddgui_vals.attr15_kick_intern_dlg = 3;
		param10_ddgui_vals.attr18_kick_intern_id_Str = param3_wdg.attr7_wid_Str;
		
	};
	return 0;
	
};
window['func24_DDgui_button_list_picker'] = function(param1_x, param1_y, param1_w, param1_h, param9_texts_Str, param6_cursel) {
	var local2_tx_ref_1982 = [0], local2_ty_ref_1983 = [0], local8_numitems_1984 = 0, local8_vals_Str_1985 = new GLBArray(), local7_screenx_ref_1986 = [0], local7_screeny_ref_1987 = [0], local2_mx_ref_1988 = [0], local2_my_ref_1989 = [0], local2_b1_ref_1990 = [0], local2_b2_ref_1991 = [0], local4_down_1992 = 0, local2_px_1993 = 0, local2_py_1994 = 0;
	GETFONTSIZE(local2_tx_ref_1982, local2_ty_ref_1983);
	local2_tx_ref_1982[0] = MAX(unref(local2_tx_ref_1982[0]), global20_gDDguiScrollbarWidth);
	local2_ty_ref_1983[0] = MAX(unref(local2_ty_ref_1983[0]), global25_gDDguiMinControlDimension);
	SPLITSTR(param9_texts_Str, unref(local8_vals_Str_1985), "|", 1);
	local8_numitems_1984 = BOUNDS(local8_vals_Str_1985, 0);
	if ((((local8_numitems_1984) == (0)) ? 1 : 0)) {
		return tryClone(-(1));
		
	};
	GETSCREENSIZE(local7_screenx_ref_1986, local7_screeny_ref_1987);
	if ((((param1_h) > (((((local2_ty_ref_1983[0]) * (local8_numitems_1984))) + (8)))) ? 1 : 0)) {
		param1_h = ((((local2_ty_ref_1983[0]) * (local8_numitems_1984))) + (8));
		
	};
	if ((((((param1_y) + (param1_h))) >= (local7_screeny_ref_1987[0])) ? 1 : 0)) {
		param1_h = ((((local7_screeny_ref_1987[0]) - (param1_y))) - (1));
		
	};
	func16_DDgui_pushdialog(((param1_x) - (1)), ((param1_y) - (1)), ((param1_w) + (2)), ((param1_h) + (2)), 0);
	func10_DDgui_list("lst", param9_texts_Str, ((param1_w) - (4)), param1_h);
	func9_DDgui_set("lst", "SELECT", CAST2STRING(param6_cursel));
	func9_DDgui_set("lst", "SCROLL", CAST2STRING(param6_cursel));
	while (1) {
		func10_DDgui_show(0);
		MOUSESTATE(local2_mx_ref_1988, local2_my_ref_1989, local2_b1_ref_1990, local2_b2_ref_1991);
		if (local2_b1_ref_1990[0]) {
			local4_down_1992 = 1;
			local2_px_1993 = local2_mx_ref_1988[0];
			local2_py_1994 = local2_my_ref_1989[0];
			
		};
		if (((((((local2_b1_ref_1990[0]) == (0)) ? 1 : 0)) && (local4_down_1992)) ? 1 : 0)) {
			if ((((BOXCOLL(~~(func9_DDgui_get("", "XPOS")), ~~(func9_DDgui_get("", "YPOS")), ~~(func9_DDgui_get("", "WIDTH")), ~~(func9_DDgui_get("", "HEIGHT")), local2_px_1993, local2_py_1994, 1, 1)) == (0)) ? 1 : 0)) {
				func15_DDgui_popdialog();
				return tryClone(-(1));
				
			};
			
		};
		if (func9_DDgui_get("lst", "CLICKED")) {
			var local4_isel_1995 = 0;
			local4_isel_1995 = ~~(func9_DDgui_get("lst", "SELECT"));
			func15_DDgui_popdialog();
			return tryClone(local4_isel_1995);
			
		};
		SHOWSCREEN();
		
	};
	return 0;
	
};
window['func10_DDgui_list'] = function(param6_id_Str, param9_texts_Str, param5_width, param6_height) {
	var local2_tx_ref_2000 = [0], local2_ty_ref_2001 = [0], local3_num_2002 = 0, local1_i_2003 = 0;
	GETFONTSIZE(local2_tx_ref_2000, local2_ty_ref_2001);
	local2_ty_ref_2001[0] = MAX(unref(local2_ty_ref_2001[0]), global25_gDDguiMinControlDimension);
	local3_num_2002 = SPLITSTR(param9_texts_Str, unref(static7_DDgui_list_opt_Str), "|", 1);
	if ((((local3_num_2002) == (0)) ? 1 : 0)) {
		func9_DDgui_set(param6_id_Str, "SELECT", CAST2STRING(-(1)));
		
	};
	if ((((param6_height) == (0)) ? 1 : 0)) {
		param6_height = ((((4) * (local2_ty_ref_2001[0]))) + (4));
		
	} else {
		param6_height = ((((param6_height) - (MOD(param6_height, unref(local2_ty_ref_2001[0]))))) + (4));
		
	};
	if ((((param5_width) == (0)) ? 1 : 0)) {
		{
			for (local1_i_2003 = 0;toCheck(local1_i_2003, ((local3_num_2002) - (1)), 1);local1_i_2003 += 1) {
				local2_ty_ref_2001[0] = (static7_DDgui_list_opt_Str.arrAccess(local1_i_2003).values[tmpPositionCache]).length;
				if ((((local2_ty_ref_2001[0]) > (param5_width)) ? 1 : 0)) {
					param5_width = local2_ty_ref_2001[0];
					
				};
				
			};
			
		};
		param5_width = ((((param5_width) + (3))) * (local2_tx_ref_2000[0]));
		
	};
	func12_DDgui_widget(param6_id_Str, param9_texts_Str, param5_width, param6_height);
	func9_DDgui_set(param6_id_Str, "TYPE", "LIST");
	func9_DDgui_set(param6_id_Str, "COUNT", CAST2STRING(local3_num_2002));
	global11_ddgui_stack_ref[0].arrAccess(-(1)).values[tmpPositionCache][0].attr7_widgets_ref[0].arrAccess(-(1)).values[tmpPositionCache][0].attr10_wscrollmax = local3_num_2002;
	return 0;
	
};
window['func14_DDgui_drawlist'] = function(param10_ddgui_vals, param3_wdg, param4_ytop) {
	var local2_c1_2008 = 0, local2_c2_2009 = 0, local7_txt_Str_2010 = "", local1_i_2011 = 0, local3_num_2012 = 0, local2_tx_ref_2013 = [0], local2_ty_ref_2014 = [0], local1_r_2015 = 0, local5_hover_2016 = 0, local5_check_2017 = 0, local6_offset_2018 = 0, local6_twidth_2020 = 0;
	GETFONTSIZE(local2_tx_ref_2013, local2_ty_ref_2014);
	local2_ty_ref_2014[0] = MAX(unref(local2_ty_ref_2014[0]), global25_gDDguiMinControlDimension);
	local3_num_2012 = SPLITSTR(unref(param3_wdg.attr9_wtext_Str_ref[0]), unref(static7_DDgui_drawlist_opt_Str_ref[0]), "|", 1);
	param3_wdg.attr6_wcount = local3_num_2012;
	local6_twidth_2020 = ((param3_wdg.attr6_wwidth) - (8));
	if (param3_wdg.attr10_wscrollmax) {
		local6_twidth_2020+=-(MAX(unref(local2_tx_ref_2013[0]), global20_gDDguiScrollbarWidth));
		
	};
	local6_offset_2018 = param3_wdg.attr7_wscroll;
	{
		for (local1_i_2011 = local6_offset_2018;toCheck(local1_i_2011, ((local3_num_2012) - (1)), 1);local1_i_2011 += 1) {
			local5_hover_2016 = 0;
			local5_check_2017 = 0;
			if ((((param3_wdg.attr7_wselect) == (local1_i_2011)) ? 1 : 0)) {
				local5_check_2017 = 1;
				
			};
			if (((((((param3_wdg.attr6_whover) == (local1_i_2011)) ? 1 : 0)) && ((((param3_wdg.attr9_wreadonly) == (0)) ? 1 : 0))) ? 1 : 0)) {
				local5_hover_2016 = 1;
				
			};
			if ((((local5_hover_2016) || (local5_check_2017)) ? 1 : 0)) {
				local2_c1_2008 = param10_ddgui_vals.attr16_col_hover_bright;
				local2_c2_2009 = param10_ddgui_vals.attr14_col_hover_norm;
				if ((((local5_hover_2016) == (0)) ? 1 : 0)) {
					local1_r_2015 = local2_c1_2008;
					local2_c1_2008 = local2_c2_2009;
					local2_c2_2009 = local1_r_2015;
					
				};
				if (local5_check_2017) {
					func13_DDgui_backgnd(local2_c1_2008, local2_c2_2009, 0, ((param4_ytop) + (((((local1_i_2011) - (local6_offset_2018))) * (local2_ty_ref_2014[0])))), ((param3_wdg.attr6_wwidth) - (1)), ((local2_ty_ref_2014[0]) - (1)));
					
				} else if (local5_hover_2016) {
					func14_DDgui_backrect(1, ((param4_ytop) + (((((local1_i_2011) - (local6_offset_2018))) * (local2_ty_ref_2014[0])))), ((param3_wdg.attr6_wwidth) - (2)), ((local2_ty_ref_2014[0]) - (1)), local2_c1_2008);
					
				};
				
			} else {
				local2_c1_2008 = param10_ddgui_vals.attr10_col_bright;
				local2_c2_2009 = param10_ddgui_vals.attr8_col_norm;
				
			};
			if ((((INSTR(unref(static7_DDgui_drawlist_opt_Str_ref[0].arrAccess(local1_i_2011).values[tmpPositionCache][0]), "SPR_B", 0)) == (0)) ? 1 : 0)) {
				local2_c1_2008 = INTEGER(FLOAT2STR(MID_Str(unref(static7_DDgui_drawlist_opt_Str_ref[0].arrAccess(local1_i_2011).values[tmpPositionCache][0]), 5, -(1))));
				func23_DDgui_fit_sprite_in_box(local2_c1_2008, 5, ((((param4_ytop) + (((((local1_i_2011) - (local6_offset_2018))) * (local2_ty_ref_2014[0]))))) + (1)), ((local6_twidth_2020) - (2)), ((local2_ty_ref_2014[0]) - (2)));
				
			} else {
				func17_DDGui_PrintIntern(static7_DDgui_drawlist_opt_Str_ref[0].arrAccess(local1_i_2011).values[tmpPositionCache], 4, ((param4_ytop) + (((((local1_i_2011) - (local6_offset_2018))) * (local2_ty_ref_2014[0])))), local5_check_2017);
				
			};
			
		};
		
	};
	local2_c1_2008 = param10_ddgui_vals.attr8_col_norm;
	func14_DDgui_backrect(0, param4_ytop, param3_wdg.attr6_wwidth, param3_wdg.attr7_wheight, local2_c1_2008);
	func19_DDgui_drawscrollbar(param10_ddgui_vals, param3_wdg, param3_wdg.attr6_wwidth, param3_wdg.attr7_wheight, CAST2INT(((param3_wdg.attr7_wheight) / (local2_ty_ref_2014[0]))), param4_ytop);
	return 0;
	
};
window['func16_DDgui_handlelist'] = function(param10_ddgui_vals, param3_wdg, param2_mx, param2_my, param2_b1, param2_b2) {
	var local2_tx_ref_2027 = [0], local2_ty_ref_2028 = [0], local5_hover_2029 = 0, local5_width_2030 = 0, local6_height_2031 = 0, local2_sb_2032 = 0, local6_offset_2033 = 0, local6_oldsel_2034 = 0, local3_num_2035 = 0;
	GETFONTSIZE(local2_tx_ref_2027, local2_ty_ref_2028);
	local2_ty_ref_2028[0] = MAX(unref(local2_ty_ref_2028[0]), global25_gDDguiMinControlDimension);
	local5_width_2030 = param3_wdg.attr6_wwidth;
	local6_height_2031 = param3_wdg.attr7_wheight;
	local3_num_2035 = param3_wdg.attr6_wcount;
	param3_wdg.attr10_wscrollmax = ((local3_num_2035) - (INTEGER(CAST2INT(((local6_height_2031) / (local2_ty_ref_2028[0]))))));
	local2_sb_2032 = func21_DDgui_handlescrollbar(param10_ddgui_vals, param3_wdg, param2_mx, param2_my, param2_b1, param2_b2, local6_height_2031);
	local6_offset_2033 = param3_wdg.attr7_wscroll;
	if (param3_wdg.attr9_wreadonly) {
		return 0;
		
	};
	param3_wdg.attr8_wclicked = 0;
	param3_wdg.attr6_whover = -(1);
	if (((((((((((((param2_my) > (0)) ? 1 : 0)) && ((((param2_my) <= (local6_height_2031)) ? 1 : 0))) ? 1 : 0)) && ((((param2_mx) > (0)) ? 1 : 0))) ? 1 : 0)) && ((((param2_mx) < (((local5_width_2030) - (((local2_sb_2032) * (((local2_tx_ref_2027[0]) * (1.5)))))))) ? 1 : 0))) ? 1 : 0)) {
		param2_my = ((INTEGER(CAST2INT(((param2_my) / (local2_ty_ref_2028[0]))))) + (local6_offset_2033));
		if ((((param2_b1) == (1)) ? 1 : 0)) {
			if ((((param2_my) >= (param3_wdg.attr6_wcount)) ? 1 : 0)) {
				param2_my = -(1);
				
			};
			param3_wdg.attr7_wselect = param2_my;
			param3_wdg.attr8_wclicked = 1;
			
		};
		param3_wdg.attr6_whover = param2_my;
		
	};
	return 0;
	
};
window['func10_DDgui_text'] = function(param6_id_Str, param8_text_Str, param5_width, param6_height) {
	func12_DDgui_widget(param6_id_Str, param8_text_Str, param5_width, param6_height);
	func9_DDgui_set(param6_id_Str, "TYPE", "TEXT");
	return 0;
	
};
window['func16_DDgui_singletext'] = function(param6_id_Str, param8_text_Str, param5_width) {
	func12_DDgui_widget(param6_id_Str, param8_text_Str, param5_width, 0);
	func9_DDgui_set(param6_id_Str, "TYPE", "SINGLETEXT");
	return 0;
	
};
window['func16_DDgui_numbertext'] = function(param6_id_Str, param8_text_Str, param5_width) {
	func12_DDgui_widget(param6_id_Str, param8_text_Str, param5_width, 0);
	func9_DDgui_set(param6_id_Str, "TYPE", "NUMBERTEXT");
	return 0;
	
};
window['func14_DDgui_drawtext'] = function(param10_ddgui_vals, param3_wdg, param4_ytop, param11_bSingleText) {
	var local2_tx_ref_2040 = [0], local2_ty_ref_2041 = [0], local2_c1_2042 = 0, local2_c2_2043 = 0, local6_twidth_2044 = 0;
	GETFONTSIZE(local2_tx_ref_2040, local2_ty_ref_2041);
	local2_c1_2042 = param10_ddgui_vals.attr10_col_bright;
	local2_c2_2043 = param10_ddgui_vals.attr8_col_norm;
	local6_twidth_2044 = ((param3_wdg.attr6_wwidth) - (local2_tx_ref_2040[0]));
	if (param3_wdg.attr10_wscrollmax) {
		local6_twidth_2044 = ((local6_twidth_2044) - (MAX(unref(local2_tx_ref_2040[0]), global20_gDDguiScrollbarWidth)));
		
	};
	if (param3_wdg.attr9_wreadonly) {
		func13_DDgui_backgnd(local2_c2_2043, local2_c2_2043, 1, ((param4_ytop) + (1)), ((param3_wdg.attr6_wwidth) - (2)), ((param3_wdg.attr7_wheight) - (2)));
		
	};
	if (param11_bSingleText) {
		func14_DDgui_boxprint(param10_ddgui_vals, param3_wdg, CAST2INT(((local2_tx_ref_2040[0]) / (2))), ((param4_ytop) + (CAST2INT(((((param3_wdg.attr7_wheight) - (local2_ty_ref_2041[0]))) / (2))))), local6_twidth_2044, 1, 0);
		
	} else {
		func14_DDgui_boxprint(param10_ddgui_vals, param3_wdg, CAST2INT(((local2_tx_ref_2040[0]) / (2))), ((param4_ytop) - (((param3_wdg.attr7_wscroll) * (local2_ty_ref_2041[0])))), local6_twidth_2044, 1, 0);
		
	};
	func19_DDgui_drawscrollbar(param10_ddgui_vals, param3_wdg, param3_wdg.attr6_wwidth, param3_wdg.attr7_wheight, CAST2INT(((param3_wdg.attr7_wheight) / (local2_ty_ref_2041[0]))), param4_ytop);
	func14_DDgui_backrect(0, param4_ytop, param3_wdg.attr6_wwidth, param3_wdg.attr7_wheight, local2_c2_2043);
	return 0;
	
};
window['func16_ddgui_handletext'] = function(param10_ddgui_vals, param3_wdg, param2_mx, param2_my, param2_b1, param2_b2, param11_bSingleText, param9_bIsNumber) {
	var local6_height_2053 = 0, local5_width_2054 = 0, local2_tx_ref_2055 = [0], local2_ty_ref_2056 = [0], local8_text_Str_2057 = "", local8_txheight_2058 = 0, local7_txwidth_2059 = 0, local9_has_focus_2060 = 0, local5_a_Str_2061 = "", local5_l_Str_2062 = "", local5_r_Str_2063 = "", local2_sb_2064 = 0, local8_selstart_2065 = 0, local6_selend_2066 = 0, local3_del_2067 = 0, local6_backsp_2068 = 0, local4_xkey_2069 = 0, local4_ykey_2070 = 0, local3_tab_2071 = 0, local7_lastkey_2072 = 0, local5_shift_2073 = 0, local6_offset_2074 = 0, local7_keycopy_2075 = 0, local8_keypaste_2076 = 0, local8_readonly_2077 = 0;
	local8_readonly_2077 = param3_wdg.attr9_wreadonly;
	GETFONTSIZE(local2_tx_ref_2055, local2_ty_ref_2056);
	local8_text_Str_2057 = param3_wdg.attr9_wtext_Str_ref[0];
	local5_width_2054 = param3_wdg.attr6_wwidth;
	local6_offset_2074 = ((param3_wdg.attr7_wscroll) * (local2_ty_ref_2056[0]));
	local7_txwidth_2059 = ((local5_width_2054) - (local2_tx_ref_2055[0]));
	if (param11_bSingleText) {
		if (((((((param2_my) > (0)) ? 1 : 0)) && ((((param2_my) < (local6_height_2053)) ? 1 : 0))) ? 1 : 0)) {
			param2_my = 1;
			
		};
		
	};
	if (param3_wdg.attr10_wscrollmax) {
		local7_txwidth_2059 = ((local7_txwidth_2059) - (MAX(unref(local2_tx_ref_2055[0]), global20_gDDguiScrollbarWidth)));
		
	};
	local6_height_2053 = param3_wdg.attr7_wheight;
	local8_txheight_2058 = func14_DDgui_boxprint(param10_ddgui_vals, param3_wdg, 0, 0, local7_txwidth_2059, 0, 0);
	param3_wdg.attr10_wscrollmax = MAX(0, CAST2INT(((((local8_txheight_2058) - (local6_height_2053))) / (local2_ty_ref_2056[0]))));
	if (param3_wdg.attr10_wscrollmax) {
		param3_wdg.attr10_wscrollmax+=1;
		
	};
	local2_sb_2064 = func21_DDgui_handlescrollbar(param10_ddgui_vals, param3_wdg, param2_mx, param2_my, param2_b1, param2_b2, local6_height_2053);
	if (((((((((((((param2_mx) >= (0)) ? 1 : 0)) && ((((param2_mx) < (((local5_width_2054) - (((local2_sb_2064) * (((local2_tx_ref_2055[0]) * (1.5)))))))) ? 1 : 0))) ? 1 : 0)) && ((((param2_my) >= (0)) ? 1 : 0))) ? 1 : 0)) && ((((param2_my) < (local6_height_2053)) ? 1 : 0))) ? 1 : 0)) {
		if (((((((param2_b1) == (1)) ? 1 : 0)) && ((((param10_ddgui_vals.attr9_focus_Str) != (param3_wdg.attr7_wid_Str)) ? 1 : 0))) ? 1 : 0)) {
			func14_DDgui_setfocus(param3_wdg.attr7_wid_Str);
			if (((((((((((((param2_b1) == (1)) ? 1 : 0)) && ((((local8_readonly_2077) == (0)) ? 1 : 0))) ? 1 : 0)) && ((((global18_DDGUI_IN_INPUT_DLG) == (0)) ? 1 : 0))) ? 1 : 0)) && (global20_DDGUI_AUTO_INPUT_DLG)) ? 1 : 0)) {
				param10_ddgui_vals.attr15_kick_intern_dlg = 2;
				param10_ddgui_vals.attr18_kick_intern_id_Str = param3_wdg.attr7_wid_Str;
				func14_DDgui_setfocus("");
				
			};
			
		} else {
			if (((((((param2_b1) == (0)) ? 1 : 0)) && (MOUSEAXIS(3))) ? 1 : 0)) {
				param2_b1 = 1;
				
			};
			if ((((param2_b1) != (0)) ? 1 : 0)) {
				local2_tx_ref_2055[0] = func14_DDgui_boxprint(param10_ddgui_vals, param3_wdg, param2_mx, ((param2_my) + (local6_offset_2074)), local7_txwidth_2059, 0, 1);
				
			};
			if ((((param2_b1) == (-(1))) ? 1 : 0)) {
				param3_wdg.attr9_wselstart = local2_tx_ref_2055[0];
				param2_b1 = 1;
				
			};
			if ((((param2_b1) == (1)) ? 1 : 0)) {
				param3_wdg.attr7_wselend = local2_tx_ref_2055[0];
				
			};
			
		};
		
	};
	if ((((param10_ddgui_vals.attr9_focus_Str) == (param3_wdg.attr7_wid_Str)) ? 1 : 0)) {
		local9_has_focus_2060 = 1;
		
	};
	if (local9_has_focus_2060) {
		local7_lastkey_2072 = static11_ddgui_handletext_st_lasttime;
		if ((((((GETTIMERALL()) - (local7_lastkey_2072))) > (150)) ? 1 : 0)) {
			local7_lastkey_2072 = 0;
			
		} else {
			local7_lastkey_2072 = static10_ddgui_handletext_st_lastkey;
			
		};
		local5_a_Str_2061 = param10_ddgui_vals.attr13_dlg_inkey_Str;
		if ((local5_a_Str_2061).length) {
			local7_lastkey_2072 = 0;
			param10_ddgui_vals.attr13_dlg_inkey_Str = "";
			
		} else {
			local5_a_Str_2061 = INKEY_Str();
			if ((local5_a_Str_2061).length) {
				
			};
			
		};
		if ((((local5_a_Str_2061) == ("\t")) ? 1 : 0)) {
			local5_a_Str_2061 = "";
			
		};
		if ((((local5_a_Str_2061) == ("\b")) ? 1 : 0)) {
			local5_a_Str_2061 = "";
			local6_backsp_2068 = 1;
			
		};
		if (((((((local7_lastkey_2072) == (0)) ? 1 : 0)) || ((((KEY(local7_lastkey_2072)) == (0)) ? 1 : 0))) ? 1 : 0)) {
			local7_lastkey_2072 = 0;
			local4_ykey_2070 = ((KEY(208)) - (KEY(200)));
			local4_xkey_2069 = ((KEY(205)) - (KEY(203)));
			local3_del_2067 = KEY(211);
			local3_tab_2071 = KEY(15);
			local6_backsp_2068 = (((local6_backsp_2068) || (KEY(14))) ? 1 : 0);
			local5_shift_2073 = (((KEY(42)) || (KEY(54))) ? 1 : 0);
			local7_keycopy_2075 = (((KEY(29)) && (KEY(46))) ? 1 : 0);
			local8_keypaste_2076 = (((KEY(29)) && (KEY(47))) ? 1 : 0);
			if ((((local4_ykey_2070) > (0)) ? 1 : 0)) {
				local7_lastkey_2072 = 208;
				
			};
			if ((((local4_ykey_2070) < (0)) ? 1 : 0)) {
				local7_lastkey_2072 = 200;
				
			};
			if ((((local4_xkey_2069) < (0)) ? 1 : 0)) {
				local7_lastkey_2072 = 203;
				
			};
			if ((((local4_xkey_2069) > (0)) ? 1 : 0)) {
				local7_lastkey_2072 = 205;
				
			};
			if (local3_del_2067) {
				local7_lastkey_2072 = 211;
				
			};
			if (local3_tab_2071) {
				local7_lastkey_2072 = 15;
				local5_a_Str_2061 = " ";
				
			};
			if (local6_backsp_2068) {
				local7_lastkey_2072 = 14;
				
			};
			if (local7_keycopy_2075) {
				local7_lastkey_2072 = 29;
				
			};
			if (local8_keypaste_2076) {
				local7_lastkey_2072 = 29;
				
			};
			if (KEY(199)) {
				local7_lastkey_2072 = 199;
				param3_wdg.attr7_wcaretx = 0;
				if (((param11_bSingleText) ? 0 : 1)) {
					param3_wdg.attr7_wcarety+=local2_ty_ref_2056[0];
					local4_ykey_2070 = -(1);
					
				};
				
			};
			if (KEY(207)) {
				local7_lastkey_2072 = 207;
				param3_wdg.attr7_wcaretx = param3_wdg.attr6_wwidth;
				if (((param11_bSingleText) ? 0 : 1)) {
					param3_wdg.attr7_wcarety+=local2_ty_ref_2056[0];
					local4_ykey_2070 = -(1);
					
				};
				
			};
			static10_ddgui_handletext_st_lastkey = local7_lastkey_2072;
			static11_ddgui_handletext_st_lasttime = GETTIMERALL();
			
		};
		if ((((local8_readonly_2077) == (1)) ? 1 : 0)) {
			local5_a_Str_2061 = "";
			local3_del_2067 = 0;
			local3_tab_2071 = 0;
			local6_backsp_2068 = 0;
			local8_keypaste_2076 = 0;
			
		};
		if (param11_bSingleText) {
			local4_ykey_2070 = 0;
			if ((((local5_a_Str_2061) == ("\n")) ? 1 : 0)) {
				local5_a_Str_2061 = "";
				
			};
			if ((((local5_a_Str_2061) == ("\r")) ? 1 : 0)) {
				local5_a_Str_2061 = "";
				
			};
			if (local3_tab_2071) {
				if (local5_shift_2073) {
					func18_DDgui_advancefocus(-(1));
					
				} else {
					func18_DDgui_advancefocus(1);
					
				};
				return 0;
				
			};
			
		};
		if (param9_bIsNumber) {
			if ((((((((((((((((local5_a_Str_2061) >= ("0")) ? 1 : 0)) && ((((local5_a_Str_2061) <= ("9")) ? 1 : 0))) ? 1 : 0)) || ((((local5_a_Str_2061) == (".")) ? 1 : 0))) ? 1 : 0)) || ((((local5_a_Str_2061) == ("e")) ? 1 : 0))) ? 1 : 0)) || ((((local5_a_Str_2061) == ("-")) ? 1 : 0))) ? 1 : 0)) {
				
			} else {
				local5_a_Str_2061 = "";
				
			};
			
		};
		if ((((((((((((((((local5_a_Str_2061) != ("")) ? 1 : 0)) || (local3_del_2067)) ? 1 : 0)) || (local6_backsp_2068)) ? 1 : 0)) || (local4_xkey_2069)) ? 1 : 0)) || (local4_ykey_2070)) ? 1 : 0)) {
			local8_selstart_2065 = param3_wdg.attr9_wselstart;
			local6_selend_2066 = param3_wdg.attr7_wselend;
			if ((((local5_shift_2073) && ((((local4_xkey_2069) || (local4_ykey_2070)) ? 1 : 0))) ? 1 : 0)) {
				local6_selend_2066+=local4_xkey_2069;
				if (local4_ykey_2070) {
					local6_selend_2066 = func14_DDgui_boxprint(param10_ddgui_vals, param3_wdg, param3_wdg.attr7_wcaretx, ((param3_wdg.attr7_wcarety) + (((local4_ykey_2070) * (local2_ty_ref_2056[0])))), local7_txwidth_2059, 0, 1);
					
				};
				if ((((local6_selend_2066) < (0)) ? 1 : 0)) {
					local6_selend_2066 = 0;
					
				};
				if ((((local6_selend_2066) > ((local8_text_Str_2057).length)) ? 1 : 0)) {
					local6_selend_2066 = (local8_text_Str_2057).length;
					
				};
				param3_wdg.attr7_wselend = local6_selend_2066;
				
			} else {
				if (((((((local8_selstart_2065) != (local6_selend_2066)) ? 1 : 0)) && (((((((local3_del_2067) || (local6_backsp_2068)) ? 1 : 0)) || ((((local5_a_Str_2061) != ("")) ? 1 : 0))) ? 1 : 0))) ? 1 : 0)) {
					if ((((local8_selstart_2065) > (local6_selend_2066)) ? 1 : 0)) {
						local2_tx_ref_2055[0] = local8_selstart_2065;
						local8_selstart_2065 = local6_selend_2066;
						local6_selend_2066 = local2_tx_ref_2055[0];
						
					};
					local5_l_Str_2062 = MID_Str(local8_text_Str_2057, 0, local8_selstart_2065);
					local5_r_Str_2063 = MID_Str(local8_text_Str_2057, local6_selend_2066, -(1));
					local8_text_Str_2057 = ((local5_l_Str_2062) + (local5_r_Str_2063));
					if (local3_del_2067) {
						local3_del_2067 = 0;
						
					};
					if (local6_backsp_2068) {
						local6_backsp_2068 = 0;
						
					};
					
				};
				local5_l_Str_2062 = MID_Str(local8_text_Str_2057, 0, local8_selstart_2065);
				local5_r_Str_2063 = MID_Str(local8_text_Str_2057, local8_selstart_2065, -(1));
				local8_selstart_2065+=local4_xkey_2069;
				if (local4_ykey_2070) {
					local8_selstart_2065 = func14_DDgui_boxprint(param10_ddgui_vals, param3_wdg, param3_wdg.attr7_wcaretx, ((param3_wdg.attr7_wcarety) + (((local4_ykey_2070) * (local2_ty_ref_2056[0])))), local7_txwidth_2059, 0, 1);
					
				};
				if (local3_del_2067) {
					local5_r_Str_2063 = MID_Str(local5_r_Str_2063, 1, -(1));
					
				};
				if (local6_backsp_2068) {
					local5_l_Str_2062 = LEFT_Str(local5_l_Str_2062, (((local5_l_Str_2062).length) - (1)));
					local8_selstart_2065+=-(1);
					
				};
				if ((((local5_a_Str_2061) != ("")) ? 1 : 0)) {
					local5_l_Str_2062 = ((local5_l_Str_2062) + (local5_a_Str_2061));
					local8_selstart_2065+=1;
					
				};
				local8_text_Str_2057 = ((local5_l_Str_2062) + (local5_r_Str_2063));
				if ((((local8_selstart_2065) < (0)) ? 1 : 0)) {
					local8_selstart_2065 = 0;
					
				};
				if ((((local8_selstart_2065) > ((local8_text_Str_2057).length)) ? 1 : 0)) {
					local8_selstart_2065 = (local8_text_Str_2057).length;
					
				};
				param3_wdg.attr9_wselstart = local8_selstart_2065;
				param3_wdg.attr7_wselend = local8_selstart_2065;
				param3_wdg.attr9_wtext_Str_ref[0] = local8_text_Str_2057;
				
			};
			if (((((((((param3_wdg.attr7_wcarety) + (local2_ty_ref_2056[0]))) > (((((param3_wdg.attr7_wscroll) * (local2_ty_ref_2056[0]))) + (param3_wdg.attr7_wheight)))) ? 1 : 0)) && ((((param3_wdg.attr7_wscroll) < (param3_wdg.attr10_wscrollmax)) ? 1 : 0))) ? 1 : 0)) {
				param3_wdg.attr7_wscroll+=1;
				
			};
			if (((((((((param3_wdg.attr7_wcarety) - (local2_ty_ref_2056[0]))) < (((param3_wdg.attr7_wscroll) * (local2_ty_ref_2056[0])))) ? 1 : 0)) && ((((param3_wdg.attr7_wscroll) > (0)) ? 1 : 0))) ? 1 : 0)) {
				param3_wdg.attr7_wscroll+=-1;
				
			};
			
		};
		
	};
	return 0;
	
};
window['func9_DDgui_tab'] = function(param6_id_Str, param12_captions_Str, param6_height) {
	var local3_num_2083 = 0, local2_fx_ref_2084 = [0], local2_fy_ref_2085 = [0];
	GETFONTSIZE(local2_fx_ref_2084, local2_fy_ref_2085);
	if ((((param6_height) == (0)) ? 1 : 0)) {
		param6_height = ((local2_fy_ref_2085[0]) + (7));
		
	};
	func12_DDgui_widget(param6_id_Str, param12_captions_Str, 10000, param6_height);
	func9_DDgui_set(param6_id_Str, "TYPE", "TAB");
	global11_ddgui_stack_ref[0].arrAccess(0.1).values[tmpPositionCache][0].attr7_widgets_ref[0].arrAccess(-(1)).values[tmpPositionCache][0].attr7_wselect = -(1);
	return 0;
	
};
window['func13_DDgui_drawtab'] = function(param10_ddgui_vals, param3_wdg, param4_ytop) {
	var local3_num_2089 = 0, local4_num2_2090 = 0, local1_i_2091 = 0, local4_isel_2092 = 0, local2_c1_2093 = 0, local2_c2_2094 = 0, local3_c1b_2095 = 0, local3_c2b_2096 = 0, local2_fx_ref_2097 = [0], local2_fy_ref_2098 = [0], local1_x_2099 = 0, local6_twidth_2100 = 0, local4_selx_2101 = 0, local4_selw_2102 = 0, local6_y_text_2105 = 0;
	GETFONTSIZE(local2_fx_ref_2097, local2_fy_ref_2098);
	local2_c1_2093 = param10_ddgui_vals.attr10_col_bright;
	local2_c2_2094 = param10_ddgui_vals.attr8_col_norm;
	local3_c1b_2095 = param10_ddgui_vals.attr16_col_hover_bright;
	local3_c2b_2096 = param10_ddgui_vals.attr14_col_hover_norm;
	func13_DDgui_backgnd(local2_c1_2093, local2_c1_2093, 0, param4_ytop, param3_wdg.attr6_wwidth, ((param3_wdg.attr7_wheight) - (1)));
	local4_isel_2092 = param3_wdg.attr7_wselect;
	local6_y_text_2105 = ((((((param4_ytop) + (param3_wdg.attr7_wheight))) - (2))) - (local2_fy_ref_2098[0]));
	local1_x_2099 = 2;
	local3_num_2089 = SPLITSTR(unref(param3_wdg.attr9_wtext_Str_ref[0]), unref(static7_DDgui_drawtab_str_Str), "|", 1);
	{
		for (local1_i_2091 = 0;toCheck(local1_i_2091, ((local3_num_2089) - (1)), 1);local1_i_2091 += 1) {
			local4_num2_2090 = SPLITSTR(static7_DDgui_drawtab_str_Str.arrAccess(local1_i_2091).values[tmpPositionCache], unref(static8_DDgui_drawtab_str2_Str_ref[0]), ",", 1);
			local6_twidth_2100 = MAX(global25_gDDguiMinControlDimension, ((func21_DDGui_TextWidthIntern(static8_DDgui_drawtab_str2_Str_ref[0].arrAccess(0).values[tmpPositionCache])) + (local2_fx_ref_2097[0])));
			if ((((local1_i_2091) == (local4_isel_2092)) ? 1 : 0)) {
				func13_DDgui_backgnd(local3_c1b_2095, local3_c2b_2096, local1_x_2099, ((param4_ytop) + (1)), local6_twidth_2100, param3_wdg.attr7_wheight);
				local4_selx_2101 = ((local1_x_2099) - (1));
				local4_selw_2102 = ((local6_twidth_2100) + (2));
				
			} else {
				func13_DDgui_backgnd(local2_c1_2093, local2_c2_2094, ((local1_x_2099) + (1)), ((param4_ytop) + (4)), ((local6_twidth_2100) - (1)), ((param3_wdg.attr7_wheight) - (4)));
				func14_DDgui_backrect(local1_x_2099, ((param4_ytop) + (3)), ((local6_twidth_2100) + (1)), ((param3_wdg.attr7_wheight) - (2)), local2_c2_2094);
				
			};
			func17_DDGui_PrintIntern(static8_DDgui_drawtab_str2_Str_ref[0].arrAccess(0).values[tmpPositionCache], ((local1_x_2099) + (INTEGER(CAST2INT(((local2_fx_ref_2097[0]) / (2)))))), local6_y_text_2105, (((local1_i_2091) == (local4_isel_2092)) ? 1 : 0));
			local1_x_2099+=local6_twidth_2100;
			
		};
		
	};
	if ((((local4_selx_2101) > (0)) ? 1 : 0)) {
		func14_DDgui_backrect(local4_selx_2101, ((param4_ytop) + (1)), local4_selw_2102, param3_wdg.attr7_wheight, local3_c2b_2096);
		
	};
	DRAWRECT(0, ((param3_wdg.attr7_wheight) - (1)), ((param3_wdg.attr6_wwidth) - (1)), 1, local2_c2_2094);
	return 0;
	
};
window['func15_DDgui_handletab'] = function(param10_ddgui_vals, param3_wdg, param2_mx, param2_my, param2_b1, param2_b2) {
	var local5_width_2112 = 0, local3_num_2113 = 0, local4_num2_2114 = 0, local1_i_2115 = 0, local2_fx_ref_2116 = [0], local2_fy_ref_2117 = [0], local1_x_2118 = 0, local6_oldsel_2119 = 0, local11_must_update_2122 = 0;
	GETFONTSIZE(local2_fx_ref_2116, local2_fy_ref_2117);
	param3_wdg.attr8_wclicked = 0;
	local2_fy_ref_2117[0] = param3_wdg.attr7_wheight;
	local11_must_update_2122 = 0;
	if (((((((param3_wdg.attr7_wselect) == (-(1))) ? 1 : 0)) || ((((((((((((((((param2_b1) == (1)) ? 1 : 0)) && ((((param2_my) > (0)) ? 1 : 0))) ? 1 : 0)) && ((((param2_mx) > (0)) ? 1 : 0))) ? 1 : 0)) && ((((param2_my) <= (local2_fy_ref_2117[0])) ? 1 : 0))) ? 1 : 0)) && ((((param2_mx) < (param3_wdg.attr6_wwidth)) ? 1 : 0))) ? 1 : 0))) ? 1 : 0)) {
		local11_must_update_2122 = 1;
		
	};
	if ((((param3_wdg.attr7_wselect) == (-(1))) ? 1 : 0)) {
		func15_DDgui_selecttab(param3_wdg.attr7_wid_Str, 0);
		
	};
	if (local11_must_update_2122) {
		local6_oldsel_2119 = param3_wdg.attr7_wselect;
		local3_num_2113 = SPLITSTR(unref(param3_wdg.attr9_wtext_Str_ref[0]), unref(static7_DDgui_handletab_str_Str), "|", 1);
		{
			for (local1_i_2115 = 0;toCheck(local1_i_2115, ((local3_num_2113) - (1)), 1);local1_i_2115 += 1) {
				local4_num2_2114 = SPLITSTR(static7_DDgui_handletab_str_Str.arrAccess(local1_i_2115).values[tmpPositionCache], unref(static8_DDgui_handletab_str2_Str_ref[0]), ",", 1);
				local5_width_2112 = MAX(global25_gDDguiMinControlDimension, ((func21_DDGui_TextWidthIntern(static8_DDgui_handletab_str2_Str_ref[0].arrAccess(0).values[tmpPositionCache])) + (local2_fx_ref_2116[0])));
				if (BOXCOLL(param2_mx, param2_my, 1, 1, local1_x_2118, 1, local5_width_2112, unref(local2_fy_ref_2117[0]))) {
					if ((((local1_i_2115) != (local6_oldsel_2119)) ? 1 : 0)) {
						param3_wdg.attr7_wselect = local1_i_2115;
						param3_wdg.attr8_wclicked = 1;
						func15_DDgui_selecttab(param3_wdg.attr7_wid_Str, local1_i_2115);
						
					};
					break;
					
				};
				local1_x_2118+=local5_width_2112;
				
			};
			
		};
		
	};
	return 0;
	
};
window['func16_DDgui_framestart'] = function(param6_id_Str, param11_caption_Str, param5_width) {
	var local5_count_2309 = 0;
	if (((((param6_id_Str).length) == (0)) ? 1 : 0)) {
		local5_count_2309 = ((1) + (BOUNDS(global11_ddgui_stack_ref[0].arrAccess(-(1)).values[tmpPositionCache][0].attr7_widgets_ref[0], 0)));
		param6_id_Str = (("frm") + (CAST2STRING(local5_count_2309)));
		
	};
	func12_DDgui_widget(param6_id_Str, param11_caption_Str, param5_width, 100);
	func9_DDgui_set(param6_id_Str, "TYPE", "FRAME");
	if ((((param5_width) == (0)) ? 1 : 0)) {
		func9_DDgui_set(param6_id_Str, "WIDTH", CAST2STRING(10000));
		
	};
	return 0;
	
};
window['func14_DDgui_frameend'] = function() {
	var local5_count_2310 = 0, local6_id_Str_2311 = "";
	local5_count_2310 = ((1) + (BOUNDS(global11_ddgui_stack_ref[0].arrAccess(-(1)).values[tmpPositionCache][0].attr7_widgets_ref[0], 0)));
	local6_id_Str_2311 = (("frm") + (CAST2STRING(local5_count_2310)));
	func12_DDgui_widget(local6_id_Str_2311, "", 1, 1);
	func9_DDgui_set(local6_id_Str_2311, "TYPE", "UNFRAME");
	func9_DDgui_set(local6_id_Str_2311, "WIDTH", CAST2STRING(0));
	func9_DDgui_set(local6_id_Str_2311, "HEIGHT", CAST2STRING(0));
	return 0;
	
};
window['__DDgui_Helpers___'] = function() {
	
};
window['__DDgui_Helpers___'] = __DDgui_Helpers___;
window['func18_DDgui_advancefocus'] = function(param10_iDirection) {
	var local9_focus_Str_2124 = "", local6_ifocus_2125 = 0, local6_iFirst_2126 = 0, local7_iBefore_2127 = 0, local6_iAfter_2128 = 0, local5_iLast_2129 = 0;
	local9_focus_Str_2124 = func13_DDgui_get_Str("", "FOCUS");
	local6_ifocus_2125 = -(1);
	local6_iFirst_2126 = -(1);
	local7_iBefore_2127 = -(1);
	local6_iAfter_2128 = -(1);
	local5_iLast_2129 = -(1);
	{
		var local1_i_2130 = 0;
		for (local1_i_2130 = 0;toCheck(local1_i_2130, ((BOUNDS(global11_ddgui_stack_ref[0].arrAccess(-(1)).values[tmpPositionCache][0].attr7_widgets_ref[0], 0)) - (1)), 1);local1_i_2130 += 1) {
			var alias3_wdg_ref_2131 = [new type9_DDGUI_WDG()];
			alias3_wdg_ref_2131 = global11_ddgui_stack_ref[0].arrAccess(-(1)).values[tmpPositionCache][0].attr7_widgets_ref[0].arrAccess(local1_i_2130).values[tmpPositionCache] /* ALIAS */;
			if ((((alias3_wdg_ref_2131[0].attr7_wid_Str) == (local9_focus_Str_2124)) ? 1 : 0)) {
				if ((((local6_ifocus_2125) == (-(1))) ? 1 : 0)) {
					local6_ifocus_2125 = local1_i_2130;
					
				};
				
			};
			if ((((((((((alias3_wdg_ref_2131[0].attr9_wtype_Str) == ("TEXT")) ? 1 : 0)) || ((((alias3_wdg_ref_2131[0].attr9_wtype_Str) == ("SINGLETEXT")) ? 1 : 0))) ? 1 : 0)) || ((((alias3_wdg_ref_2131[0].attr9_wtype_Str) == ("NUMBERTEXT")) ? 1 : 0))) ? 1 : 0)) {
				if ((((local6_iFirst_2126) == (-(1))) ? 1 : 0)) {
					local6_iFirst_2126 = local1_i_2130;
					
				};
				if ((((local6_ifocus_2125) == (-(1))) ? 1 : 0)) {
					local7_iBefore_2127 = local1_i_2130;
					
				};
				if ((((((((((local6_ifocus_2125) >= (0)) ? 1 : 0)) && ((((local6_iAfter_2128) == (-(1))) ? 1 : 0))) ? 1 : 0)) && ((((local6_ifocus_2125) != (local1_i_2130)) ? 1 : 0))) ? 1 : 0)) {
					local6_iAfter_2128 = local1_i_2130;
					
				};
				local5_iLast_2129 = local1_i_2130;
				
			};
			
		};
		
	};
	if ((((param10_iDirection) < (0)) ? 1 : 0)) {
		if ((((local7_iBefore_2127) >= (0)) ? 1 : 0)) {
			local6_ifocus_2125 = local7_iBefore_2127;
			
		};
		if (((((((local7_iBefore_2127) < (0)) ? 1 : 0)) && ((((local5_iLast_2129) >= (0)) ? 1 : 0))) ? 1 : 0)) {
			local6_ifocus_2125 = local5_iLast_2129;
			
		};
		
	} else {
		if ((((local6_iAfter_2128) >= (0)) ? 1 : 0)) {
			local6_ifocus_2125 = local6_iAfter_2128;
			
		};
		if (((((((local6_iAfter_2128) < (0)) ? 1 : 0)) && ((((local6_iFirst_2126) >= (0)) ? 1 : 0))) ? 1 : 0)) {
			local6_ifocus_2125 = local6_iFirst_2126;
			
		};
		
	};
	if (((((((local6_ifocus_2125) >= (0)) ? 1 : 0)) && ((((local6_ifocus_2125) < (BOUNDS(global11_ddgui_stack_ref[0].arrAccess(-(1)).values[tmpPositionCache][0].attr7_widgets_ref[0], 0))) ? 1 : 0))) ? 1 : 0)) {
		local9_focus_Str_2124 = global11_ddgui_stack_ref[0].arrAccess(-(1)).values[tmpPositionCache][0].attr7_widgets_ref[0].arrAccess(local6_ifocus_2125).values[tmpPositionCache][0].attr7_wid_Str;
		func14_DDgui_setfocus(local9_focus_Str_2124);
		
	};
	return 0;
	
};
window['func14_DDgui_setfocus'] = function(param6_id_Str) {
	func9_DDgui_set("", "FOCUS", param6_id_Str);
	{
		var local16___SelectHelper6__2133 = "";
		local16___SelectHelper6__2133 = func13_DDgui_get_Str(param6_id_Str, "TYPE");
		if ((((local16___SelectHelper6__2133) == ("TEXT")) ? 1 : 0)) {
			func9_DDgui_set(param6_id_Str, "SELSTART", CAST2STRING(0));
			func9_DDgui_set(param6_id_Str, "SELEND", CAST2STRING(0));
			
		} else if ((((local16___SelectHelper6__2133) == ("SINGLETEXT")) ? 1 : 0)) {
			func9_DDgui_set(param6_id_Str, "SELSTART", CAST2STRING(0));
			func9_DDgui_set(param6_id_Str, "SELEND", CAST2STRING((func13_DDgui_get_Str(param6_id_Str, "TEXT")).length));
			
		} else if ((((local16___SelectHelper6__2133) == ("NUMBERTEXT")) ? 1 : 0)) {
			func9_DDgui_set(param6_id_Str, "SELSTART", CAST2STRING(0));
			func9_DDgui_set(param6_id_Str, "SELEND", CAST2STRING((func13_DDgui_get_Str(param6_id_Str, "TEXT")).length));
			
		};
		
	};
	return 0;
	
};
window['func15_DDgui_selecttab'] = function(param6_id_Str, param4_isel) {
	var local3_num_2136 = 0, local4_num2_2137 = 0, local1_i_2138 = 0, local1_j_2139 = 0, local9_oldselect_2142 = 0;
	local9_oldselect_2142 = ~~(func9_DDgui_get(param6_id_Str, "SELECT"));
	func9_DDgui_set(param6_id_Str, "SELECT", CAST2STRING(param4_isel));
	local3_num_2136 = SPLITSTR(func13_DDgui_get_Str(param6_id_Str, "TEXT"), unref(static7_DDgui_selecttab_str_Str), "|", 1);
	{
		var local5_iHide_2143 = 0;
		for (local5_iHide_2143 = 0;toCheck(local5_iHide_2143, 1, 1);local5_iHide_2143 += 1) {
			{
				for (local1_i_2138 = 0;toCheck(local1_i_2138, ((local3_num_2136) - (1)), 1);local1_i_2138 += 1) {
					local4_num2_2137 = SPLITSTR(static7_DDgui_selecttab_str_Str.arrAccess(local1_i_2138).values[tmpPositionCache], unref(static8_DDgui_selecttab_str2_Str_ref[0]), ",", 1);
					{
						for (local1_j_2139 = 1;toCheck(local1_j_2139, ((local4_num2_2137) - (1)), 1);local1_j_2139 += 1) {
							if (((((((local9_oldselect_2142) == (-(1))) ? 1 : 0)) && ((((func11_DDgui_index(unref(global11_ddgui_stack_ref[0].arrAccess(-(1)).values[tmpPositionCache][0]), static8_DDgui_selecttab_str2_Str_ref[0].arrAccess(local1_j_2139).values[tmpPositionCache], 0)) < (0)) ? 1 : 0))) ? 1 : 0)) {
								continue;
								
							};
							if (((((((local1_i_2138) == (param4_isel)) ? 1 : 0)) && ((((local5_iHide_2143) == (1)) ? 1 : 0))) ? 1 : 0)) {
								func10_DDgui_hide(unref(static8_DDgui_selecttab_str2_Str_ref[0].arrAccess(local1_j_2139).values[tmpPositionCache][0]), 0);
								
							} else if ((((local5_iHide_2143) == (0)) ? 1 : 0)) {
								func10_DDgui_hide(unref(static8_DDgui_selecttab_str2_Str_ref[0].arrAccess(local1_j_2139).values[tmpPositionCache][0]), 1);
								
							};
							
						};
						
					};
					
				};
				
			};
			
		};
		
	};
	return 0;
	
};
window['func31_DDgui_intern_list_item_text_Str'] = function(param7_txt_Str_ref, param5_index) {
	var local5_start_2146 = 0, local4_fine_2147 = 0;
	if ((((param5_index) < (0)) ? 1 : 0)) {
		return "";
		
	};
	local5_start_2146 = -(1);
	while ((((param5_index) > (0)) ? 1 : 0)) {
		local5_start_2146 = INSTR(unref(param7_txt_Str_ref[0]), "|", ((local5_start_2146) + (1)));
		if ((((local5_start_2146) < (0)) ? 1 : 0)) {
			return "";
			
		};
		param5_index+=-1;
		
	};
	local4_fine_2147 = INSTR(unref(param7_txt_Str_ref[0]), "|", ((local5_start_2146) + (1)));
	if ((((local4_fine_2147) > (0)) ? 1 : 0)) {
		local4_fine_2147 = ((((local4_fine_2147) - (local5_start_2146))) - (1));
		
	};
	return tryClone(MID_Str(unref(param7_txt_Str_ref[0]), ((local5_start_2146) + (1)), local4_fine_2147));
	return "";
	
};
window['func21_DDgui_getitemtext_Str'] = function(param6_id_Str, param5_index) {
	var local2_iw_2314 = 0;
	var local6_id_Str_ref_2312 = [param6_id_Str]; /* NEWCODEHERE */
	if ((((BOUNDS(global11_ddgui_stack_ref[0], 0)) == (0)) ? 1 : 0)) {
		return "";
		
	};
	local2_iw_2314 = func11_DDgui_index(unref(global11_ddgui_stack_ref[0].arrAccess(-(1)).values[tmpPositionCache][0]), local6_id_Str_ref_2312, 0);
	if ((((local2_iw_2314) >= (0)) ? 1 : 0)) {
		var alias3_wdg_ref_2315 = [new type9_DDGUI_WDG()], alias7_txt_Str_ref_2316 = [""];
		alias3_wdg_ref_2315 = global11_ddgui_stack_ref[0].arrAccess(-(1)).values[tmpPositionCache][0].attr7_widgets_ref[0].arrAccess(local2_iw_2314).values[tmpPositionCache] /* ALIAS */;
		alias7_txt_Str_ref_2316 = alias3_wdg_ref_2315[0].attr9_wtext_Str_ref /* ALIAS */;
		return tryClone(func31_DDgui_intern_list_item_text_Str(alias7_txt_Str_ref_2316, param5_index));
		
	};
	return "";
	
};
window['func15_DDgui_input_Str'] = function(param8_text_Str, param13_bSpecialChars, param11_bFullscreen, param11_bSingleLine, param9_bIsNumber) {
	var __labels = {"__DrawFrames__": 3476, "refresh": 10927};
	
	var local2_fx_ref_2153 = [0], local2_fy_ref_2154 = [0], local4_size_2155 = 0, local7_iTabSel_2156 = 0, local12_text_old_Str_2157 = "", local4_ssel_2158 = 0, local4_esel_2159 = 0, local8_widg_Str_2160 = new GLBArray(), local3_scx_ref_2161 = [0], local3_scy_ref_2162 = [0], local12_storeoldsize_2163 = 0, local5_texth_2164 = 0, local10_cancel_Str_2166 = "", local3_chr_2167 = 0;
	var __pc = 10790;
	while(__pc >= 0) {
		switch(__pc) {
			case 10790:
				local12_text_old_Str_2157 = param8_text_Str;
				
			GETSCREENSIZE(local3_scx_ref_2161, local3_scy_ref_2162);
			GETFONTSIZE(local2_fx_ref_2153, local2_fy_ref_2154);
			local12_storeoldsize_2163 = global25_gDDguiMinControlDimension;
			global25_gDDguiMinControlDimension = 16;
			local4_size_2155 = MIN(400, MIN(unref(local3_scx_ref_2161[0]), unref(local3_scy_ref_2162[0])));
			case 10882:
				if (!(param11_bFullscreen)) { __pc = 10812; break; }
				
				case 10819:
					func16_DDgui_pushdialog(0, 0, unref(local3_scx_ref_2161[0]), unref(local3_scy_ref_2162[0]), 1);
					
				local4_size_2155 = 20;
				case 10831:
					if (!((((local3_scx_ref_2161[0]) > (240)) ? 1 : 0))) { __pc = 10826; break; }
				
				case 10830:
					local4_size_2155 = 28;
					
				
				
			case 10826: //dummy jumper1
				;
					
				case 10840:
					if (!((((local3_scx_ref_2161[0]) > (320)) ? 1 : 0))) { __pc = 10835; break; }
				
				case 10839:
					local4_size_2155 = 36;
					
				
				
			case 10835: //dummy jumper1
				;
					
				
				__pc = 16893;
				break;
				
			case 10812: //dummy jumper1
				
				case 10854:
					func16_DDgui_pushdialog(CAST2INT(((((local3_scx_ref_2161[0]) - (local4_size_2155))) / (2))), CAST2INT(((((local3_scy_ref_2162[0]) - (local4_size_2155))) / (2))), local4_size_2155, local4_size_2155, 0);
					
				local3_scy_ref_2162[0] = local4_size_2155;
				local3_scx_ref_2161[0] = local4_size_2155;
				local4_size_2155 = 20;
				case 10872:
					if (!((((local3_scx_ref_2161[0]) > (240)) ? 1 : 0))) { __pc = 10867; break; }
				
				case 10871:
					local4_size_2155 = 28;
					
				
				
			case 10867: //dummy jumper1
				;
					
				case 10881:
					if (!((((local3_scx_ref_2161[0]) > (320)) ? 1 : 0))) { __pc = 10876; break; }
				
				case 10880:
					local4_size_2155 = 36;
					
				
				
			case 10876: //dummy jumper1
				;
					
				
				
			case 16893: //dummy jumper2
				;
				
			global18_DDGUI_IN_INPUT_DLG = 1;
			func9_DDgui_set("tx_text", "TEXT", param8_text_Str);
			func9_DDgui_set("tab", "SELECT", CAST2STRING(2));
			case 10902:
				if (!(param9_bIsNumber)) { __pc = 10896; break; }
				
				case 10901:
					func9_DDgui_set("tab", "SELECT", CAST2STRING(0));
					
				
				
			case 10896: //dummy jumper1
				;
				
			case 10926:
				if (!((((param11_bSingleLine) || (((((((INSTR(param8_text_Str, "\n", 0)) < (0)) ? 1 : 0)) && (((((param8_text_Str).length) < (40)) ? 1 : 0))) ? 1 : 0))) ? 1 : 0))) { __pc = 10915; break; }
				
				case 10920:
					func9_DDgui_set("tx_text", "SELSTART", CAST2STRING(0));
					
				func9_DDgui_set("tx_text", "SELEND", CAST2STRING((param8_text_Str).length));
				
				
			case 10915: //dummy jumper1
				;
				
			case 10927:
				//label: refresh;
				
			param8_text_Str = func13_DDgui_get_Str("tx_text", "TEXT");
			local4_ssel_2158 = ~~(func9_DDgui_get("tx_text", "SELSTART"));
			local4_esel_2159 = ~~(func9_DDgui_get("tx_text", "SELEND"));
			local7_iTabSel_2156 = ~~(func9_DDgui_get("tab", "SELECT"));
			func10_DDgui_init();
			local5_texth_2164 = ((((local3_scy_ref_2162[0]) - (((6) * (((local4_size_2155) + (2))))))) - (32));
			case 11001:
				if (!(param11_bSingleLine)) { __pc = 10965; break; }
				
				case 10969:
					local5_texth_2164 = 0;
					
				case 10990:
					if (!(param9_bIsNumber)) { __pc = 10971; break; }
				
				case 10980:
					func16_DDgui_numbertext("tx_text", param8_text_Str, ((local3_scx_ref_2161[0]) - (MAX(32, unref(local2_fx_ref_2153[0])))));
					
				
				__pc = 16901;
				break;
				
			case 10971: //dummy jumper1
				
				case 10989:
					func16_DDgui_singletext("tx_text", param8_text_Str, ((local3_scx_ref_2161[0]) - (MAX(32, unref(local2_fx_ref_2153[0])))));
					
				
				
			case 16901: //dummy jumper2
				;
					
				
				__pc = 16900;
				break;
				
			case 10965: //dummy jumper1
				
				case 11000:
					func10_DDgui_text("tx_text", param8_text_Str, ((local3_scx_ref_2161[0]) - (MAX(32, unref(local2_fx_ref_2153[0])))), local5_texth_2164);
					
				
				
			case 16900: //dummy jumper2
				;
				
			func9_DDgui_set("tx_text", "ALIGN", CAST2STRING(0));
			func12_DDgui_spacer(10000, 2);
			func9_DDgui_set("tab", "SELECT", CAST2STRING(local7_iTabSel_2156));
			func9_DDgui_set("tx_text", "SELSTART", CAST2STRING(local4_ssel_2158));
			func9_DDgui_set("tx_text", "SELEND", CAST2STRING(local4_esel_2159));
			case 11042:
				if (!(param9_bIsNumber)) { __pc = 11022; break; }
				
				case 11027:
					func9_DDgui_tab("tab", "123", local4_size_2155);
					
				
				__pc = 16902;
				break;
				
			case 11022: //dummy jumper1
				
				case 11041:
					if (!(param13_bSpecialChars)) { __pc = 11030; break; }
				
				case 11035:
					func9_DDgui_tab("tab", "123|ABC|abc|ÄÖÜ", local4_size_2155);
					
				
				__pc = 16903;
				break;
				
			case 11030: //dummy jumper1
				
				case 11040:
					func9_DDgui_tab("tab", "123|ABC|abc", local4_size_2155);
					
				
				
			case 16903: //dummy jumper2
				;
					
				
				
			case 16902: //dummy jumper2
				;
				
			func16_DDgui_framestart("fr_keypad", "", 0);
			case 11930:
				if (!(param9_bIsNumber)) { __pc = 11046; break; }
				
				case 11052:
					func12_DDgui_button("b7", "7", local4_size_2155, local4_size_2155);
					
				func12_DDgui_button("b8", "8", local4_size_2155, local4_size_2155);
				func12_DDgui_button("b9", "9", local4_size_2155, local4_size_2155);
				func12_DDgui_button("b-", "-", local4_size_2155, local4_size_2155);
				func12_DDgui_spacer(10000, 0);
				func12_DDgui_button("b4", "4", local4_size_2155, local4_size_2155);
				func12_DDgui_button("b5", "5", local4_size_2155, local4_size_2155);
				func12_DDgui_button("b6", "6", local4_size_2155, local4_size_2155);
				func12_DDgui_button("be", "e", local4_size_2155, local4_size_2155);
				func12_DDgui_spacer(10000, 0);
				func12_DDgui_button("b1", "1", local4_size_2155, local4_size_2155);
				func12_DDgui_button("b2", "2", local4_size_2155, local4_size_2155);
				func12_DDgui_button("b3", "3", local4_size_2155, local4_size_2155);
				func12_DDgui_spacer(10000, 0);
				func12_DDgui_button("b0", "0", ((((local4_size_2155) * (2))) + (2)), local4_size_2155);
				func12_DDgui_button("b.", ".", local4_size_2155, local4_size_2155);
				func12_DDgui_button("b\b", "<-", ((((local4_size_2155) * (2))) + (2)), local4_size_2155);
				
				__pc = 16904;
				break;
				
			case 11046: //dummy jumper1
				
				case 11137:
					
				var local16___SelectHelper7__2165 = 0;
				case 11139:
					local16___SelectHelper7__2165 = local7_iTabSel_2156;
					
				case 11929:
					if (!((((local16___SelectHelper7__2165) == (0)) ? 1 : 0))) { __pc = 11141; break; }
				
				case 11147:
					func12_DDgui_button("b@", "@", local4_size_2155, local4_size_2155);
					
				func12_DDgui_button("b#", "#", local4_size_2155, local4_size_2155);
				func12_DDgui_button("b[", "[", local4_size_2155, local4_size_2155);
				func12_DDgui_button("b]", "]", local4_size_2155, local4_size_2155);
				func12_DDgui_button("b~", "~", local4_size_2155, local4_size_2155);
				func12_DDgui_button("b7", "7", local4_size_2155, local4_size_2155);
				func12_DDgui_button("b8", "8", local4_size_2155, local4_size_2155);
				func12_DDgui_button("b9", "9", local4_size_2155, local4_size_2155);
				func12_DDgui_button("b/", "/", local4_size_2155, local4_size_2155);
				func12_DDgui_button("b*", "*", local4_size_2155, local4_size_2155);
				func12_DDgui_spacer(10000, 0);
				func12_DDgui_button("b?", "?", local4_size_2155, local4_size_2155);
				func12_DDgui_button("b!", "!", local4_size_2155, local4_size_2155);
				func12_DDgui_button("b{", "{", local4_size_2155, local4_size_2155);
				func12_DDgui_button("b}", "}", local4_size_2155, local4_size_2155);
				func12_DDgui_button("b=", "=", local4_size_2155, local4_size_2155);
				func12_DDgui_button("b4", "4", local4_size_2155, local4_size_2155);
				func12_DDgui_button("b5", "5", local4_size_2155, local4_size_2155);
				func12_DDgui_button("b6", "6", local4_size_2155, local4_size_2155);
				func12_DDgui_button("b-", "-", local4_size_2155, local4_size_2155);
				func12_DDgui_button("b+", "+", local4_size_2155, local4_size_2155);
				func12_DDgui_spacer(10000, 0);
				func12_DDgui_button("b:", ":", local4_size_2155, local4_size_2155);
				func12_DDgui_button("b;", ";", local4_size_2155, local4_size_2155);
				func12_DDgui_button("b(", "(", local4_size_2155, local4_size_2155);
				func12_DDgui_button("b)", ")", local4_size_2155, local4_size_2155);
				func12_DDgui_button("b0", "0", local4_size_2155, local4_size_2155);
				func12_DDgui_button("b1", "1", local4_size_2155, local4_size_2155);
				func12_DDgui_button("b2", "2", local4_size_2155, local4_size_2155);
				func12_DDgui_button("b3", "3", local4_size_2155, local4_size_2155);
				func12_DDgui_button("b\b", "<-", ((((local4_size_2155) * (2))) + (2)), local4_size_2155);
				func12_DDgui_spacer(10000, 0);
				func12_DDgui_button("b,", ",", local4_size_2155, local4_size_2155);
				func12_DDgui_button("b.", ".", local4_size_2155, local4_size_2155);
				func12_DDgui_button("b<", "<", local4_size_2155, local4_size_2155);
				func12_DDgui_button("b>", ">", local4_size_2155, local4_size_2155);
				func12_DDgui_button("b'", "'", local4_size_2155, local4_size_2155);
				func12_DDgui_button("b\"", "\"", local4_size_2155, local4_size_2155);
				func12_DDgui_button("b ", "", ((((local4_size_2155) * (2))) + (2)), local4_size_2155);
				func12_DDgui_button("b\n", CHR_Str(182), ((((local4_size_2155) * (2))) + (2)), local4_size_2155);
				
				
			case 11141: //dummy jumper1
				if (!((((local16___SelectHelper7__2165) == (1)) ? 1 : 0))) { __pc = 11351; break; }
				
				case 11357:
					func12_DDgui_button("bQ", "Q", local4_size_2155, local4_size_2155);
					
				func12_DDgui_button("bW", "W", local4_size_2155, local4_size_2155);
				func12_DDgui_button("bE", "E", local4_size_2155, local4_size_2155);
				func12_DDgui_button("bR", "R", local4_size_2155, local4_size_2155);
				func12_DDgui_button("bT", "T", local4_size_2155, local4_size_2155);
				func12_DDgui_button("bY", "Y", local4_size_2155, local4_size_2155);
				func12_DDgui_button("bU", "U", local4_size_2155, local4_size_2155);
				func12_DDgui_button("bI", "I", local4_size_2155, local4_size_2155);
				func12_DDgui_button("bO", "O", local4_size_2155, local4_size_2155);
				func12_DDgui_button("bP", "P", local4_size_2155, local4_size_2155);
				func12_DDgui_spacer(10000, 0);
				func12_DDgui_button("bA", "A", local4_size_2155, local4_size_2155);
				func12_DDgui_button("bS", "S", local4_size_2155, local4_size_2155);
				func12_DDgui_button("bD", "D", local4_size_2155, local4_size_2155);
				func12_DDgui_button("bF", "F", local4_size_2155, local4_size_2155);
				func12_DDgui_button("bG", "G", local4_size_2155, local4_size_2155);
				func12_DDgui_button("bH", "H", local4_size_2155, local4_size_2155);
				func12_DDgui_button("bJ", "J", local4_size_2155, local4_size_2155);
				func12_DDgui_button("bK", "K", local4_size_2155, local4_size_2155);
				func12_DDgui_button("bL", "L", local4_size_2155, local4_size_2155);
				func12_DDgui_button("b,", ",", local4_size_2155, local4_size_2155);
				func12_DDgui_spacer(10000, 0);
				func12_DDgui_button("bShift", "^", local4_size_2155, local4_size_2155);
				func12_DDgui_button("bZ", "Z", local4_size_2155, local4_size_2155);
				func12_DDgui_button("bX", "X", local4_size_2155, local4_size_2155);
				func12_DDgui_button("bC", "C", local4_size_2155, local4_size_2155);
				func12_DDgui_button("bV", "V", local4_size_2155, local4_size_2155);
				func12_DDgui_button("bB", "B", local4_size_2155, local4_size_2155);
				func12_DDgui_button("bN", "N", local4_size_2155, local4_size_2155);
				func12_DDgui_button("bM", "M", local4_size_2155, local4_size_2155);
				func12_DDgui_button("b\b", "<-", ((((local4_size_2155) * (2))) + (2)), local4_size_2155);
				func12_DDgui_spacer(10000, 0);
				func12_DDgui_button("b,", ",", local4_size_2155, local4_size_2155);
				func12_DDgui_button("b.", ".", local4_size_2155, local4_size_2155);
				func12_DDgui_button("b ", "", ((((local4_size_2155) * (6))) + (10)), local4_size_2155);
				func12_DDgui_button("b\n", CHR_Str(182), ((((local4_size_2155) * (2))) + (2)), local4_size_2155);
				
				
			case 11351: //dummy jumper1
				if (!((((local16___SelectHelper7__2165) == (2)) ? 1 : 0))) { __pc = 11541; break; }
				
				case 11547:
					func12_DDgui_button("bq", "q", local4_size_2155, local4_size_2155);
					
				func12_DDgui_button("bw", "w", local4_size_2155, local4_size_2155);
				func12_DDgui_button("be", "e", local4_size_2155, local4_size_2155);
				func12_DDgui_button("br", "r", local4_size_2155, local4_size_2155);
				func12_DDgui_button("bt", "t", local4_size_2155, local4_size_2155);
				func12_DDgui_button("by", "y", local4_size_2155, local4_size_2155);
				func12_DDgui_button("bu", "u", local4_size_2155, local4_size_2155);
				func12_DDgui_button("bi", "i", local4_size_2155, local4_size_2155);
				func12_DDgui_button("bo", "o", local4_size_2155, local4_size_2155);
				func12_DDgui_button("bp", "p", local4_size_2155, local4_size_2155);
				func12_DDgui_spacer(10000, 0);
				func12_DDgui_button("ba", "a", local4_size_2155, local4_size_2155);
				func12_DDgui_button("bs", "s", local4_size_2155, local4_size_2155);
				func12_DDgui_button("bd", "d", local4_size_2155, local4_size_2155);
				func12_DDgui_button("bf", "f", local4_size_2155, local4_size_2155);
				func12_DDgui_button("bg", "g", local4_size_2155, local4_size_2155);
				func12_DDgui_button("bh", "h", local4_size_2155, local4_size_2155);
				func12_DDgui_button("bj", "j", local4_size_2155, local4_size_2155);
				func12_DDgui_button("bk", "k", local4_size_2155, local4_size_2155);
				func12_DDgui_button("bl", "l", local4_size_2155, local4_size_2155);
				func12_DDgui_button("b,", ",", local4_size_2155, local4_size_2155);
				func12_DDgui_spacer(10000, 0);
				func12_DDgui_button("bShift", "^", local4_size_2155, local4_size_2155);
				func12_DDgui_button("bz", "z", local4_size_2155, local4_size_2155);
				func12_DDgui_button("bx", "x", local4_size_2155, local4_size_2155);
				func12_DDgui_button("bc", "c", local4_size_2155, local4_size_2155);
				func12_DDgui_button("bv", "v", local4_size_2155, local4_size_2155);
				func12_DDgui_button("bb", "b", local4_size_2155, local4_size_2155);
				func12_DDgui_button("bn", "n", local4_size_2155, local4_size_2155);
				func12_DDgui_button("bm", "m", local4_size_2155, local4_size_2155);
				func12_DDgui_button("b\b", "<-", ((((local4_size_2155) * (2))) + (2)), local4_size_2155);
				func12_DDgui_spacer(10000, 0);
				func12_DDgui_button("b,", ",", local4_size_2155, local4_size_2155);
				func12_DDgui_button("b.", ".", local4_size_2155, local4_size_2155);
				func12_DDgui_button("b ", "", ((((local4_size_2155) * (6))) + (10)), local4_size_2155);
				func12_DDgui_button("b\n", CHR_Str(182), ((((local4_size_2155) * (2))) + (2)), local4_size_2155);
				
				
			case 11541: //dummy jumper1
				if (!((((local16___SelectHelper7__2165) == (3)) ? 1 : 0))) { __pc = 11731; break; }
				
				case 11737:
					func12_DDgui_button("bá", "á", local4_size_2155, local4_size_2155);
					
				func12_DDgui_button("bé", "é", local4_size_2155, local4_size_2155);
				func12_DDgui_button("bí", "í", local4_size_2155, local4_size_2155);
				func12_DDgui_button("bó", "ó", local4_size_2155, local4_size_2155);
				func12_DDgui_button("bú", "ú", local4_size_2155, local4_size_2155);
				func12_DDgui_button("bÁ", "Á", local4_size_2155, local4_size_2155);
				func12_DDgui_button("bÉ", "É", local4_size_2155, local4_size_2155);
				func12_DDgui_button("bÍ", "Í", local4_size_2155, local4_size_2155);
				func12_DDgui_button("bÓ", "Ó", local4_size_2155, local4_size_2155);
				func12_DDgui_button("bÚ", "Ú", local4_size_2155, local4_size_2155);
				func12_DDgui_spacer(10000, 0);
				func12_DDgui_button("bà", "à", local4_size_2155, local4_size_2155);
				func12_DDgui_button("bè", "è", local4_size_2155, local4_size_2155);
				func12_DDgui_button("bì", "ì", local4_size_2155, local4_size_2155);
				func12_DDgui_button("bò", "ò", local4_size_2155, local4_size_2155);
				func12_DDgui_button("bù", "ù", local4_size_2155, local4_size_2155);
				func12_DDgui_button("b2", "À", local4_size_2155, local4_size_2155);
				func12_DDgui_button("b3", "È", local4_size_2155, local4_size_2155);
				func12_DDgui_button("b2", "Ì", local4_size_2155, local4_size_2155);
				func12_DDgui_button("b2", "Ò", local4_size_2155, local4_size_2155);
				func12_DDgui_button("b3", "Ù", local4_size_2155, local4_size_2155);
				func12_DDgui_spacer(10000, 0);
				func12_DDgui_button("bä", "ä", local4_size_2155, local4_size_2155);
				func12_DDgui_button("bö", "ö", local4_size_2155, local4_size_2155);
				func12_DDgui_button("bü", "ü", local4_size_2155, local4_size_2155);
				func12_DDgui_button("bÄ", "Ä", local4_size_2155, local4_size_2155);
				func12_DDgui_button("bÖ", "Ö", local4_size_2155, local4_size_2155);
				func12_DDgui_button("bÜ", "Ü", local4_size_2155, local4_size_2155);
				func12_DDgui_button("bß", "ß", local4_size_2155, local4_size_2155);
				func12_DDgui_button("bß", "ß", local4_size_2155, local4_size_2155);
				func12_DDgui_button("b\b", "<-", ((((local4_size_2155) * (2))) + (2)), local4_size_2155);
				func12_DDgui_spacer(10000, 0);
				func12_DDgui_button("b´", "´", local4_size_2155, local4_size_2155);
				func12_DDgui_button("b`", "`", local4_size_2155, local4_size_2155);
				func12_DDgui_button("b° ", "°", local4_size_2155, local4_size_2155);
				func12_DDgui_button("b ", "", ((((local4_size_2155) * (5))) + (8)), local4_size_2155);
				func12_DDgui_button("b\n", CHR_Str(182), ((((local4_size_2155) * (2))) + (2)), local4_size_2155);
				func9_DDgui_set("b\n", "TEXT", "Enter");
				
				
			case 11731: //dummy jumper1
				;
					
				
				;
					
				
				
			case 16904: //dummy jumper2
				;
				
			func14_DDgui_frameend();
			func9_DDgui_set("fr_keypad", "ALIGN", CAST2STRING(0));
			local10_cancel_Str_2166 = "Cancel";
			case 11949:
				if (!((((PLATFORMINFO_Str("LOCALE")) == ("de")) ? 1 : 0))) { __pc = 11944; break; }
				
				case 11948:
					local10_cancel_Str_2166 = "Abbrechen";
					
				
				
			case 11944: //dummy jumper1
				;
				
			func12_DDgui_spacer(10000, 0);
			func16_DDgui_framestart("fr_okpad", "", 0);
			func12_DDgui_button("btOK", "OK", 0, local4_size_2155);
			func12_DDgui_spacer(16, 1);
			func12_DDgui_button("btCancel", local10_cancel_Str_2166, 0, local4_size_2155);
			func14_DDgui_frameend();
			func9_DDgui_set("fr_okpad", "ALIGN", CAST2STRING(0));
			DIM(local8_widg_Str_2160, [0], "");
			case 12023:
				var forEachSaver12023 = global11_ddgui_stack_ref[0].arrAccess(((BOUNDS(global11_ddgui_stack_ref[0], 0)) - (1))).values[tmpPositionCache][0].attr7_widgets_ref[0];
				var forEachCounter12023 = 0
				
			case 11990: //dummy for1
				if (!(forEachCounter12023 < forEachSaver12023.values.length)) {__pc = 11979; break;}
				var local1_w_ref_2168 = forEachSaver12023.values[forEachCounter12023];
				
				
				case 12022:
					if (!((((((((local1_w_ref_2168[0].attr7_wid_Str).length) == (2)) ? 1 : 0)) && ((((MID_Str(local1_w_ref_2168[0].attr7_wid_Str, 0, 1)) == ("b")) ? 1 : 0))) ? 1 : 0))) { __pc = 12007; break; }
				
				case 12014:
					DIMPUSH(local8_widg_Str_2160, local1_w_ref_2168[0].attr7_wid_Str);
					
				local1_w_ref_2168[0].attr11_tiptext_Str_ref[0] = local1_w_ref_2168[0].attr9_wtext_Str_ref[0];
				
				
			case 12007: //dummy jumper1
				;
					
				
				forEachSaver12023.values[forEachCounter12023] = local1_w_ref_2168;
				
				forEachCounter12023++
				__pc = 11990; break; //back jump
				
			case 11979: //dummy for
				;
				
			func9_DDgui_set("", "FOCUS", "tx_text");
			func10_DDgui_show(1);
			case 12158:
				if (!(1)) {__pc = 16908; break;}
				
				var local10_tab_change_2169 = 0;
				case 12038:
					local10_tab_change_2169 = ~~(func9_DDgui_get("tab", "CLICKED"));
					
				func9_DDgui_set("", "FOCUS", "tx_text");
				func10_DDgui_show(1);
				case 12050:
					if (!(local10_tab_change_2169)) { __pc = 12047; break; }
				
				case 12049:
					__pc = __labels["refresh"]; break;
					
				
				
			case 12047: //dummy jumper1
				;
					
				case 12086:
					var forEachSaver12086 = local8_widg_Str_2160;
				var forEachCounter12086 = 0
				
			case 12054: //dummy for1
				if (!(forEachCounter12086 < forEachSaver12086.values.length)) {__pc = 12052; break;}
				var local5_w_Str_2170 = forEachSaver12086.values[forEachCounter12086];
				
				
				case 12085:
					if (!(func9_DDgui_get(local5_w_Str_2170, "CLICKED"))) { __pc = 12058; break; }
				
				case 12066:
					func9_DDgui_set("", "INKEY", MID_Str(local5_w_Str_2170, 1, 1));
					
				case 12083:
					if (!((((func9_DDgui_get("tab", "SELECT")) == (1)) ? 1 : 0))) { __pc = 12073; break; }
				
				case 12078:
					func9_DDgui_set("tab", "SELECT", CAST2STRING(2));
					
				func9_DDgui_set("tab", "CLICKED", CAST2STRING(1));
				
				
			case 12073: //dummy jumper1
				;
					
				case 12084:
					__pc = 12052; break;
					
				
				
			case 12058: //dummy jumper1
				;
					
				
				forEachSaver12086.values[forEachCounter12086] = local5_w_Str_2170;
				
				forEachCounter12086++
				__pc = 12054; break; //back jump
				
			case 12052: //dummy for
				;
					
				case 12136:
					if (!((((((param9_bIsNumber) ? 0 : 1)) && (func9_DDgui_get("bShift", "CLICKED"))) ? 1 : 0))) { __pc = 12094; break; }
				
				var local4_isel_2171 = 0;
				case 12101:
					local4_isel_2171 = ~~(func9_DDgui_get("tab", "SELECT"));
					
				case 12135:
					if (!(((((((local4_isel_2171) < (3)) ? 1 : 0)) && ((((local4_isel_2171) > (0)) ? 1 : 0))) ? 1 : 0))) { __pc = 12110; break; }
				
				case 12116:
					local4_isel_2171 = ((local4_isel_2171) - (1));
					
				local4_isel_2171 = ((1) - (local4_isel_2171));
				local4_isel_2171 = ((1) + (local4_isel_2171));
				func9_DDgui_set("tab", "SELECT", CAST2STRING(local4_isel_2171));
				func9_DDgui_set("tab", "CLICKED", CAST2STRING(1));
				
				
			case 12110: //dummy jumper1
				;
					
				
				
			case 12094: //dummy jumper1
				;
					
				case 12147:
					if (!(func9_DDgui_get("btOK", "CLICKED"))) { __pc = 12139; break; }
				
				case 12145:
					param8_text_Str = func13_DDgui_get_Str("tx_text", "TEXT");
					
				case 12146:
					__pc = 16908; break;
					
				
				
			case 12139: //dummy jumper1
				;
					
				case 12156:
					if (!(func9_DDgui_get("btCancel", "CLICKED"))) { __pc = 12150; break; }
				
				case 12154:
					param8_text_Str = local12_text_old_Str_2157;
					
				case 12155:
					__pc = 16908; break;
					
				
				
			case 12150: //dummy jumper1
				;
					
				SHOWSCREEN();
				
				__pc = 12158; break; //back jump
				
			case 16908:
				;
				
			func15_DDgui_popdialog();
			global18_DDGUI_IN_INPUT_DLG = 0;
			global25_gDDguiMinControlDimension = local12_storeoldsize_2163;
			return tryClone(param8_text_Str);
			return "";
			__pc = -1; break;
			default:
				throwError("Gotocounter exception pc: "+__pc);
			
		}
	}
};
window['func20_DDgui_FileDialog_Str'] = function(param5_bOpen, param13_filterstr_Str, param10_initialise) {
	var __labels = {"__DrawFrames__": 3476, "refresh_fd": 12222};
	
	var local12_startdir_Str_2175 = "", local8_cdir_Str_2176 = "", local9_bread_Str_2177 = new GLBArray(), local7_pre_Str_2178 = "", local9_files_Str_2179 = new GLBArray(), local8_num_file_2180 = 0, local7_num_dir_2181 = 0, local11_outfile_Str_2182 = "", local12_bBreadcrumbs_2183 = 0, local3_scx_ref_2184 = [0], local3_scy_ref_2185 = [0], local11_caption_Str_2186 = "", local7_tmp_Str_2188 = "", local2_ok_2191 = 0;
	var __pc = 12173;
	while(__pc >= 0) {
		switch(__pc) {
			case 12173:
				local12_startdir_Str_2175 = GETCURRENTDIR_Str();
				
			local8_cdir_Str_2176 = local12_startdir_Str_2175;
			local12_bBreadcrumbs_2183 = 0;
			GETSCREENSIZE(local3_scx_ref_2184, local3_scy_ref_2185);
			local3_scx_ref_2184[0] = MIN(480, unref(local3_scx_ref_2184[0]));
			local3_scy_ref_2185[0] = MIN(480, unref(local3_scy_ref_2185[0]));
			case 12215:
				if (!(((((((local3_scx_ref_2184[0]) > (400)) ? 1 : 0)) && ((((local3_scy_ref_2185[0]) > (400)) ? 1 : 0))) ? 1 : 0))) { __pc = 12210; break; }
				
				case 12214:
					local12_bBreadcrumbs_2183 = 1;
					
				
				
			case 12210: //dummy jumper1
				;
				
			func16_DDgui_pushdialog(0, 0, unref(local3_scx_ref_2184[0]), unref(local3_scy_ref_2185[0]), 1);
			case 12222:
				//label: refresh_fd;
				
			func10_DDgui_init();
			func9_DDgui_set("", "MOVEABLE", CAST2STRING(1));
			func9_DDgui_set("", "SCALEABLE", CAST2STRING(0));
			local11_caption_Str_2186 = "Pick a file:";
			case 12245:
				if (!((((PLATFORMINFO_Str("LOCALE")) == ("de")) ? 1 : 0))) { __pc = 12240; break; }
				
				case 12244:
					local11_caption_Str_2186 = "Datei auswählen:";
					
				
				
			case 12240: //dummy jumper1
				;
				
			func9_DDgui_set("", "TEXT", local11_caption_Str_2186);
			local8_cdir_Str_2176 = GETCURRENTDIR_Str();
			case 12259:
				if (!((((param10_initialise) == (1)) ? 1 : 0))) { __pc = 12256; break; }
				
				case 12258:
					func10_DDgui_init();
					
				
				
			case 12256: //dummy jumper1
				;
				
			case 12314:
				if (!((((MID_Str(local8_cdir_Str_2176, 1, 1)) == (":")) ? 1 : 0))) { __pc = 12266; break; }
				
				case 12273:
					local7_pre_Str_2178 = MID_Str(local8_cdir_Str_2176, 0, 2);
					
				local8_cdir_Str_2176 = MID_Str(local8_cdir_Str_2176, 2, -(1));
				
				__pc = 16919;
				break;
				
			case 12266: //dummy jumper1
				if (!(((((((MID_Str(local8_cdir_Str_2176, 1, 1)) == ("/")) ? 1 : 0)) || ((((MID_Str(local8_cdir_Str_2176, 0, 1)) == ("~")) ? 1 : 0))) ? 1 : 0))) { __pc = 12292; break; }
				
				case 12299:
					local7_pre_Str_2178 = MID_Str(local8_cdir_Str_2176, 0, 1);
					
				local8_cdir_Str_2176 = MID_Str(local8_cdir_Str_2176, 1, -(1));
				
				__pc = 16919;
				break;
				
			case 12292: //dummy jumper1
				
				case 12308:
					local7_pre_Str_2178 = "";
					
				local8_cdir_Str_2176 = MID_Str(local8_cdir_Str_2176, 1, -(1));
				
				
			case 16919: //dummy jumper2
				;
				
			SPLITSTR(local8_cdir_Str_2176, unref(local9_bread_Str_2177), "/", 1);
			case 12349:
				if (!(local12_bBreadcrumbs_2183)) { __pc = 12321; break; }
				
				case 12323:
					
				var local1_i_2187 = 0;
				case 12345:
					local1_i_2187 = 0
				
			case 12326: //dummy for1
				if (!toCheck(local1_i_2187, ((BOUNDS(local9_bread_Str_2177, 0)) - (1)), 1)) {__pc = 12333; break;}
				
				case 12344:
					func12_DDgui_button((("bt_br") + (CAST2STRING(local1_i_2187))), local9_bread_Str_2177.arrAccess(local1_i_2187).values[tmpPositionCache], 0, 0);
					
				
				local1_i_2187 += 1;
				__pc = 12326; break; //back jump
				
			case 12333: //dummy for
				;
					
				
				;
					
				func12_DDgui_spacer(1000, 4);
				
				
			case 12321: //dummy jumper1
				;
				
			local8_num_file_2180 = ~~(GETFILELIST(param13_filterstr_Str, unref(local9_files_Str_2179)));
			local7_num_dir_2181 = INTEGER(CAST2INT(((local8_num_file_2180) / (65536))));
			local8_num_file_2180 = MOD(local8_num_file_2180, 65536);
			
				var local1_i_2189 = 0;
				case 12414:
					local1_i_2189 = 0
				
			case 12372: //dummy for1
				if (!toCheck(local1_i_2189, ((local7_num_dir_2181) - (1)), 1)) {__pc = 12376; break;}
				
				case 12400:
					if (!((((local9_files_Str_2179.arrAccess(local1_i_2189).values[tmpPositionCache]) == (".")) ? 1 : 0))) { __pc = 12383; break; }
				
				case 12388:
					DIMDEL(local9_files_Str_2179, local1_i_2189);
					
				local7_num_dir_2181+=-(1);
				local1_i_2189+=-(1);
				case 12399:
					__pc = 12372; break;
					
				
				
			case 12383: //dummy jumper1
				;
					
				case 12408:
					if (!((local7_tmp_Str_2188).length)) { __pc = 12403; break; }
				
				case 12407:
					local7_tmp_Str_2188+="|";
					
				
				
			case 12403: //dummy jumper1
				;
					
				local7_tmp_Str_2188+=local9_files_Str_2179.arrAccess(local1_i_2189).values[tmpPositionCache];
				
				local1_i_2189 += 1;
				__pc = 12372; break; //back jump
				
			case 12376: //dummy for
				;
					
				
				;
			func11_DDgui_combo("ls_dir", local7_tmp_Str_2188, ((local3_scx_ref_2184[0]) - (20)), 0);
			func9_DDgui_set("ls_dir", "SELECT", CAST2STRING(-(1)));
			func12_DDgui_spacer(1000, 4);
			local7_tmp_Str_2188 = "";
			
				var local1_i_2190 = 0;
				case 12458:
					local1_i_2190 = 0
				
			case 12436: //dummy for1
				if (!toCheck(local1_i_2190, ((local8_num_file_2180) - (1)), 1)) {__pc = 12440; break;}
				
				case 12450:
					if (!((((local1_i_2190) > (0)) ? 1 : 0))) { __pc = 12445; break; }
				
				case 12449:
					local7_tmp_Str_2188+="|";
					
				
				
			case 12445: //dummy jumper1
				;
					
				local7_tmp_Str_2188+=local9_files_Str_2179.arrAccess(((local1_i_2190) + (local7_num_dir_2181))).values[tmpPositionCache];
				
				local1_i_2190 += 1;
				__pc = 12436; break; //back jump
				
			case 12440: //dummy for
				;
					
				
				;
			func10_DDgui_list("ls_file", local7_tmp_Str_2188, ((local3_scx_ref_2184[0]) - (20)), ((((local3_scy_ref_2185[0]) - (120))) - (((local12_bBreadcrumbs_2183) * (64)))));
			func9_DDgui_set("ls_file", "SELECT", CAST2STRING(-(1)));
			func12_DDgui_spacer(1000, 4);
			func16_DDgui_singletext("tx_file", "", ((local3_scx_ref_2184[0]) - (20)));
			func12_DDgui_spacer(1000, 4);
			func12_DDgui_button("bt_ok", "OK", 0, 0);
			func12_DDgui_button("bt_cancel", "Cancel", 0, 0);
			local2_ok_2191 = 0;
			case 12807:
				if (!(1)) {__pc = 16924; break;}
				
				case 12509:
					func10_DDgui_show(0);
					
				case 12571:
					if (!(local12_bBreadcrumbs_2183)) { __pc = 12511; break; }
				
				case 12513:
					
				var local1_i_2192 = 0;
				case 12570:
					local1_i_2192 = 0
				
			case 12516: //dummy for1
				if (!toCheck(local1_i_2192, ((BOUNDS(local9_bread_Str_2177, 0)) - (1)), 1)) {__pc = 12523; break;}
				
				case 12569:
					if (!(func9_DDgui_get((("bt_br") + (CAST2STRING(local1_i_2192))), "CLICKED"))) { __pc = 12530; break; }
				
				case 12534:
					local8_cdir_Str_2176 = local7_pre_Str_2178;
					
				
				var local1_j_2193 = 0;
				case 12550:
					local1_j_2193 = 0
				
			case 12538: //dummy for1
				if (!toCheck(local1_j_2193, local1_i_2192, 1)) {__pc = 12540; break;}
				
				case 12544:
					local8_cdir_Str_2176+="/";
					
				local8_cdir_Str_2176+=local9_bread_Str_2177.arrAccess(local1_j_2193).values[tmpPositionCache];
				
				local1_j_2193 += 1;
				__pc = 12538; break; //back jump
				
			case 12540: //dummy for
				;
					
				
				;
				case 12565:
					if (!((((MID_Str(local8_cdir_Str_2176, (((local8_cdir_Str_2176).length) - (1)), 1)) == (":")) ? 1 : 0))) { __pc = 12560; break; }
				
				case 12564:
					local8_cdir_Str_2176+="/";
					
				
				
			case 12560: //dummy jumper1
				;
					
				SETCURRENTDIR(local8_cdir_Str_2176);
				case 12568:
					__pc = __labels["refresh_fd"]; break;
					
				
				
			case 12530: //dummy jumper1
				;
					
				
				local1_i_2192 += 1;
				__pc = 12516; break; //back jump
				
			case 12523: //dummy for
				;
					
				
				;
					
				
				
			case 12511: //dummy jumper1
				;
					
				case 12669:
					if (!(func9_DDgui_get("ls_dir", "CLICKED"))) { __pc = 12574; break; }
				
				var local3_sel_2194 = 0;
				case 12581:
					local3_sel_2194 = ~~(func9_DDgui_get("ls_dir", "SELECT"));
					
				local8_cdir_Str_2176 = local7_pre_Str_2178;
				
				var local1_i_2195 = 0;
				case 12606:
					local1_i_2195 = 0
				
			case 12589: //dummy for1
				if (!toCheck(local1_i_2195, ((BOUNDS(local9_bread_Str_2177, 0)) - (2)), 1)) {__pc = 12596; break;}
				
				case 12600:
					local8_cdir_Str_2176+="/";
					
				local8_cdir_Str_2176+=local9_bread_Str_2177.arrAccess(local1_i_2195).values[tmpPositionCache];
				
				local1_i_2195 += 1;
				__pc = 12589; break; //back jump
				
			case 12596: //dummy for
				;
					
				
				;
				case 12650:
					if (!((((local9_files_Str_2179.arrAccess(local3_sel_2194).values[tmpPositionCache]) != ("..")) ? 1 : 0))) { __pc = 12612; break; }
				
				case 12629:
					if (!(BOUNDS(local9_bread_Str_2177, 0))) { __pc = 12618; break; }
				
				case 12628:
					local8_cdir_Str_2176+=(("/") + (local9_bread_Str_2177.arrAccess(-(1)).values[tmpPositionCache]));
					
				
				
			case 12618: //dummy jumper1
				;
					
				local8_cdir_Str_2176+=(("/") + (func21_DDgui_getitemtext_Str("ls_dir", local3_sel_2194)));
				
				
			case 12612: //dummy jumper1
				;
					
				case 12665:
					if (!((((MID_Str(local8_cdir_Str_2176, (((local8_cdir_Str_2176).length) - (1)), 1)) == (":")) ? 1 : 0))) { __pc = 12660; break; }
				
				case 12664:
					local8_cdir_Str_2176+="/";
					
				
				
			case 12660: //dummy jumper1
				;
					
				SETCURRENTDIR(local8_cdir_Str_2176);
				case 12668:
					__pc = __labels["refresh_fd"]; break;
					
				
				
			case 12574: //dummy jumper1
				;
					
				case 12682:
					if (!(func9_DDgui_get("ls_file", "CLICKED"))) { __pc = 12672; break; }
				
				case 12681:
					func9_DDgui_set("tx_file", "TEXT", func21_DDgui_getitemtext_Str("ls_file", ~~(func9_DDgui_get("ls_file", "SELECT"))));
					
				
				
			case 12672: //dummy jumper1
				;
					
				case 12799:
					if (!(func9_DDgui_get("bt_ok", "CLICKED"))) { __pc = 12685; break; }
				
				case 12691:
					local11_outfile_Str_2182 = func13_DDgui_get_Str("tx_file", "TEXT");
					
				case 12797:
					if (!((local11_outfile_Str_2182).length)) { __pc = 12694; break; }
				
				case 12698:
					local8_cdir_Str_2176 = GETCURRENTDIR_Str();
					
				case 12723:
					if (!((((MID_Str(local8_cdir_Str_2176, (((local8_cdir_Str_2176).length) - (1)), 1)) == ("/")) ? 1 : 0))) { __pc = 12708; break; }
				
				case 12714:
					local11_outfile_Str_2182 = ((local8_cdir_Str_2176) + (local11_outfile_Str_2182));
					
				
				__pc = 16935;
				break;
				
			case 12708: //dummy jumper1
				
				case 12722:
					local11_outfile_Str_2182 = ((((local8_cdir_Str_2176) + ("/"))) + (local11_outfile_Str_2182));
					
				
				
			case 16935: //dummy jumper2
				;
					
				case 12796:
					if (!(param5_bOpen)) { __pc = 12725; break; }
				
				case 12734:
					if (!(DOESFILEEXIST(local11_outfile_Str_2182))) { __pc = 12729; break; }
				
				case 12733:
					local2_ok_2191 = 1;
					
				
				
			case 12729: //dummy jumper1
				;
					
				
				__pc = 16936;
				break;
				
			case 12725: //dummy jumper1
				
				var local7_ext_Str_2196 = "", local8_cext_Str_2197 = "";
				case 12745:
					local7_ext_Str_2196 = MID_Str(param13_filterstr_Str, ((INSTR(param13_filterstr_Str, ".", 0)) + (1)), -(1));
					
				local8_cext_Str_2197 = MID_Str(local11_outfile_Str_2182, (((local11_outfile_Str_2182).length) - ((local7_ext_Str_2196).length)), (local7_ext_Str_2196).length);
				case 12774:
					if (!(((((((local7_ext_Str_2196) != ("*")) ? 1 : 0)) && ((((LCASE_Str(local8_cext_Str_2197)) != (LCASE_Str(local7_ext_Str_2196))) ? 1 : 0))) ? 1 : 0))) { __pc = 12767; break; }
				
				case 12773:
					local11_outfile_Str_2182+=((".") + (local7_ext_Str_2196));
					
				
				
			case 12767: //dummy jumper1
				;
					
				case 12795:
					if (!(DOESFILEEXIST(local11_outfile_Str_2182))) { __pc = 12777; break; }
				
				case 12781:
					local2_ok_2191 = 1;
					
				
				__pc = 16939;
				break;
				
			case 12777: //dummy jumper1
				
				case 12794:
					if (!(OPENFILE(1, local11_outfile_Str_2182, 0))) { __pc = 12787; break; }
				
				case 12790:
					CLOSEFILE(1);
					
				local2_ok_2191 = 1;
				
				
			case 12787: //dummy jumper1
				;
					
				
				
			case 16939: //dummy jumper2
				;
					
				
				
			case 16936: //dummy jumper2
				;
					
				
				
			case 12694: //dummy jumper1
				;
					
				case 12798:
					__pc = 16924; break;
					
				
				
			case 12685: //dummy jumper1
				;
					
				case 12805:
					if (!(func9_DDgui_get("bt_cancel", "CLICKED"))) { __pc = 12802; break; }
				
				case 12804:
					__pc = 16924; break;
					
				
				
			case 12802: //dummy jumper1
				;
					
				SHOWSCREEN();
				
				__pc = 12807; break; //back jump
				
			case 16924:
				;
				
			func15_DDgui_popdialog();
			SETCURRENTDIR(local12_startdir_Str_2175);
			case 12816:
				if (!(local2_ok_2191)) { __pc = 12812; break; }
				
				case 12815:
					return tryClone(local11_outfile_Str_2182);
					
				
				
			case 12812: //dummy jumper1
				;
				
			return "";
			return "";
			__pc = -1; break;
			default:
				throwError("Gotocounter exception pc: "+__pc);
			
		}
	}
};
window['func14_DDgui_ColorDlg'] = function(param5_color) {
	var local7_screenx_ref_2199 = [0], local7_screeny_ref_2200 = [0], local2_tx_ref_2201 = [0], local2_ty_ref_2202 = [0], local1_x_2203 = 0, local1_y_2204 = 0, local1_w_2205 = 0, local1_r_2206 = 0.0, local1_g_2207 = 0.0, local1_b_2208 = 0.0, local1_h_2209 = 0.0, local8_oldcolor_2210 = 0;
	local8_oldcolor_2210 = param5_color;
	local1_r_2206 = ((bAND(param5_color, 255)) / (255));
	local1_g_2207 = ((bAND(param5_color, 65280)) / (65280));
	local1_b_2208 = ((bAND(param5_color, 16711680)) / (16711680));
	local1_h_2209 = 0.5;
	GETFONTSIZE(local2_tx_ref_2201, local2_ty_ref_2202);
	GETSCREENSIZE(local7_screenx_ref_2199, local7_screeny_ref_2200);
	func16_DDgui_pushdialog(0, 0, 240, 240, 0);
	func9_DDgui_set("", "MOVEABLE", CAST2STRING(1));
	func9_DDgui_set("", "TEXT", "Color Picker");
	func16_DDgui_framestart("", "", 0);
	func12_DDgui_widget("", "R", 0, 0);
	func12_DDgui_slider("sl_R", local1_r_2206, 0, 0);
	func16_DDgui_numbertext("tx_R", CAST2STRING(INTEGER(((local1_r_2206) * (255.1)))), ((local2_tx_ref_2201[0]) * (3)));
	func9_DDgui_set("tx_R", "READONLY", CAST2STRING(1));
	func9_DDgui_set("tx_R", "STEP", CAST2STRING(16));
	func12_DDgui_spacer(10000, 0);
	func12_DDgui_widget("", "G", 0, 0);
	func12_DDgui_slider("sl_G", local1_g_2207, 0, 0);
	func16_DDgui_numbertext("tx_G", CAST2STRING(INTEGER(((local1_g_2207) * (255.1)))), ((local2_tx_ref_2201[0]) * (3)));
	func9_DDgui_set("tx_G", "READONLY", CAST2STRING(1));
	func9_DDgui_set("tx_G", "STEP", CAST2STRING(16));
	func12_DDgui_spacer(10000, 0);
	func12_DDgui_widget("", "B", 0, 0);
	func12_DDgui_slider("sl_B", local1_b_2208, 0, 0);
	func16_DDgui_numbertext("tx_B", CAST2STRING(INTEGER(((local1_b_2208) * (255.1)))), ((local2_tx_ref_2201[0]) * (3)));
	func9_DDgui_set("tx_B", "READONLY", CAST2STRING(1));
	func9_DDgui_set("tx_B", "STEP", CAST2STRING(16));
	func12_DDgui_spacer(10000, 0);
	func12_DDgui_widget("", "H", 0, 0);
	func12_DDgui_slider("sl_H", local1_h_2209, 0, 0);
	func16_DDgui_numbertext("tx_H", CAST2STRING(INTEGER(((local1_h_2209) * (100.1)))), ((local2_tx_ref_2201[0]) * (3)));
	func9_DDgui_set("tx_H", "READONLY", CAST2STRING(1));
	func9_DDgui_set("tx_H", "STEP", CAST2STRING(6.25));
	func14_DDgui_frameend();
	func12_DDgui_button("bt_col", (("SPR_C") + (CAST2STRING(param5_color))), 32, 128);
	func9_DDgui_set("bt_col", "WIDTH", CAST2STRING(32));
	func9_DDgui_set("bt_col", "READONLY", CAST2STRING(1));
	func12_DDgui_spacer(10000, 0);
	func16_DDgui_framestart("fr_center", "", 0);
	func12_DDgui_button("bt_ok", "OK", 64, 32);
	func12_DDgui_button("bt_cancel", "Cancel", 128, 32);
	func14_DDgui_frameend();
	func9_DDgui_set("fr_center", "ALIGN", CAST2STRING(0));
	while (1) {
		func10_DDgui_show(0);
		if ((((((((((func9_DDgui_get("sl_R", "CLICKED")) || (func9_DDgui_get("sl_G", "CLICKED"))) ? 1 : 0)) || (func9_DDgui_get("sl_B", "CLICKED"))) ? 1 : 0)) || (func9_DDgui_get("sl_H", "CLICKED"))) ? 1 : 0)) {
			local1_r_2206 = func9_DDgui_get("sl_R", "TEXT");
			local1_g_2207 = func9_DDgui_get("sl_G", "TEXT");
			local1_b_2208 = func9_DDgui_get("sl_B", "TEXT");
			local1_h_2209 = ((2) * (func9_DDgui_get("sl_H", "TEXT")));
			if ((((local1_h_2209) <= (1)) ? 1 : 0)) {
				local1_r_2206 = ((local1_h_2209) * (local1_r_2206));
				local1_g_2207 = ((local1_h_2209) * (local1_g_2207));
				local1_b_2208 = ((local1_h_2209) * (local1_b_2208));
				
			} else {
				local1_h_2209 = ((local1_h_2209) - (1));
				local1_r_2206 = MIN(1, MAX(0, ((((local1_h_2209) * (((1) - (local1_r_2206))))) + (local1_r_2206))));
				local1_g_2207 = MIN(1, MAX(0, ((((local1_h_2209) * (((1) - (local1_g_2207))))) + (local1_g_2207))));
				local1_b_2208 = MIN(1, MAX(0, ((((local1_h_2209) * (((1) - (local1_b_2208))))) + (local1_b_2208))));
				
			};
			param5_color = RGB(~~(((local1_r_2206) * (255))), ~~(((local1_g_2207) * (255))), ~~(((local1_b_2208) * (255))));
			func9_DDgui_set("tx_R", "TEXT", CAST2STRING(INTEGER(((local1_r_2206) * (255.1)))));
			func9_DDgui_set("tx_G", "TEXT", CAST2STRING(INTEGER(((local1_g_2207) * (255.1)))));
			func9_DDgui_set("tx_B", "TEXT", CAST2STRING(INTEGER(((local1_b_2208) * (255.1)))));
			func9_DDgui_set("tx_H", "TEXT", CAST2STRING(INTEGER(((local1_h_2209) * (100.1)))));
			func9_DDgui_set("bt_col", "TEXT", (("SPR_C") + (CAST2STRING(param5_color))));
			
		};
		local1_x_2203 = ((global11_ddgui_stack_ref[0].arrAccess(-(1)).values[tmpPositionCache][0].attr4_xpos) + (((local2_tx_ref_2201[0]) * (2))));
		local1_y_2204 = ((global11_ddgui_stack_ref[0].arrAccess(-(1)).values[tmpPositionCache][0].attr4_ypos) + (((local2_ty_ref_2202[0]) * (2))));
		local1_w_2205 = 128;
		local1_h_2209 = 48;
		SHOWSCREEN();
		if (func9_DDgui_get("bt_ok", "CLICKED")) {
			break;
			
		};
		if (func9_DDgui_get("bt_cancel", "CLICKED")) {
			param5_color = local8_oldcolor_2210;
			break;
			
		};
		HIBERNATE();
		
	};
	func15_DDgui_popdialog();
	return tryClone(param5_color);
	return 0;
	
};
window['func18_DDgui_CenterDialog'] = function() {
	var local3_scx_ref_2211 = [0], local3_scy_ref_2212 = [0], local1_w_2213 = 0, local1_h_2214 = 0;
	GETSCREENSIZE(local3_scx_ref_2211, local3_scy_ref_2212);
	local1_w_2213 = ~~(func9_DDgui_get("", "WIDTH"));
	local1_h_2214 = ~~(func9_DDgui_get("", "HEIGHT"));
	func9_DDgui_set("", "XPOS", CAST2STRING(CAST2INT(((((local3_scx_ref_2211[0]) - (local1_w_2213))) / (2)))));
	func9_DDgui_set("", "YPOS", CAST2STRING(CAST2INT(((((local3_scy_ref_2212[0]) - (local1_h_2214))) / (2)))));
	return 0;
	
};
window['method13_type7_TObject_12_ToString_Str'] = function(param4_self) {
	return "Object";
	return "";
	
};
window['method13_type7_TObject_6_Equals'] = function(param3_Obj, param4_self) {
	if ((((param3_Obj) == (param4_self)) ? 1 : 0)) {
		return 1;
		
	} else {
		return tryClone(0);
		
	};
	return 0;
	
};
window['method13_type7_TObject_10_ToHashCode'] = function(param4_self) {
	return 0;
	return 0;
	
};
window['DDgui_userfunction'] = function() {
	return function() { throwError("NullPrototypeException"); };
};
var vtbl_type11_DDGUI_ENTRY = {
	ToString_Str: method13_type7_TObject_12_ToString_Str, 
	Equals: method13_type7_TObject_6_Equals, 
	ToHashCode: method13_type7_TObject_10_ToHashCode
};
/**
* @constructor
*/
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
/**
* @constructor
*/
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
/**
* @constructor
*/
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
/**
* @constructor
*/
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
/**
* @constructor
*/
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
/**
* @constructor
*/
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
static7_DDgui_radio_opt_Str = new GLBArray();
static7_DDgui_handleradio_txt_Str = new GLBArray();
static7_DDgui_list_opt_Str = new GLBArray();
static7_DDgui_drawlist_opt_Str_ref = [new GLBArray()];
static11_ddgui_handletext_st_lasttime = 0, static10_ddgui_handletext_st_lastkey = 0;
static7_DDgui_drawtab_str_Str = new GLBArray(), static8_DDgui_drawtab_str2_Str_ref = [new GLBArray()];
static7_DDgui_handletab_str_Str = new GLBArray(), static8_DDgui_handletab_str2_Str_ref = [new GLBArray()];
static7_DDgui_selecttab_str_Str = new GLBArray(), static8_DDgui_selecttab_str2_Str_ref = [new GLBArray()];

}
for (var __init = 0; __init < preInitFuncs.length; __init++) preInitFuncs[__init]();
