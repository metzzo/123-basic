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
var __debugInfo = "";
var debugMode = true;
window['main'] = function(){
	stackPush("main", __debugInfo);
	try {
		var local2_dx_ref_1391 = [0], local2_dy_ref_1392 = [0];
		__debugInfo = "28:\JumpIt.gbas";
		LIMITFPS(30);
		__debugInfo = "29:\JumpIt.gbas";
		global12_Hardware_Str = PLATFORMINFO_Str("DEVICE");
		__debugInfo = "31:\JumpIt.gbas";
		GETDESKTOPSIZE(local2_dx_ref_1391, local2_dy_ref_1392);
		__debugInfo = "33:\JumpIt.gbas";
		SYSTEMPOINTER(1);
		__debugInfo = "38:\JumpIt.gbas";
		if ((((global12_Hardware_Str) == ("DESKTOP")) ? 1 : 0)) {
			__debugInfo = "36:\JumpIt.gbas";
			local2_dx_ref_1391[0] = 800;
			__debugInfo = "37:\JumpIt.gbas";
			local2_dy_ref_1392[0] = 600;
			__debugInfo = "36:\JumpIt.gbas";
		};
		__debugInfo = "40:\JumpIt.gbas";
		SETSCREEN(unref(local2_dx_ref_1391[0]), unref(local2_dy_ref_1392[0]), 0);
		__debugInfo = "45:\JumpIt.gbas";
		if ((((local2_dx_ref_1391[0]) < (local2_dy_ref_1392[0])) ? 1 : 0)) {
			__debugInfo = "44:\JumpIt.gbas";
			if (((((((global12_Hardware_Str) != ("DESKTOP")) ? 1 : 0)) || ((((global12_Hardware_Str) == ("WIZ")) ? 1 : 0))) ? 1 : 0)) {
				__debugInfo = "43:\JumpIt.gbas";
				SETORIENTATION(1);
				__debugInfo = "43:\JumpIt.gbas";
			};
			__debugInfo = "44:\JumpIt.gbas";
		};
		__debugInfo = "47:\JumpIt.gbas";
		SETCURRENTDIR("Media");
		__debugInfo = "51:\JumpIt.gbas";
		global9_Gamestate = ~~(0);
		__debugInfo = "53:\JumpIt.gbas";
		global10_SelectTile = 0;
		__debugInfo = "61:\JumpIt.gbas";
		global11_PlayerImage = GENSPRITE();
		__debugInfo = "62:\JumpIt.gbas";
		LOADANIM("spieler.png", global11_PlayerImage, 16, 32);
		__debugInfo = "69:\JumpIt.gbas";
		global11_LadderImage = GENSPRITE();
		__debugInfo = "70:\JumpIt.gbas";
		LOADSPRITE("leiter.png", global11_LadderImage);
		__debugInfo = "73:\JumpIt.gbas";
		global10_SpikeImage = GENSPRITE();
		__debugInfo = "74:\JumpIt.gbas";
		LOADSPRITE("stachel.png", global10_SpikeImage);
		__debugInfo = "77:\JumpIt.gbas";
		global15_TrampolineImage = GENSPRITE();
		__debugInfo = "78:\JumpIt.gbas";
		LOADSPRITE("trampolin.png", global15_TrampolineImage);
		__debugInfo = "81:\JumpIt.gbas";
		global8_PigImage = GENSPRITE();
		__debugInfo = "82:\JumpIt.gbas";
		LOADANIM("schwein.png", global8_PigImage, 32, 32);
		__debugInfo = "85:\JumpIt.gbas";
		global10_HumanImage = GENSPRITE();
		__debugInfo = "86:\JumpIt.gbas";
		LOADSPRITE("fettmonster.png", global10_HumanImage);
		__debugInfo = "89:\JumpIt.gbas";
		global9_BirdImage = GENSPRITE();
		__debugInfo = "90:\JumpIt.gbas";
		LOADANIM("vogel.png", global9_BirdImage, 32, 16);
		__debugInfo = "93:\JumpIt.gbas";
		global9_ShitImage = GENSPRITE();
		__debugInfo = "94:\JumpIt.gbas";
		LOADSPRITE("exkrement.png", global9_ShitImage);
		__debugInfo = "97:\JumpIt.gbas";
		global10_LlamaImage = GENSPRITE();
		__debugInfo = "98:\JumpIt.gbas";
		LOADANIM("llama.png", global10_LlamaImage, 46, 64);
		__debugInfo = "101:\JumpIt.gbas";
		global9_SpitImage = GENSPRITE();
		__debugInfo = "102:\JumpIt.gbas";
		LOADSPRITE("spucke.png", global9_SpitImage);
		__debugInfo = "105:\JumpIt.gbas";
		global9_DoorImage = GENSPRITE();
		__debugInfo = "106:\JumpIt.gbas";
		LOADSPRITE("tuer.png", global9_DoorImage);
		__debugInfo = "109:\JumpIt.gbas";
		global12_TriggerImage = GENSPRITE();
		__debugInfo = "110:\JumpIt.gbas";
		LOADANIM("schalter.png", global12_TriggerImage, 32, 16);
		__debugInfo = "113:\JumpIt.gbas";
		global12_DynamitImage = GENSPRITE();
		__debugInfo = "114:\JumpIt.gbas";
		LOADSPRITE("dynamit.png", global12_DynamitImage);
		__debugInfo = "117:\JumpIt.gbas";
		global14_ExplosionImage = GENSPRITE();
		__debugInfo = "118:\JumpIt.gbas";
		LOADANIM("explosion.png", global14_ExplosionImage, 32, 32);
		__debugInfo = "121:\JumpIt.gbas";
		global9_MenuImage = GENSPRITE();
		__debugInfo = "122:\JumpIt.gbas";
		LOADSPRITE("menu.png", global9_MenuImage);
		__debugInfo = "125:\JumpIt.gbas";
		global11_ButtonImage = GENSPRITE();
		__debugInfo = "126:\JumpIt.gbas";
		LOADSPRITE("button.png", global11_ButtonImage);
		__debugInfo = "129:\JumpIt.gbas";
		global10_ArrowImage = GENSPRITE();
		__debugInfo = "130:\JumpIt.gbas";
		LOADSPRITE("pfeil.png", global10_ArrowImage);
		__debugInfo = "133:\JumpIt.gbas";
		global9_JumpImage = GENSPRITE();
		__debugInfo = "134:\JumpIt.gbas";
		LOADSPRITE("springen.png", global9_JumpImage);
		__debugInfo = "140:\JumpIt.gbas";
		CLEARSCREEN(RGB(63, 156, 255));
		__debugInfo = "142:\JumpIt.gbas";
		Init();
		__debugInfo = "143:\JumpIt.gbas";
		global9_Title_Str = "JumpIt Spielmenue";
		__debugInfo = "144:\JumpIt.gbas";
		global9_Menu1_Str = "Spielen";
		__debugInfo = "145:\JumpIt.gbas";
		global9_Menu2_Str = "Mapeditor";
		__debugInfo = "146:\JumpIt.gbas";
		global9_Menu3_Str = "Beenden";
		__debugInfo = "147:\JumpIt.gbas";
		PUSHLOOP("MENU_LOOP");
		__debugInfo = "28:\JumpIt.gbas";
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
		__debugInfo = "158:\JumpIt.gbas";
		{
			var ex_Str = "";
			__debugInfo = "159:\JumpIt.gbas";
			try {
				__debugInfo = "155:\JumpIt.gbas";
				Update();
				__debugInfo = "156:\JumpIt.gbas";
				Update();
				__debugInfo = "157:\JumpIt.gbas";
				Render();
				__debugInfo = "155:\JumpIt.gbas";
			} catch (ex_Str) {
				if (ex_Str instanceof GLBException) ex_Str = ex_Str.getText(); else throwError(ex_Str);{
					
				}
			};
			__debugInfo = "159:\JumpIt.gbas";
		};
		__debugInfo = "161:\JumpIt.gbas";
		SHOWSCREEN();
		__debugInfo = "158:\JumpIt.gbas";
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
window['Update'] = function() {
	stackPush("sub: Update", __debugInfo);
	try {
		__debugInfo = "167:\JumpIt.gbas";
		MOUSESTATE(global6_MouseX_ref, global6_MouseY_ref, global2_ML_ref, global2_MR_ref);
		__debugInfo = "169:\JumpIt.gbas";
		{
			var local16___SelectHelper1__1394 = 0;
			__debugInfo = "169:\JumpIt.gbas";
			local16___SelectHelper1__1394 = global9_Gamestate;
			__debugInfo = "189:\JumpIt.gbas";
			if ((((local16___SelectHelper1__1394) == (~~(0))) ? 1 : 0)) {
				__debugInfo = "171:\JumpIt.gbas";
				(global3_Map).Update();
				__debugInfo = "174:\JumpIt.gbas";
				var forEachSaver1669 = global6_Enemys;
				for(var forEachCounter1669 = 0 ; forEachCounter1669 < forEachSaver1669.values.length ; forEachCounter1669++) {
					var local5_Enemy_1395 = forEachSaver1669.values[forEachCounter1669];
				{
						__debugInfo = "173:\JumpIt.gbas";
						(local5_Enemy_1395).Update();
						__debugInfo = "173:\JumpIt.gbas";
					}
					forEachSaver1669.values[forEachCounter1669] = local5_Enemy_1395;
				
				};
				__debugInfo = "178:\JumpIt.gbas";
				var forEachSaver1684 = global5_Shits;
				for(var forEachCounter1684 = 0 ; forEachCounter1684 < forEachSaver1684.values.length ; forEachCounter1684++) {
					var local4_Shit_1396 = forEachSaver1684.values[forEachCounter1684];
				{
						__debugInfo = "176:\JumpIt.gbas";
						(local4_Shit_1396).Update();
						__debugInfo = "177:\JumpIt.gbas";
						if (local4_Shit_1396.attr3_Del) {
							__debugInfo = "177:\JumpIt.gbas";
							//DELETE!!111
							forEachSaver1684.values[forEachCounter1684] = local4_Shit_1396;
							DIMDEL(forEachSaver1684, forEachCounter1684);
							forEachCounter1684--;
							continue;
							__debugInfo = "177:\JumpIt.gbas";
						};
						__debugInfo = "176:\JumpIt.gbas";
					}
					forEachSaver1684.values[forEachCounter1684] = local4_Shit_1396;
				
				};
				__debugInfo = "182:\JumpIt.gbas";
				var forEachSaver1699 = global5_Spits;
				for(var forEachCounter1699 = 0 ; forEachCounter1699 < forEachSaver1699.values.length ; forEachCounter1699++) {
					var local4_Spit_1397 = forEachSaver1699.values[forEachCounter1699];
				{
						__debugInfo = "180:\JumpIt.gbas";
						(local4_Spit_1397).Update();
						__debugInfo = "181:\JumpIt.gbas";
						if (local4_Spit_1397.attr3_Del) {
							__debugInfo = "181:\JumpIt.gbas";
							//DELETE!!111
							forEachSaver1699.values[forEachCounter1699] = local4_Spit_1397;
							DIMDEL(forEachSaver1699, forEachCounter1699);
							forEachCounter1699--;
							continue;
							__debugInfo = "181:\JumpIt.gbas";
						};
						__debugInfo = "180:\JumpIt.gbas";
					}
					forEachSaver1699.values[forEachCounter1699] = local4_Spit_1397;
				
				};
				__debugInfo = "186:\JumpIt.gbas";
				var forEachSaver1714 = global10_Explosions;
				for(var forEachCounter1714 = 0 ; forEachCounter1714 < forEachSaver1714.values.length ; forEachCounter1714++) {
					var local9_Explosion_1398 = forEachSaver1714.values[forEachCounter1714];
				{
						__debugInfo = "184:\JumpIt.gbas";
						(local9_Explosion_1398).Update();
						__debugInfo = "185:\JumpIt.gbas";
						if (local9_Explosion_1398.attr3_Del) {
							__debugInfo = "185:\JumpIt.gbas";
							//DELETE!!111
							forEachSaver1714.values[forEachCounter1714] = local9_Explosion_1398;
							DIMDEL(forEachSaver1714, forEachCounter1714);
							forEachCounter1714--;
							continue;
							__debugInfo = "185:\JumpIt.gbas";
						};
						__debugInfo = "184:\JumpIt.gbas";
					}
					forEachSaver1714.values[forEachCounter1714] = local9_Explosion_1398;
				
				};
				__debugInfo = "187:\JumpIt.gbas";
				(global6_Player).Update();
				__debugInfo = "171:\JumpIt.gbas";
			};
			__debugInfo = "169:\JumpIt.gbas";
		};
		__debugInfo = "167:\JumpIt.gbas";
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
window['Render'] = function() {
	stackPush("sub: Render", __debugInfo);
	try {
		var local5_Width_ref_1399 = [0.0], local6_Height_ref_1400 = [0.0];
		__debugInfo = "195:\JumpIt.gbas";
		GETSCREENSIZE(local5_Width_ref_1399, local6_Height_ref_1400);
		__debugInfo = "205:\JumpIt.gbas";
		{
			var local16___SelectHelper2__1401 = 0;
			__debugInfo = "205:\JumpIt.gbas";
			local16___SelectHelper2__1401 = global9_Gamestate;
			__debugInfo = "233:\JumpIt.gbas";
			if ((((local16___SelectHelper2__1401) == (~~(0))) ? 1 : 0)) {
				__debugInfo = "209:\JumpIt.gbas";
				var forEachSaver1737 = global5_Shits;
				for(var forEachCounter1737 = 0 ; forEachCounter1737 < forEachSaver1737.values.length ; forEachCounter1737++) {
					var local4_Shit_1402 = forEachSaver1737.values[forEachCounter1737];
				{
						__debugInfo = "208:\JumpIt.gbas";
						(local4_Shit_1402).Render();
						__debugInfo = "208:\JumpIt.gbas";
					}
					forEachSaver1737.values[forEachCounter1737] = local4_Shit_1402;
				
				};
				__debugInfo = "211:\JumpIt.gbas";
				(global3_Map).Render();
				__debugInfo = "215:\JumpIt.gbas";
				var forEachSaver1747 = global5_Spits;
				for(var forEachCounter1747 = 0 ; forEachCounter1747 < forEachSaver1747.values.length ; forEachCounter1747++) {
					var local4_Spit_1403 = forEachSaver1747.values[forEachCounter1747];
				{
						__debugInfo = "214:\JumpIt.gbas";
						(local4_Spit_1403).Render();
						__debugInfo = "214:\JumpIt.gbas";
					}
					forEachSaver1747.values[forEachCounter1747] = local4_Spit_1403;
				
				};
				__debugInfo = "219:\JumpIt.gbas";
				var forEachSaver1755 = global6_Enemys;
				for(var forEachCounter1755 = 0 ; forEachCounter1755 < forEachSaver1755.values.length ; forEachCounter1755++) {
					var local5_Enemy_1404 = forEachSaver1755.values[forEachCounter1755];
				{
						__debugInfo = "218:\JumpIt.gbas";
						(local5_Enemy_1404).Render();
						__debugInfo = "218:\JumpIt.gbas";
					}
					forEachSaver1755.values[forEachCounter1755] = local5_Enemy_1404;
				
				};
				__debugInfo = "223:\JumpIt.gbas";
				var forEachSaver1763 = global10_Explosions;
				for(var forEachCounter1763 = 0 ; forEachCounter1763 < forEachSaver1763.values.length ; forEachCounter1763++) {
					var local9_Explosion_1405 = forEachSaver1763.values[forEachCounter1763];
				{
						__debugInfo = "222:\JumpIt.gbas";
						(local9_Explosion_1405).Render();
						__debugInfo = "222:\JumpIt.gbas";
					}
					forEachSaver1763.values[forEachCounter1763] = local9_Explosion_1405;
				
				};
				__debugInfo = "225:\JumpIt.gbas";
				(global6_Player).Render();
				__debugInfo = "232:\JumpIt.gbas";
				if (global12_Hardware_Str) {
					__debugInfo = "228:\JumpIt.gbas";
					func10_GameButton(42, ((local6_Height_ref_1400[0]) - (42)), "<");
					__debugInfo = "229:\JumpIt.gbas";
					func10_GameButton(((local5_Width_ref_1399[0]) - (42)), ((local6_Height_ref_1400[0]) - (42)), ">");
					__debugInfo = "230:\JumpIt.gbas";
					func10_GameButton(42, ((local6_Height_ref_1400[0]) - (125)), "jump");
					__debugInfo = "231:\JumpIt.gbas";
					func10_GameButton(((local5_Width_ref_1399[0]) - (42)), ((local6_Height_ref_1400[0]) - (125)), "jump");
					__debugInfo = "228:\JumpIt.gbas";
				};
				__debugInfo = "209:\JumpIt.gbas";
			};
			__debugInfo = "205:\JumpIt.gbas";
		};
		__debugInfo = "195:\JumpIt.gbas";
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
window['Init'] = function() {
	stackPush("sub: Init", __debugInfo);
	try {
		var local5_Width_ref_1406 = [0.0], local6_Height_ref_1407 = [0.0];
		__debugInfo = "239:\JumpIt.gbas";
		GETSCREENSIZE(local5_Width_ref_1406, local6_Height_ref_1407);
		__debugInfo = "240:\JumpIt.gbas";
		{
			var local16___SelectHelper3__1408 = 0;
			__debugInfo = "240:\JumpIt.gbas";
			local16___SelectHelper3__1408 = global9_Gamestate;
			__debugInfo = "244:\JumpIt.gbas";
			if ((((local16___SelectHelper3__1408) == (~~(0))) ? 1 : 0)) {
				__debugInfo = "242:\JumpIt.gbas";
				(global6_Player).Init(100, 100, 16, 32);
				__debugInfo = "243:\JumpIt.gbas";
				(global3_Map).Init("map3.map");
				__debugInfo = "242:\JumpIt.gbas";
			};
			__debugInfo = "240:\JumpIt.gbas";
		};
		__debugInfo = "246:\JumpIt.gbas";
		DIM(global17_LastMousePosition, [0], 0);
		__debugInfo = "239:\JumpIt.gbas";
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
window['MENU_LOOP'] = function() {
	stackPush("sub: MENU_LOOP", __debugInfo);
	try {
		var local1_x_ref_1409 = [0.0], local1_y_ref_1410 = [0.0], local1_w_ref_1411 = [0.0], local1_h_ref_1412 = [0.0], local2_iw_ref_1413 = [0.0], local2_ih_ref_1414 = [0.0], local2_hh_1415 = 0.0;
		__debugInfo = "262:\JumpIt.gbas";
		GETFONTSIZE(local1_x_ref_1409, local1_y_ref_1410);
		__debugInfo = "264:\JumpIt.gbas";
		GETSCREENSIZE(local1_w_ref_1411, local1_h_ref_1412);
		__debugInfo = "266:\JumpIt.gbas";
		GETSPRITESIZE(global9_MenuImage, local2_iw_ref_1413, local2_ih_ref_1414);
		__debugInfo = "269:\JumpIt.gbas";
		local2_hh_1415 = ((local1_h_ref_1412[0]) - (150));
		__debugInfo = "271:\JumpIt.gbas";
		global6_Action = 0;
		__debugInfo = "273:\JumpIt.gbas";
		MOUSESTATE(global6_MouseX_ref, global6_MouseY_ref, global2_ML_ref, global2_MR_ref);
		__debugInfo = "274:\JumpIt.gbas";
		Render();
		__debugInfo = "276:\JumpIt.gbas";
		STRETCHSPRITE(global9_MenuImage, ((local1_w_ref_1411[0]) - (KERNLEN(global9_Title_Str, 1))), 8, ((-(local1_w_ref_1411[0])) - (KERNLEN(global9_Title_Str, 1))), unref(local2_ih_ref_1414[0]));
		__debugInfo = "277:\JumpIt.gbas";
		PRINT(global9_Title_Str, 20, ((40) - (((local1_y_ref_1410[0]) / (2)))), 0);
		__debugInfo = "279:\JumpIt.gbas";
		if (func6_Button(global9_Menu1_Str, ((((local2_hh_1415) / (3))) + (100)))) {
			__debugInfo = "279:\JumpIt.gbas";
			global6_Action = 1;
			__debugInfo = "279:\JumpIt.gbas";
		};
		__debugInfo = "280:\JumpIt.gbas";
		if (func6_Button(global9_Menu2_Str, ((((((local2_hh_1415) / (3))) * (2))) + (100)))) {
			__debugInfo = "280:\JumpIt.gbas";
			global6_Action = 2;
			__debugInfo = "280:\JumpIt.gbas";
		};
		__debugInfo = "281:\JumpIt.gbas";
		if ((((global9_Menu3_Str) != ("")) ? 1 : 0)) {
			__debugInfo = "281:\JumpIt.gbas";
			if (func6_Button(global9_Menu3_Str, ((local2_hh_1415) + (100)))) {
				__debugInfo = "281:\JumpIt.gbas";
				global6_Action = 3;
				__debugInfo = "281:\JumpIt.gbas";
			};
			__debugInfo = "281:\JumpIt.gbas";
		};
		__debugInfo = "283:\JumpIt.gbas";
		{
			var local16___SelectHelper4__1416 = 0;
			__debugInfo = "283:\JumpIt.gbas";
			local16___SelectHelper4__1416 = global6_Action;
			__debugInfo = "289:\JumpIt.gbas";
			if ((((local16___SelectHelper4__1416) == (1)) ? 1 : 0)) {
				__debugInfo = "285:\JumpIt.gbas";
				global9_Gamestate = ~~(0);
				__debugInfo = "286:\JumpIt.gbas";
				POPLOOP();
				__debugInfo = "285:\JumpIt.gbas";
			} else if ((((local16___SelectHelper4__1416) == (3)) ? 1 : 0)) {
				__debugInfo = "288:\JumpIt.gbas";
				END();
				__debugInfo = "288:\JumpIt.gbas";
			};
			__debugInfo = "283:\JumpIt.gbas";
		};
		__debugInfo = "290:\JumpIt.gbas";
		if (global6_Action) {
			__debugInfo = "290:\JumpIt.gbas";
			Init();
			__debugInfo = "290:\JumpIt.gbas";
		};
		__debugInfo = "292:\JumpIt.gbas";
		SHOWSCREEN();
		__debugInfo = "262:\JumpIt.gbas";
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
window['func6_Button'] = function(param8_Text_Str, param1_Y) {
	stackPush("function: Button", __debugInfo);
	try {
		var local1_x_ref_1419 = [0.0], local1_y_ref_1420 = [0.0], local1_w_ref_1421 = [0.0], local1_h_ref_1422 = [0.0], local2_iw_ref_1423 = [0.0], local2_ih_ref_1424 = [0.0];
		__debugInfo = "297:\JumpIt.gbas";
		GETFONTSIZE(local1_x_ref_1419, local1_y_ref_1420);
		__debugInfo = "299:\JumpIt.gbas";
		GETSCREENSIZE(local1_w_ref_1421, local1_h_ref_1422);
		__debugInfo = "301:\JumpIt.gbas";
		GETSPRITESIZE(global9_MenuImage, local2_iw_ref_1423, local2_ih_ref_1424);
		__debugInfo = "310:\JumpIt.gbas";
		if (BOXCOLL(0, ~~(((param1_Y) - (32))), unref(~~(local1_w_ref_1421[0])), unref(~~(local2_ih_ref_1424[0])), unref(~~(global6_MouseX_ref[0])), unref(~~(global6_MouseY_ref[0])), 1, 1)) {
			__debugInfo = "304:\JumpIt.gbas";
			ALPHAMODE(0);
			__debugInfo = "307:\JumpIt.gbas";
			if (global2_ML_ref[0]) {
				__debugInfo = "306:\JumpIt.gbas";
				return 1;
				__debugInfo = "306:\JumpIt.gbas";
			};
			__debugInfo = "304:\JumpIt.gbas";
		} else {
			__debugInfo = "309:\JumpIt.gbas";
			ALPHAMODE(-(0.75));
			__debugInfo = "309:\JumpIt.gbas";
		};
		__debugInfo = "311:\JumpIt.gbas";
		STRETCHSPRITE(global9_MenuImage, 0, ((param1_Y) - (32)), unref(local1_w_ref_1421[0]), unref(local2_ih_ref_1424[0]));
		__debugInfo = "312:\JumpIt.gbas";
		ALPHAMODE(0);
		__debugInfo = "314:\JumpIt.gbas";
		PRINT(param8_Text_Str, 40, ((param1_Y) - (((local1_y_ref_1420[0]) / (2)))), 0);
		__debugInfo = "316:\JumpIt.gbas";
		return tryClone(0);
		__debugInfo = "317:\JumpIt.gbas";
		return 0;
		__debugInfo = "297:\JumpIt.gbas";
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
window['func10_GameButton'] = function(param1_X, param1_Y, param8_Text_Str) {
	stackPush("function: GameButton", __debugInfo);
	try {
		__debugInfo = "325:\JumpIt.gbas";
		if (func16_UpdateGameButton(param1_X, param1_Y)) {
			__debugInfo = "322:\JumpIt.gbas";
			ALPHAMODE(0.5);
			__debugInfo = "322:\JumpIt.gbas";
		} else {
			__debugInfo = "324:\JumpIt.gbas";
			ALPHAMODE(-(0.5));
			__debugInfo = "324:\JumpIt.gbas";
		};
		__debugInfo = "327:\JumpIt.gbas";
		DRAWSPRITE(global11_ButtonImage, ((param1_X) - (32)), ((param1_Y) - (32)));
		__debugInfo = "328:\JumpIt.gbas";
		{
			var local16___SelectHelper5__1428 = "";
			__debugInfo = "328:\JumpIt.gbas";
			local16___SelectHelper5__1428 = param8_Text_Str;
			__debugInfo = "335:\JumpIt.gbas";
			if ((((local16___SelectHelper5__1428) == ("<")) ? 1 : 0)) {
				__debugInfo = "330:\JumpIt.gbas";
				DRAWSPRITE(global10_ArrowImage, ((param1_X) - (32)), ((param1_Y) - (32)));
				__debugInfo = "330:\JumpIt.gbas";
			} else if ((((local16___SelectHelper5__1428) == (">")) ? 1 : 0)) {
				__debugInfo = "332:\JumpIt.gbas";
				ZOOMSPRITE(global10_ArrowImage, ((param1_X) - (32)), ((param1_Y) - (32)), -(1), 1);
				__debugInfo = "332:\JumpIt.gbas";
			} else if ((((local16___SelectHelper5__1428) == ("jump")) ? 1 : 0)) {
				__debugInfo = "334:\JumpIt.gbas";
				DRAWSPRITE(global9_JumpImage, ((param1_X) - (32)), ((param1_Y) - (32)));
				__debugInfo = "334:\JumpIt.gbas";
			};
			__debugInfo = "328:\JumpIt.gbas";
		};
		__debugInfo = "337:\JumpIt.gbas";
		ALPHAMODE(0);
		__debugInfo = "338:\JumpIt.gbas";
		return 0;
		__debugInfo = "325:\JumpIt.gbas";
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
window['func16_UpdateGameButton'] = function(param1_X, param1_Y) {
	stackPush("function: UpdateGameButton", __debugInfo);
	try {
		var local2_MX_ref_1431 = [0.0], local2_MY_ref_1432 = [0.0], local2_ML_ref_1433 = [0.0], local2_MR_ref_1434 = [0.0];
		__debugInfo = "341:\JumpIt.gbas";
		{
			var local1_i_1435 = 0.0;
			__debugInfo = "349:\JumpIt.gbas";
			for (local1_i_1435 = 0;toCheck(local1_i_1435, ((GETMOUSECOUNT()) - (1)), 1);local1_i_1435 += 1) {
				__debugInfo = "343:\JumpIt.gbas";
				SETACTIVEMOUSE(~~(local1_i_1435));
				__debugInfo = "344:\JumpIt.gbas";
				MOUSESTATE(local2_MX_ref_1431, local2_MY_ref_1432, local2_ML_ref_1433, local2_MR_ref_1434);
				__debugInfo = "348:\JumpIt.gbas";
				if ((((BOXCOLL(~~(((param1_X) - (32))), ~~(((param1_Y) - (32))), 64, 64, unref(~~(local2_MX_ref_1431[0])), unref(~~(local2_MY_ref_1432[0])), 1, 1)) && (local2_ML_ref_1433[0])) ? 1 : 0)) {
					__debugInfo = "346:\JumpIt.gbas";
					SETACTIVEMOUSE(0);
					__debugInfo = "347:\JumpIt.gbas";
					return tryClone(1);
					__debugInfo = "346:\JumpIt.gbas";
				};
				__debugInfo = "343:\JumpIt.gbas";
			};
			__debugInfo = "349:\JumpIt.gbas";
		};
		__debugInfo = "350:\JumpIt.gbas";
		SETACTIVEMOUSE(0);
		__debugInfo = "351:\JumpIt.gbas";
		return 0;
		__debugInfo = "352:\JumpIt.gbas";
		return 0;
		__debugInfo = "341:\JumpIt.gbas";
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
window['method12_type6_TEnemy_6_Update'] = function(param4_self) {
	stackPush("method: Update", __debugInfo);
	try {
		__debugInfo = "80:\Enemy.gbas";
		if (param4_self.attr4_Fall) {
			__debugInfo = "27:\Enemy.gbas";
			param4_self.attr2_VY = ((param4_self.attr2_VY) + (0.2));
			__debugInfo = "29:\Enemy.gbas";
			param4_self.attr1_Y+=param4_self.attr2_VY;
			__debugInfo = "27:\Enemy.gbas";
		} else {
			__debugInfo = "31:\Enemy.gbas";
			param4_self.attr4_Anim+=1;
			__debugInfo = "32:\Enemy.gbas";
			{
				var local16___SelectHelper6__1438 = 0;
				__debugInfo = "32:\Enemy.gbas";
				local16___SelectHelper6__1438 = param4_self.attr3_Typ;
				__debugInfo = "79:\Enemy.gbas";
				if ((((local16___SelectHelper6__1438) == (~~(1))) ? 1 : 0)) {
					__debugInfo = "36:\Enemy.gbas";
					if (((((((((((global3_Map).CollisionPoint(((((param4_self.attr1_X) + (2))) + (param4_self.attr2_VX)), ((param4_self.attr1_Y) + (((param4_self.attr6_Height) / (2)))))) || ((global3_Map).CollisionPoint(((((((param4_self.attr1_X) - (2))) + (param4_self.attr2_VX))) + (param4_self.attr5_Width)), ((param4_self.attr1_Y) + (((param4_self.attr6_Height) / (2))))))) ? 1 : 0)) || ((((((param4_self.attr1_X) + (param4_self.attr2_VX))) < (0)) ? 1 : 0))) ? 1 : 0)) || ((((((param4_self.attr1_X) + (param4_self.attr2_VX))) > (((global3_Map.attr5_Width) * (32)))) ? 1 : 0))) ? 1 : 0)) {
						__debugInfo = "35:\Enemy.gbas";
						param4_self.attr2_VX = -(param4_self.attr2_VX);
						__debugInfo = "35:\Enemy.gbas";
					};
					__debugInfo = "37:\Enemy.gbas";
					param4_self.attr1_X+=param4_self.attr2_VX;
					__debugInfo = "38:\Enemy.gbas";
					param4_self.attr2_VY = func4_QCOS(CAST2INT(((GETTIMERALL()) / (10))));
					__debugInfo = "41:\Enemy.gbas";
					if ((global3_Map).Collision(((param4_self.attr1_X) + (4)), ((param4_self.attr1_Y) + (param4_self.attr2_VY)), ((param4_self.attr5_Width) - (8)), param4_self.attr6_Height)) {
						__debugInfo = "40:\Enemy.gbas";
						param4_self.attr2_VY = 0;
						__debugInfo = "40:\Enemy.gbas";
					};
					__debugInfo = "43:\Enemy.gbas";
					param4_self.attr12_EventCounter+=1;
					__debugInfo = "47:\Enemy.gbas";
					if ((((MOD(param4_self.attr12_EventCounter, ~~(RND(500)))) == (5)) ? 1 : 0)) {
						var local1_S_1439 = new type5_TShit();
						__debugInfo = "46:\Enemy.gbas";
						(local1_S_1439).Init(param4_self.attr1_X, param4_self.attr1_Y);
						__debugInfo = "46:\Enemy.gbas";
					};
					__debugInfo = "49:\Enemy.gbas";
					param4_self.attr1_Y+=param4_self.attr2_VY;
					__debugInfo = "51:\Enemy.gbas";
					param4_self.attr4_Anim = MOD(param4_self.attr4_Anim, 30);
					__debugInfo = "36:\Enemy.gbas";
				} else if (((((((local16___SelectHelper6__1438) >= (~~(2))) ? 1 : 0)) && ((((local16___SelectHelper6__1438) <= (~~(4))) ? 1 : 0))) ? 1 : 0)) {
					__debugInfo = "53:\Enemy.gbas";
					{
						var local16___SelectHelper7__1440 = 0;
						__debugInfo = "53:\Enemy.gbas";
						local16___SelectHelper7__1440 = param4_self.attr3_Typ;
						__debugInfo = "73:\Enemy.gbas";
						if ((((local16___SelectHelper7__1440) == (~~(4))) ? 1 : 0)) {
							var local4_Look_1441 = 0.0;
							__debugInfo = "55:\Enemy.gbas";
							param4_self.attr4_Anim = MOD(param4_self.attr4_Anim, 15);
							__debugInfo = "56:\Enemy.gbas";
							param4_self.attr12_EventCounter+=1;
							__debugInfo = "63:\Enemy.gbas";
							if ((((param4_self.attr2_VX) < (0)) ? 1 : 0)) {
								__debugInfo = "60:\Enemy.gbas";
								local4_Look_1441 = 0;
								__debugInfo = "60:\Enemy.gbas";
							} else {
								__debugInfo = "62:\Enemy.gbas";
								local4_Look_1441 = ((param4_self.attr5_Width) / (2));
								__debugInfo = "62:\Enemy.gbas";
							};
							__debugInfo = "70:\Enemy.gbas";
							if (((((((MOD(param4_self.attr12_EventCounter, 55)) == (5)) ? 1 : 0)) && (((((global3_Map).RayCollision(((param4_self.attr1_X) + (local4_Look_1441)), ((param4_self.attr1_Y) + (4)), global6_Player.attr1_X, global6_Player.attr1_Y)) == (0)) ? 1 : 0))) ? 1 : 0)) {
								var local1_S_1442 = new type5_TSpit();
								__debugInfo = "69:\Enemy.gbas";
								(local1_S_1442).Init(((param4_self.attr1_X) + (local4_Look_1441)), ((param4_self.attr1_Y) + (4)), ((param4_self.attr2_VX) * (4)), ((param4_self.attr2_VY) - (RND(2))));
								__debugInfo = "69:\Enemy.gbas";
							};
							__debugInfo = "55:\Enemy.gbas";
						} else if ((((local16___SelectHelper7__1440) == (~~(2))) ? 1 : 0)) {
							__debugInfo = "72:\Enemy.gbas";
							param4_self.attr4_Anim = MOD(param4_self.attr4_Anim, 10);
							__debugInfo = "72:\Enemy.gbas";
						};
						__debugInfo = "53:\Enemy.gbas";
					};
					__debugInfo = "77:\Enemy.gbas";
					if (((((((((((((((((global3_Map).CollisionPoint(((param4_self.attr1_X) + (param4_self.attr2_VX)), ((((param4_self.attr1_Y) + (param4_self.attr6_Height))) + (1)))) == (0)) ? 1 : 0)) || (((((global3_Map).CollisionPoint(((((param4_self.attr1_X) + (param4_self.attr5_Width))) + (param4_self.attr2_VX)), ((((param4_self.attr1_Y) + (param4_self.attr6_Height))) + (1)))) == (0)) ? 1 : 0))) ? 1 : 0)) || (((((global3_Map).CollisionPoint(((((param4_self.attr1_X) + (2))) + (param4_self.attr2_VX)), ((param4_self.attr1_Y) + (((param4_self.attr6_Height) / (2)))))) || ((global3_Map).CollisionPoint(((((((param4_self.attr1_X) - (2))) + (param4_self.attr2_VX))) + (param4_self.attr5_Width)), ((param4_self.attr1_Y) + (((param4_self.attr6_Height) / (2))))))) ? 1 : 0))) ? 1 : 0)) || ((((((param4_self.attr1_X) + (param4_self.attr2_VX))) < (0)) ? 1 : 0))) ? 1 : 0)) || ((((((param4_self.attr1_X) + (param4_self.attr2_VX))) > (((global3_Map.attr5_Width) * (32)))) ? 1 : 0))) ? 1 : 0)) {
						__debugInfo = "76:\Enemy.gbas";
						param4_self.attr2_VX = -(param4_self.attr2_VX);
						__debugInfo = "76:\Enemy.gbas";
					};
					__debugInfo = "78:\Enemy.gbas";
					param4_self.attr1_X+=param4_self.attr2_VX;
					__debugInfo = "53:\Enemy.gbas";
				};
				__debugInfo = "32:\Enemy.gbas";
			};
			__debugInfo = "31:\Enemy.gbas";
		};
		__debugInfo = "81:\Enemy.gbas";
		return 0;
		__debugInfo = "80:\Enemy.gbas";
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
window['method12_type6_TEnemy_6_Render'] = function(param4_self) {
	stackPush("method: Render", __debugInfo);
	try {
		var local5_Frame_1445 = 0;
		__debugInfo = "84:\Enemy.gbas";
		local5_Frame_1445 = 0;
		__debugInfo = "86:\Enemy.gbas";
		{
			var local16___SelectHelper8__1446 = 0;
			__debugInfo = "86:\Enemy.gbas";
			local16___SelectHelper8__1446 = param4_self.attr3_Typ;
			__debugInfo = "139:\Enemy.gbas";
			if ((((local16___SelectHelper8__1446) == (~~(1))) ? 1 : 0)) {
				var local3_Dir_1447 = 0;
				__debugInfo = "93:\Enemy.gbas";
				if ((((param4_self.attr2_VX) > (0)) ? 1 : 0)) {
					__debugInfo = "90:\Enemy.gbas";
					local3_Dir_1447 = 1;
					__debugInfo = "90:\Enemy.gbas";
				} else {
					__debugInfo = "92:\Enemy.gbas";
					local3_Dir_1447 = 0;
					__debugInfo = "92:\Enemy.gbas";
				};
				__debugInfo = "100:\Enemy.gbas";
				if ((((param4_self.attr4_Anim) > (20)) ? 1 : 0)) {
					__debugInfo = "95:\Enemy.gbas";
					local5_Frame_1445 = 2;
					__debugInfo = "95:\Enemy.gbas";
				} else if ((((param4_self.attr4_Anim) > (10)) ? 1 : 0)) {
					__debugInfo = "97:\Enemy.gbas";
					local5_Frame_1445 = 1;
					__debugInfo = "97:\Enemy.gbas";
				} else {
					__debugInfo = "99:\Enemy.gbas";
					local5_Frame_1445 = 0;
					__debugInfo = "99:\Enemy.gbas";
				};
				__debugInfo = "102:\Enemy.gbas";
				func9_TurnImage(global9_BirdImage, local5_Frame_1445, local3_Dir_1447, param4_self.attr1_X, param4_self.attr1_Y, 6);
				__debugInfo = "93:\Enemy.gbas";
			} else if ((((local16___SelectHelper8__1446) == (~~(2))) ? 1 : 0)) {
				var local3_Dir_1448 = 0;
				__debugInfo = "109:\Enemy.gbas";
				if ((((param4_self.attr2_VX) < (0)) ? 1 : 0)) {
					__debugInfo = "106:\Enemy.gbas";
					local3_Dir_1448 = 0;
					__debugInfo = "106:\Enemy.gbas";
				} else {
					__debugInfo = "108:\Enemy.gbas";
					local3_Dir_1448 = 1;
					__debugInfo = "108:\Enemy.gbas";
				};
				__debugInfo = "115:\Enemy.gbas";
				if ((((param4_self.attr4_Anim) > (5)) ? 1 : 0)) {
					__debugInfo = "112:\Enemy.gbas";
					local5_Frame_1445 = 1;
					__debugInfo = "112:\Enemy.gbas";
				} else {
					__debugInfo = "114:\Enemy.gbas";
					local5_Frame_1445 = 0;
					__debugInfo = "114:\Enemy.gbas";
				};
				__debugInfo = "118:\Enemy.gbas";
				func9_TurnImage(global8_PigImage, local5_Frame_1445, local3_Dir_1448, param4_self.attr1_X, param4_self.attr1_Y, 4);
				__debugInfo = "109:\Enemy.gbas";
			} else if ((((local16___SelectHelper8__1446) == (~~(3))) ? 1 : 0)) {
				__debugInfo = "120:\Enemy.gbas";
				ROTOSPRITE(global10_HumanImage, ((param4_self.attr1_X) + (global3_Map.attr7_ScrollX)), ((param4_self.attr1_Y) + (global3_Map.attr7_ScrollY)), -(MOD(~~(param4_self.attr1_X), 360)));
				__debugInfo = "120:\Enemy.gbas";
			} else if ((((local16___SelectHelper8__1446) == (~~(4))) ? 1 : 0)) {
				var local3_Dir_1449 = 0;
				__debugInfo = "127:\Enemy.gbas";
				if ((((param4_self.attr2_VX) < (0)) ? 1 : 0)) {
					__debugInfo = "124:\Enemy.gbas";
					local3_Dir_1449 = 1;
					__debugInfo = "124:\Enemy.gbas";
				} else {
					__debugInfo = "126:\Enemy.gbas";
					local3_Dir_1449 = 0;
					__debugInfo = "126:\Enemy.gbas";
				};
				__debugInfo = "135:\Enemy.gbas";
				if ((((param4_self.attr4_Anim) > (10)) ? 1 : 0)) {
					__debugInfo = "130:\Enemy.gbas";
					local5_Frame_1445 = 2;
					__debugInfo = "130:\Enemy.gbas";
				} else if ((((param4_self.attr4_Anim) > (5)) ? 1 : 0)) {
					__debugInfo = "132:\Enemy.gbas";
					local5_Frame_1445 = 1;
					__debugInfo = "132:\Enemy.gbas";
				} else {
					__debugInfo = "134:\Enemy.gbas";
					local5_Frame_1445 = 0;
					__debugInfo = "134:\Enemy.gbas";
				};
				__debugInfo = "138:\Enemy.gbas";
				func9_TurnImage(global10_LlamaImage, local5_Frame_1445, local3_Dir_1449, param4_self.attr1_X, param4_self.attr1_Y, 6);
				__debugInfo = "127:\Enemy.gbas";
			};
			__debugInfo = "86:\Enemy.gbas";
		};
		__debugInfo = "140:\Enemy.gbas";
		return 0;
		__debugInfo = "84:\Enemy.gbas";
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
window['method12_type6_TEnemy_4_Init'] = function(param3_Typ, param1_X, param1_Y, param4_self) {
	stackPush("method: Init", __debugInfo);
	try {
		__debugInfo = "143:\Enemy.gbas";
		param4_self.attr3_Typ = param3_Typ;
		__debugInfo = "144:\Enemy.gbas";
		param4_self.attr1_X = param1_X;
		__debugInfo = "145:\Enemy.gbas";
		param4_self.attr1_Y = param1_Y;
		__debugInfo = "146:\Enemy.gbas";
		param4_self.attr5_Width = 32;
		__debugInfo = "147:\Enemy.gbas";
		param4_self.attr6_Height = 32;
		__debugInfo = "149:\Enemy.gbas";
		{
			var local16___SelectHelper9__1455 = 0;
			__debugInfo = "149:\Enemy.gbas";
			local16___SelectHelper9__1455 = param4_self.attr3_Typ;
			__debugInfo = "181:\Enemy.gbas";
			if ((((local16___SelectHelper9__1455) == (~~(1))) ? 1 : 0)) {
				__debugInfo = "151:\Enemy.gbas";
				param4_self.attr6_Height = 16;
				__debugInfo = "156:\Enemy.gbas";
				if (INTEGER(RND(2))) {
					__debugInfo = "153:\Enemy.gbas";
					param4_self.attr2_VX = 1;
					__debugInfo = "153:\Enemy.gbas";
				} else {
					__debugInfo = "155:\Enemy.gbas";
					param4_self.attr2_VX = -(1);
					__debugInfo = "155:\Enemy.gbas";
				};
				__debugInfo = "151:\Enemy.gbas";
			} else if ((((local16___SelectHelper9__1455) == (~~(2))) ? 1 : 0)) {
				__debugInfo = "162:\Enemy.gbas";
				if (INTEGER(RND(2))) {
					__debugInfo = "159:\Enemy.gbas";
					param4_self.attr2_VX = 2;
					__debugInfo = "159:\Enemy.gbas";
				} else {
					__debugInfo = "161:\Enemy.gbas";
					param4_self.attr2_VX = -(2);
					__debugInfo = "161:\Enemy.gbas";
				};
				__debugInfo = "162:\Enemy.gbas";
			} else if ((((local16___SelectHelper9__1455) == (~~(3))) ? 1 : 0)) {
				__debugInfo = "164:\Enemy.gbas";
				param4_self.attr1_Y = ((param4_self.attr1_Y) - (32));
				__debugInfo = "165:\Enemy.gbas";
				param4_self.attr6_Height = 64;
				__debugInfo = "166:\Enemy.gbas";
				param4_self.attr5_Width = 64;
				__debugInfo = "171:\Enemy.gbas";
				if (INTEGER(RND(2))) {
					__debugInfo = "168:\Enemy.gbas";
					param4_self.attr2_VX = 1;
					__debugInfo = "168:\Enemy.gbas";
				} else {
					__debugInfo = "170:\Enemy.gbas";
					param4_self.attr2_VX = -(1);
					__debugInfo = "170:\Enemy.gbas";
				};
				__debugInfo = "164:\Enemy.gbas";
			} else if ((((local16___SelectHelper9__1455) == (~~(4))) ? 1 : 0)) {
				__debugInfo = "173:\Enemy.gbas";
				param4_self.attr1_Y = ((param4_self.attr1_Y) - (32));
				__debugInfo = "174:\Enemy.gbas";
				param4_self.attr6_Height = 64;
				__debugInfo = "175:\Enemy.gbas";
				param4_self.attr5_Width = 64;
				__debugInfo = "180:\Enemy.gbas";
				if (INTEGER(RND(2))) {
					__debugInfo = "177:\Enemy.gbas";
					param4_self.attr2_VX = 1;
					__debugInfo = "177:\Enemy.gbas";
				} else {
					__debugInfo = "179:\Enemy.gbas";
					param4_self.attr2_VX = -(1);
					__debugInfo = "179:\Enemy.gbas";
				};
				__debugInfo = "173:\Enemy.gbas";
			};
			__debugInfo = "149:\Enemy.gbas";
		};
		__debugInfo = "183:\Enemy.gbas";
		DIMPUSH(global6_Enemys, param4_self);
		__debugInfo = "184:\Enemy.gbas";
		return 0;
		__debugInfo = "143:\Enemy.gbas";
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
window['method12_type6_TEnemy_13_IsDestroyable'] = function(param4_self) {
	stackPush("method: IsDestroyable", __debugInfo);
	try {
		__debugInfo = "191:\Enemy.gbas";
		if ((((param4_self.attr3_Typ) == (3)) ? 1 : 0)) {
			__debugInfo = "188:\Enemy.gbas";
			return 0;
			__debugInfo = "188:\Enemy.gbas";
		} else {
			__debugInfo = "190:\Enemy.gbas";
			return tryClone(1);
			__debugInfo = "190:\Enemy.gbas";
		};
		__debugInfo = "192:\Enemy.gbas";
		return 0;
		__debugInfo = "191:\Enemy.gbas";
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
window['method17_type10_TExplosion_6_Update'] = function(param4_self) {
	stackPush("method: Update", __debugInfo);
	try {
		__debugInfo = "16:\Explosion.gbas";
		param4_self.attr4_Anim+=1;
		__debugInfo = "17:\Explosion.gbas";
		if ((((param4_self.attr4_Anim) > (20)) ? 1 : 0)) {
			__debugInfo = "17:\Explosion.gbas";
			param4_self.attr3_Del = 1;
			__debugInfo = "17:\Explosion.gbas";
		};
		__debugInfo = "18:\Explosion.gbas";
		return 0;
		__debugInfo = "16:\Explosion.gbas";
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
window['method17_type10_TExplosion_6_Render'] = function(param4_self) {
	stackPush("method: Render", __debugInfo);
	try {
		var local5_Frame_1462 = 0;
		__debugInfo = "30:\Explosion.gbas";
		if ((((param4_self.attr4_Anim) > (15)) ? 1 : 0)) {
			__debugInfo = "23:\Explosion.gbas";
			local5_Frame_1462 = 3;
			__debugInfo = "23:\Explosion.gbas";
		} else if ((((param4_self.attr4_Anim) > (10)) ? 1 : 0)) {
			__debugInfo = "25:\Explosion.gbas";
			local5_Frame_1462 = 2;
			__debugInfo = "25:\Explosion.gbas";
		} else if ((((param4_self.attr4_Anim) > (5)) ? 1 : 0)) {
			__debugInfo = "27:\Explosion.gbas";
			local5_Frame_1462 = 1;
			__debugInfo = "27:\Explosion.gbas";
		} else {
			__debugInfo = "29:\Explosion.gbas";
			local5_Frame_1462 = 0;
			__debugInfo = "29:\Explosion.gbas";
		};
		__debugInfo = "32:\Explosion.gbas";
		DRAWANIM(global14_ExplosionImage, local5_Frame_1462, ((param4_self.attr1_X) + (global3_Map.attr7_ScrollX)), ((param4_self.attr1_Y) + (global3_Map.attr7_ScrollY)));
		__debugInfo = "33:\Explosion.gbas";
		return 0;
		__debugInfo = "30:\Explosion.gbas";
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
window['method17_type10_TExplosion_4_Init'] = function(param1_X, param1_Y, param4_self) {
	stackPush("method: Init", __debugInfo);
	try {
		__debugInfo = "36:\Explosion.gbas";
		param4_self.attr1_X = param1_X;
		__debugInfo = "37:\Explosion.gbas";
		param4_self.attr1_Y = param1_Y;
		__debugInfo = "39:\Explosion.gbas";
		DIMPUSH(global10_Explosions, param4_self);
		__debugInfo = "40:\Explosion.gbas";
		return 0;
		__debugInfo = "36:\Explosion.gbas";
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
window['method10_type4_TMap_9_InitEmpty'] = function(param5_Width, param6_Height, param11_Tileset_Str, param4_self) {
	stackPush("method: InitEmpty", __debugInfo);
	try {
		__debugInfo = "25:\Map.gbas";
		param4_self.attr6_IsSnow = 0;
		__debugInfo = "26:\Map.gbas";
		param4_self.attr5_Width = param5_Width;
		__debugInfo = "27:\Map.gbas";
		param4_self.attr6_Height = param6_Height;
		__debugInfo = "29:\Map.gbas";
		param4_self.attr7_ScrollX = 0;
		__debugInfo = "30:\Map.gbas";
		param4_self.attr7_ScrollY = 0;
		__debugInfo = "32:\Map.gbas";
		DIM(global5_Spits, [0], new type5_TSpit());
		__debugInfo = "33:\Map.gbas";
		DIM(global5_Shits, [0], new type5_TShit());
		__debugInfo = "34:\Map.gbas";
		DIM(global6_Enemys, [0], new type6_TEnemy());
		__debugInfo = "35:\Map.gbas";
		(global6_Player).Init(100, 100, 16, 32);
		__debugInfo = "37:\Map.gbas";
		param4_self.attr7_Tileset = GENSPRITE();
		__debugInfo = "38:\Map.gbas";
		param4_self.attr15_TilesetPath_Str = param11_Tileset_Str;
		__debugInfo = "39:\Map.gbas";
		LOADANIM(param11_Tileset_Str, param4_self.attr7_Tileset, 32, 32);
		__debugInfo = "40:\Map.gbas";
		if ((((INSTR(param11_Tileset_Str, "snowtileset", 0)) != (-(1))) ? 1 : 0)) {
			__debugInfo = "40:\Map.gbas";
			param4_self.attr6_IsSnow = 1;
			__debugInfo = "40:\Map.gbas";
		};
		__debugInfo = "44:\Map.gbas";
		DIM(param4_self.attr5_Datas, [param4_self.attr5_Width, param4_self.attr6_Height], 0);
		__debugInfo = "46:\Map.gbas";
		param4_self.attr6_HasFBO = INT2STR(PLATFORMINFO_Str("GLEX:glBindFramebufferEXT"));
		__debugInfo = "53:\Map.gbas";
		if (param4_self.attr6_HasFBO) {
			__debugInfo = "48:\Map.gbas";
			param4_self.attr5_SprID = GENSPRITE();
			__debugInfo = "49:\Map.gbas";
			param4_self.attr13_IsRenderedFBO = 0;
			__debugInfo = "50:\Map.gbas";
			param4_self.attr8_ScreenID = 0;
			__debugInfo = "51:\Map.gbas";
			LOADSPRITE("", param4_self.attr5_SprID);
			__debugInfo = "52:\Map.gbas";
			CREATESCREEN(param4_self.attr8_ScreenID, param4_self.attr5_SprID, ~~(((param4_self.attr5_Width) * (32))), ~~(((param4_self.attr6_Height) * (32))));
			__debugInfo = "48:\Map.gbas";
		};
		__debugInfo = "54:\Map.gbas";
		return 0;
		__debugInfo = "25:\Map.gbas";
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
window['method10_type4_TMap_4_Save'] = function(param8_File_Str, param4_self) {
	stackPush("method: Save", __debugInfo);
	try {
		var local3_Chn_1475 = 0;
		__debugInfo = "57:\Map.gbas";
		local3_Chn_1475 = GENFILE();
		__debugInfo = "58:\Map.gbas";
		if (DOESFILEEXIST(param8_File_Str)) {
			__debugInfo = "58:\Map.gbas";
			KILLFILE(param8_File_Str);
			__debugInfo = "58:\Map.gbas";
		};
		__debugInfo = "59:\Map.gbas";
		if ((((OPENFILE(local3_Chn_1475, param8_File_Str, 0)) == (0)) ? 1 : 0)) {
			__debugInfo = "59:\Map.gbas";
			END();
			__debugInfo = "59:\Map.gbas";
		};
		__debugInfo = "62:\Map.gbas";
		WRITELINE(local3_Chn_1475, CAST2STRING(param4_self.attr5_Width));
		__debugInfo = "63:\Map.gbas";
		WRITELINE(local3_Chn_1475, CAST2STRING(param4_self.attr6_Height));
		__debugInfo = "64:\Map.gbas";
		WRITELINE(local3_Chn_1475, param4_self.attr15_TilesetPath_Str);
		__debugInfo = "65:\Map.gbas";
		WRITELINE(local3_Chn_1475, param4_self.attr11_NextMap_Str);
		__debugInfo = "65:\Map.gbas";
		{
			var local1_y_1476 = 0.0;
			__debugInfo = "90:\Map.gbas";
			for (local1_y_1476 = 0;toCheck(local1_y_1476, ((param4_self.attr6_Height) - (1)), 1);local1_y_1476 += 1) {
				var local8_Line_Str_1477 = "";
				__debugInfo = "67:\Map.gbas";
				local8_Line_Str_1477 = "";
				__debugInfo = "67:\Map.gbas";
				{
					var local1_x_1478 = 0.0;
					__debugInfo = "88:\Map.gbas";
					for (local1_x_1478 = 0;toCheck(local1_x_1478, ((param4_self.attr5_Width) - (1)), 1);local1_x_1478 += 1) {
						var local12_PositionData_1479 = 0;
						__debugInfo = "69:\Map.gbas";
						if ((((local1_x_1478) > (0)) ? 1 : 0)) {
							__debugInfo = "69:\Map.gbas";
							local8_Line_Str_1477 = ((local8_Line_Str_1477) + (","));
							__debugInfo = "69:\Map.gbas";
						};
						__debugInfo = "70:\Map.gbas";
						local12_PositionData_1479 = param4_self.attr5_Datas.arrAccess(~~(local1_x_1478), ~~(local1_y_1476)).values[tmpPositionCache];
						__debugInfo = "85:\Map.gbas";
						var forEachSaver3454 = global6_Enemys;
						for(var forEachCounter3454 = 0 ; forEachCounter3454 < forEachSaver3454.values.length ; forEachCounter3454++) {
							var local4_Enem_1480 = forEachSaver3454.values[forEachCounter3454];
						{
								__debugInfo = "84:\Map.gbas";
								if (((((((INTEGER(((local4_Enem_1480.attr1_X) / (32)))) == (local1_x_1478)) ? 1 : 0)) && ((((INTEGER(((((((local4_Enem_1480.attr1_Y) + (local4_Enem_1480.attr6_Height))) - (1))) / (32)))) == (local1_y_1476)) ? 1 : 0))) ? 1 : 0)) {
									__debugInfo = "73:\Map.gbas";
									{
										var local17___SelectHelper10__1481 = 0;
										__debugInfo = "73:\Map.gbas";
										local17___SelectHelper10__1481 = local4_Enem_1480.attr3_Typ;
										__debugInfo = "82:\Map.gbas";
										if ((((local17___SelectHelper10__1481) == (~~(1))) ? 1 : 0)) {
											__debugInfo = "75:\Map.gbas";
											local12_PositionData_1479 = 8;
											__debugInfo = "75:\Map.gbas";
										} else if ((((local17___SelectHelper10__1481) == (~~(2))) ? 1 : 0)) {
											__debugInfo = "77:\Map.gbas";
											local12_PositionData_1479 = 6;
											__debugInfo = "77:\Map.gbas";
										} else if ((((local17___SelectHelper10__1481) == (~~(4))) ? 1 : 0)) {
											__debugInfo = "79:\Map.gbas";
											local12_PositionData_1479 = 9;
											__debugInfo = "79:\Map.gbas";
										} else if ((((local17___SelectHelper10__1481) == (~~(3))) ? 1 : 0)) {
											__debugInfo = "81:\Map.gbas";
											local12_PositionData_1479 = 7;
											__debugInfo = "81:\Map.gbas";
										};
										__debugInfo = "73:\Map.gbas";
									};
									__debugInfo = "83:\Map.gbas";
									break;
									__debugInfo = "73:\Map.gbas";
								};
								__debugInfo = "84:\Map.gbas";
							}
							forEachSaver3454.values[forEachCounter3454] = local4_Enem_1480;
						
						};
						__debugInfo = "87:\Map.gbas";
						local8_Line_Str_1477 = ((local8_Line_Str_1477) + (CAST2STRING(local12_PositionData_1479)));
						__debugInfo = "69:\Map.gbas";
					};
					__debugInfo = "88:\Map.gbas";
				};
				__debugInfo = "89:\Map.gbas";
				WRITELINE(local3_Chn_1475, local8_Line_Str_1477);
				__debugInfo = "67:\Map.gbas";
			};
			__debugInfo = "90:\Map.gbas";
		};
		__debugInfo = "92:\Map.gbas";
		CLOSEFILE(local3_Chn_1475);
		__debugInfo = "93:\Map.gbas";
		return 0;
		__debugInfo = "57:\Map.gbas";
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
window['method10_type4_TMap_4_Init'] = function(param8_Name_Str, param4_self) {
	stackPush("method: Init", __debugInfo);
	try {
		var local3_Chn_1485 = 0, local8_Line_Str_ref_1486 = [""], local11_Tileset_Str_1487 = "", local1_x_1488 = 0, local1_y_1489 = 0;
		__debugInfo = "96:\Map.gbas";
		local3_Chn_1485 = GENFILE();
		__debugInfo = "99:\Map.gbas";
		if ((((OPENFILE(local3_Chn_1485, param8_Name_Str, 1)) == (0)) ? 1 : 0)) {
			__debugInfo = "99:\Map.gbas";
			END();
			__debugInfo = "99:\Map.gbas";
		};
		__debugInfo = "101:\Map.gbas";
		READLINE(local3_Chn_1485, local8_Line_Str_ref_1486);
		__debugInfo = "102:\Map.gbas";
		param4_self.attr5_Width = INTEGER(unref(FLOAT2STR(local8_Line_Str_ref_1486[0])));
		__debugInfo = "104:\Map.gbas";
		READLINE(local3_Chn_1485, local8_Line_Str_ref_1486);
		__debugInfo = "105:\Map.gbas";
		param4_self.attr6_Height = INTEGER(unref(FLOAT2STR(local8_Line_Str_ref_1486[0])));
		__debugInfo = "107:\Map.gbas";
		READLINE(local3_Chn_1485, local8_Line_Str_ref_1486);
		__debugInfo = "108:\Map.gbas";
		local11_Tileset_Str_1487 = local8_Line_Str_ref_1486[0];
		__debugInfo = "110:\Map.gbas";
		READLINE(local3_Chn_1485, local8_Line_Str_ref_1486);
		__debugInfo = "111:\Map.gbas";
		param4_self.attr11_NextMap_Str = local8_Line_Str_ref_1486[0];
		__debugInfo = "113:\Map.gbas";
		(param4_self).InitEmpty(param4_self.attr5_Width, param4_self.attr6_Height, local11_Tileset_Str_1487);
		__debugInfo = "153:\Map.gbas";
		while ((((ENDOFFILE(local3_Chn_1485)) == (0)) ? 1 : 0)) {
			var local9_Tiles_Str_1490 = new GLBArray();
			__debugInfo = "117:\Map.gbas";
			READLINE(local3_Chn_1485, local8_Line_Str_ref_1486);
			__debugInfo = "120:\Map.gbas";
			SPLITSTR(unref(local8_Line_Str_ref_1486[0]), unref(local9_Tiles_Str_1490), ",", 1);
			__debugInfo = "123:\Map.gbas";
			local1_x_1488 = 0;
			__debugInfo = "150:\Map.gbas";
			var forEachSaver3671 = local9_Tiles_Str_1490;
			for(var forEachCounter3671 = 0 ; forEachCounter3671 < forEachSaver3671.values.length ; forEachCounter3671++) {
				var local4_tile_1491 = forEachSaver3671.values[forEachCounter3671];
			{
					__debugInfo = "125:\Map.gbas";
					param4_self.attr5_Datas.arrAccess(local1_x_1488, local1_y_1489).values[tmpPositionCache] = func7_Convert(local4_tile_1491);
					__debugInfo = "126:\Map.gbas";
					{
						var local17___SelectHelper11__1492 = 0;
						__debugInfo = "126:\Map.gbas";
						local17___SelectHelper11__1492 = param4_self.attr5_Datas.arrAccess(local1_x_1488, local1_y_1489).values[tmpPositionCache];
						__debugInfo = "148:\Map.gbas";
						if ((((local17___SelectHelper11__1492) == (4)) ? 1 : 0)) {
							__debugInfo = "128:\Map.gbas";
							global6_Player.attr1_X = ((local1_x_1488) * (32));
							__debugInfo = "129:\Map.gbas";
							global6_Player.attr1_Y = ((local1_y_1489) * (32));
							__debugInfo = "130:\Map.gbas";
							param4_self.attr6_SpawnX = ~~(global6_Player.attr1_X);
							__debugInfo = "131:\Map.gbas";
							param4_self.attr6_SpawnY = ~~(global6_Player.attr1_Y);
							__debugInfo = "132:\Map.gbas";
							param4_self.attr5_Datas.arrAccess(local1_x_1488, local1_y_1489).values[tmpPositionCache] = 0;
							__debugInfo = "128:\Map.gbas";
						} else if (((((((local17___SelectHelper11__1492) >= (6)) ? 1 : 0)) && ((((local17___SelectHelper11__1492) <= (9)) ? 1 : 0))) ? 1 : 0)) {
							var local3_Typ_1493 = 0.0, local5_Enemy_1495 = new type6_TEnemy();
							__debugInfo = "135:\Map.gbas";
							{
								var local17___SelectHelper12__1494 = 0;
								__debugInfo = "135:\Map.gbas";
								local17___SelectHelper12__1494 = param4_self.attr5_Datas.arrAccess(local1_x_1488, local1_y_1489).values[tmpPositionCache];
								__debugInfo = "144:\Map.gbas";
								if ((((local17___SelectHelper12__1494) == (6)) ? 1 : 0)) {
									__debugInfo = "137:\Map.gbas";
									local3_Typ_1493 = 2;
									__debugInfo = "137:\Map.gbas";
								} else if ((((local17___SelectHelper12__1494) == (7)) ? 1 : 0)) {
									__debugInfo = "139:\Map.gbas";
									local3_Typ_1493 = 3;
									__debugInfo = "139:\Map.gbas";
								} else if ((((local17___SelectHelper12__1494) == (8)) ? 1 : 0)) {
									__debugInfo = "141:\Map.gbas";
									local3_Typ_1493 = 1;
									__debugInfo = "141:\Map.gbas";
								} else if ((((local17___SelectHelper12__1494) == (9)) ? 1 : 0)) {
									__debugInfo = "143:\Map.gbas";
									local3_Typ_1493 = 4;
									__debugInfo = "143:\Map.gbas";
								};
								__debugInfo = "135:\Map.gbas";
							};
							__debugInfo = "146:\Map.gbas";
							(local5_Enemy_1495).Init(~~(local3_Typ_1493), ((local1_x_1488) * (32)), ((local1_y_1489) * (32)));
							__debugInfo = "147:\Map.gbas";
							param4_self.attr5_Datas.arrAccess(local1_x_1488, local1_y_1489).values[tmpPositionCache] = 0;
							__debugInfo = "135:\Map.gbas";
						};
						__debugInfo = "126:\Map.gbas";
					};
					__debugInfo = "149:\Map.gbas";
					local1_x_1488+=1;
					__debugInfo = "125:\Map.gbas";
				}
				forEachSaver3671.values[forEachCounter3671] = local4_tile_1491;
			
			};
			__debugInfo = "152:\Map.gbas";
			local1_y_1489+=1;
			__debugInfo = "117:\Map.gbas";
		};
		__debugInfo = "155:\Map.gbas";
		CLOSEFILE(local3_Chn_1485);
		__debugInfo = "156:\Map.gbas";
		return 0;
		__debugInfo = "96:\Map.gbas";
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
window['method10_type4_TMap_6_Update'] = function(param4_self) {
	stackPush("method: Update", __debugInfo);
	try {
		__debugInfo = "171:\Map.gbas";
		if (param4_self.attr8_SpikeDir) {
			__debugInfo = "160:\Map.gbas";
			param4_self.attr13_SpikePosition+=-(0.5);
			__debugInfo = "164:\Map.gbas";
			if ((((param4_self.attr13_SpikePosition) <= (0)) ? 1 : 0)) {
				__debugInfo = "162:\Map.gbas";
				param4_self.attr13_SpikePosition = 0;
				__debugInfo = "163:\Map.gbas";
				param4_self.attr8_SpikeDir = 0;
				__debugInfo = "162:\Map.gbas";
			};
			__debugInfo = "160:\Map.gbas";
		} else {
			__debugInfo = "166:\Map.gbas";
			param4_self.attr13_SpikePosition+=0.5;
			__debugInfo = "170:\Map.gbas";
			if ((((param4_self.attr13_SpikePosition) >= (32)) ? 1 : 0)) {
				__debugInfo = "168:\Map.gbas";
				param4_self.attr8_SpikeDir = 1;
				__debugInfo = "169:\Map.gbas";
				param4_self.attr13_SpikePosition = 32;
				__debugInfo = "168:\Map.gbas";
			};
			__debugInfo = "166:\Map.gbas";
		};
		__debugInfo = "172:\Map.gbas";
		return 0;
		__debugInfo = "171:\Map.gbas";
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
window['method10_type4_TMap_6_Render'] = function(param4_self) {
	stackPush("method: Render", __debugInfo);
	try {
		var local10_TmpScrollX_1500 = 0.0, local10_TmpScrollY_1501 = 0.0;
		__debugInfo = "175:\Map.gbas";
		local10_TmpScrollX_1500 = param4_self.attr7_ScrollX;
		__debugInfo = "176:\Map.gbas";
		local10_TmpScrollY_1501 = param4_self.attr7_ScrollY;
		__debugInfo = "183:\Map.gbas";
		if (((((((param4_self.attr13_IsRenderedFBO) == (0)) ? 1 : 0)) && (param4_self.attr6_HasFBO)) ? 1 : 0)) {
			__debugInfo = "179:\Map.gbas";
			USESCREEN(param4_self.attr8_ScreenID);
			__debugInfo = "180:\Map.gbas";
			DRAWRECT(0, 0, ((param4_self.attr5_Width) * (32)), ((param4_self.attr6_Height) * (32)), RGB(255, 0, 128));
			__debugInfo = "181:\Map.gbas";
			param4_self.attr7_ScrollX = 0;
			__debugInfo = "182:\Map.gbas";
			param4_self.attr7_ScrollY = 0;
			__debugInfo = "179:\Map.gbas";
		};
		__debugInfo = "215:\Map.gbas";
		if (((((((param4_self.attr6_HasFBO) == (0)) ? 1 : 0)) || ((((param4_self.attr13_IsRenderedFBO) == (0)) ? 1 : 0))) ? 1 : 0)) {
			var local5_width_ref_1502 = [0.0], local6_height_ref_1503 = [0.0], local2_sx_1504 = 0.0, local2_sy_1505 = 0.0;
			__debugInfo = "187:\Map.gbas";
			GETSCREENSIZE(local5_width_ref_1502, local6_height_ref_1503);
			__debugInfo = "188:\Map.gbas";
			local5_width_ref_1502[0] = ((INTEGER(((local5_width_ref_1502[0]) / (32)))) + (1));
			__debugInfo = "189:\Map.gbas";
			local6_height_ref_1503[0] = ((INTEGER(((local6_height_ref_1503[0]) / (32)))) + (1));
			__debugInfo = "190:\Map.gbas";
			local2_sx_1504 = ((-(INTEGER(((param4_self.attr7_ScrollX) / (32))))) - (1));
			__debugInfo = "191:\Map.gbas";
			local2_sy_1505 = ((-(INTEGER(((param4_self.attr7_ScrollY) / (32))))) - (1));
			__debugInfo = "194:\Map.gbas";
			{
				var local1_x_1506 = 0.0;
				__debugInfo = "201:\Map.gbas";
				for (local1_x_1506 = local2_sx_1504;toCheck(local1_x_1506, ((local2_sx_1504) + (local5_width_ref_1502[0])), 1);local1_x_1506 += 1) {
					__debugInfo = "195:\Map.gbas";
					{
						var local1_y_1507 = 0.0;
						__debugInfo = "200:\Map.gbas";
						for (local1_y_1507 = local2_sy_1505;toCheck(local1_y_1507, ((local2_sy_1505) + (local6_height_ref_1503[0])), 1);local1_y_1507 += 1) {
							__debugInfo = "199:\Map.gbas";
							if (((((((((((((local1_x_1506) >= (0)) ? 1 : 0)) && ((((local1_y_1507) >= (0)) ? 1 : 0))) ? 1 : 0)) && ((((local1_x_1506) < (param4_self.attr5_Width)) ? 1 : 0))) ? 1 : 0)) && ((((local1_y_1507) < (param4_self.attr6_Height)) ? 1 : 0))) ? 1 : 0)) {
								__debugInfo = "198:\Map.gbas";
								if ((((param4_self.attr5_Datas.arrAccess(~~(local1_x_1506), ~~(local1_y_1507)).values[tmpPositionCache]) != (1)) ? 1 : 0)) {
									__debugInfo = "198:\Map.gbas";
									(param4_self).RenderTile(param4_self.attr5_Datas.arrAccess(~~(local1_x_1506), ~~(local1_y_1507)).values[tmpPositionCache], local1_x_1506, local1_y_1507, 0);
									__debugInfo = "198:\Map.gbas";
								};
								__debugInfo = "198:\Map.gbas";
							};
							__debugInfo = "199:\Map.gbas";
						};
						__debugInfo = "200:\Map.gbas";
					};
					__debugInfo = "195:\Map.gbas";
				};
				__debugInfo = "201:\Map.gbas";
			};
			__debugInfo = "205:\Map.gbas";
			STARTPOLY(param4_self.attr7_Tileset, 2);
			__debugInfo = "205:\Map.gbas";
			{
				var local1_x_1508 = 0.0;
				__debugInfo = "212:\Map.gbas";
				for (local1_x_1508 = local2_sx_1504;toCheck(local1_x_1508, ((local2_sx_1504) + (local5_width_ref_1502[0])), 1);local1_x_1508 += 1) {
					__debugInfo = "206:\Map.gbas";
					{
						var local1_y_1509 = 0.0;
						__debugInfo = "211:\Map.gbas";
						for (local1_y_1509 = local2_sy_1505;toCheck(local1_y_1509, ((local2_sy_1505) + (local6_height_ref_1503[0])), 1);local1_y_1509 += 1) {
							__debugInfo = "210:\Map.gbas";
							if (((((((((((((local1_x_1508) >= (0)) ? 1 : 0)) && ((((local1_y_1509) >= (0)) ? 1 : 0))) ? 1 : 0)) && ((((local1_x_1508) < (param4_self.attr5_Width)) ? 1 : 0))) ? 1 : 0)) && ((((local1_y_1509) < (param4_self.attr6_Height)) ? 1 : 0))) ? 1 : 0)) {
								__debugInfo = "209:\Map.gbas";
								if ((((param4_self.attr5_Datas.arrAccess(~~(local1_x_1508), ~~(local1_y_1509)).values[tmpPositionCache]) == (1)) ? 1 : 0)) {
									__debugInfo = "209:\Map.gbas";
									(param4_self).RenderTile(param4_self.attr5_Datas.arrAccess(~~(local1_x_1508), ~~(local1_y_1509)).values[tmpPositionCache], local1_x_1508, local1_y_1509, 1);
									__debugInfo = "209:\Map.gbas";
								};
								__debugInfo = "209:\Map.gbas";
							};
							__debugInfo = "210:\Map.gbas";
						};
						__debugInfo = "211:\Map.gbas";
					};
					__debugInfo = "206:\Map.gbas";
				};
				__debugInfo = "212:\Map.gbas";
			};
			__debugInfo = "213:\Map.gbas";
			ENDPOLY();
			__debugInfo = "187:\Map.gbas";
		};
		__debugInfo = "222:\Map.gbas";
		if (((((((param4_self.attr13_IsRenderedFBO) == (0)) ? 1 : 0)) && (param4_self.attr6_HasFBO)) ? 1 : 0)) {
			__debugInfo = "218:\Map.gbas";
			USESCREEN(-(1));
			__debugInfo = "219:\Map.gbas";
			param4_self.attr13_IsRenderedFBO = 1;
			__debugInfo = "220:\Map.gbas";
			param4_self.attr7_ScrollX = local10_TmpScrollX_1500;
			__debugInfo = "221:\Map.gbas";
			param4_self.attr7_ScrollY = local10_TmpScrollY_1501;
			__debugInfo = "218:\Map.gbas";
		};
		__debugInfo = "225:\Map.gbas";
		if (param4_self.attr13_IsRenderedFBO) {
			__debugInfo = "224:\Map.gbas";
			DRAWSPRITE(param4_self.attr5_SprID, param4_self.attr7_ScrollX, param4_self.attr7_ScrollY);
			__debugInfo = "224:\Map.gbas";
		};
		__debugInfo = "226:\Map.gbas";
		return 0;
		__debugInfo = "175:\Map.gbas";
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
window['method10_type4_TMap_10_RenderTile'] = function(param4_Tile, param1_x, param1_y, param6_IsPoly, param4_self) {
	stackPush("method: RenderTile", __debugInfo);
	try {
		__debugInfo = "229:\Map.gbas";
		if (((((((((((((((param1_x) >= (0)) ? 1 : 0)) && ((((param1_y) >= (0)) ? 1 : 0))) ? 1 : 0)) && ((((param1_x) < (global3_Map.attr5_Width)) ? 1 : 0))) ? 1 : 0)) && ((((param1_y) < (global3_Map.attr6_Height)) ? 1 : 0))) ? 1 : 0)) ? 0 : 1)) {
			__debugInfo = "229:\Map.gbas";
			return 0;
			__debugInfo = "229:\Map.gbas";
		};
		__debugInfo = "231:\Map.gbas";
		{
			var local17___SelectHelper13__1516 = 0;
			__debugInfo = "231:\Map.gbas";
			local17___SelectHelper13__1516 = param4_Tile;
			__debugInfo = "274:\Map.gbas";
			if ((((local17___SelectHelper13__1516) == (1)) ? 1 : 0)) {
				__debugInfo = "233:\Map.gbas";
				param4_Tile;
				__debugInfo = "246:\Map.gbas";
				if ((((((((((param1_y) == (0)) ? 1 : 0)) || (func15_IsCollisionTile(param4_self.attr5_Datas.arrAccess(~~(param1_x), ~~(((param1_y) - (1)))).values[tmpPositionCache]))) ? 1 : 0)) && (((((((param1_x) == (0)) ? 1 : 0)) || (func15_IsCollisionTile(param4_self.attr5_Datas.arrAccess(~~(((param1_x) - (1))), ~~(param1_y)).values[tmpPositionCache]))) ? 1 : 0))) ? 1 : 0)) {
					__debugInfo = "239:\Map.gbas";
					if ((((((((((param1_y) == (0)) ? 1 : 0)) || (func15_IsCollisionTile(param4_self.attr5_Datas.arrAccess(~~(param1_x), ~~(((param1_y) - (1)))).values[tmpPositionCache]))) ? 1 : 0)) && (((((((param1_x) == (((param4_self.attr5_Width) - (1)))) ? 1 : 0)) || (func15_IsCollisionTile(param4_self.attr5_Datas.arrAccess(~~(((param1_x) + (1))), ~~(param1_y)).values[tmpPositionCache]))) ? 1 : 0))) ? 1 : 0)) {
						__debugInfo = "236:\Map.gbas";
						param4_Tile = 1;
						__debugInfo = "236:\Map.gbas";
					} else {
						__debugInfo = "238:\Map.gbas";
						param4_Tile = 2;
						__debugInfo = "238:\Map.gbas";
					};
					__debugInfo = "239:\Map.gbas";
				} else if ((((((((((param1_y) == (0)) ? 1 : 0)) || (func15_IsCollisionTile(param4_self.attr5_Datas.arrAccess(~~(param1_x), ~~(((param1_y) - (1)))).values[tmpPositionCache]))) ? 1 : 0)) && (((((((param1_x) == (((param4_self.attr5_Width) - (1)))) ? 1 : 0)) || ((((param4_self.attr5_Datas.arrAccess(~~(((param1_x) + (1))), ~~(param1_y)).values[tmpPositionCache]) == (0)) ? 1 : 0))) ? 1 : 0))) ? 1 : 0)) {
					__debugInfo = "241:\Map.gbas";
					param4_Tile = 3;
					__debugInfo = "241:\Map.gbas";
				} else if (((((((param1_y) == (0)) ? 1 : 0)) || (func15_IsCollisionTile(param4_self.attr5_Datas.arrAccess(~~(param1_x), ~~(((param1_y) - (1)))).values[tmpPositionCache]))) ? 1 : 0)) {
					__debugInfo = "243:\Map.gbas";
					param4_Tile = 1;
					__debugInfo = "243:\Map.gbas";
				} else {
					__debugInfo = "245:\Map.gbas";
					param4_Tile = 0;
					__debugInfo = "245:\Map.gbas";
				};
				__debugInfo = "257:\Map.gbas";
				if ((((param6_IsPoly) == (0)) ? 1 : 0)) {
					__debugInfo = "249:\Map.gbas";
					DRAWANIM(param4_self.attr7_Tileset, param4_Tile, ((((param1_x) * (32))) + (param4_self.attr7_ScrollX)), ((((param1_y) * (32))) + (param4_self.attr7_ScrollY)));
					__debugInfo = "249:\Map.gbas";
				} else {
					__debugInfo = "251:\Map.gbas";
					POLYVECTOR(((((param1_x) * (32))) + (param4_self.attr7_ScrollX)), ((((((param1_y) * (32))) + (param4_self.attr7_ScrollY))) - (1)), ((param4_Tile) * (32)), 0, RGB(255, 255, 255));
					__debugInfo = "252:\Map.gbas";
					POLYVECTOR(((((((param1_x) * (32))) + (param4_self.attr7_ScrollX))) + (32)), ((((((param1_y) * (32))) + (param4_self.attr7_ScrollY))) - (1)), ((((param4_Tile) + (1))) * (32)), 0, RGB(255, 255, 255));
					__debugInfo = "253:\Map.gbas";
					POLYVECTOR(((((param1_x) * (32))) + (param4_self.attr7_ScrollX)), ((((((((param1_y) * (32))) + (param4_self.attr7_ScrollY))) + (32))) - (1)), ((param4_Tile) * (32)), 31, RGB(255, 255, 255));
					__debugInfo = "254:\Map.gbas";
					POLYVECTOR(((((((param1_x) * (32))) + (param4_self.attr7_ScrollX))) + (32)), ((((((((param1_y) * (32))) + (param4_self.attr7_ScrollY))) + (32))) - (1)), ((((param4_Tile) + (1))) * (32)), 31, RGB(255, 255, 255));
					__debugInfo = "256:\Map.gbas";
					POLYNEWSTRIP();
					__debugInfo = "251:\Map.gbas";
				};
				__debugInfo = "233:\Map.gbas";
			} else if ((((local17___SelectHelper13__1516) == (2)) ? 1 : 0)) {
				__debugInfo = "259:\Map.gbas";
				DRAWSPRITE(global11_LadderImage, ((((param1_x) * (32))) + (param4_self.attr7_ScrollX)), ((((param1_y) * (32))) + (param4_self.attr7_ScrollY)));
				__debugInfo = "259:\Map.gbas";
			} else if ((((local17___SelectHelper13__1516) == (3)) ? 1 : 0)) {
				__debugInfo = "261:\Map.gbas";
				DRAWSPRITE(global10_SpikeImage, ((((param1_x) * (32))) + (param4_self.attr7_ScrollX)), ((((((param1_y) * (32))) + (param4_self.attr7_ScrollY))) + (param4_self.attr13_SpikePosition)));
				__debugInfo = "261:\Map.gbas";
			} else if ((((local17___SelectHelper13__1516) == (4)) ? 1 : 0)) {
				
			} else if ((((local17___SelectHelper13__1516) == (5)) ? 1 : 0)) {
				__debugInfo = "265:\Map.gbas";
				DRAWSPRITE(global15_TrampolineImage, ((((param1_x) * (32))) + (param4_self.attr7_ScrollX)), ((((((param1_y) * (32))) + (param4_self.attr7_ScrollY))) + (16)));
				__debugInfo = "265:\Map.gbas";
			} else if ((((local17___SelectHelper13__1516) == (10)) ? 1 : 0)) {
				__debugInfo = "267:\Map.gbas";
				DRAWSPRITE(global9_DoorImage, ((((param1_x) * (32))) + (param4_self.attr7_ScrollX)), ((((param1_y) * (32))) + (param4_self.attr7_ScrollY)));
				__debugInfo = "267:\Map.gbas";
			} else if ((((local17___SelectHelper13__1516) == (11)) ? 1 : 0)) {
				__debugInfo = "269:\Map.gbas";
				DRAWSPRITE(global12_DynamitImage, ((((param1_x) * (32))) + (param4_self.attr7_ScrollX)), ((((param1_y) * (32))) + (param4_self.attr7_ScrollY)));
				__debugInfo = "269:\Map.gbas";
			} else if ((((local17___SelectHelper13__1516) == (12)) ? 1 : 0)) {
				__debugInfo = "271:\Map.gbas";
				DRAWANIM(global12_TriggerImage, 0, ((((param1_x) * (32))) + (param4_self.attr7_ScrollX)), ((((((param1_y) * (32))) + (param4_self.attr7_ScrollY))) + (16)));
				__debugInfo = "271:\Map.gbas";
			} else if ((((local17___SelectHelper13__1516) == (13)) ? 1 : 0)) {
				__debugInfo = "273:\Map.gbas";
				DRAWANIM(global12_TriggerImage, 1, ((((param1_x) * (32))) + (param4_self.attr7_ScrollX)), ((((((param1_y) * (32))) + (param4_self.attr7_ScrollY))) + (16)));
				__debugInfo = "273:\Map.gbas";
			};
			__debugInfo = "231:\Map.gbas";
		};
		__debugInfo = "275:\Map.gbas";
		return 0;
		__debugInfo = "229:\Map.gbas";
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
window['method10_type4_TMap_8_PickTile'] = function(param1_X, param1_Y, param4_self) {
	stackPush("method: PickTile", __debugInfo);
	try {
		__debugInfo = "288:\Map.gbas";
		if (((((((((((((param1_X) >= (0)) ? 1 : 0)) && ((((param1_Y) >= (0)) ? 1 : 0))) ? 1 : 0)) && ((((param1_X) < (((param4_self.attr5_Width) * (32)))) ? 1 : 0))) ? 1 : 0)) && ((((param1_Y) < (((param4_self.attr6_Height) * (32)))) ? 1 : 0))) ? 1 : 0)) {
			__debugInfo = "281:\Map.gbas";
			param1_X = INTEGER(((param1_X) / (32)));
			__debugInfo = "282:\Map.gbas";
			param1_Y = INTEGER(((param1_Y) / (32)));
			__debugInfo = "283:\Map.gbas";
			param4_self.attr9_LastPickX = ~~(param1_X);
			__debugInfo = "284:\Map.gbas";
			param4_self.attr9_LastPickY = ~~(param1_Y);
			__debugInfo = "285:\Map.gbas";
			return tryClone(param4_self.attr5_Datas.arrAccess(~~(param1_X), ~~(param1_Y)).values[tmpPositionCache]);
			__debugInfo = "281:\Map.gbas";
		} else {
			__debugInfo = "287:\Map.gbas";
			return tryClone(0);
			__debugInfo = "287:\Map.gbas";
		};
		__debugInfo = "289:\Map.gbas";
		return 0;
		__debugInfo = "288:\Map.gbas";
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
window['method10_type4_TMap_10_RemoveTile'] = function(param1_X, param1_Y, param4_self) {
	stackPush("method: RemoveTile", __debugInfo);
	try {
		__debugInfo = "296:\Map.gbas";
		if (((((((((((((param1_X) >= (0)) ? 1 : 0)) && ((((param1_Y) >= (0)) ? 1 : 0))) ? 1 : 0)) && ((((param1_X) < (global3_Map.attr5_Width)) ? 1 : 0))) ? 1 : 0)) && ((((param1_Y) < (global3_Map.attr6_Height)) ? 1 : 0))) ? 1 : 0)) {
			__debugInfo = "294:\Map.gbas";
			param4_self.attr5_Datas.arrAccess(~~(param1_X), ~~(param1_Y)).values[tmpPositionCache] = 0;
			__debugInfo = "295:\Map.gbas";
			param4_self.attr13_IsRenderedFBO = 0;
			__debugInfo = "294:\Map.gbas";
		};
		__debugInfo = "297:\Map.gbas";
		return 0;
		__debugInfo = "296:\Map.gbas";
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
window['method10_type4_TMap_14_CollisionPoint'] = function(param1_X, param1_Y, param4_self) {
	stackPush("method: CollisionPoint", __debugInfo);
	try {
		var local4_TmpY_1529 = 0.0;
		__debugInfo = "301:\Map.gbas";
		local4_TmpY_1529 = param1_Y;
		__debugInfo = "322:\Map.gbas";
		if (((((((((((((param1_X) >= (0)) ? 1 : 0)) && ((((param1_Y) >= (0)) ? 1 : 0))) ? 1 : 0)) && ((((param1_X) < (((param4_self.attr5_Width) * (32)))) ? 1 : 0))) ? 1 : 0)) && ((((param1_Y) < (((param4_self.attr6_Height) * (32)))) ? 1 : 0))) ? 1 : 0)) {
			__debugInfo = "304:\Map.gbas";
			param1_X = INTEGER(((param1_X) / (32)));
			__debugInfo = "305:\Map.gbas";
			param1_Y = INTEGER(((param1_Y) / (32)));
			__debugInfo = "319:\Map.gbas";
			if ((((func15_IsCollisionTile(param4_self.attr5_Datas.arrAccess(~~(param1_X), ~~(param1_Y)).values[tmpPositionCache])) == (0)) ? 1 : 0)) {
				__debugInfo = "315:\Map.gbas";
				if ((((((((((param4_self.attr5_Datas.arrAccess(~~(param1_X), ~~(param1_Y)).values[tmpPositionCache]) == (5)) ? 1 : 0)) || ((((param4_self.attr5_Datas.arrAccess(~~(param1_X), ~~(param1_Y)).values[tmpPositionCache]) == (12)) ? 1 : 0))) ? 1 : 0)) || ((((param4_self.attr5_Datas.arrAccess(~~(param1_X), ~~(param1_Y)).values[tmpPositionCache]) == (13)) ? 1 : 0))) ? 1 : 0)) {
					__debugInfo = "314:\Map.gbas";
					if ((((MOD(~~(local4_TmpY_1529), 32)) > (16)) ? 1 : 0)) {
						__debugInfo = "311:\Map.gbas";
						return 1;
						__debugInfo = "311:\Map.gbas";
					} else {
						__debugInfo = "313:\Map.gbas";
						return tryClone(0);
						__debugInfo = "313:\Map.gbas";
					};
					__debugInfo = "314:\Map.gbas";
				};
				__debugInfo = "316:\Map.gbas";
				return 1;
				__debugInfo = "315:\Map.gbas";
			} else {
				__debugInfo = "318:\Map.gbas";
				return tryClone(0);
				__debugInfo = "318:\Map.gbas";
			};
			__debugInfo = "304:\Map.gbas";
		} else {
			__debugInfo = "321:\Map.gbas";
			return tryClone(0);
			__debugInfo = "321:\Map.gbas";
		};
		__debugInfo = "323:\Map.gbas";
		return 0;
		__debugInfo = "301:\Map.gbas";
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
window['method10_type4_TMap_12_RayCollision'] = function(param2_X1, param2_Y1, param2_X2, param2_Y2, param4_self) {
	stackPush("method: RayCollision", __debugInfo);
	try {
		var local6_Length_1536 = 0.0, local6_DeltaX_1537 = 0.0, local6_DeltaY_1538 = 0.0;
		__debugInfo = "327:\Map.gbas";
		local6_Length_1536 = SQR(((((((((param2_X1) * (param2_X1))) + (((param2_Y1) * (param2_Y1))))) + (((param2_X2) * (param2_X2))))) + (((param2_Y2) * (param2_Y2)))));
		__debugInfo = "328:\Map.gbas";
		local6_DeltaX_1537 = ((((param2_X1) - (param2_X2))) / (local6_Length_1536));
		__debugInfo = "329:\Map.gbas";
		local6_DeltaY_1538 = ((((param2_Y1) - (param2_Y2))) / (local6_Length_1536));
		__debugInfo = "329:\Map.gbas";
		{
			var local1_i_1539 = 0.0;
			__debugInfo = "334:\Map.gbas";
			for (local1_i_1539 = 0;toCheck(local1_i_1539, local6_Length_1536, 1);local1_i_1539 += 1) {
				__debugInfo = "333:\Map.gbas";
				if ((param4_self).CollisionPoint(((param2_X1) - (((local6_DeltaX_1537) * (local1_i_1539)))), ((param2_Y1) - (((local6_DeltaY_1538) * (local1_i_1539)))))) {
					__debugInfo = "332:\Map.gbas";
					return tryClone(1);
					__debugInfo = "332:\Map.gbas";
				};
				__debugInfo = "333:\Map.gbas";
			};
			__debugInfo = "334:\Map.gbas";
		};
		__debugInfo = "335:\Map.gbas";
		return 0;
		__debugInfo = "336:\Map.gbas";
		return 0;
		__debugInfo = "327:\Map.gbas";
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
window['method10_type4_TMap_9_Collision'] = function(param1_X, param1_Y, param5_Width, param6_Height, param4_self) {
	stackPush("method: Collision", __debugInfo);
	try {
		__debugInfo = "339:\Map.gbas";
		{
			var local2_XX_1546 = 0.0;
			__debugInfo = "344:\Map.gbas";
			for (local2_XX_1546 = param1_X;toCheck(local2_XX_1546, ((param1_X) + (param5_Width)), 4);local2_XX_1546 += 4) {
				__debugInfo = "340:\Map.gbas";
				{
					var local2_YY_1547 = 0.0;
					__debugInfo = "343:\Map.gbas";
					for (local2_YY_1547 = param1_Y;toCheck(local2_YY_1547, ((param1_Y) + (param6_Height)), 4);local2_YY_1547 += 4) {
						__debugInfo = "342:\Map.gbas";
						if ((param4_self).CollisionPoint(local2_XX_1546, local2_YY_1547)) {
							__debugInfo = "342:\Map.gbas";
							return 1;
							__debugInfo = "342:\Map.gbas";
						};
						__debugInfo = "342:\Map.gbas";
					};
					__debugInfo = "343:\Map.gbas";
				};
				__debugInfo = "340:\Map.gbas";
			};
			__debugInfo = "344:\Map.gbas";
		};
		__debugInfo = "351:\Map.gbas";
		if (((((((((((param4_self).CollisionPoint(param1_X, param1_Y)) || ((param4_self).CollisionPoint(((param1_X) + (param5_Width)), param1_Y))) ? 1 : 0)) || ((param4_self).CollisionPoint(param1_X, ((param1_Y) + (param6_Height))))) ? 1 : 0)) || ((param4_self).CollisionPoint(((param1_X) + (param5_Width)), ((param1_Y) + (param6_Height))))) ? 1 : 0)) {
			__debugInfo = "348:\Map.gbas";
			return 1;
			__debugInfo = "348:\Map.gbas";
		} else {
			__debugInfo = "350:\Map.gbas";
			return tryClone(0);
			__debugInfo = "350:\Map.gbas";
		};
		__debugInfo = "352:\Map.gbas";
		return 0;
		__debugInfo = "339:\Map.gbas";
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
window['func15_IsCollisionTile'] = function(param3_Typ) {
	stackPush("function: IsCollisionTile", __debugInfo);
	try {
		__debugInfo = "360:\Map.gbas";
		if (((((((((((((param3_Typ) == (0)) ? 1 : 0)) || ((((param3_Typ) == (2)) ? 1 : 0))) ? 1 : 0)) || ((((param3_Typ) == (3)) ? 1 : 0))) ? 1 : 0)) || ((((param3_Typ) == (10)) ? 1 : 0))) ? 1 : 0)) {
			__debugInfo = "357:\Map.gbas";
			return 1;
			__debugInfo = "357:\Map.gbas";
		} else {
			__debugInfo = "359:\Map.gbas";
			return tryClone(0);
			__debugInfo = "359:\Map.gbas";
		};
		__debugInfo = "361:\Map.gbas";
		return 0;
		__debugInfo = "360:\Map.gbas";
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
window['func7_Convert'] = function(param8_Text_Str) {
	stackPush("function: Convert", __debugInfo);
	try {
		__debugInfo = "364:\Map.gbas";
		{
			var local17___SelectHelper14__1550 = "";
			__debugInfo = "364:\Map.gbas";
			local17___SelectHelper14__1550 = param8_Text_Str;
			__debugInfo = "373:\Map.gbas";
			if ((((local17___SelectHelper14__1550) == ("A")) ? 1 : 0)) {
				__debugInfo = "366:\Map.gbas";
				return 10;
				__debugInfo = "366:\Map.gbas";
			} else if ((((local17___SelectHelper14__1550) == ("B")) ? 1 : 0)) {
				__debugInfo = "368:\Map.gbas";
				return 11;
				__debugInfo = "368:\Map.gbas";
			} else if ((((local17___SelectHelper14__1550) == ("C")) ? 1 : 0)) {
				__debugInfo = "370:\Map.gbas";
				return 12;
				__debugInfo = "370:\Map.gbas";
			} else {
				__debugInfo = "372:\Map.gbas";
				return tryClone(INTEGER(FLOAT2STR(param8_Text_Str)));
				__debugInfo = "372:\Map.gbas";
			};
			__debugInfo = "364:\Map.gbas";
		};
		__debugInfo = "374:\Map.gbas";
		return 0;
		__debugInfo = "364:\Map.gbas";
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
window['method13_type7_TPlayer_4_Init'] = function(param1_X, param1_Y, param5_Width, param6_Height, param4_self) {
	stackPush("method: Init", __debugInfo);
	try {
		__debugInfo = "16:\Player.gbas";
		param4_self.attr1_X = param1_X;
		__debugInfo = "17:\Player.gbas";
		param4_self.attr1_Y = param1_Y;
		__debugInfo = "18:\Player.gbas";
		param4_self.attr2_VX = 0;
		__debugInfo = "19:\Player.gbas";
		param4_self.attr2_VY = 0;
		__debugInfo = "21:\Player.gbas";
		param4_self.attr5_Width = param5_Width;
		__debugInfo = "22:\Player.gbas";
		param4_self.attr6_Height = param6_Height;
		__debugInfo = "23:\Player.gbas";
		return 0;
		__debugInfo = "16:\Player.gbas";
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
window['method13_type7_TPlayer_6_Update'] = function(param4_self) {
	stackPush("method: Update", __debugInfo);
	try {
		var local8_ScrWidth_ref_1559 = [0.0], local9_ScrHeight_ref_1560 = [0.0], local4_OldX_1561 = 0.0, local4_OldY_1562 = 0.0;
		__debugInfo = "27:\Player.gbas";
		GETSCREENSIZE(local8_ScrWidth_ref_1559, local9_ScrHeight_ref_1560);
		__debugInfo = "30:\Player.gbas";
		param4_self.attr2_VY+=0.5;
		__debugInfo = "33:\Player.gbas";
		if ((((KEY(203)) || (func16_UpdateGameButton(42, ((local9_ScrHeight_ref_1560[0]) - (42))))) ? 1 : 0)) {
			__debugInfo = "33:\Player.gbas";
			param4_self.attr2_VX+=-(1);
			__debugInfo = "33:\Player.gbas";
		};
		__debugInfo = "34:\Player.gbas";
		if ((((KEY(205)) || (func16_UpdateGameButton(((local8_ScrWidth_ref_1559[0]) - (42)), ((local9_ScrHeight_ref_1560[0]) - (42))))) ? 1 : 0)) {
			__debugInfo = "34:\Player.gbas";
			param4_self.attr2_VX+=1;
			__debugInfo = "34:\Player.gbas";
		};
		__debugInfo = "47:\Player.gbas";
		if ((((KEY(57)) || ((((func16_UpdateGameButton(42, ((local9_ScrHeight_ref_1560[0]) - (125)))) || (func16_UpdateGameButton(((local8_ScrWidth_ref_1559[0]) - (42)), ((local9_ScrHeight_ref_1560[0]) - (125))))) ? 1 : 0))) ? 1 : 0)) {
			__debugInfo = "46:\Player.gbas";
			if (((((global3_Map).PickTile(((param4_self.attr1_X) + (CAST2INT(((param4_self.attr5_Width) / (2))))), param4_self.attr1_Y)) == (2)) ? 1 : 0)) {
				__debugInfo = "37:\Player.gbas";
				param4_self.attr2_VY = 0;
				__debugInfo = "38:\Player.gbas";
				param4_self.attr1_Y+=-(4);
				__debugInfo = "42:\Player.gbas";
				while (((((global3_Map).PickTile(((param4_self.attr1_X) + (CAST2INT(((param4_self.attr5_Width) / (2))))), param4_self.attr1_Y)) != (2)) ? 1 : 0)) {
					__debugInfo = "41:\Player.gbas";
					param4_self.attr1_Y+=1;
					__debugInfo = "41:\Player.gbas";
				};
				__debugInfo = "37:\Player.gbas";
			} else if (((((global3_Map).CollisionPoint(((param4_self.attr1_X) + (1)), ((((param4_self.attr1_Y) + (param4_self.attr6_Height))) + (1)))) || ((global3_Map).CollisionPoint(((((param4_self.attr1_X) + (param4_self.attr5_Width))) - (1)), ((((param4_self.attr1_Y) + (param4_self.attr6_Height))) + (1))))) ? 1 : 0)) {
				__debugInfo = "45:\Player.gbas";
				param4_self.attr2_VY = -(8);
				__debugInfo = "45:\Player.gbas";
			};
			__debugInfo = "46:\Player.gbas";
		};
		__debugInfo = "58:\Player.gbas";
		if (((((global3_Map).PickTile(((param4_self.attr1_X) + (CAST2INT(((param4_self.attr5_Width) / (2))))), ((param4_self.attr1_Y) + (CAST2INT(((param4_self.attr6_Height) / (2))))))) == (10)) ? 1 : 0)) {
			__debugInfo = "57:\Player.gbas";
			if ((((global3_Map.attr11_NextMap_Str) == ("")) ? 1 : 0)) {
				__debugInfo = "53:\Player.gbas";
				END();
				__debugInfo = "53:\Player.gbas";
			} else {
				__debugInfo = "55:\Player.gbas";
				(global3_Map).Init(global3_Map.attr11_NextMap_Str);
				__debugInfo = "56:\Player.gbas";
				throw new GLBException("Exit", "\Player.gbas", 56);
				__debugInfo = "55:\Player.gbas";
			};
			__debugInfo = "57:\Player.gbas";
		};
		__debugInfo = "61:\Player.gbas";
		param4_self.attr2_VX = ((param4_self.attr2_VX) * (((0.77) + (((global3_Map.attr6_IsSnow) * (0.1))))));
		__debugInfo = "64:\Player.gbas";
		if ((((param4_self.attr2_VY) > (31)) ? 1 : 0)) {
			__debugInfo = "64:\Player.gbas";
			param4_self.attr2_VY = 31;
			__debugInfo = "64:\Player.gbas";
		};
		__debugInfo = "65:\Player.gbas";
		if ((((param4_self.attr2_VY) < (-33)) ? 1 : 0)) {
			__debugInfo = "65:\Player.gbas";
			param4_self.attr2_VY = -33;
			__debugInfo = "65:\Player.gbas";
		};
		__debugInfo = "69:\Player.gbas";
		local4_OldX_1561 = param4_self.attr1_X;
		__debugInfo = "70:\Player.gbas";
		local4_OldY_1562 = param4_self.attr1_Y;
		__debugInfo = "73:\Player.gbas";
		param4_self.attr1_X+=param4_self.attr2_VX;
		__debugInfo = "76:\Player.gbas";
		if ((global3_Map).Collision(((param4_self.attr1_X) + (1)), ((param4_self.attr1_Y) + (1)), ((param4_self.attr5_Width) - (2)), ((param4_self.attr6_Height) - (2)))) {
			__debugInfo = "75:\Player.gbas";
			param4_self.attr1_X = local4_OldX_1561;
			__debugInfo = "75:\Player.gbas";
		};
		__debugInfo = "78:\Player.gbas";
		param4_self.attr1_Y+=param4_self.attr2_VY;
		__debugInfo = "82:\Player.gbas";
		if ((global3_Map).Collision(((param4_self.attr1_X) + (1)), ((param4_self.attr1_Y) + (1)), ((param4_self.attr5_Width) - (2)), ((param4_self.attr6_Height) - (2)))) {
			__debugInfo = "80:\Player.gbas";
			param4_self.attr1_Y = local4_OldY_1562;
			__debugInfo = "81:\Player.gbas";
			param4_self.attr2_VY = 0;
			__debugInfo = "80:\Player.gbas";
		};
		__debugInfo = "90:\Player.gbas";
		if ((((ABS(param4_self.attr2_VX)) > (0.1)) ? 1 : 0)) {
			__debugInfo = "86:\Player.gbas";
			param4_self.attr4_Anim+=1;
			__debugInfo = "87:\Player.gbas";
			param4_self.attr4_Anim = MOD(param4_self.attr4_Anim, 15);
			__debugInfo = "86:\Player.gbas";
		} else {
			__debugInfo = "89:\Player.gbas";
			param4_self.attr4_Anim = 13;
			__debugInfo = "89:\Player.gbas";
		};
		__debugInfo = "95:\Player.gbas";
		if ((((((((global3_Map).PickTile(((param4_self.attr1_X) + (4)), ((((((param4_self.attr1_Y) - (global3_Map.attr13_SpikePosition))) + (32))) - (1)))) == (3)) ? 1 : 0)) || (((((global3_Map).PickTile(((((param4_self.attr1_X) + (param4_self.attr5_Width))) - (4)), ((((((param4_self.attr1_Y) - (global3_Map.attr13_SpikePosition))) + (32))) - (1)))) == (3)) ? 1 : 0))) ? 1 : 0)) {
			__debugInfo = "94:\Player.gbas";
			(param4_self).Reset();
			__debugInfo = "94:\Player.gbas";
		};
		__debugInfo = "100:\Player.gbas";
		if (((((((((((global3_Map).PickTile(((param4_self.attr1_X) + (2)), ((((((param4_self.attr1_Y) + (param4_self.attr6_Height))) + (param4_self.attr2_VY))) - (16)))) == (5)) ? 1 : 0)) || (((((global3_Map).PickTile(((((param4_self.attr1_X) + (param4_self.attr5_Width))) - (4)), ((((((param4_self.attr1_Y) + (param4_self.attr6_Height))) + (param4_self.attr2_VY))) - (16)))) == (5)) ? 1 : 0))) ? 1 : 0)) && ((((ABS(param4_self.attr2_VY)) > (0.25)) ? 1 : 0))) ? 1 : 0)) {
			__debugInfo = "99:\Player.gbas";
			param4_self.attr2_VY = ((-(param4_self.attr2_VY)) * (1.1));
			__debugInfo = "99:\Player.gbas";
		};
		__debugInfo = "160:\Player.gbas";
		if ((((((((global3_Map).PickTile(param4_self.attr1_X, ((((((param4_self.attr1_Y) + (param4_self.attr6_Height))) + (param4_self.attr2_VY))) - (16)))) == (12)) ? 1 : 0)) || (((((global3_Map).PickTile(((((param4_self.attr1_X) + (param4_self.attr5_Width))) - (4)), ((((((param4_self.attr1_Y) + (param4_self.attr6_Height))) + (param4_self.attr2_VY))) - (16)))) == (12)) ? 1 : 0))) ? 1 : 0)) {
			var local8_LastPosX_1563 = 0.0, local8_LastPosY_1564 = 0.0, local4_Dist_1565 = 0.0;
			__debugInfo = "105:\Player.gbas";
			global3_Map.attr5_Datas.arrAccess(global3_Map.attr9_LastPickX, global3_Map.attr9_LastPickY).values[tmpPositionCache] = 13;
			__debugInfo = "106:\Player.gbas";
			global3_Map.attr13_IsRenderedFBO = 0;
			__debugInfo = "109:\Player.gbas";
			local4_Dist_1565 = -(1);
			__debugInfo = "109:\Player.gbas";
			{
				var local1_x_1566 = 0.0;
				__debugInfo = "121:\Player.gbas";
				for (local1_x_1566 = 0;toCheck(local1_x_1566, ((global3_Map.attr5_Width) - (1)), 1);local1_x_1566 += 1) {
					__debugInfo = "110:\Player.gbas";
					{
						var local1_y_1567 = 0.0;
						__debugInfo = "120:\Player.gbas";
						for (local1_y_1567 = 0;toCheck(local1_y_1567, ((global3_Map.attr6_Height) - (1)), 1);local1_y_1567 += 1) {
							__debugInfo = "119:\Player.gbas";
							if ((((global3_Map.attr5_Datas.arrAccess(~~(local1_x_1566), ~~(local1_y_1567)).values[tmpPositionCache]) == (11)) ? 1 : 0)) {
								var local7_TmpDist_1568 = 0.0;
								__debugInfo = "113:\Player.gbas";
								local7_TmpDist_1568 = SQR(((((((local1_x_1566) - (global3_Map.attr9_LastPickX))) * (((local1_x_1566) - (global3_Map.attr9_LastPickX))))) + (((((local1_y_1567) - (global3_Map.attr9_LastPickY))) * (((local1_y_1567) - (global3_Map.attr9_LastPickY)))))));
								__debugInfo = "118:\Player.gbas";
								if (((((((local4_Dist_1565) == (-(1))) ? 1 : 0)) || ((((local7_TmpDist_1568) < (local4_Dist_1565)) ? 1 : 0))) ? 1 : 0)) {
									__debugInfo = "115:\Player.gbas";
									local4_Dist_1565 = local7_TmpDist_1568;
									__debugInfo = "116:\Player.gbas";
									local8_LastPosX_1563 = local1_x_1566;
									__debugInfo = "117:\Player.gbas";
									local8_LastPosY_1564 = local1_y_1567;
									__debugInfo = "115:\Player.gbas";
								};
								__debugInfo = "113:\Player.gbas";
							};
							__debugInfo = "119:\Player.gbas";
						};
						__debugInfo = "120:\Player.gbas";
					};
					__debugInfo = "110:\Player.gbas";
				};
				__debugInfo = "121:\Player.gbas";
			};
			__debugInfo = "159:\Player.gbas";
			if ((((local4_Dist_1565) != (-(1))) ? 1 : 0)) {
				var local2_X1_1569 = 0.0, local2_Y1_1570 = 0.0, local2_X2_1571 = 0.0, local2_Y2_1572 = 0.0, local5_Angle_1573 = 0.0;
				__debugInfo = "126:\Player.gbas";
				local2_Y1_1570 = ((((local8_LastPosY_1564) * (32))) + (16));
				__debugInfo = "127:\Player.gbas";
				local2_Y2_1572 = ((param4_self.attr1_Y) + (CAST2INT(((param4_self.attr6_Height) / (2)))));
				__debugInfo = "127:\Player.gbas";
				local2_X1_1569 = ((((local8_LastPosX_1563) * (32))) + (16));
				__debugInfo = "128:\Player.gbas";
				local2_X2_1571 = ((param4_self.attr1_X) + (CAST2INT(((param4_self.attr5_Width) / (2)))));
				__debugInfo = "129:\Player.gbas";
				local5_Angle_1573 = -(MOD(~~(((ATAN(((local2_Y1_1570) - (local2_Y2_1572)), ((local2_X1_1569) - (local2_X2_1571)))) + (180))), 360));
				__debugInfo = "130:\Player.gbas";
				local4_Dist_1565 = SQR(((((((local2_X1_1569) - (local2_X2_1571))) * (((local2_X1_1569) - (local2_X2_1571))))) + (((((local2_Y1_1570) - (local2_Y2_1572))) * (((local2_Y1_1570) - (local2_Y2_1572)))))));
				__debugInfo = "136:\Player.gbas";
				if ((((local4_Dist_1565) < (512)) ? 1 : 0)) {
					var local8_Strength_1574 = 0.0;
					__debugInfo = "133:\Player.gbas";
					local8_Strength_1574 = ((((256) / (((local4_Dist_1565) + (1))))) * (16));
					__debugInfo = "134:\Player.gbas";
					param4_self.attr2_VX+=((func4_QCOS(local5_Angle_1573)) * (local8_Strength_1574));
					__debugInfo = "135:\Player.gbas";
					param4_self.attr2_VY+=((func4_QSIN(local5_Angle_1573)) * (local8_Strength_1574));
					__debugInfo = "133:\Player.gbas";
				};
				__debugInfo = "138:\Player.gbas";
				{
					var local1_X_1575 = 0.0;
					__debugInfo = "151:\Player.gbas";
					for (local1_X_1575 = -(1);toCheck(local1_X_1575, 1, 1);local1_X_1575 += 1) {
						__debugInfo = "139:\Player.gbas";
						{
							var local1_Y_1576 = 0.0;
							__debugInfo = "150:\Player.gbas";
							for (local1_Y_1576 = -(1);toCheck(local1_Y_1576, 1, 1);local1_Y_1576 += 1) {
								__debugInfo = "141:\Player.gbas";
								(global3_Map).RemoveTile(((local8_LastPosX_1563) + (local1_X_1575)), ((local8_LastPosY_1564) + (local1_Y_1576)));
								__debugInfo = "141:\Player.gbas";
								{
									var local2_XX_1577 = 0.0;
									__debugInfo = "149:\Player.gbas";
									for (local2_XX_1577 = -(0.5);toCheck(local2_XX_1577, 0.5, 0.5);local2_XX_1577 += 0.5) {
										__debugInfo = "142:\Player.gbas";
										{
											var local2_YY_1578 = 0.0;
											__debugInfo = "148:\Player.gbas";
											for (local2_YY_1578 = -(0.5);toCheck(local2_YY_1578, 0.5, 0.5);local2_YY_1578 += 0.5) {
												__debugInfo = "147:\Player.gbas";
												if ((((INTEGER(RND(2))) > (1)) ? 1 : 0)) {
													var local3_Exp_1579 = new type10_TExplosion();
													__debugInfo = "146:\Player.gbas";
													(local3_Exp_1579).Init(((((((local8_LastPosX_1563) + (local1_X_1575))) + (local2_XX_1577))) * (32)), ((((((local8_LastPosY_1564) + (local1_Y_1576))) + (local2_YY_1578))) * (32)));
													__debugInfo = "146:\Player.gbas";
												};
												__debugInfo = "147:\Player.gbas";
											};
											__debugInfo = "148:\Player.gbas";
										};
										__debugInfo = "142:\Player.gbas";
									};
									__debugInfo = "149:\Player.gbas";
								};
								__debugInfo = "141:\Player.gbas";
							};
							__debugInfo = "150:\Player.gbas";
						};
						__debugInfo = "139:\Player.gbas";
					};
					__debugInfo = "151:\Player.gbas";
				};
				__debugInfo = "158:\Player.gbas";
				var forEachSaver5978 = global6_Enemys;
				for(var forEachCounter5978 = 0 ; forEachCounter5978 < forEachSaver5978.values.length ; forEachCounter5978++) {
					var local5_Enemy_1580 = forEachSaver5978.values[forEachCounter5978];
				{
						__debugInfo = "157:\Player.gbas";
						if ((((SQR(((((((local5_Enemy_1580.attr1_X) - (((local8_LastPosX_1563) * (32))))) * (((local5_Enemy_1580.attr1_X) - (((local8_LastPosX_1563) * (32))))))) + (((local5_Enemy_1580.attr1_Y) - (((local8_LastPosY_1564) * (32)))))))) < (32)) ? 1 : 0)) {
							__debugInfo = "156:\Player.gbas";
							local5_Enemy_1580.attr4_Fall = 1;
							__debugInfo = "156:\Player.gbas";
						};
						__debugInfo = "157:\Player.gbas";
					}
					forEachSaver5978.values[forEachCounter5978] = local5_Enemy_1580;
				
				};
				__debugInfo = "126:\Player.gbas";
			};
			__debugInfo = "105:\Player.gbas";
		};
		__debugInfo = "173:\Player.gbas";
		var forEachSaver6108 = global6_Enemys;
		for(var forEachCounter6108 = 0 ; forEachCounter6108 < forEachSaver6108.values.length ; forEachCounter6108++) {
			var local5_Enemy_1581 = forEachSaver6108.values[forEachCounter6108];
		{
				__debugInfo = "172:\Player.gbas";
				if ((((local5_Enemy_1581.attr4_Fall) == (0)) ? 1 : 0)) {
					__debugInfo = "171:\Player.gbas";
					if (((((((BOXCOLL(~~(((param4_self.attr1_X) + (2))), ~~(((param4_self.attr1_Y) + (2))), ((param4_self.attr5_Width) - (4)), ((param4_self.attr6_Height) + (4)), ~~(((local5_Enemy_1581.attr1_X) + (4))), ~~(((local5_Enemy_1581.attr1_Y) - (8))), ~~(((local5_Enemy_1581.attr5_Width) - (8))), 16)) && ((local5_Enemy_1581).IsDestroyable())) ? 1 : 0)) && ((((param4_self.attr2_VY) != (0)) ? 1 : 0))) ? 1 : 0)) {
						__debugInfo = "167:\Player.gbas";
						local5_Enemy_1581.attr4_Fall = 1;
						__debugInfo = "167:\Player.gbas";
					} else if (BOXCOLL(~~(((param4_self.attr1_X) + (2))), ~~(((param4_self.attr1_Y) + (2))), ((param4_self.attr5_Width) - (4)), ((param4_self.attr6_Height) - (4)), ~~(((local5_Enemy_1581.attr1_X) + (2))), ~~(((local5_Enemy_1581.attr1_Y) + (2))), ~~(((local5_Enemy_1581.attr5_Width) - (4))), ~~(((local5_Enemy_1581.attr6_Height) - (4))))) {
						__debugInfo = "169:\Player.gbas";
						(param4_self).Reset();
						__debugInfo = "170:\Player.gbas";
						break;
						__debugInfo = "169:\Player.gbas";
					};
					__debugInfo = "171:\Player.gbas";
				};
				__debugInfo = "172:\Player.gbas";
			}
			forEachSaver6108.values[forEachCounter6108] = local5_Enemy_1581;
		
		};
		__debugInfo = "181:\Player.gbas";
		var forEachSaver6148 = global5_Shits;
		for(var forEachCounter6148 = 0 ; forEachCounter6148 < forEachSaver6148.values.length ; forEachCounter6148++) {
			var local1_S_1582 = forEachSaver6148.values[forEachCounter6148];
		{
				__debugInfo = "180:\Player.gbas";
				if ((((BOXCOLL(~~(param4_self.attr1_X), ~~(param4_self.attr1_Y), param4_self.attr5_Width, param4_self.attr6_Height, ~~(local1_S_1582.attr1_X), ~~(local1_S_1582.attr1_Y), 16, 16)) && ((((local1_S_1582.attr2_VY) != (0)) ? 1 : 0))) ? 1 : 0)) {
					__debugInfo = "178:\Player.gbas";
					(param4_self).Reset();
					__debugInfo = "179:\Player.gbas";
					//DELETE!!111
					forEachSaver6148.values[forEachCounter6148] = local1_S_1582;
					DIMDEL(forEachSaver6148, forEachCounter6148);
					forEachCounter6148--;
					continue;
					__debugInfo = "178:\Player.gbas";
				};
				__debugInfo = "180:\Player.gbas";
			}
			forEachSaver6148.values[forEachCounter6148] = local1_S_1582;
		
		};
		__debugInfo = "189:\Player.gbas";
		var forEachSaver6188 = global5_Spits;
		for(var forEachCounter6188 = 0 ; forEachCounter6188 < forEachSaver6188.values.length ; forEachCounter6188++) {
			var local1_S_1583 = forEachSaver6188.values[forEachCounter6188];
		{
				__debugInfo = "188:\Player.gbas";
				if ((((BOXCOLL(~~(param4_self.attr1_X), ~~(param4_self.attr1_Y), param4_self.attr5_Width, param4_self.attr6_Height, ~~(local1_S_1583.attr1_X), ~~(local1_S_1583.attr1_Y), 8, 8)) && ((((local1_S_1583.attr2_VY) != (0)) ? 1 : 0))) ? 1 : 0)) {
					__debugInfo = "186:\Player.gbas";
					(param4_self).Reset();
					__debugInfo = "187:\Player.gbas";
					//DELETE!!111
					forEachSaver6188.values[forEachCounter6188] = local1_S_1583;
					DIMDEL(forEachSaver6188, forEachCounter6188);
					forEachCounter6188--;
					continue;
					__debugInfo = "186:\Player.gbas";
				};
				__debugInfo = "188:\Player.gbas";
			}
			forEachSaver6188.values[forEachCounter6188] = local1_S_1583;
		
		};
		__debugInfo = "195:\Player.gbas";
		if ((((((param4_self.attr1_Y) - (((param4_self.attr6_Height) * (2))))) > (((global3_Map.attr6_Height) * (32)))) ? 1 : 0)) {
			__debugInfo = "194:\Player.gbas";
			(param4_self).Reset();
			__debugInfo = "194:\Player.gbas";
		};
		__debugInfo = "198:\Player.gbas";
		global3_Map.attr7_ScrollX = ((((-(param4_self.attr1_X)) + (((local8_ScrWidth_ref_1559[0]) / (2))))) + (CAST2INT(((param4_self.attr5_Width) / (2)))));
		__debugInfo = "199:\Player.gbas";
		global3_Map.attr7_ScrollY = ((((-(param4_self.attr1_Y)) + (((local9_ScrHeight_ref_1560[0]) / (2))))) + (CAST2INT(((param4_self.attr6_Height) / (2)))));
		__debugInfo = "200:\Player.gbas";
		return 0;
		__debugInfo = "27:\Player.gbas";
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
window['method13_type7_TPlayer_6_Render'] = function(param4_self) {
	stackPush("method: Render", __debugInfo);
	try {
		var local7_CurAnim_1586 = 0, local3_Dir_1587 = 0;
		__debugInfo = "210:\Player.gbas";
		if ((((param4_self.attr4_Anim) > (10)) ? 1 : 0)) {
			__debugInfo = "205:\Player.gbas";
			local7_CurAnim_1586 = 0;
			__debugInfo = "205:\Player.gbas";
		} else if ((((param4_self.attr4_Anim) > (5)) ? 1 : 0)) {
			__debugInfo = "207:\Player.gbas";
			local7_CurAnim_1586 = 1;
			__debugInfo = "207:\Player.gbas";
		} else {
			__debugInfo = "209:\Player.gbas";
			local7_CurAnim_1586 = 2;
			__debugInfo = "209:\Player.gbas";
		};
		__debugInfo = "217:\Player.gbas";
		if ((((param4_self.attr2_VX) < (0)) ? 1 : 0)) {
			__debugInfo = "214:\Player.gbas";
			local3_Dir_1587 = 1;
			__debugInfo = "214:\Player.gbas";
		} else {
			__debugInfo = "216:\Player.gbas";
			local3_Dir_1587 = 0;
			__debugInfo = "216:\Player.gbas";
		};
		__debugInfo = "220:\Player.gbas";
		func9_TurnImage(global11_PlayerImage, local7_CurAnim_1586, local3_Dir_1587, ((param4_self.attr1_X) + (1)), param4_self.attr1_Y, 6);
		__debugInfo = "221:\Player.gbas";
		return 0;
		__debugInfo = "210:\Player.gbas";
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
window['method13_type7_TPlayer_5_Reset'] = function(param4_self) {
	stackPush("method: Reset", __debugInfo);
	try {
		__debugInfo = "224:\Player.gbas";
		param4_self.attr1_X = global3_Map.attr6_SpawnX;
		__debugInfo = "225:\Player.gbas";
		param4_self.attr1_Y = global3_Map.attr6_SpawnY;
		__debugInfo = "226:\Player.gbas";
		param4_self.attr2_VX = 0;
		__debugInfo = "227:\Player.gbas";
		param4_self.attr2_VY = 0;
		__debugInfo = "228:\Player.gbas";
		return 0;
		__debugInfo = "224:\Player.gbas";
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
window['func9_TurnImage'] = function(param3_Img, param5_Frame, param3_Dir, param1_X, param1_Y, param8_MaxFrame) {
	stackPush("function: TurnImage", __debugInfo);
	try {
		__debugInfo = "235:\Player.gbas";
		if (param3_Dir) {
			__debugInfo = "234:\Player.gbas";
			param5_Frame = ((((param8_MaxFrame) - (1))) - (param5_Frame));
			__debugInfo = "234:\Player.gbas";
		};
		__debugInfo = "237:\Player.gbas";
		DRAWANIM(param3_Img, param5_Frame, ((param1_X) + (global3_Map.attr7_ScrollX)), ((param1_Y) + (global3_Map.attr7_ScrollY)));
		__debugInfo = "238:\Player.gbas";
		return 0;
		__debugInfo = "235:\Player.gbas";
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
window['func4_QSIN'] = function(param1_x) {
	stackPush("function: QSIN", __debugInfo);
	try {
		__debugInfo = "13:\qmath.gbas";
		return tryClone(SIN(param1_x));
		__debugInfo = "29:\qmath.gbas";
		return 0;
		__debugInfo = "13:\qmath.gbas";
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
window['func4_QCOS'] = function(param1_x) {
	stackPush("function: QCOS", __debugInfo);
	try {
		__debugInfo = "35:\qmath.gbas";
		return tryClone(COS(param1_x));
		__debugInfo = "39:\qmath.gbas";
		return 0;
		__debugInfo = "35:\qmath.gbas";
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
window['method11_type5_TShit_6_Render'] = function(param4_self) {
	stackPush("method: Render", __debugInfo);
	try {
		__debugInfo = "17:\Shit.gbas";
		DRAWSPRITE(global9_ShitImage, ((param4_self.attr1_X) + (global3_Map.attr7_ScrollX)), ((param4_self.attr1_Y) + (global3_Map.attr7_ScrollY)));
		__debugInfo = "18:\Shit.gbas";
		return 0;
		__debugInfo = "17:\Shit.gbas";
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
window['method11_type5_TShit_6_Update'] = function(param4_self) {
	stackPush("method: Update", __debugInfo);
	try {
		__debugInfo = "23:\Shit.gbas";
		if ((((param4_self.attr3_Age) > (149)) ? 1 : 0)) {
			__debugInfo = "22:\Shit.gbas";
			param4_self.attr3_Del = 1;
			__debugInfo = "22:\Shit.gbas";
		};
		__debugInfo = "25:\Shit.gbas";
		if ((((param4_self.attr1_Y) > (((((global3_Map.attr6_Height) * (32))) + (640)))) ? 1 : 0)) {
			__debugInfo = "25:\Shit.gbas";
			param4_self.attr3_Del = 1;
			__debugInfo = "25:\Shit.gbas";
		};
		__debugInfo = "36:\Shit.gbas";
		if ((global3_Map).CollisionPoint(((param4_self.attr1_X) + (8)), ((((param4_self.attr1_Y) + (param4_self.attr2_VY))) + (16)))) {
			__debugInfo = "31:\Shit.gbas";
			while (((((global3_Map).CollisionPoint(((param4_self.attr1_X) + (8)), ((param4_self.attr1_Y) + (16)))) == (0)) ? 1 : 0)) {
				__debugInfo = "30:\Shit.gbas";
				param4_self.attr1_Y+=1;
				__debugInfo = "30:\Shit.gbas";
			};
			__debugInfo = "32:\Shit.gbas";
			param4_self.attr2_VY = 0;
			__debugInfo = "33:\Shit.gbas";
			param4_self.attr3_Age+=1;
			__debugInfo = "31:\Shit.gbas";
		} else {
			__debugInfo = "35:\Shit.gbas";
			param4_self.attr2_VY+=1;
			__debugInfo = "35:\Shit.gbas";
		};
		__debugInfo = "37:\Shit.gbas";
		param4_self.attr2_VY = MIN(param4_self.attr2_VY, 8);
		__debugInfo = "40:\Shit.gbas";
		param4_self.attr1_Y+=param4_self.attr2_VY;
		__debugInfo = "41:\Shit.gbas";
		return 0;
		__debugInfo = "23:\Shit.gbas";
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
window['method11_type5_TShit_4_Init'] = function(param1_X, param1_Y, param4_self) {
	stackPush("method: Init", __debugInfo);
	try {
		__debugInfo = "44:\Shit.gbas";
		param4_self.attr1_X = param1_X;
		__debugInfo = "45:\Shit.gbas";
		param4_self.attr1_Y = param1_Y;
		__debugInfo = "46:\Shit.gbas";
		param4_self.attr2_VY = 1;
		__debugInfo = "48:\Shit.gbas";
		DIMPUSH(global5_Shits, param4_self);
		__debugInfo = "49:\Shit.gbas";
		return 0;
		__debugInfo = "44:\Shit.gbas";
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
window['method11_type5_TSpit_6_Update'] = function(param4_self) {
	stackPush("method: Update", __debugInfo);
	try {
		var local4_OldX_1608 = 0.0, local4_OldY_1609 = 0.0;
		__debugInfo = "16:\Spit.gbas";
		param4_self.attr2_VX = ((param4_self.attr2_VX) * (0.99));
		__debugInfo = "17:\Spit.gbas";
		param4_self.attr2_VY+=0.1;
		__debugInfo = "18:\Spit.gbas";
		param4_self.attr3_Age+=1;
		__debugInfo = "22:\Spit.gbas";
		if ((((param4_self.attr3_Age) > (149)) ? 1 : 0)) {
			__debugInfo = "21:\Spit.gbas";
			param4_self.attr3_Del = 1;
			__debugInfo = "21:\Spit.gbas";
		};
		__debugInfo = "25:\Spit.gbas";
		local4_OldX_1608 = param4_self.attr1_X;
		__debugInfo = "26:\Spit.gbas";
		local4_OldY_1609 = param4_self.attr1_Y;
		__debugInfo = "28:\Spit.gbas";
		param4_self.attr1_X+=param4_self.attr2_VX;
		__debugInfo = "32:\Spit.gbas";
		if ((global3_Map).Collision(param4_self.attr1_X, param4_self.attr1_Y, 8, 8)) {
			__debugInfo = "30:\Spit.gbas";
			param4_self.attr2_VX = -(param4_self.attr2_VX);
			__debugInfo = "31:\Spit.gbas";
			param4_self.attr1_X = local4_OldX_1608;
			__debugInfo = "30:\Spit.gbas";
		};
		__debugInfo = "33:\Spit.gbas";
		param4_self.attr1_Y+=param4_self.attr2_VY;
		__debugInfo = "37:\Spit.gbas";
		if ((global3_Map).Collision(param4_self.attr1_X, param4_self.attr1_Y, 8, 8)) {
			__debugInfo = "35:\Spit.gbas";
			param4_self.attr2_VY = -(param4_self.attr2_VY);
			__debugInfo = "36:\Spit.gbas";
			param4_self.attr1_Y = local4_OldY_1609;
			__debugInfo = "35:\Spit.gbas";
		};
		__debugInfo = "38:\Spit.gbas";
		return 0;
		__debugInfo = "16:\Spit.gbas";
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
window['method11_type5_TSpit_6_Render'] = function(param4_self) {
	stackPush("method: Render", __debugInfo);
	try {
		__debugInfo = "41:\Spit.gbas";
		DRAWSPRITE(global9_SpitImage, ((param4_self.attr1_X) + (global3_Map.attr7_ScrollX)), ((param4_self.attr1_Y) + (global3_Map.attr7_ScrollY)));
		__debugInfo = "42:\Spit.gbas";
		return 0;
		__debugInfo = "41:\Spit.gbas";
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
window['method11_type5_TSpit_4_Init'] = function(param1_X, param1_Y, param4_DirX, param4_DirY, param4_self) {
	stackPush("method: Init", __debugInfo);
	try {
		__debugInfo = "45:\Spit.gbas";
		param4_self.attr1_X = param1_X;
		__debugInfo = "46:\Spit.gbas";
		param4_self.attr1_Y = param1_Y;
		__debugInfo = "47:\Spit.gbas";
		param4_self.attr2_VX = param4_DirX;
		__debugInfo = "48:\Spit.gbas";
		param4_self.attr2_VY = param4_DirY;
		__debugInfo = "50:\Spit.gbas";
		DIMPUSH(global5_Spits, param4_self);
		__debugInfo = "51:\Spit.gbas";
		return 0;
		__debugInfo = "45:\Spit.gbas";
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
		__debugInfo = "59:\Spit.gbas";
		return "Object";
		__debugInfo = "60:\Spit.gbas";
		return "";
		__debugInfo = "59:\Spit.gbas";
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
		__debugInfo = "66:\Spit.gbas";
		if ((((param3_Obj) == (param4_self)) ? 1 : 0)) {
			__debugInfo = "63:\Spit.gbas";
			return 1;
			__debugInfo = "63:\Spit.gbas";
		} else {
			__debugInfo = "65:\Spit.gbas";
			return tryClone(0);
			__debugInfo = "65:\Spit.gbas";
		};
		__debugInfo = "67:\Spit.gbas";
		return 0;
		__debugInfo = "66:\Spit.gbas";
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
		__debugInfo = "69:\Spit.gbas";
		return 0;
		__debugInfo = "70:\Spit.gbas";
		return 0;
		__debugInfo = "69:\Spit.gbas";
	} catch(ex) {
		if (isKnownException(ex)) throw ex;
		alert(formatError(ex));
		END();
	} finally {
		stackPop();
	}
	
};
var vtbl_type6_TEnemy = {
	Update: method12_type6_TEnemy_6_Update, 
	Render: method12_type6_TEnemy_6_Render, 
	Init: method12_type6_TEnemy_4_Init, 
	IsDestroyable: method12_type6_TEnemy_13_IsDestroyable, 
	ToString_Str: method13_type7_TObject_12_ToString_Str, 
	Equals: method13_type7_TObject_6_Equals, 
	ToHashCode: method13_type7_TObject_10_ToHashCode
};
window ['type6_TEnemy'] = function() {
	this.attr3_Typ = 0;
	this.attr1_X = 0.0;
	this.attr1_Y = 0.0;
	this.attr2_VX = 0.0;
	this.attr2_VY = 0.0;
	this.attr5_Width = 0.0;
	this.attr6_Height = 0.0;
	this.attr4_Anim = 0;
	this.attr4_Fall = 0;
	this.attr12_EventCounter = 0;
	this.vtbl = vtbl_type6_TEnemy;
	return this;
	
};
window['type6_TEnemy'].prototype.clone = function() {
	var other = new type6_TEnemy();
	other.attr3_Typ = this.attr3_Typ;
	other.attr1_X = this.attr1_X;
	other.attr1_Y = this.attr1_Y;
	other.attr2_VX = this.attr2_VX;
	other.attr2_VY = this.attr2_VY;
	other.attr5_Width = this.attr5_Width;
	other.attr6_Height = this.attr6_Height;
	other.attr4_Anim = this.attr4_Anim;
	other.attr4_Fall = this.attr4_Fall;
	other.attr12_EventCounter = this.attr12_EventCounter;
	other.vtbl = this.vtbl;
	return other;
};
type6_TEnemy.prototype.Update = function() {
	 return this.vtbl.Update(this);
};
type6_TEnemy.prototype.Render = function() {
	 return this.vtbl.Render(this);
};
type6_TEnemy.prototype.Init = function() {
	 return this.vtbl.Init(arguments[0], arguments[1], arguments[2], this);
};
type6_TEnemy.prototype.IsDestroyable = function() {
	 return this.vtbl.IsDestroyable(this);
};
type6_TEnemy.prototype.ToString_Str = function() {
	 return this.vtbl.ToString_Str(this);
};
type6_TEnemy.prototype.Equals = function() {
	 return this.vtbl.Equals(arguments[0], this);
};
type6_TEnemy.prototype.ToHashCode = function() {
	 return this.vtbl.ToHashCode(this);
};
var vtbl_type10_TExplosion = {
	Update: method17_type10_TExplosion_6_Update, 
	Render: method17_type10_TExplosion_6_Render, 
	Init: method17_type10_TExplosion_4_Init, 
	ToString_Str: method13_type7_TObject_12_ToString_Str, 
	Equals: method13_type7_TObject_6_Equals, 
	ToHashCode: method13_type7_TObject_10_ToHashCode
};
window ['type10_TExplosion'] = function() {
	this.attr1_X = 0.0;
	this.attr1_Y = 0.0;
	this.attr4_Anim = 0;
	this.attr3_Del = 0;
	this.vtbl = vtbl_type10_TExplosion;
	return this;
	
};
window['type10_TExplosion'].prototype.clone = function() {
	var other = new type10_TExplosion();
	other.attr1_X = this.attr1_X;
	other.attr1_Y = this.attr1_Y;
	other.attr4_Anim = this.attr4_Anim;
	other.attr3_Del = this.attr3_Del;
	other.vtbl = this.vtbl;
	return other;
};
type10_TExplosion.prototype.Update = function() {
	 return this.vtbl.Update(this);
};
type10_TExplosion.prototype.Render = function() {
	 return this.vtbl.Render(this);
};
type10_TExplosion.prototype.Init = function() {
	 return this.vtbl.Init(arguments[0], arguments[1], this);
};
type10_TExplosion.prototype.ToString_Str = function() {
	 return this.vtbl.ToString_Str(this);
};
type10_TExplosion.prototype.Equals = function() {
	 return this.vtbl.Equals(arguments[0], this);
};
type10_TExplosion.prototype.ToHashCode = function() {
	 return this.vtbl.ToHashCode(this);
};
var vtbl_type4_TMap = {
	InitEmpty: method10_type4_TMap_9_InitEmpty, 
	Save: method10_type4_TMap_4_Save, 
	Init: method10_type4_TMap_4_Init, 
	Update: method10_type4_TMap_6_Update, 
	Render: method10_type4_TMap_6_Render, 
	RenderTile: method10_type4_TMap_10_RenderTile, 
	PickTile: method10_type4_TMap_8_PickTile, 
	RemoveTile: method10_type4_TMap_10_RemoveTile, 
	CollisionPoint: method10_type4_TMap_14_CollisionPoint, 
	RayCollision: method10_type4_TMap_12_RayCollision, 
	Collision: method10_type4_TMap_9_Collision, 
	ToString_Str: method13_type7_TObject_12_ToString_Str, 
	Equals: method13_type7_TObject_6_Equals, 
	ToHashCode: method13_type7_TObject_10_ToHashCode
};
window ['type4_TMap'] = function() {
	this.attr6_IsSnow = 0;
	this.attr5_Datas = new GLBArray();
	this.attr5_Width = 0;
	this.attr6_Height = 0;
	this.attr7_ScrollX = 0.0;
	this.attr7_ScrollY = 0.0;
	this.attr7_Tileset = 0;
	this.attr15_TilesetPath_Str = "";
	this.attr13_SpikePosition = 0.0;
	this.attr8_SpikeDir = 0;
	this.attr6_SpawnX = 0;
	this.attr6_SpawnY = 0;
	this.attr11_NextMap_Str = "";
	this.attr9_LastPickX = 0;
	this.attr9_LastPickY = 0;
	this.attr6_HasFBO = 0;
	this.attr13_IsRenderedFBO = 0;
	this.attr8_ScreenID = 0;
	this.attr5_SprID = 0;
	this.vtbl = vtbl_type4_TMap;
	this.attr11_NextMap_Str = "";
	return this;
	
};
window['type4_TMap'].prototype.clone = function() {
	var other = new type4_TMap();
	other.attr6_IsSnow = this.attr6_IsSnow;
	other.attr5_Datas = tryClone(this.attr5_Datas);
	other.attr5_Width = this.attr5_Width;
	other.attr6_Height = this.attr6_Height;
	other.attr7_ScrollX = this.attr7_ScrollX;
	other.attr7_ScrollY = this.attr7_ScrollY;
	other.attr7_Tileset = this.attr7_Tileset;
	other.attr15_TilesetPath_Str = this.attr15_TilesetPath_Str;
	other.attr13_SpikePosition = this.attr13_SpikePosition;
	other.attr8_SpikeDir = this.attr8_SpikeDir;
	other.attr6_SpawnX = this.attr6_SpawnX;
	other.attr6_SpawnY = this.attr6_SpawnY;
	other.attr11_NextMap_Str = this.attr11_NextMap_Str;
	other.attr9_LastPickX = this.attr9_LastPickX;
	other.attr9_LastPickY = this.attr9_LastPickY;
	other.attr6_HasFBO = this.attr6_HasFBO;
	other.attr13_IsRenderedFBO = this.attr13_IsRenderedFBO;
	other.attr8_ScreenID = this.attr8_ScreenID;
	other.attr5_SprID = this.attr5_SprID;
	other.vtbl = this.vtbl;
	return other;
};
type4_TMap.prototype.InitEmpty = function() {
	 return this.vtbl.InitEmpty(arguments[0], arguments[1], arguments[2], this);
};
type4_TMap.prototype.Save = function() {
	 return this.vtbl.Save(arguments[0], this);
};
type4_TMap.prototype.Init = function() {
	 return this.vtbl.Init(arguments[0], this);
};
type4_TMap.prototype.Update = function() {
	 return this.vtbl.Update(this);
};
type4_TMap.prototype.Render = function() {
	 return this.vtbl.Render(this);
};
type4_TMap.prototype.RenderTile = function() {
	 return this.vtbl.RenderTile(arguments[0], arguments[1], arguments[2], arguments[3], this);
};
type4_TMap.prototype.PickTile = function() {
	 return this.vtbl.PickTile(arguments[0], arguments[1], this);
};
type4_TMap.prototype.RemoveTile = function() {
	 return this.vtbl.RemoveTile(arguments[0], arguments[1], this);
};
type4_TMap.prototype.CollisionPoint = function() {
	 return this.vtbl.CollisionPoint(arguments[0], arguments[1], this);
};
type4_TMap.prototype.RayCollision = function() {
	 return this.vtbl.RayCollision(arguments[0], arguments[1], arguments[2], arguments[3], this);
};
type4_TMap.prototype.Collision = function() {
	 return this.vtbl.Collision(arguments[0], arguments[1], arguments[2], arguments[3], this);
};
type4_TMap.prototype.ToString_Str = function() {
	 return this.vtbl.ToString_Str(this);
};
type4_TMap.prototype.Equals = function() {
	 return this.vtbl.Equals(arguments[0], this);
};
type4_TMap.prototype.ToHashCode = function() {
	 return this.vtbl.ToHashCode(this);
};
var vtbl_type7_TPlayer = {
	Init: method13_type7_TPlayer_4_Init, 
	Update: method13_type7_TPlayer_6_Update, 
	Render: method13_type7_TPlayer_6_Render, 
	Reset: method13_type7_TPlayer_5_Reset, 
	ToString_Str: method13_type7_TObject_12_ToString_Str, 
	Equals: method13_type7_TObject_6_Equals, 
	ToHashCode: method13_type7_TObject_10_ToHashCode
};
window ['type7_TPlayer'] = function() {
	this.attr1_X = 0.0;
	this.attr1_Y = 0.0;
	this.attr2_VX = 0.0;
	this.attr2_VY = 0.0;
	this.attr5_Width = 0;
	this.attr6_Height = 0;
	this.attr4_Anim = 0;
	this.vtbl = vtbl_type7_TPlayer;
	return this;
	
};
window['type7_TPlayer'].prototype.clone = function() {
	var other = new type7_TPlayer();
	other.attr1_X = this.attr1_X;
	other.attr1_Y = this.attr1_Y;
	other.attr2_VX = this.attr2_VX;
	other.attr2_VY = this.attr2_VY;
	other.attr5_Width = this.attr5_Width;
	other.attr6_Height = this.attr6_Height;
	other.attr4_Anim = this.attr4_Anim;
	other.vtbl = this.vtbl;
	return other;
};
type7_TPlayer.prototype.Init = function() {
	 return this.vtbl.Init(arguments[0], arguments[1], arguments[2], arguments[3], this);
};
type7_TPlayer.prototype.Update = function() {
	 return this.vtbl.Update(this);
};
type7_TPlayer.prototype.Render = function() {
	 return this.vtbl.Render(this);
};
type7_TPlayer.prototype.Reset = function() {
	 return this.vtbl.Reset(this);
};
type7_TPlayer.prototype.ToString_Str = function() {
	 return this.vtbl.ToString_Str(this);
};
type7_TPlayer.prototype.Equals = function() {
	 return this.vtbl.Equals(arguments[0], this);
};
type7_TPlayer.prototype.ToHashCode = function() {
	 return this.vtbl.ToHashCode(this);
};
var vtbl_type5_TShit = {
	Render: method11_type5_TShit_6_Render, 
	Update: method11_type5_TShit_6_Update, 
	Init: method11_type5_TShit_4_Init, 
	ToString_Str: method13_type7_TObject_12_ToString_Str, 
	Equals: method13_type7_TObject_6_Equals, 
	ToHashCode: method13_type7_TObject_10_ToHashCode
};
window ['type5_TShit'] = function() {
	this.attr3_Del = 0;
	this.attr1_X = 0.0;
	this.attr1_Y = 0.0;
	this.attr2_VY = 0.0;
	this.attr3_Age = 0;
	this.attr2_Al = 0.0;
	this.vtbl = vtbl_type5_TShit;
	return this;
	
};
window['type5_TShit'].prototype.clone = function() {
	var other = new type5_TShit();
	other.attr3_Del = this.attr3_Del;
	other.attr1_X = this.attr1_X;
	other.attr1_Y = this.attr1_Y;
	other.attr2_VY = this.attr2_VY;
	other.attr3_Age = this.attr3_Age;
	other.attr2_Al = this.attr2_Al;
	other.vtbl = this.vtbl;
	return other;
};
type5_TShit.prototype.Render = function() {
	 return this.vtbl.Render(this);
};
type5_TShit.prototype.Update = function() {
	 return this.vtbl.Update(this);
};
type5_TShit.prototype.Init = function() {
	 return this.vtbl.Init(arguments[0], arguments[1], this);
};
type5_TShit.prototype.ToString_Str = function() {
	 return this.vtbl.ToString_Str(this);
};
type5_TShit.prototype.Equals = function() {
	 return this.vtbl.Equals(arguments[0], this);
};
type5_TShit.prototype.ToHashCode = function() {
	 return this.vtbl.ToHashCode(this);
};
var vtbl_type5_TSpit = {
	Update: method11_type5_TSpit_6_Update, 
	Render: method11_type5_TSpit_6_Render, 
	Init: method11_type5_TSpit_4_Init, 
	ToString_Str: method13_type7_TObject_12_ToString_Str, 
	Equals: method13_type7_TObject_6_Equals, 
	ToHashCode: method13_type7_TObject_10_ToHashCode
};
window ['type5_TSpit'] = function() {
	this.attr1_X = 0.0;
	this.attr1_Y = 0.0;
	this.attr2_VX = 0.0;
	this.attr2_VY = 0.0;
	this.attr3_Age = 0;
	this.attr2_Al = 0.0;
	this.attr3_Del = 0;
	this.vtbl = vtbl_type5_TSpit;
	return this;
	
};
window['type5_TSpit'].prototype.clone = function() {
	var other = new type5_TSpit();
	other.attr1_X = this.attr1_X;
	other.attr1_Y = this.attr1_Y;
	other.attr2_VX = this.attr2_VX;
	other.attr2_VY = this.attr2_VY;
	other.attr3_Age = this.attr3_Age;
	other.attr2_Al = this.attr2_Al;
	other.attr3_Del = this.attr3_Del;
	other.vtbl = this.vtbl;
	return other;
};
type5_TSpit.prototype.Update = function() {
	 return this.vtbl.Update(this);
};
type5_TSpit.prototype.Render = function() {
	 return this.vtbl.Render(this);
};
type5_TSpit.prototype.Init = function() {
	 return this.vtbl.Init(arguments[0], arguments[1], arguments[2], arguments[3], this);
};
type5_TSpit.prototype.ToString_Str = function() {
	 return this.vtbl.ToString_Str(this);
};
type5_TSpit.prototype.Equals = function() {
	 return this.vtbl.Equals(arguments[0], this);
};
type5_TSpit.prototype.ToHashCode = function() {
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
var const13_STATE_IS_GAME = 0, const7_IS_BIRD = 1, const6_IS_PIG = 2, const8_IS_HUMAN = 3, const8_IS_LLAMA = 4, const8_Tilesize = 32, const19_GL_DEPTH_BUFFER_BIT = 256, const21_GL_STENCIL_BUFFER_BIT = 1024, const19_GL_COLOR_BUFFER_BIT = 16384, const8_GL_FALSE = 0, const7_GL_TRUE = 1, const9_GL_POINTS = 0, const8_GL_LINES = 1, const12_GL_LINE_LOOP = 2, const13_GL_LINE_STRIP = 3, const12_GL_TRIANGLES = 4, const17_GL_TRIANGLE_STRIP = 5, const15_GL_TRIANGLE_FAN = 6, const7_GL_ZERO = 0, const6_GL_ONE = 1, const12_GL_SRC_COLOR = 768, const22_GL_ONE_MINUS_SRC_COLOR = 769, const12_GL_SRC_ALPHA = 770, const22_GL_ONE_MINUS_SRC_ALPHA = 771, const12_GL_DST_ALPHA = 772, const22_GL_ONE_MINUS_DST_ALPHA = 773, const12_GL_DST_COLOR = 774, const22_GL_ONE_MINUS_DST_COLOR = 775, const21_GL_SRC_ALPHA_SATURATE = 776, const11_GL_FUNC_ADD = 32774, const17_GL_BLEND_EQUATION = 32777, const21_GL_BLEND_EQUATION_RGB = 32777, const23_GL_BLEND_EQUATION_ALPHA = 34877, const16_GL_FUNC_SUBTRACT = 32778, const24_GL_FUNC_REVERSE_SUBTRACT = 32779, const16_GL_BLEND_DST_RGB = 32968, const16_GL_BLEND_SRC_RGB = 32969, const18_GL_BLEND_DST_ALPHA = 32970, const18_GL_BLEND_SRC_ALPHA = 32971, const17_GL_CONSTANT_COLOR = 32769, const27_GL_ONE_MINUS_CONSTANT_COLOR = 32770, const17_GL_CONSTANT_ALPHA = 32771, const27_GL_ONE_MINUS_CONSTANT_ALPHA = 32772, const14_GL_BLEND_COLOR = 32773, const15_GL_ARRAY_BUFFER = 34962, const23_GL_ELEMENT_ARRAY_BUFFER = 34963, const23_GL_ARRAY_BUFFER_BINDING = 34964, const31_GL_ELEMENT_ARRAY_BUFFER_BINDING = 34965, const14_GL_STREAM_DRAW = 35040, const14_GL_STATIC_DRAW = 35044, const15_GL_DYNAMIC_DRAW = 35048, const14_GL_BUFFER_SIZE = 34660, const15_GL_BUFFER_USAGE = 34661, const24_GL_CURRENT_VERTEX_ATTRIB = 34342, const8_GL_FRONT = 1028, const7_GL_BACK = 1029, const17_GL_FRONT_AND_BACK = 1032, const13_GL_TEXTURE_2D = 3553, const12_GL_CULL_FACE = 2884, const8_GL_BLEND = 3042, const9_GL_DITHER = 3024, const15_GL_STENCIL_TEST = 2960, const13_GL_DEPTH_TEST = 2929, const15_GL_SCISSOR_TEST = 3089, const22_GL_POLYGON_OFFSET_FILL = 32823, const27_GL_SAMPLE_ALPHA_TO_COVERAGE = 32926, const18_GL_SAMPLE_COVERAGE = 32928, const11_GL_NO_ERROR = 0, const15_GL_INVALID_ENUM = 1280, const16_GL_INVALID_VALUE = 1281, const20_GL_INVALID_OPERATION = 1282, const16_GL_OUT_OF_MEMORY = 1285, const5_GL_CW = 2304, const6_GL_CCW = 2305, const13_GL_LINE_WIDTH = 2849, const27_GL_ALIASED_POINT_SIZE_RANGE = 33901, const27_GL_ALIASED_LINE_WIDTH_RANGE = 33902, const17_GL_CULL_FACE_MODE = 2885, const13_GL_FRONT_FACE = 2886, const14_GL_DEPTH_RANGE = 2928, const18_GL_DEPTH_WRITEMASK = 2930, const20_GL_DEPTH_CLEAR_VALUE = 2931, const13_GL_DEPTH_FUNC = 2932, const22_GL_STENCIL_CLEAR_VALUE = 2961, const15_GL_STENCIL_FUNC = 2962, const15_GL_STENCIL_FAIL = 2964, const26_GL_STENCIL_PASS_DEPTH_FAIL = 2965, const26_GL_STENCIL_PASS_DEPTH_PASS = 2966, const14_GL_STENCIL_REF = 2967, const21_GL_STENCIL_VALUE_MASK = 2963, const20_GL_STENCIL_WRITEMASK = 2968, const20_GL_STENCIL_BACK_FUNC = 34816, const20_GL_STENCIL_BACK_FAIL = 34817, const31_GL_STENCIL_BACK_PASS_DEPTH_FAIL = 34818, const31_GL_STENCIL_BACK_PASS_DEPTH_PASS = 34819, const19_GL_STENCIL_BACK_REF = 36003, const26_GL_STENCIL_BACK_VALUE_MASK = 36004, const25_GL_STENCIL_BACK_WRITEMASK = 36005, const11_GL_VIEWPORT = 2978, const14_GL_SCISSOR_BOX = 3088, const20_GL_COLOR_CLEAR_VALUE = 3106, const18_GL_COLOR_WRITEMASK = 3107, const19_GL_UNPACK_ALIGNMENT = 3317, const17_GL_PACK_ALIGNMENT = 3333, const19_GL_MAX_TEXTURE_SIZE = 3379, const20_GL_MAX_VIEWPORT_DIMS = 3386, const16_GL_SUBPIXEL_BITS = 3408, const11_GL_RED_BITS = 3410, const13_GL_GREEN_BITS = 3411, const12_GL_BLUE_BITS = 3412, const13_GL_ALPHA_BITS = 3413, const13_GL_DEPTH_BITS = 3414, const15_GL_STENCIL_BITS = 3415, const23_GL_POLYGON_OFFSET_UNITS = 10752, const24_GL_POLYGON_OFFSET_FACTOR = 32824, const21_GL_TEXTURE_BINDING_2D = 32873, const17_GL_SAMPLE_BUFFERS = 32936, const10_GL_SAMPLES = 32937, const24_GL_SAMPLE_COVERAGE_VALUE = 32938, const25_GL_SAMPLE_COVERAGE_INVERT = 32939, const33_GL_NUM_COMPRESSED_TEXTURE_FORMATS = 34466, const29_GL_COMPRESSED_TEXTURE_FORMATS = 34467, const12_GL_DONT_CARE = 4352, const10_GL_FASTEST = 4353, const9_GL_NICEST = 4354, const23_GL_GENERATE_MIPMAP_HINT = 33170, const7_GL_BYTE = 5120, const16_GL_UNSIGNED_BYTE = 5121, const8_GL_SHORT = 5122, const17_GL_UNSIGNED_SHORT = 5123, const6_GL_INT = 5124, const15_GL_UNSIGNED_INT = 5125, const8_GL_FLOAT = 5126, const8_GL_FIXED = 5132, const18_GL_DEPTH_COMPONENT = 6402, const8_GL_ALPHA = 6406, const6_GL_RGB = 6407, const7_GL_RGBA = 6408, const12_GL_LUMINANCE = 6409, const18_GL_LUMINANCE_ALPHA = 6410, const25_GL_UNSIGNED_SHORT_4_4_4_4 = 32819, const25_GL_UNSIGNED_SHORT_5_5_5_1 = 32820, const23_GL_UNSIGNED_SHORT_5_6_5 = 33635, const18_GL_FRAGMENT_SHADER = 35632, const16_GL_VERTEX_SHADER = 35633, const21_GL_MAX_VERTEX_ATTRIBS = 34921, const29_GL_MAX_VERTEX_UNIFORM_VECTORS = 36347, const22_GL_MAX_VARYING_VECTORS = 36348, const35_GL_MAX_COMBINED_TEXTURE_IMAGE_UNITS = 35661, const33_GL_MAX_VERTEX_TEXTURE_IMAGE_UNITS = 35660, const26_GL_MAX_TEXTURE_IMAGE_UNITS = 34930, const31_GL_MAX_FRAGMENT_UNIFORM_VECTORS = 36349, const14_GL_SHADER_TYPE = 35663, const16_GL_DELETE_STATUS = 35712, const14_GL_LINK_STATUS = 35714, const18_GL_VALIDATE_STATUS = 35715, const19_GL_ATTACHED_SHADERS = 35717, const18_GL_ACTIVE_UNIFORMS = 35718, const28_GL_ACTIVE_UNIFORM_MAX_LENGTH = 35719, const20_GL_ACTIVE_ATTRIBUTES = 35721, const30_GL_ACTIVE_ATTRIBUTE_MAX_LENGTH = 35722, const27_GL_SHADING_LANGUAGE_VERSION = 35724, const18_GL_CURRENT_PROGRAM = 35725, const8_GL_NEVER = 512, const7_GL_LESS = 513, const8_GL_EQUAL = 514, const9_GL_LEQUAL = 515, const10_GL_GREATER = 516, const11_GL_NOTEQUAL = 517, const9_GL_GEQUAL = 518, const9_GL_ALWAYS = 519, const7_GL_KEEP = 7680, const10_GL_REPLACE = 7681, const7_GL_INCR = 7682, const7_GL_DECR = 7683, const9_GL_INVERT = 5386, const12_GL_INCR_WRAP = 34055, const12_GL_DECR_WRAP = 34056, const9_GL_VENDOR = 7936, const11_GL_RENDERER = 7937, const10_GL_VERSION = 7938, const13_GL_EXTENSIONS = 7939, const10_GL_NEAREST = 9728, const9_GL_LINEAR = 9729, const25_GL_NEAREST_MIPMAP_NEAREST = 9984, const24_GL_LINEAR_MIPMAP_NEAREST = 9985, const24_GL_NEAREST_MIPMAP_LINEAR = 9986, const23_GL_LINEAR_MIPMAP_LINEAR = 9987, const21_GL_TEXTURE_MAG_FILTER = 10240, const21_GL_TEXTURE_MIN_FILTER = 10241, const17_GL_TEXTURE_WRAP_S = 10242, const17_GL_TEXTURE_WRAP_T = 10243, const10_GL_TEXTURE = 5890, const19_GL_TEXTURE_CUBE_MAP = 34067, const27_GL_TEXTURE_BINDING_CUBE_MAP = 34068, const30_GL_TEXTURE_CUBE_MAP_POSITIVE_X = 34069, const30_GL_TEXTURE_CUBE_MAP_NEGATIVE_X = 34070, const30_GL_TEXTURE_CUBE_MAP_POSITIVE_Y = 34071, const30_GL_TEXTURE_CUBE_MAP_NEGATIVE_Y = 34072, const30_GL_TEXTURE_CUBE_MAP_POSITIVE_Z = 34073, const30_GL_TEXTURE_CUBE_MAP_NEGATIVE_Z = 34074, const28_GL_MAX_CUBE_MAP_TEXTURE_SIZE = 34076, const11_GL_TEXTURE0 = 33984, const11_GL_TEXTURE1 = 33985, const11_GL_TEXTURE2 = 33986, const11_GL_TEXTURE3 = 33987, const11_GL_TEXTURE4 = 33988, const11_GL_TEXTURE5 = 33989, const11_GL_TEXTURE6 = 33990, const11_GL_TEXTURE7 = 33991, const11_GL_TEXTURE8 = 33992, const11_GL_TEXTURE9 = 33993, const12_GL_TEXTURE10 = 33994, const12_GL_TEXTURE11 = 33995, const12_GL_TEXTURE12 = 33996, const12_GL_TEXTURE13 = 33997, const12_GL_TEXTURE14 = 33998, const12_GL_TEXTURE15 = 33999, const12_GL_TEXTURE16 = 34000, const12_GL_TEXTURE17 = 34001, const12_GL_TEXTURE18 = 34002, const12_GL_TEXTURE19 = 34003, const12_GL_TEXTURE20 = 34004, const12_GL_TEXTURE21 = 34005, const12_GL_TEXTURE22 = 34006, const12_GL_TEXTURE23 = 34007, const12_GL_TEXTURE24 = 34008, const12_GL_TEXTURE25 = 34009, const12_GL_TEXTURE26 = 34010, const12_GL_TEXTURE27 = 34011, const12_GL_TEXTURE28 = 34012, const12_GL_TEXTURE29 = 34013, const12_GL_TEXTURE30 = 34014, const12_GL_TEXTURE31 = 34015, const17_GL_ACTIVE_TEXTURE = 34016, const9_GL_REPEAT = 10497, const16_GL_CLAMP_TO_EDGE = 33071, const18_GL_MIRRORED_REPEAT = 33648, const13_GL_FLOAT_VEC2 = 35664, const13_GL_FLOAT_VEC3 = 35665, const13_GL_FLOAT_VEC4 = 35666, const11_GL_INT_VEC2 = 35667, const11_GL_INT_VEC3 = 35668, const11_GL_INT_VEC4 = 35669, const7_GL_BOOL = 35670, const12_GL_BOOL_VEC2 = 35671, const12_GL_BOOL_VEC3 = 35672, const12_GL_BOOL_VEC4 = 35673, const13_GL_FLOAT_MAT2 = 35674, const13_GL_FLOAT_MAT3 = 35675, const13_GL_FLOAT_MAT4 = 35676, const13_GL_SAMPLER_2D = 35678, const15_GL_SAMPLER_CUBE = 35680, const30_GL_VERTEX_ATTRIB_ARRAY_ENABLED = 34338, const27_GL_VERTEX_ATTRIB_ARRAY_SIZE = 34339, const29_GL_VERTEX_ATTRIB_ARRAY_STRIDE = 34340, const27_GL_VERTEX_ATTRIB_ARRAY_TYPE = 34341, const33_GL_VERTEX_ATTRIB_ARRAY_NORMALIZED = 34922, const30_GL_VERTEX_ATTRIB_ARRAY_POINTER = 34373, const37_GL_VERTEX_ATTRIB_ARRAY_BUFFER_BINDING = 34975, const33_GL_IMPLEMENTATION_COLOR_READ_TYPE = 35738, const35_GL_IMPLEMENTATION_COLOR_READ_FORMAT = 35739, const17_GL_COMPILE_STATUS = 35713, const18_GL_INFO_LOG_LENGTH = 35716, const23_GL_SHADER_SOURCE_LENGTH = 35720, const18_GL_SHADER_COMPILER = 36346, const24_GL_SHADER_BINARY_FORMATS = 36344, const28_GL_NUM_SHADER_BINARY_FORMATS = 36345, const12_GL_LOW_FLOAT = 36336, const15_GL_MEDIUM_FLOAT = 36337, const13_GL_HIGH_FLOAT = 36338, const10_GL_LOW_INT = 36339, const13_GL_MEDIUM_INT = 36340, const11_GL_HIGH_INT = 36341, const14_GL_FRAMEBUFFER = 36160, const15_GL_RENDERBUFFER = 36161, const8_GL_RGBA4 = 32854, const10_GL_RGB5_A1 = 32855, const9_GL_RGB565 = 36194, const20_GL_DEPTH_COMPONENT16 = 33189, const16_GL_STENCIL_INDEX = 6401, const17_GL_STENCIL_INDEX8 = 36168, const21_GL_RENDERBUFFER_WIDTH = 36162, const22_GL_RENDERBUFFER_HEIGHT = 36163, const31_GL_RENDERBUFFER_INTERNAL_FORMAT = 36164, const24_GL_RENDERBUFFER_RED_SIZE = 36176, const26_GL_RENDERBUFFER_GREEN_SIZE = 36177, const25_GL_RENDERBUFFER_BLUE_SIZE = 36178, const26_GL_RENDERBUFFER_ALPHA_SIZE = 36179, const26_GL_RENDERBUFFER_DEPTH_SIZE = 36180, const28_GL_RENDERBUFFER_STENCIL_SIZE = 36181, const37_GL_FRAMEBUFFER_ATTACHMENT_OBJECT_TYPE = 36048, const37_GL_FRAMEBUFFER_ATTACHMENT_OBJECT_NAME = 36049, const39_GL_FRAMEBUFFER_ATTACHMENT_TEXTURE_LEVEL = 36050, const47_GL_FRAMEBUFFER_ATTACHMENT_TEXTURE_CUBE_MAP_FACE = 36051, const20_GL_COLOR_ATTACHMENT0 = 36064, const19_GL_DEPTH_ATTACHMENT = 36096, const21_GL_STENCIL_ATTACHMENT = 36128, const7_GL_NONE = 0, const23_GL_FRAMEBUFFER_COMPLETE = 36053, const36_GL_FRAMEBUFFER_INCOMPLETE_ATTACHMENT = 36054, const44_GL_FRAMEBUFFER_INCOMPLETE_MISSING_ATTACHMENT = 36055, const36_GL_FRAMEBUFFER_INCOMPLETE_DIMENSIONS = 36057, const26_GL_FRAMEBUFFER_UNSUPPORTED = 36061, const22_GL_FRAMEBUFFER_BINDING = 36006, const23_GL_RENDERBUFFER_BINDING = 36007, const24_GL_MAX_RENDERBUFFER_SIZE = 34024, const32_GL_INVALID_FRAMEBUFFER_OPERATION = 1286, global12_Hardware_Str = "", global9_Gamestate = 0, global11_EditorEnemy = new type6_TEnemy(), global10_SelectTile = 0, global6_MouseX_ref = [0.0], global6_MouseY_ref = [0.0], global2_ML_ref = [0.0], global2_MR_ref = [0.0], global11_PlayerImage = 0, global11_LadderImage = 0, global10_SpikeImage = 0, global15_TrampolineImage = 0, global8_PigImage = 0, global10_HumanImage = 0, global9_BirdImage = 0, global9_ShitImage = 0, global10_LlamaImage = 0, global9_SpitImage = 0, global9_DoorImage = 0, global12_TriggerImage = 0, global12_DynamitImage = 0, global14_ExplosionImage = 0, global9_MenuImage = 0, global11_ButtonImage = 0, global10_ArrowImage = 0, global9_JumpImage = 0, global6_Player = new type7_TPlayer(), global3_Map = new type4_TMap(), global17_LastMousePosition = new GLBArray(), global9_Title_Str = "", global9_Menu1_Str = "", global9_Menu2_Str = "", global9_Menu3_Str = "", global6_Action = 0, global6_Enemys = new GLBArray(), global10_Explosions = new GLBArray(), global5_Shits = new GLBArray(), global5_Spits = new GLBArray(), global6_Objs3D = new GLBArray();
window['initStatics'] = function() {}
for (var __init = 0; __init < preInitFuncs.length; __init++) preInitFuncs[__init]();
