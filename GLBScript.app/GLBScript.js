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
var static12_Factor_DIMASEXPRErr = 0;
var static12_Keyword_SelectHelper = 0.0, static7_Keyword_GOTOErr = 0;
var debugMode = false;
window['main'] = function(){
	var local1_G_1756 = new type10_TGenerator();
	DIM(global10_Generators, [0], new type10_TGenerator());
	local1_G_1756.attr8_Name_Str = "JS";
	local1_G_1756.attr8_genProto = func16_JS_Generator_Str;
	DIMPUSH(global10_Generators, local1_G_1756);
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
	global5_NoRun = 0;
	
}
main = window['main'];
window['GetIdentifierByPart'] = function(param8_Text_Str) {
	var local10_Result_Str_1758 = "", local11_tmpCompiler_1759 = new type9_TCompiler();
	local10_Result_Str_1758 = "";
	local11_tmpCompiler_1759 = global8_Compiler.clone(/* In Assign */);
	global8_Compiler.attr8_Code_Str = ((param8_Text_Str) + ("\n"));
	func5_Lexer();
	func8_Analyser();
	global8_Compiler.attr8_GetIdent = 1;
	func6_Parser();
	global8_Compiler = local11_tmpCompiler_1759.clone(/* In Assign */);
	return tryClone(local10_Result_Str_1758);
	return "";
	
};
GetIdentifierByPart = window['GetIdentifierByPart'];
window['func8_Analyser'] = function() {
	var local6_CurTyp_1765 = 0;
	func5_Start();
	while (func8_EOFParse()) {
		{
			var Err_Str = "";
			try {
				{
					var local16___SelectHelper1__1760 = "";
					local16___SelectHelper1__1760 = func14_GetCurrent_Str();
					if ((((local16___SelectHelper1__1760) == ("TYPE")) ? 1 : 0)) {
						var local3_typ_ref_1761 = [new type14_IdentifierType()];
						func5_Match("TYPE", 16, "src\CompilerPasses\Analyser.gbas");
						local3_typ_ref_1761[0].attr8_Name_Str = func14_GetCurrent_Str();
						local3_typ_ref_1761[0].attr12_RealName_Str = local3_typ_ref_1761[0].attr8_Name_Str;
						local3_typ_ref_1761[0].attr2_ID = BOUNDS(global8_Compiler.attr5_Types_ref[0], 0);
						DIMPUSH(global8_Compiler.attr5_Types_ref[0], local3_typ_ref_1761);
						func7_GetNext();
						
					} else if ((((local16___SelectHelper1__1760) == ("PROTOTYPE")) ? 1 : 0)) {
						var local4_func_1762 = new type14_IdentifierFunc();
						func5_Match("PROTOTYPE", 25, "src\CompilerPasses\Analyser.gbas");
						local4_func_1762.attr8_Name_Str = func14_GetCurrent_Str();
						local4_func_1762.attr3_Typ = ~~(4);
						func11_AddFunction(local4_func_1762);
						func7_GetNext();
						
					} else if ((((local16___SelectHelper1__1760) == ("CONSTANT")) ? 1 : 0)) {
						do {
							var local4_Vari_1763 = new type14_IdentifierVari();
							if (func7_IsToken("CONSTANT")) {
								func5_Match("CONSTANT", 44, "src\CompilerPasses\Analyser.gbas");
								
							} else {
								func5_Match(",", 46, "src\CompilerPasses\Analyser.gbas");
								
							};
							local4_Vari_1763 = func7_VariDef(0).clone(/* In Assign */);
							local4_Vari_1763.attr3_Typ = ~~(6);
							func11_AddVariable(local4_Vari_1763, 0);
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
	local6_CurTyp_1765 = -(1);
	func5_Start();
	while (func8_EOFParse()) {
		{
			var Err_Str = "";
			try {
				var local10_IsCallback_1766 = 0, local8_IsNative_1767 = 0, local10_IsAbstract_1768 = 0;
				local10_IsCallback_1766 = 0;
				local8_IsNative_1767 = 0;
				local10_IsAbstract_1768 = 0;
				if (func7_IsToken("CALLBACK")) {
					func5_Match("CALLBACK", 72, "src\CompilerPasses\Analyser.gbas");
					local10_IsCallback_1766 = 1;
					if ((((func7_IsToken("FUNCTION")) == (0)) ? 1 : 0)) {
						func5_Match("FUNCTION", 74, "src\CompilerPasses\Analyser.gbas");
						
					};
					
				};
				if (func7_IsToken("NATIVE")) {
					func5_Match("NATIVE", 77, "src\CompilerPasses\Analyser.gbas");
					local8_IsNative_1767 = 1;
					if ((((func7_IsToken("FUNCTION")) == (0)) ? 1 : 0)) {
						func5_Match("FUNCTION", 79, "src\CompilerPasses\Analyser.gbas");
						
					};
					
				};
				if (func7_IsToken("ABSTRACT")) {
					func5_Match("ABSTRACT", 82, "src\CompilerPasses\Analyser.gbas");
					local10_IsAbstract_1768 = 1;
					if ((((func7_IsToken("FUNCTION")) == (0)) ? 1 : 0)) {
						func5_Match("FUNCTION", 84, "src\CompilerPasses\Analyser.gbas");
						
					};
					
				};
				{
					var local16___SelectHelper2__1769 = "";
					local16___SelectHelper2__1769 = func14_GetCurrent_Str();
					if ((((local16___SelectHelper2__1769) == ("PROTOTYPE")) ? 1 : 0)) {
						var local3_var_1770 = new type14_IdentifierVari(), local5_Found_1771 = 0;
						func5_Match("PROTOTYPE", 89, "src\CompilerPasses\Analyser.gbas");
						local3_var_1770 = func7_VariDef(0).clone(/* In Assign */);
						local5_Found_1771 = 0;
						var forEachSaver2397 = global8_Compiler.attr5_Funcs_ref[0];
						for(var forEachCounter2397 = 0 ; forEachCounter2397 < forEachSaver2397.values.length ; forEachCounter2397++) {
							var local4_func_ref_1772 = forEachSaver2397.values[forEachCounter2397];
						{
								if ((((local4_func_ref_1772[0].attr8_Name_Str) == (local3_var_1770.attr8_Name_Str)) ? 1 : 0)) {
									local4_func_ref_1772[0].attr8_datatype = local3_var_1770.attr8_datatype.clone(/* In Assign */);
									local5_Found_1771 = 1;
									break;
									
								};
								
							}
							forEachSaver2397.values[forEachCounter2397] = local4_func_ref_1772;
						
						};
						if ((((local5_Found_1771) == (0)) ? 1 : 0)) {
							func5_Error((("Internal error (prototype not found: ") + (local3_var_1770.attr8_Name_Str)), 100, "src\CompilerPasses\Analyser.gbas");
							
						};
						if ((((local6_CurTyp_1765) != (-(1))) ? 1 : 0)) {
							func5_Error("PROTOTYPE definition not in Type allowed.", 101, "src\CompilerPasses\Analyser.gbas");
							
						};
						
					} else if ((((local16___SelectHelper2__1769) == ("FUNCTION")) ? 1 : 0)) {
						var local3_var_1773 = new type14_IdentifierVari(), local4_func_1774 = new type14_IdentifierFunc();
						func5_Match("FUNCTION", 103, "src\CompilerPasses\Analyser.gbas");
						local3_var_1773 = func7_VariDef(0).clone(/* In Assign */);
						local4_func_1774.attr8_Name_Str = local3_var_1773.attr8_Name_Str;
						local4_func_1774.attr8_datatype = local3_var_1773.attr8_datatype.clone(/* In Assign */);
						local4_func_1774.attr10_IsCallback = local10_IsCallback_1766;
						local4_func_1774.attr10_IsAbstract = local10_IsAbstract_1768;
						if ((((local6_CurTyp_1765) != (-(1))) ? 1 : 0)) {
							local4_func_1774.attr3_Typ = ~~(3);
							DIMPUSH(global8_Compiler.attr5_Types_ref[0].arrAccess(local6_CurTyp_1765).values[tmpPositionCache][0].attr7_Methods, BOUNDS(global8_Compiler.attr5_Funcs_ref[0], 0));
							local4_func_1774.attr6_MyType = local6_CurTyp_1765;
							
						} else {
							local4_func_1774.attr3_Typ = ~~(1);
							
						};
						func11_AddFunction(local4_func_1774);
						if (((((((local8_IsNative_1767) == (0)) ? 1 : 0)) && ((((local10_IsAbstract_1768) == (0)) ? 1 : 0))) ? 1 : 0)) {
							func10_SkipTokens("FUNCTION", "ENDFUNCTION", local4_func_1774.attr8_Name_Str);
							
						};
						
					} else if ((((local16___SelectHelper2__1769) == ("SUB")) ? 1 : 0)) {
						var local4_func_1775 = new type14_IdentifierFunc();
						func5_Match("SUB", 125, "src\CompilerPasses\Analyser.gbas");
						local4_func_1775.attr8_Name_Str = func14_GetCurrent_Str();
						local4_func_1775.attr8_datatype = global12_voidDatatype.clone(/* In Assign */);
						local4_func_1775.attr3_Typ = ~~(2);
						func11_AddFunction(local4_func_1775);
						func10_SkipTokens("SUB", "ENDSUB", local4_func_1775.attr8_Name_Str);
						
					} else if ((((local16___SelectHelper2__1769) == ("TYPE")) ? 1 : 0)) {
						func5_Match("TYPE", 133, "src\CompilerPasses\Analyser.gbas");
						if ((((func6_IsType("")) == (0)) ? 1 : 0)) {
							func5_Error((((("Internal error (unrecognized type: ") + (func14_GetCurrent_Str()))) + (")")), 134, "src\CompilerPasses\Analyser.gbas");
							
						};
						local6_CurTyp_1765 = global8_LastType.attr2_ID;
						
					} else if ((((local16___SelectHelper2__1769) == ("ENDTYPE")) ? 1 : 0)) {
						local6_CurTyp_1765 = -(1);
						
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
	if ((((local6_CurTyp_1765) != (-(1))) ? 1 : 0)) {
		func5_Error((((("Type '") + (global8_Compiler.attr5_Types_ref[0].arrAccess(local6_CurTyp_1765).values[tmpPositionCache][0].attr8_Name_Str))) + (" not closed with 'ENDTYPE'")), 147, "src\CompilerPasses\Analyser.gbas");
		
	};
	local6_CurTyp_1765 = -(1);
	var forEachSaver2680 = global8_Compiler.attr5_Funcs_ref[0];
	for(var forEachCounter2680 = 0 ; forEachCounter2680 < forEachSaver2680.values.length ; forEachCounter2680++) {
		var local1_F_ref_1777 = forEachSaver2680.values[forEachCounter2680];
	{
			if (local1_F_ref_1777[0].attr10_IsCallback) {
				var local12_alreadyExist_1778 = 0;
				local12_alreadyExist_1778 = 0;
				var forEachSaver2665 = global8_Compiler.attr5_Funcs_ref[0];
				for(var forEachCounter2665 = 0 ; forEachCounter2665 < forEachSaver2665.values.length ; forEachCounter2665++) {
					var local2_F2_ref_1779 = forEachSaver2665.values[forEachCounter2665];
				{
						if (((((((local2_F2_ref_1779[0].attr8_Name_Str) == (local1_F_ref_1777[0].attr8_Name_Str)) ? 1 : 0)) && ((((local2_F2_ref_1779[0].attr10_IsCallback) == (0)) ? 1 : 0))) ? 1 : 0)) {
							local12_alreadyExist_1778 = 1;
							break;
							
						};
						
					}
					forEachSaver2665.values[forEachCounter2665] = local2_F2_ref_1779;
				
				};
				if (local12_alreadyExist_1778) {
					local1_F_ref_1777[0].attr8_Name_Str = (("Overwritten Callback method (screw them!): ") + (local1_F_ref_1777[0].attr8_Name_Str));
					
				};
				
			};
			
		}
		forEachSaver2680.values[forEachCounter2680] = local1_F_ref_1777;
	
	};
	var forEachSaver2719 = global8_Compiler.attr5_Funcs_ref[0];
	for(var forEachCounter2719 = 0 ; forEachCounter2719 < forEachSaver2719.values.length ; forEachCounter2719++) {
		var local1_F_ref_1780 = forEachSaver2719.values[forEachCounter2719];
	{
			if ((((((((((local1_F_ref_1780[0].attr3_Typ) != (3)) ? 1 : 0)) && ((((local1_F_ref_1780[0].attr3_Typ) != (2)) ? 1 : 0))) ? 1 : 0)) && (((local1_F_ref_1780[0].attr10_IsCallback) ? 0 : 1))) ? 1 : 0)) {
				(global8_Compiler.attr11_GlobalFuncs).Put(local1_F_ref_1780[0].attr8_Name_Str, local1_F_ref_1780[0].attr2_ID);
				
			};
			
		}
		forEachSaver2719.values[forEachCounter2719] = local1_F_ref_1780;
	
	};
	func5_Start();
	while (func8_EOFParse()) {
		{
			var Err_Str = "";
			try {
				{
					var local16___SelectHelper3__1781 = "";
					local16___SelectHelper3__1781 = func14_GetCurrent_Str();
					if ((((local16___SelectHelper3__1781) == ("GLOBAL")) ? 1 : 0)) {
						do {
							var local4_Vari_1782 = new type14_IdentifierVari();
							if (func7_IsToken("GLOBAL")) {
								func5_Match("GLOBAL", 193, "src\CompilerPasses\Analyser.gbas");
								
							} else {
								func5_Match(",", 195, "src\CompilerPasses\Analyser.gbas");
								
							};
							local4_Vari_1782 = func7_VariDef(0).clone(/* In Assign */);
							local4_Vari_1782.attr3_Typ = ~~(2);
							func11_AddVariable(local4_Vari_1782, 1);
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
					var local16___SelectHelper4__1784 = "";
					local16___SelectHelper4__1784 = func14_GetCurrent_Str();
					if ((((local16___SelectHelper4__1784) == ("TYPE")) ? 1 : 0)) {
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
	local6_CurTyp_1765 = -(1);
	var forEachSaver2820 = global8_Compiler.attr5_Types_ref[0];
	for(var forEachCounter2820 = 0 ; forEachCounter2820 < forEachSaver2820.values.length ; forEachCounter2820++) {
		var local3_typ_ref_1786 = forEachSaver2820.values[forEachCounter2820];
	{
			func10_ExtendType(unref(local3_typ_ref_1786[0]));
			
		}
		forEachSaver2820.values[forEachCounter2820] = local3_typ_ref_1786;
	
	};
	var forEachSaver2833 = global8_Compiler.attr5_Types_ref[0];
	for(var forEachCounter2833 = 0 ; forEachCounter2833 < forEachSaver2833.values.length ; forEachCounter2833++) {
		var local3_typ_ref_1787 = forEachSaver2833.values[forEachCounter2833];
	{
			func11_CheckCyclic(local3_typ_ref_1787[0].attr8_Name_Str, unref(local3_typ_ref_1787[0]));
			
		}
		forEachSaver2833.values[forEachCounter2833] = local3_typ_ref_1787;
	
	};
	func5_Start();
	while (func8_EOFParse()) {
		{
			var Err_Str = "";
			try {
				var local8_isNative_1788 = 0, local10_isCallBack_1789 = 0;
				local8_isNative_1788 = 0;
				local10_isCallBack_1789 = 0;
				{
					var local16___SelectHelper5__1790 = "";
					local16___SelectHelper5__1790 = func14_GetCurrent_Str();
					if ((((local16___SelectHelper5__1790) == ("NATIVE")) ? 1 : 0)) {
						local8_isNative_1788 = 1;
						func7_GetNext();
						
					} else if ((((local16___SelectHelper5__1790) == ("CALLBACK")) ? 1 : 0)) {
						local10_isCallBack_1789 = 1;
						func7_GetNext();
						
					} else if ((((local16___SelectHelper5__1790) == ("ABSTRACT")) ? 1 : 0)) {
						func7_GetNext();
						
					};
					
				};
				{
					var local16___SelectHelper6__1791 = "";
					local16___SelectHelper6__1791 = func14_GetCurrent_Str();
					if ((((local16___SelectHelper6__1791) == ("FUNCTION")) ? 1 : 0)) {
						var local3_Typ_1792 = 0.0;
						if ((((local6_CurTyp_1765) == (-(1))) ? 1 : 0)) {
							local3_Typ_1792 = 1;
							
						} else {
							local3_Typ_1792 = 3;
							
						};
						func7_FuncDef(local8_isNative_1788, local10_isCallBack_1789, ~~(local3_Typ_1792), local6_CurTyp_1765);
						
					} else if ((((local16___SelectHelper6__1791) == ("PROTOTYPE")) ? 1 : 0)) {
						func7_FuncDef(0, 0, ~~(4), -(1));
						
					} else if ((((local16___SelectHelper6__1791) == ("SUB")) ? 1 : 0)) {
						func6_SubDef();
						
					} else if ((((local16___SelectHelper6__1791) == ("TYPE")) ? 1 : 0)) {
						func5_Match("TYPE", 268, "src\CompilerPasses\Analyser.gbas");
						if ((((func6_IsType("")) == (0)) ? 1 : 0)) {
							func5_Error((((("Internal error (unrecognized type: ") + (func14_GetCurrent_Str()))) + (")")), 269, "src\CompilerPasses\Analyser.gbas");
							
						};
						local6_CurTyp_1765 = global8_LastType.attr2_ID;
						
					} else if ((((local16___SelectHelper6__1791) == ("ENDTYPE")) ? 1 : 0)) {
						local6_CurTyp_1765 = -(1);
						
					} else if ((((local16___SelectHelper6__1791) == ("STARTDATA")) ? 1 : 0)) {
						var local8_Name_Str_1793 = "", local5_Datas_1794 = new GLBArray(), local5_dataB_1798 = new type9_DataBlock();
						func5_Match("STARTDATA", 274, "src\CompilerPasses\Analyser.gbas");
						local8_Name_Str_1793 = func14_GetCurrent_Str();
						if ((((func14_IsValidVarName()) == (0)) ? 1 : 0)) {
							func5_Error("Invalid DATA name", 276, "src\CompilerPasses\Analyser.gbas");
							
						};
						func5_Match(local8_Name_Str_1793, 277, "src\CompilerPasses\Analyser.gbas");
						func5_Match(":", 278, "src\CompilerPasses\Analyser.gbas");
						func5_Match("\n", 279, "src\CompilerPasses\Analyser.gbas");
						while (func7_IsToken("DATA")) {
							var local4_Done_1795 = 0;
							func5_Match("DATA", 282, "src\CompilerPasses\Analyser.gbas");
							local4_Done_1795 = 0;
							while ((((func7_IsToken("\n")) == (0)) ? 1 : 0)) {
								var local1_e_1796 = 0.0, local7_tmpData_1797 = new type8_Datatype();
								if ((((local4_Done_1795) == (1)) ? 1 : 0)) {
									func5_Match(",", 285, "src\CompilerPasses\Analyser.gbas");
									
								};
								local1_e_1796 = func10_Expression(0);
								local7_tmpData_1797 = global5_Exprs_ref[0].arrAccess(~~(local1_e_1796)).values[tmpPositionCache][0].attr8_datatype.clone(/* In Assign */);
								local7_tmpData_1797.attr7_IsArray_ref[0] = 0;
								func14_EnsureDatatype(~~(local1_e_1796), local7_tmpData_1797, 0, 0);
								if ((((((((((global5_Exprs_ref[0].arrAccess(~~(local1_e_1796)).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str_ref[0]) == ("int")) ? 1 : 0)) || ((((global5_Exprs_ref[0].arrAccess(~~(local1_e_1796)).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str_ref[0]) == ("float")) ? 1 : 0))) ? 1 : 0)) || ((((global5_Exprs_ref[0].arrAccess(~~(local1_e_1796)).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str_ref[0]) == ("string")) ? 1 : 0))) ? 1 : 0)) {
									
								} else {
									func5_Error((((("Must be primitive datatype (int, float or string), got '") + (global5_Exprs_ref[0].arrAccess(~~(local1_e_1796)).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str_ref[0]))) + ("'")), 293, "src\CompilerPasses\Analyser.gbas");
									
								};
								DIMPUSH(local5_Datas_1794, ~~(local1_e_1796));
								local4_Done_1795 = 1;
								
							};
							func5_Match("\n", 298, "src\CompilerPasses\Analyser.gbas");
							
						};
						func5_Match("ENDDATA", 300, "src\CompilerPasses\Analyser.gbas");
						local5_dataB_1798.attr8_Name_Str = local8_Name_Str_1793;
						local5_dataB_1798.attr5_Datas = local5_Datas_1794.clone(/* In Assign */);
						DIMPUSH(global8_Compiler.attr10_DataBlocks, local5_dataB_1798);
						
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
	var forEachSaver3187 = param3_typ.attr10_Attributes;
	for(var forEachCounter3187 = 0 ; forEachCounter3187 < forEachSaver3187.values.length ; forEachCounter3187++) {
		var local1_t_1802 = forEachSaver3187.values[forEachCounter3187];
	{
			if ((((global8_Compiler.attr5_Varis_ref[0].arrAccess(local1_t_1802).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str_ref[0]) == (param8_Name_Str)) ? 1 : 0)) {
				func5_Error((((((((("Cyclic reference '") + (global8_Compiler.attr5_Varis_ref[0].arrAccess(local1_t_1802).values[tmpPositionCache][0].attr8_Name_Str))) + ("' to type '"))) + (param8_Name_Str))) + ("'")), 320, "src\CompilerPasses\Analyser.gbas");
				
			} else if (func6_IsType(unref(global8_Compiler.attr5_Varis_ref[0].arrAccess(local1_t_1802).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str_ref[0]))) {
				func11_CheckCyclic(param8_Name_Str, global8_LastType);
				
			} else {
				
			};
			
		}
		forEachSaver3187.values[forEachCounter3187] = local1_t_1802;
	
	};
	return 0;
	
};
func11_CheckCyclic = window['func11_CheckCyclic'];
window['func10_ExtendType'] = function(param3_typ) {
	if ((((param3_typ.attr9_Extending) != (-(1))) ? 1 : 0)) {
		var alias6_ExtTyp_ref_1804 = [new type14_IdentifierType()], local6_tmpTyp_1805 = 0, local9_Abstracts_1806 = new GLBArray();
		func10_ExtendType(unref(global8_Compiler.attr5_Types_ref[0].arrAccess(param3_typ.attr9_Extending).values[tmpPositionCache][0]));
		alias6_ExtTyp_ref_1804 = global8_Compiler.attr5_Types_ref[0].arrAccess(param3_typ.attr9_Extending).values[tmpPositionCache] /* ALIAS */;
		local6_tmpTyp_1805 = alias6_ExtTyp_ref_1804[0].attr2_ID;
		while ((((local6_tmpTyp_1805) != (-(1))) ? 1 : 0)) {
			var forEachSaver3255 = global8_Compiler.attr5_Types_ref[0].arrAccess(local6_tmpTyp_1805).values[tmpPositionCache][0].attr7_Methods;
			for(var forEachCounter3255 = 0 ; forEachCounter3255 < forEachSaver3255.values.length ; forEachCounter3255++) {
				var local1_M_1807 = forEachSaver3255.values[forEachCounter3255];
			{
					if (global8_Compiler.attr5_Funcs_ref[0].arrAccess(local1_M_1807).values[tmpPositionCache][0].attr10_IsAbstract) {
						DIMPUSH(local9_Abstracts_1806, local1_M_1807);
						
					};
					
				}
				forEachSaver3255.values[forEachCounter3255] = local1_M_1807;
			
			};
			local6_tmpTyp_1805 = global8_Compiler.attr5_Types_ref[0].arrAccess(local6_tmpTyp_1805).values[tmpPositionCache][0].attr9_Extending;
			
		};
		var forEachSaver3359 = local9_Abstracts_1806;
		for(var forEachCounter3359 = 0 ; forEachCounter3359 < forEachSaver3359.values.length ; forEachCounter3359++) {
			var local2_Ab_1808 = forEachSaver3359.values[forEachCounter3359];
		{
				var local5_Found_1809 = 0;
				local5_Found_1809 = 0;
				local6_tmpTyp_1805 = alias6_ExtTyp_ref_1804[0].attr2_ID;
				while ((((local6_tmpTyp_1805) != (-(1))) ? 1 : 0)) {
					var forEachSaver3332 = global8_Compiler.attr5_Types_ref[0].arrAccess(local6_tmpTyp_1805).values[tmpPositionCache][0].attr7_Methods;
					for(var forEachCounter3332 = 0 ; forEachCounter3332 < forEachSaver3332.values.length ; forEachCounter3332++) {
						var local1_M_1810 = forEachSaver3332.values[forEachCounter3332];
					{
							if (((((((global8_Compiler.attr5_Funcs_ref[0].arrAccess(local1_M_1810).values[tmpPositionCache][0].attr8_Name_Str) == (global8_Compiler.attr5_Funcs_ref[0].arrAccess(local2_Ab_1808).values[tmpPositionCache][0].attr8_Name_Str)) ? 1 : 0)) && (((global8_Compiler.attr5_Funcs_ref[0].arrAccess(local1_M_1810).values[tmpPositionCache][0].attr10_IsAbstract) ? 0 : 1))) ? 1 : 0)) {
								local5_Found_1809 = 1;
								break;
								
							};
							
						}
						forEachSaver3332.values[forEachCounter3332] = local1_M_1810;
					
					};
					if (local5_Found_1809) {
						break;
						
					};
					local6_tmpTyp_1805 = global8_Compiler.attr5_Types_ref[0].arrAccess(local6_tmpTyp_1805).values[tmpPositionCache][0].attr9_Extending;
					
				};
				if (((local5_Found_1809) ? 0 : 1)) {
					alias6_ExtTyp_ref_1804[0].attr10_Createable = 0;
					
				};
				
			}
			forEachSaver3359.values[forEachCounter3359] = local2_Ab_1808;
		
		};
		var forEachSaver3417 = alias6_ExtTyp_ref_1804[0].attr10_Attributes;
		for(var forEachCounter3417 = 0 ; forEachCounter3417 < forEachSaver3417.values.length ; forEachCounter3417++) {
			var local1_A_1811 = forEachSaver3417.values[forEachCounter3417];
		{
				var alias3_Att_ref_1812 = [new type14_IdentifierVari()], local6_Exists_1813 = 0;
				alias3_Att_ref_1812 = global8_Compiler.attr5_Varis_ref[0].arrAccess(local1_A_1811).values[tmpPositionCache] /* ALIAS */;
				local6_Exists_1813 = 0;
				var forEachSaver3405 = param3_typ.attr10_Attributes;
				for(var forEachCounter3405 = 0 ; forEachCounter3405 < forEachSaver3405.values.length ; forEachCounter3405++) {
					var local2_A2_1814 = forEachSaver3405.values[forEachCounter3405];
				{
						var alias4_Att2_ref_1815 = [new type14_IdentifierVari()];
						alias4_Att2_ref_1815 = global8_Compiler.attr5_Varis_ref[0].arrAccess(local2_A2_1814).values[tmpPositionCache] /* ALIAS */;
						if ((((alias3_Att_ref_1812[0].attr8_Name_Str) == (alias4_Att2_ref_1815[0].attr8_Name_Str)) ? 1 : 0)) {
							local6_Exists_1813 = 1;
							break;
							
						};
						
					}
					forEachSaver3405.values[forEachCounter3405] = local2_A2_1814;
				
				};
				if (((local6_Exists_1813) ? 0 : 1)) {
					DIMPUSH(param3_typ.attr10_Attributes, local1_A_1811);
					
				};
				
			}
			forEachSaver3417.values[forEachCounter3417] = local1_A_1811;
		
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
	var forEachSaver3467 = param4_self.attr6_Params;
	for(var forEachCounter3467 = 0 ; forEachCounter3467 < forEachSaver3467.values.length ; forEachCounter3467++) {
		var local1_P_1819 = forEachSaver3467.values[forEachCounter3467];
	{
			WRITELONG(param1_F, local1_P_1819);
			if ((((local1_P_1819) != (-(1))) ? 1 : 0)) {
				(global8_Compiler.attr5_Varis_ref[0].arrAccess(local1_P_1819).values[tmpPositionCache][0]).Save(param1_F);
				
			};
			
		}
		forEachSaver3467.values[forEachCounter3467] = local1_P_1819;
	
	};
	WRITEUWORD(param1_F, BOUNDS(param4_self.attr10_CopyParams, 0));
	var forEachSaver3501 = param4_self.attr10_CopyParams;
	for(var forEachCounter3501 = 0 ; forEachCounter3501 < forEachSaver3501.values.length ; forEachCounter3501++) {
		var local1_P_1820 = forEachSaver3501.values[forEachCounter3501];
	{
			WRITELONG(param1_F, local1_P_1820);
			if ((((local1_P_1820) != (-(1))) ? 1 : 0)) {
				(global8_Compiler.attr5_Varis_ref[0].arrAccess(local1_P_1820).values[tmpPositionCache][0]).Save(param1_F);
				
			};
			
		}
		forEachSaver3501.values[forEachCounter3501] = local1_P_1820;
	
	};
	WRITEUWORD(param1_F, BOUNDS(param4_self.attr7_Statics, 0));
	var forEachSaver3535 = param4_self.attr7_Statics;
	for(var forEachCounter3535 = 0 ; forEachCounter3535 < forEachSaver3535.values.length ; forEachCounter3535++) {
		var local1_P_1821 = forEachSaver3535.values[forEachCounter3535];
	{
			WRITELONG(param1_F, local1_P_1821);
			if ((((local1_P_1821) != (-(1))) ? 1 : 0)) {
				(global8_Compiler.attr5_Varis_ref[0].arrAccess(local1_P_1821).values[tmpPositionCache][0]).Save(param1_F);
				
			};
			
		}
		forEachSaver3535.values[forEachCounter3535] = local1_P_1821;
	
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
	var forEachSaver3811 = param4_self.attr10_Attributes;
	for(var forEachCounter3811 = 0 ; forEachCounter3811 < forEachSaver3811.values.length ; forEachCounter3811++) {
		var local1_P_1834 = forEachSaver3811.values[forEachCounter3811];
	{
			WRITELONG(param1_F, local1_P_1834);
			if ((((local1_P_1834) != (-(1))) ? 1 : 0)) {
				(global8_Compiler.attr5_Varis_ref[0].arrAccess(local1_P_1834).values[tmpPositionCache][0]).Save(param1_F);
				
			};
			
		}
		forEachSaver3811.values[forEachCounter3811] = local1_P_1834;
	
	};
	WRITEUWORD(param1_F, BOUNDS(param4_self.attr7_Methods, 0));
	var forEachSaver3845 = param4_self.attr7_Methods;
	for(var forEachCounter3845 = 0 ; forEachCounter3845 < forEachSaver3845.values.length ; forEachCounter3845++) {
		var local1_P_1835 = forEachSaver3845.values[forEachCounter3845];
	{
			WRITELONG(param1_F, local1_P_1835);
			if ((((local1_P_1835) != (-(1))) ? 1 : 0)) {
				(global8_Compiler.attr5_Funcs_ref[0].arrAccess(local1_P_1835).values[tmpPositionCache][0]).Save(param1_F);
				
			};
			
		}
		forEachSaver3845.values[forEachCounter3845] = local1_P_1835;
	
	};
	WRITEUWORD(param1_F, BOUNDS(param4_self.attr7_PreSize, 0));
	var forEachSaver3877 = param4_self.attr7_PreSize;
	for(var forEachCounter3877 = 0 ; forEachCounter3877 < forEachSaver3877.values.length ; forEachCounter3877++) {
		var local1_P_1836 = forEachSaver3877.values[forEachCounter3877];
	{
			WRITELONG(param1_F, local1_P_1836);
			if ((((local1_P_1836) != (-(1))) ? 1 : 0)) {
				(global5_Exprs_ref[0].arrAccess(local1_P_1836).values[tmpPositionCache][0]).Save(param1_F);
				
			};
			
		}
		forEachSaver3877.values[forEachCounter3877] = local1_P_1836;
	
	};
	WRITEUWORD(param1_F, ~~(3000));
	return 0;
	
};
method21_type14_IdentifierType_4_Save = window['method21_type14_IdentifierType_4_Save'];
window['method21_type14_IdentifierType_4_Load'] = function(param1_F, param4_self) {
	var local3_tmp_ref_1840 = [0];
	READUWORD(param1_F, local3_tmp_ref_1840);
	if ((((local3_tmp_ref_1840[0]) != (3000)) ? 1 : 0)) {
		return tryClone(0);
		
	};
	READUWORD(param1_F, local3_tmp_ref_1840);
	if ((((local3_tmp_ref_1840[0]) != (3000)) ? 1 : 0)) {
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
	var local3_tmp_ref_1847 = [0];
	READUWORD(param1_F, local3_tmp_ref_1847);
	if ((((local3_tmp_ref_1847[0]) != (4000)) ? 1 : 0)) {
		return tryClone(0);
		
	};
	func10_ReadString(param1_F, param4_self.attr8_Name_Str_ref);
	READLONG(param1_F, param4_self.attr7_IsArray_ref);
	READUWORD(param1_F, local3_tmp_ref_1847);
	if ((((local3_tmp_ref_1847[0]) != (4000)) ? 1 : 0)) {
		return tryClone(0);
		
	};
	return 1;
	return 0;
	
};
method14_type8_Datatype_4_Load = window['method14_type8_Datatype_4_Load'];
window['method11_type5_Token_4_Load'] = function(param1_F, param4_self) {
	var local3_tmp_ref_1851 = [0];
	READUWORD(param1_F, local3_tmp_ref_1851);
	if ((((local3_tmp_ref_1851[0]) != (5000)) ? 1 : 0)) {
		return tryClone(0);
		
	};
	READLONG(param1_F, param4_self.attr4_Line_ref);
	READLONG(param1_F, param4_self.attr9_Character_ref);
	func10_ReadString(param1_F, param4_self.attr15_LineContent_Str_ref);
	func10_ReadString(param1_F, param4_self.attr8_Path_Str_ref);
	func10_ReadString(param1_F, param4_self.attr8_Text_Str_ref);
	READUWORD(param1_F, local3_tmp_ref_1851);
	if ((((local3_tmp_ref_1851[0]) != (5000)) ? 1 : 0)) {
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
	var local8_Text_Str_2555 = "", local4_File_2556 = 0;
	local4_File_2556 = GENFILE();
	if (OPENFILE(local4_File_2556, param8_Path_Str, 1)) {
		while ((((ENDOFFILE(local4_File_2556)) == (0)) ? 1 : 0)) {
			var local8_Line_Str_ref_2557 = [""];
			READLINE(local4_File_2556, local8_Line_Str_ref_2557);
			local8_Text_Str_2555 = ((((local8_Text_Str_2555) + (local8_Line_Str_ref_2557[0]))) + ("\n"));
			
		};
		CLOSEFILE(local4_File_2556);
		
	} else {
		func5_Error((("Cannot find file: ") + (param8_Path_Str)), 613, "src\Compiler.gbas");
		
	};
	return tryClone(local8_Text_Str_2555);
	return "";
	
};
func12_LoadFile_Str = window['func12_LoadFile_Str'];
window['func5_Error'] = function(param7_Msg_Str, param4_Line, param8_File_Str) {
	var local3_tok_1863 = new type5_Token();
	local3_tok_1863 = func15_GetCurrentToken().clone(/* In Assign */);
	param7_Msg_Str = (((((("Error: '") + (REPLACE_Str(param7_Msg_Str, "\n", "NEWLINE")))) + (global8_Compiler.attr14_errorState_Str))) + ("'\n"));
	param7_Msg_Str = ((((((((((((((param7_Msg_Str) + ("in line '"))) + (CAST2STRING(local3_tok_1863.attr4_Line_ref[0])))) + ("' at character '"))) + (CAST2STRING(local3_tok_1863.attr9_Character_ref[0])))) + ("' near '"))) + (REPLACE_Str(unref(local3_tok_1863.attr8_Text_Str_ref[0]), "\n", "NEWLINE")))) + ("'\n"));
	param7_Msg_Str = ((((((param7_Msg_Str) + ("in file '"))) + (local3_tok_1863.attr8_Path_Str_ref[0]))) + ("'\n"));
	param7_Msg_Str = ((((((param7_Msg_Str) + ("\t '"))) + (local3_tok_1863.attr15_LineContent_Str_ref[0]))) + ("'\n"));
	param7_Msg_Str = ((param7_Msg_Str) + ("-----------------------------------\n"));
	param7_Msg_Str = (("\n-----------------------------------\n") + (param7_Msg_Str));
	STDERR(param7_Msg_Str);
	global8_Compiler.attr8_WasError = 1;
	END();
	throw new GLBException((((("syntaxerror '") + (param7_Msg_Str))) + ("'")), "\src\Compiler.gbas", 642);
	return 0;
	
};
func5_Error = window['func5_Error'];
window['func7_Warning'] = function(param7_Msg_Str) {
	var local3_tok_2559 = new type5_Token();
	local3_tok_2559 = func15_GetCurrentToken().clone(/* In Assign */);
	param7_Msg_Str = (((("Warning: '") + (REPLACE_Str(param7_Msg_Str, "\n", "NEWLINE")))) + ("'\n"));
	param7_Msg_Str = ((((((((((((((param7_Msg_Str) + ("in line '"))) + (CAST2STRING(local3_tok_2559.attr4_Line_ref[0])))) + ("' at character '"))) + (CAST2STRING(local3_tok_2559.attr9_Character_ref[0])))) + ("' near '"))) + (REPLACE_Str(unref(local3_tok_2559.attr8_Text_Str_ref[0]), "\n", "NEWLINE")))) + ("'\n"));
	param7_Msg_Str = ((((((param7_Msg_Str) + ("in file '"))) + (local3_tok_2559.attr8_Path_Str_ref[0]))) + ("'\n"));
	param7_Msg_Str = ((((((param7_Msg_Str) + ("\t '"))) + (local3_tok_2559.attr15_LineContent_Str_ref[0]))) + ("'\n"));
	param7_Msg_Str = ((param7_Msg_Str) + ("-----------------------------------\n"));
	param7_Msg_Str = (("\n-----------------------------------\n") + (param7_Msg_Str));
	STDOUT(param7_Msg_Str);
	return 0;
	
};
func7_Warning = window['func7_Warning'];
window['func11_CreateToken'] = function(param8_Text_Str, param15_LineContent_Str, param4_Line, param9_Character, param8_Path_Str) {
	if (((((((((((((param8_Text_Str) != ("\n")) ? 1 : 0)) && ((((TRIM_Str(param8_Text_Str, " \t\r\n\v\f")) == ("")) ? 1 : 0))) ? 1 : 0)) || ((((param8_Text_Str) == ("\t")) ? 1 : 0))) ? 1 : 0)) || ((((param8_Text_Str) == ("\r")) ? 1 : 0))) ? 1 : 0)) {
		
	} else {
		var local6_ascval_2565 = 0, local3_pos_2566 = 0.0;
		local6_ascval_2565 = ASC(param8_Text_Str, 0);
		if ((((((((((local6_ascval_2565) == (8)) ? 1 : 0)) || ((((local6_ascval_2565) == (12)) ? 1 : 0))) ? 1 : 0)) || ((((CAST2STRING(local6_ascval_2565)) == (global11_SHLASHF_Str)) ? 1 : 0))) ? 1 : 0)) {
			param8_Text_Str = "\n";
			
		};
		local3_pos_2566 = global8_Compiler.attr11_LastTokenID;
		global8_Compiler.attr11_LastTokenID = ((global8_Compiler.attr11_LastTokenID) + (1));
		if ((((global8_Compiler.attr11_LastTokenID) >= (((BOUNDS(global8_Compiler.attr6_Tokens, 0)) - (10)))) ? 1 : 0)) {
			REDIM(global8_Compiler.attr6_Tokens, [((global8_Compiler.attr11_LastTokenID) + (50))], new type5_Token() );
			
		};
		global8_Compiler.attr6_Tokens.arrAccess(~~(local3_pos_2566)).values[tmpPositionCache].attr4_Line_ref[0] = param4_Line;
		global8_Compiler.attr6_Tokens.arrAccess(~~(local3_pos_2566)).values[tmpPositionCache].attr9_Character_ref[0] = param9_Character;
		global8_Compiler.attr6_Tokens.arrAccess(~~(local3_pos_2566)).values[tmpPositionCache].attr15_LineContent_Str_ref[0] = param15_LineContent_Str;
		global8_Compiler.attr6_Tokens.arrAccess(~~(local3_pos_2566)).values[tmpPositionCache].attr8_Path_Str_ref[0] = param8_Path_Str;
		global8_Compiler.attr6_Tokens.arrAccess(~~(local3_pos_2566)).values[tmpPositionCache].attr8_Text_Str_ref[0] = param8_Text_Str;
		if ((((LEFT_Str(unref(global8_Compiler.attr6_Tokens.arrAccess(~~(local3_pos_2566)).values[tmpPositionCache].attr8_Text_Str_ref[0]), 1)) == ("@")) ? 1 : 0)) {
			global8_Compiler.attr6_Tokens.arrAccess(~~(local3_pos_2566)).values[tmpPositionCache].attr8_Text_Str_ref[0] = MID_Str(unref(global8_Compiler.attr6_Tokens.arrAccess(~~(local3_pos_2566)).values[tmpPositionCache].attr8_Text_Str_ref[0]), 1, -(1));
			
		};
		
	};
	return tryClone(unref(new type5_Token()));
	
};
func11_CreateToken = window['func11_CreateToken'];
window['func15_GetCurrentToken'] = function() {
	if ((((global8_Compiler.attr11_currentPosi) < (global8_Compiler.attr11_LastTokenID)) ? 1 : 0)) {
		return tryClone(global8_Compiler.attr6_Tokens.arrAccess(global8_Compiler.attr11_currentPosi).values[tmpPositionCache]);
		
	} else {
		var local1_t_1864 = new type5_Token();
		return tryClone(local1_t_1864);
		
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
			func5_Error("Unexpected end of line", 714, "src\Compiler.gbas");
			
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
	var local8_datatype_2572 = new type8_Datatype();
	local8_datatype_2572.attr8_Name_Str_ref[0] = param8_Name_Str;
	local8_datatype_2572.attr7_IsArray_ref[0] = param7_IsArray;
	return tryClone(local8_datatype_2572);
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
	var local2_Op_ref_2577 = [new type8_Operator()];
	local2_Op_ref_2577[0].attr8_Name_Str = param8_Name_Str;
	local2_Op_ref_2577[0].attr7_Sym_Str = param7_Sym_Str;
	local2_Op_ref_2577[0].attr4_Prio = param4_Prio;
	local2_Op_ref_2577[0].attr3_Typ = param3_Typ;
	local2_Op_ref_2577[0].attr2_ID = BOUNDS(global9_Operators_ref[0], 0);
	DIMPUSH(global9_Operators_ref[0], local2_Op_ref_2577);
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
	var local1_l_ref_1873 = [0];
	READULONG(param1_F, local1_l_ref_1873);
	READSTR(param1_F, param8_Text_Str_ref, unref(local1_l_ref_1873[0]));
	return 0;
	
};
func10_ReadString = window['func10_ReadString'];
window['func11_AddVariable'] = function(param4_Vari, param6_Ignore) {
	var local4_Vari_ref_1874 = [param4_Vari]; /* NEWCODEHERE */
	if (((((((param6_Ignore) == (0)) ? 1 : 0)) && (func13_IsVarExisting(local4_Vari_ref_1874[0].attr8_Name_Str))) ? 1 : 0)) {
		func5_Error((((("Variable already exists, is a keyword or a type: '") + (local4_Vari_ref_1874[0].attr8_Name_Str))) + ("'")), 787, "src\Compiler.gbas");
		
	};
	local4_Vari_ref_1874[0].attr2_ID = BOUNDS(global8_Compiler.attr5_Varis_ref[0], 0);
	DIMPUSH(global8_Compiler.attr5_Varis_ref[0], local4_Vari_ref_1874);
	return 0;
	
};
func11_AddVariable = window['func11_AddVariable'];
window['func11_AddFunction'] = function(param4_Func) {
	var local4_Func_ref_1876 = [param4_Func]; /* NEWCODEHERE */
	if (((((((local4_Func_ref_1876[0].attr3_Typ) != (3)) ? 1 : 0)) && (func14_IsFuncExisting(local4_Func_ref_1876[0].attr8_Name_Str, local4_Func_ref_1876[0].attr10_IsCallback))) ? 1 : 0)) {
		func5_Error((((("Function already exists, is a keyword or a type: '") + (local4_Func_ref_1876[0].attr8_Name_Str))) + ("'")), 794, "src\Compiler.gbas");
		
	};
	local4_Func_ref_1876[0].attr2_ID = BOUNDS(global8_Compiler.attr5_Funcs_ref[0], 0);
	DIMPUSH(global8_Compiler.attr5_Funcs_ref[0], local4_Func_ref_1876);
	return 0;
	
};
func11_AddFunction = window['func11_AddFunction'];
window['InitCompiler'] = function() {
	var local12_Keywords_Str_1877 = new GLBArray();
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
	DIMDATA(local12_Keywords_Str_1877, ["CALLBACK", "FUNCTION", "ENDFUNCTION", "SUB", "ENDSUB", "GOSUB", "IF", "ELSE", "ELSEIF", "THEN", "ENDIF", "WHILE", "WEND", "BREAK", "CONTINUE", "FOR", "FOREACH", "IN", "TO", "STEP", "NEXT", "REPEAT", "UNTIL", "TYPE", "ENDTYPE", "RETURN", "NATIVE", "LOCAL", "GLOBAL", "STATIC", "DIM", "REDIM", "INLINE", "ENDINLINE", "PROTOTYPE", "REQUIRE", "BREAK", "CONTINUE", "TRY", "CATCH", "FINALLY", "THROW", "SELECT", "CASE", "DEFAULT", "ENDSELECT", "STARTDATA", "ENDDATA", "DATA", "RESTORE", "READ", "GOTO", "ALIAS", "AS", "CONSTANT", "INC", "DEC", "DIMPUSH", "LEN", "DIMDATA", "DELETE", "DIMDEL", "DEBUG", "ASSERT", "ABSTRACT", "EXPORT"]);
	(global10_KeywordMap).SetSize(((BOUNDS(local12_Keywords_Str_1877, 0)) * (8)));
	var forEachSaver4572 = local12_Keywords_Str_1877;
	for(var forEachCounter4572 = 0 ; forEachCounter4572 < forEachSaver4572.values.length ; forEachCounter4572++) {
		var local7_key_Str_1878 = forEachSaver4572.values[forEachCounter4572];
	{
			(global10_KeywordMap).Put(local7_key_Str_1878, 1);
			
		}
		forEachSaver4572.values[forEachCounter4572] = local7_key_Str_1878;
	
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
	var local1_c_1881 = new type9_TCompiler(), local11_tmpPath_Str_1882 = "", local10_Output_Str_1883 = "";
	global8_Compiler = local1_c_1881.clone(/* In Assign */);
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
	local11_tmpPath_Str_1882 = GETCURRENTDIR_Str();
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
	SETCURRENTDIR(local11_tmpPath_Str_1882);
	func9_PushTimer();
	local10_Output_Str_1883 = func12_DoTarget_Str(param10_Target_Str);
	func8_PopTimer("Target stuff");
	PassSuccessfull();
	if (global8_Compiler.attr8_WasError) {
		STDOUT("Generating failed :( \n");
		return "";
		
	} else {
		STDOUT((((("Generating successful to target ") + (param10_Target_Str))) + ("! \n")));
		
	};
	return tryClone(local10_Output_Str_1883);
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
	var local3_Def_1887 = new type7_TDefine();
	local3_Def_1887.attr7_Key_Str = param7_Key_Str;
	local3_Def_1887.attr9_Value_Str = param9_Value_Str;
	DIMPUSH(global7_Defines, local3_Def_1887);
	return 0;
	
};
RegisterDefine = window['RegisterDefine'];
window['func16_CreateExpression'] = function(param3_Typ, param8_datatype) {
	var local4_tmpD_2580 = new type8_Datatype(), local3_pos_2581 = 0.0, local1_d_2582 = new type8_Datatype();
	local4_tmpD_2580 = param8_datatype.clone(/* In Assign */);
	local3_pos_2581 = global10_LastExprID;
	global10_LastExprID = ((global10_LastExprID) + (1));
	if ((((global10_LastExprID) >= (((BOUNDS(global5_Exprs_ref[0], 0)) - (10)))) ? 1 : 0)) {
		REDIM(unref(global5_Exprs_ref[0]), [~~(((global10_LastExprID) + (50)))], [new type4_Expr()] );
		
	};
	global5_Exprs_ref[0].arrAccess(~~(local3_pos_2581)).values[tmpPositionCache][0].attr3_Typ = param3_Typ;
	local1_d_2582.attr8_Name_Str_ref[0] = local4_tmpD_2580.attr8_Name_Str_ref[0];
	local1_d_2582.attr7_IsArray_ref[0] = local4_tmpD_2580.attr7_IsArray_ref[0];
	global5_Exprs_ref[0].arrAccess(~~(local3_pos_2581)).values[tmpPositionCache][0].attr8_datatype = local1_d_2582.clone(/* In Assign */);
	global5_Exprs_ref[0].arrAccess(~~(local3_pos_2581)).values[tmpPositionCache][0].attr2_ID = ~~(local3_pos_2581);
	global5_Exprs_ref[0].arrAccess(~~(local3_pos_2581)).values[tmpPositionCache][0].attr5_tokID = global8_Compiler.attr11_currentPosi;
	return tryClone(~~(local3_pos_2581));
	return 0;
	
};
func16_CreateExpression = window['func16_CreateExpression'];
window['func24_CreateOperatorExpression'] = function(param2_Op, param4_Left, param5_Right) {
	var local4_expr_2586 = 0, local8_datatype_2587 = new type8_Datatype();
	var local4_Left_ref_2584 = [param4_Left]; /* NEWCODEHERE */
	var local5_Right_ref_2585 = [param5_Right]; /* NEWCODEHERE */
	local8_datatype_2587 = func12_CastDatatype(local4_Left_ref_2584, local5_Right_ref_2585).clone(/* In Assign */);
	if ((((param2_Op.attr3_Typ) == (3)) ? 1 : 0)) {
		local8_datatype_2587 = global11_intDatatype.clone(/* In Assign */);
		
	};
	local4_expr_2586 = func16_CreateExpression(~~(1), local8_datatype_2587);
	global5_Exprs_ref[0].arrAccess(local4_expr_2586).values[tmpPositionCache][0].attr4_Left = local4_Left_ref_2584[0];
	global5_Exprs_ref[0].arrAccess(local4_expr_2586).values[tmpPositionCache][0].attr5_Right = local5_Right_ref_2585[0];
	global5_Exprs_ref[0].arrAccess(local4_expr_2586).values[tmpPositionCache][0].attr2_Op = param2_Op.attr2_ID;
	return tryClone(local4_expr_2586);
	return 0;
	
};
func24_CreateOperatorExpression = window['func24_CreateOperatorExpression'];
window['func19_CreateIntExpression'] = function(param3_Num) {
	var local4_expr_2589 = 0;
	local4_expr_2589 = func16_CreateExpression(~~(3), global11_intDatatype);
	global5_Exprs_ref[0].arrAccess(local4_expr_2589).values[tmpPositionCache][0].attr6_intval = param3_Num;
	return tryClone(local4_expr_2589);
	return 0;
	
};
func19_CreateIntExpression = window['func19_CreateIntExpression'];
window['func21_CreateFloatExpression'] = function(param3_Num) {
	var local4_expr_2591 = 0;
	local4_expr_2591 = func16_CreateExpression(~~(4), global13_floatDatatype);
	global5_Exprs_ref[0].arrAccess(local4_expr_2591).values[tmpPositionCache][0].attr8_floatval = param3_Num;
	return tryClone(local4_expr_2591);
	return 0;
	
};
func21_CreateFloatExpression = window['func21_CreateFloatExpression'];
window['func19_CreateStrExpression'] = function(param7_Str_Str) {
	var local4_expr_2593 = 0;
	local4_expr_2593 = func16_CreateExpression(~~(5), global11_strDatatype);
	global5_Exprs_ref[0].arrAccess(local4_expr_2593).values[tmpPositionCache][0].attr10_strval_Str = param7_Str_Str;
	return tryClone(local4_expr_2593);
	return 0;
	
};
func19_CreateStrExpression = window['func19_CreateStrExpression'];
window['func21_CreateScopeExpression'] = function(param6_ScpTyp) {
	var local3_Scp_2595 = 0;
	local3_Scp_2595 = func16_CreateExpression(~~(2), global12_voidDatatype);
	global5_Exprs_ref[0].arrAccess(local3_Scp_2595).values[tmpPositionCache][0].attr10_SuperScope = global8_Compiler.attr12_CurrentScope;
	global5_Exprs_ref[0].arrAccess(local3_Scp_2595).values[tmpPositionCache][0].attr6_ScpTyp = param6_ScpTyp;
	return tryClone(local3_Scp_2595);
	return 0;
	
};
func21_CreateScopeExpression = window['func21_CreateScopeExpression'];
window['func24_CreateFuncCallExpression'] = function(param4_func, param6_Params) {
	var local4_expr_2598 = 0;
	local4_expr_2598 = func16_CreateExpression(~~(6), global8_Compiler.attr5_Funcs_ref[0].arrAccess(param4_func).values[tmpPositionCache][0].attr8_datatype);
	global5_Exprs_ref[0].arrAccess(local4_expr_2598).values[tmpPositionCache][0].attr6_Params = param6_Params.clone(/* In Assign */);
	global5_Exprs_ref[0].arrAccess(local4_expr_2598).values[tmpPositionCache][0].attr4_func = param4_func;
	return tryClone(local4_expr_2598);
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
		var local4_expr_2600 = 0;
		local4_expr_2600 = func16_CreateExpression(~~(9), global8_Compiler.attr5_Varis_ref[0].arrAccess(param4_vari).values[tmpPositionCache][0].attr8_datatype);
		global5_Exprs_ref[0].arrAccess(local4_expr_2600).values[tmpPositionCache][0].attr4_vari = param4_vari;
		return tryClone(local4_expr_2600);
		
	};
	return 0;
	
};
func24_CreateVariableExpression = window['func24_CreateVariableExpression'];
window['func22_CreateAssignExpression'] = function(param4_Vari, param5_Right) {
	var local4_Expr_2603 = 0;
	local4_Expr_2603 = func16_CreateExpression(~~(10), global12_voidDatatype);
	global5_Exprs_ref[0].arrAccess(local4_Expr_2603).values[tmpPositionCache][0].attr4_vari = param4_Vari;
	global5_Exprs_ref[0].arrAccess(local4_Expr_2603).values[tmpPositionCache][0].attr5_Right = param5_Right;
	return tryClone(local4_Expr_2603);
	return 0;
	
};
func22_CreateAssignExpression = window['func22_CreateAssignExpression'];
window['func19_CreateDimExpression'] = function(param5_Array, param4_Dims) {
	var local4_Expr_2606 = 0;
	local4_Expr_2606 = func16_CreateExpression(~~(11), global5_Exprs_ref[0].arrAccess(param5_Array).values[tmpPositionCache][0].attr8_datatype);
	global5_Exprs_ref[0].arrAccess(local4_Expr_2606).values[tmpPositionCache][0].attr5_array = param5_Array;
	global5_Exprs_ref[0].arrAccess(local4_Expr_2606).values[tmpPositionCache][0].attr4_dims = param4_Dims.clone(/* In Assign */);
	return tryClone(local4_Expr_2606);
	return 0;
	
};
func19_CreateDimExpression = window['func19_CreateDimExpression'];
window['func21_CreateReDimExpression'] = function(param5_Array, param4_Dims) {
	var local4_Expr_2609 = 0;
	local4_Expr_2609 = func16_CreateExpression(~~(12), global5_Exprs_ref[0].arrAccess(param5_Array).values[tmpPositionCache][0].attr8_datatype);
	global5_Exprs_ref[0].arrAccess(local4_Expr_2609).values[tmpPositionCache][0].attr5_array = param5_Array;
	global5_Exprs_ref[0].arrAccess(local4_Expr_2609).values[tmpPositionCache][0].attr4_dims = param4_Dims.clone(/* In Assign */);
	return tryClone(local4_Expr_2609);
	return 0;
	
};
func21_CreateReDimExpression = window['func21_CreateReDimExpression'];
window['func21_CreateArrayExpression'] = function(param5_Array, param4_Dims) {
	var local7_tmpData_2612 = new type8_Datatype(), local4_Expr_2613 = 0;
	local7_tmpData_2612 = global5_Exprs_ref[0].arrAccess(param5_Array).values[tmpPositionCache][0].attr8_datatype.clone(/* In Assign */);
	if (((((((global5_Exprs_ref[0].arrAccess(param5_Array).values[tmpPositionCache][0].attr8_datatype.attr7_IsArray_ref[0]) && (global8_Compiler.attr5_Varis_ref[0].arrAccess(func11_GetVariable(param5_Array, 1)).values[tmpPositionCache][0].attr8_datatype.attr7_IsArray_ref[0])) ? 1 : 0)) && (BOUNDS(param4_Dims, 0))) ? 1 : 0)) {
		local7_tmpData_2612.attr7_IsArray_ref[0] = 0;
		
	};
	local4_Expr_2613 = func16_CreateExpression(~~(13), local7_tmpData_2612);
	global5_Exprs_ref[0].arrAccess(local4_Expr_2613).values[tmpPositionCache][0].attr5_array = param5_Array;
	global5_Exprs_ref[0].arrAccess(local4_Expr_2613).values[tmpPositionCache][0].attr4_dims = param4_Dims.clone(/* In Assign */);
	return tryClone(local4_Expr_2613);
	return 0;
	
};
func21_CreateArrayExpression = window['func21_CreateArrayExpression'];
window['func24_CreateCast2IntExpression'] = function(param4_expr) {
	var local4_Expr_2615 = 0;
	local4_Expr_2615 = func16_CreateExpression(~~(15), global11_intDatatype);
	global5_Exprs_ref[0].arrAccess(local4_Expr_2615).values[tmpPositionCache][0].attr4_expr = param4_expr;
	return tryClone(local4_Expr_2615);
	return 0;
	
};
func24_CreateCast2IntExpression = window['func24_CreateCast2IntExpression'];
window['func26_CreateCast2FloatExpression'] = function(param4_expr) {
	var local4_Expr_2617 = 0;
	local4_Expr_2617 = func16_CreateExpression(~~(16), global13_floatDatatype);
	global5_Exprs_ref[0].arrAccess(local4_Expr_2617).values[tmpPositionCache][0].attr4_expr = param4_expr;
	return tryClone(local4_Expr_2617);
	return 0;
	
};
func26_CreateCast2FloatExpression = window['func26_CreateCast2FloatExpression'];
window['func27_CreateCast2StringExpression'] = function(param4_expr) {
	var local4_Expr_2619 = 0;
	local4_Expr_2619 = func16_CreateExpression(~~(17), global11_strDatatype);
	global5_Exprs_ref[0].arrAccess(local4_Expr_2619).values[tmpPositionCache][0].attr4_expr = param4_expr;
	return tryClone(local4_Expr_2619);
	return 0;
	
};
func27_CreateCast2StringExpression = window['func27_CreateCast2StringExpression'];
window['func22_CreateAccessExpression'] = function(param4_expr, param8_NextExpr) {
	if (((((((param4_expr) == (param8_NextExpr)) ? 1 : 0)) && ((((param4_expr) == (-(1))) ? 1 : 0))) ? 1 : 0)) {
		func5_Error("Internal error (expr and nextexpr = -1)", 236, "src\Expression.gbas");
		
	};
	if ((((param4_expr) == (-(1))) ? 1 : 0)) {
		return tryClone(param8_NextExpr);
		
	} else if ((((param8_NextExpr) == (-(1))) ? 1 : 0)) {
		return tryClone(param4_expr);
		
	} else {
		var local9_ONextExpr_2622 = 0;
		local9_ONextExpr_2622 = param8_NextExpr;
		if ((((global5_Exprs_ref[0].arrAccess(param8_NextExpr).values[tmpPositionCache][0].attr3_Typ) == (13)) ? 1 : 0)) {
			param8_NextExpr = global5_Exprs_ref[0].arrAccess(param8_NextExpr).values[tmpPositionCache][0].attr5_array;
			
		};
		if ((((global5_Exprs_ref[0].arrAccess(param8_NextExpr).values[tmpPositionCache][0].attr3_Typ) == (6)) ? 1 : 0)) {
			DIMPUSH(global5_Exprs_ref[0].arrAccess(param8_NextExpr).values[tmpPositionCache][0].attr6_Params, param4_expr);
			return tryClone(local9_ONextExpr_2622);
			
		} else {
			var local4_Expr_2623 = 0;
			param8_NextExpr = local9_ONextExpr_2622;
			local4_Expr_2623 = func16_CreateExpression(~~(18), global5_Exprs_ref[0].arrAccess(param8_NextExpr).values[tmpPositionCache][0].attr8_datatype);
			global5_Exprs_ref[0].arrAccess(local4_Expr_2623).values[tmpPositionCache][0].attr4_expr = param4_expr;
			global5_Exprs_ref[0].arrAccess(local4_Expr_2623).values[tmpPositionCache][0].attr8_nextExpr = param8_NextExpr;
			return tryClone(local4_Expr_2623);
			
		};
		
	};
	return 0;
	
};
func22_CreateAccessExpression = window['func22_CreateAccessExpression'];
window['func22_CreateReturnExpression'] = function(param4_expr) {
	var local4_Expr_2625 = 0;
	local4_Expr_2625 = func16_CreateExpression(~~(19), global12_voidDatatype);
	global5_Exprs_ref[0].arrAccess(local4_Expr_2625).values[tmpPositionCache][0].attr4_expr = param4_expr;
	return tryClone(local4_Expr_2625);
	return 0;
	
};
func22_CreateReturnExpression = window['func22_CreateReturnExpression'];
window['func20_CreateGotoExpression'] = function(param8_Name_Str) {
	var local4_Expr_2627 = 0;
	local4_Expr_2627 = func16_CreateExpression(~~(20), global12_voidDatatype);
	global5_Exprs_ref[0].arrAccess(local4_Expr_2627).values[tmpPositionCache][0].attr8_Name_Str = param8_Name_Str;
	global5_Exprs_ref[0].arrAccess(local4_Expr_2627).values[tmpPositionCache][0].attr3_Scp = global8_Compiler.attr12_CurrentScope;
	return tryClone(local4_Expr_2627);
	return 0;
	
};
func20_CreateGotoExpression = window['func20_CreateGotoExpression'];
window['func21_CreateLabelExpression'] = function(param8_Name_Str) {
	var local4_Expr_2629 = 0;
	local4_Expr_2629 = func16_CreateExpression(~~(21), global12_voidDatatype);
	global5_Exprs_ref[0].arrAccess(local4_Expr_2629).values[tmpPositionCache][0].attr8_Name_Str = param8_Name_Str;
	return tryClone(local4_Expr_2629);
	return 0;
	
};
func21_CreateLabelExpression = window['func21_CreateLabelExpression'];
window['func24_CreateFuncDataExpression'] = function(param1_d) {
	return tryClone(func16_CreateExpression(~~(22), param1_d));
	return 0;
	
};
func24_CreateFuncDataExpression = window['func24_CreateFuncDataExpression'];
window['func25_CreateProtoCallExpression'] = function(param4_expr, param6_Params) {
	var local4_Func_2633 = 0, local4_Expr_2634 = 0;
	local4_Func_2633 = func14_SearchPrototyp(unref(global5_Exprs_ref[0].arrAccess(param4_expr).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str_ref[0]));
	if ((((local4_Func_2633) == (-(1))) ? 1 : 0)) {
		func5_Error((((("Internal error (could not find prototype: ") + (global5_Exprs_ref[0].arrAccess(param4_expr).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str_ref[0]))) + (")")), 288, "src\Expression.gbas");
		
	};
	local4_Expr_2634 = func16_CreateExpression(~~(23), global5_Exprs_ref[0].arrAccess(param4_expr).values[tmpPositionCache][0].attr8_datatype);
	global5_Exprs_ref[0].arrAccess(local4_Expr_2634).values[tmpPositionCache][0].attr4_expr = param4_expr;
	global5_Exprs_ref[0].arrAccess(local4_Expr_2634).values[tmpPositionCache][0].attr6_Params = param6_Params.clone(/* In Assign */);
	global5_Exprs_ref[0].arrAccess(local4_Expr_2634).values[tmpPositionCache][0].attr4_func = local4_Func_2633;
	return tryClone(local4_Expr_2634);
	return 0;
	
};
func25_CreateProtoCallExpression = window['func25_CreateProtoCallExpression'];
window['func18_CreateIfExpression'] = function(param5_Conds, param4_Scps, param7_elseScp) {
	var local4_Expr_2638 = 0;
	local4_Expr_2638 = func16_CreateExpression(~~(24), global12_voidDatatype);
	global5_Exprs_ref[0].arrAccess(local4_Expr_2638).values[tmpPositionCache][0].attr10_Conditions = param5_Conds.clone(/* In Assign */);
	global5_Exprs_ref[0].arrAccess(local4_Expr_2638).values[tmpPositionCache][0].attr6_Scopes = param4_Scps.clone(/* In Assign */);
	global5_Exprs_ref[0].arrAccess(local4_Expr_2638).values[tmpPositionCache][0].attr9_elseScope = param7_elseScp;
	global5_Exprs_ref[0].arrAccess(local4_Expr_2638).values[tmpPositionCache][0].attr5_dummy = func21_CreateDummyExpression();
	return tryClone(local4_Expr_2638);
	return 0;
	
};
func18_CreateIfExpression = window['func18_CreateIfExpression'];
window['func21_CreateWhileExpression'] = function(param4_expr, param3_Scp) {
	var local4_Expr_2641 = 0;
	local4_Expr_2641 = func16_CreateExpression(~~(25), global12_voidDatatype);
	global5_Exprs_ref[0].arrAccess(local4_Expr_2641).values[tmpPositionCache][0].attr4_expr = param4_expr;
	global5_Exprs_ref[0].arrAccess(local4_Expr_2641).values[tmpPositionCache][0].attr3_Scp = param3_Scp;
	global5_Exprs_ref[0].arrAccess(local4_Expr_2641).values[tmpPositionCache][0].attr5_dummy = func21_CreateDummyExpression();
	return tryClone(local4_Expr_2641);
	return 0;
	
};
func21_CreateWhileExpression = window['func21_CreateWhileExpression'];
window['func22_CreateRepeatExpression'] = function(param4_expr, param3_Scp) {
	var local4_Expr_2644 = 0;
	local4_Expr_2644 = func16_CreateExpression(~~(26), global12_voidDatatype);
	global5_Exprs_ref[0].arrAccess(local4_Expr_2644).values[tmpPositionCache][0].attr4_expr = param4_expr;
	global5_Exprs_ref[0].arrAccess(local4_Expr_2644).values[tmpPositionCache][0].attr3_Scp = param3_Scp;
	global5_Exprs_ref[0].arrAccess(local4_Expr_2644).values[tmpPositionCache][0].attr5_dummy = func21_CreateDummyExpression();
	return tryClone(local4_Expr_2644);
	return 0;
	
};
func22_CreateRepeatExpression = window['func22_CreateRepeatExpression'];
window['func19_CreateForExpression'] = function(param7_varExpr, param6_toExpr, param8_stepExpr, param5_hasTo, param3_Scp) {
	var local4_Expr_2650 = 0;
	local4_Expr_2650 = func16_CreateExpression(~~(27), global12_voidDatatype);
	global5_Exprs_ref[0].arrAccess(local4_Expr_2650).values[tmpPositionCache][0].attr7_varExpr = param7_varExpr;
	global5_Exprs_ref[0].arrAccess(local4_Expr_2650).values[tmpPositionCache][0].attr6_toExpr = param6_toExpr;
	global5_Exprs_ref[0].arrAccess(local4_Expr_2650).values[tmpPositionCache][0].attr8_stepExpr = param8_stepExpr;
	global5_Exprs_ref[0].arrAccess(local4_Expr_2650).values[tmpPositionCache][0].attr3_Scp = param3_Scp;
	global5_Exprs_ref[0].arrAccess(local4_Expr_2650).values[tmpPositionCache][0].attr5_hasTo = param5_hasTo;
	global5_Exprs_ref[0].arrAccess(local4_Expr_2650).values[tmpPositionCache][0].attr5_dummy = func21_CreateDummyExpression();
	return tryClone(local4_Expr_2650);
	return 0;
	
};
func19_CreateForExpression = window['func19_CreateForExpression'];
window['func23_CreateForEachExpression'] = function(param7_varExpr, param6_inExpr, param3_Scp) {
	var local4_Expr_2654 = 0;
	local4_Expr_2654 = func16_CreateExpression(~~(38), global12_voidDatatype);
	global5_Exprs_ref[0].arrAccess(local4_Expr_2654).values[tmpPositionCache][0].attr7_varExpr = param7_varExpr;
	global5_Exprs_ref[0].arrAccess(local4_Expr_2654).values[tmpPositionCache][0].attr6_inExpr = param6_inExpr;
	global5_Exprs_ref[0].arrAccess(local4_Expr_2654).values[tmpPositionCache][0].attr3_Scp = param3_Scp;
	global5_Exprs_ref[0].arrAccess(local4_Expr_2654).values[tmpPositionCache][0].attr5_dummy = func21_CreateDummyExpression();
	return tryClone(local4_Expr_2654);
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
	var local4_Expr_2658 = 0;
	local4_Expr_2658 = func16_CreateExpression(~~(31), global12_voidDatatype);
	global5_Exprs_ref[0].arrAccess(local4_Expr_2658).values[tmpPositionCache][0].attr3_Scp = param6_tryScp;
	global5_Exprs_ref[0].arrAccess(local4_Expr_2658).values[tmpPositionCache][0].attr8_catchScp = param7_ctchScp;
	global5_Exprs_ref[0].arrAccess(local4_Expr_2658).values[tmpPositionCache][0].attr4_vari = param4_vari;
	return tryClone(local4_Expr_2658);
	return 0;
	
};
func19_CreateTryExpression = window['func19_CreateTryExpression'];
window['func21_CreateThrowExpression'] = function(param5_value) {
	var local4_Expr_2660 = 0;
	local4_Expr_2660 = func16_CreateExpression(~~(32), global12_voidDatatype);
	global5_Exprs_ref[0].arrAccess(local4_Expr_2660).values[tmpPositionCache][0].attr4_expr = param5_value;
	return tryClone(local4_Expr_2660);
	return 0;
	
};
func21_CreateThrowExpression = window['func21_CreateThrowExpression'];
window['func23_CreateRestoreExpression'] = function(param8_Name_Str) {
	var local4_Expr_2662 = 0;
	local4_Expr_2662 = func16_CreateExpression(~~(33), global12_voidDatatype);
	global5_Exprs_ref[0].arrAccess(local4_Expr_2662).values[tmpPositionCache][0].attr8_Name_Str = param8_Name_Str;
	return tryClone(local4_Expr_2662);
	return 0;
	
};
func23_CreateRestoreExpression = window['func23_CreateRestoreExpression'];
window['func20_CreateReadExpression'] = function(param5_Reads) {
	var local4_Expr_2664 = 0;
	local4_Expr_2664 = func16_CreateExpression(~~(34), global12_voidDatatype);
	global5_Exprs_ref[0].arrAccess(local4_Expr_2664).values[tmpPositionCache][0].attr5_Reads = param5_Reads.clone(/* In Assign */);
	return tryClone(local4_Expr_2664);
	return 0;
	
};
func20_CreateReadExpression = window['func20_CreateReadExpression'];
window['func28_CreateDefaultValueExpression'] = function(param8_datatype) {
	if (param8_datatype.attr7_IsArray_ref[0]) {
		return tryClone(func16_CreateExpression(~~(35), param8_datatype));
		
	} else {
		{
			var local17___SelectHelper40__2666 = "";
			local17___SelectHelper40__2666 = param8_datatype.attr8_Name_Str_ref[0];
			if ((((local17___SelectHelper40__2666) == ("int")) ? 1 : 0)) {
				return tryClone(func19_CreateIntExpression(0));
				
			} else if ((((local17___SelectHelper40__2666) == ("float")) ? 1 : 0)) {
				return tryClone(func21_CreateFloatExpression(0));
				
			} else if ((((local17___SelectHelper40__2666) == ("string")) ? 1 : 0)) {
				return tryClone(func19_CreateStrExpression("\"\""));
				
			} else if ((((local17___SelectHelper40__2666) == ("void")) ? 1 : 0)) {
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
	var local4_Expr_2669 = 0;
	local4_Expr_2669 = func16_CreateExpression(~~(36), param8_datatype);
	global5_Exprs_ref[0].arrAccess(local4_Expr_2669).values[tmpPositionCache][0].attr4_dims = param4_dims.clone(/* In Assign */);
	return tryClone(local4_Expr_2669);
	return 0;
	
};
func25_CreateDimAsExprExpression = window['func25_CreateDimAsExprExpression'];
window['func21_CreateAliasExpression'] = function(param4_vari, param4_expr) {
	var local4_Expr_2672 = 0;
	local4_Expr_2672 = func16_CreateExpression(~~(37), global12_voidDatatype);
	global5_Exprs_ref[0].arrAccess(local4_Expr_2672).values[tmpPositionCache][0].attr4_vari = param4_vari;
	global5_Exprs_ref[0].arrAccess(local4_Expr_2672).values[tmpPositionCache][0].attr4_expr = param4_expr;
	return tryClone(local4_Expr_2672);
	return 0;
	
};
func21_CreateAliasExpression = window['func21_CreateAliasExpression'];
window['func19_CreateIncExpression'] = function(param4_Vari, param7_AddExpr) {
	var local4_Expr_2675 = 0;
	local4_Expr_2675 = func16_CreateExpression(~~(39), global12_voidDatatype);
	global5_Exprs_ref[0].arrAccess(local4_Expr_2675).values[tmpPositionCache][0].attr4_vari = param4_Vari;
	global5_Exprs_ref[0].arrAccess(local4_Expr_2675).values[tmpPositionCache][0].attr4_expr = param7_AddExpr;
	return tryClone(local4_Expr_2675);
	return 0;
	
};
func19_CreateIncExpression = window['func19_CreateIncExpression'];
window['func23_CreateDimpushExpression'] = function(param4_vari, param4_expr) {
	var local4_Expr_2678 = 0;
	local4_Expr_2678 = func16_CreateExpression(~~(40), global12_voidDatatype);
	global5_Exprs_ref[0].arrAccess(local4_Expr_2678).values[tmpPositionCache][0].attr4_vari = param4_vari;
	global5_Exprs_ref[0].arrAccess(local4_Expr_2678).values[tmpPositionCache][0].attr4_expr = param4_expr;
	return tryClone(local4_Expr_2678);
	return 0;
	
};
func23_CreateDimpushExpression = window['func23_CreateDimpushExpression'];
window['func19_CreateLenExpression'] = function(param4_expr, param4_kern) {
	var local4_Expr_2681 = 0;
	local4_Expr_2681 = func16_CreateExpression(~~(41), global11_intDatatype);
	global5_Exprs_ref[0].arrAccess(local4_Expr_2681).values[tmpPositionCache][0].attr4_expr = param4_expr;
	global5_Exprs_ref[0].arrAccess(local4_Expr_2681).values[tmpPositionCache][0].attr4_kern = param4_kern;
	return tryClone(local4_Expr_2681);
	return 0;
	
};
func19_CreateLenExpression = window['func19_CreateLenExpression'];
window['func23_CreateDimDataExpression'] = function(param5_array, param5_exprs) {
	var local4_Expr_2684 = 0;
	local4_Expr_2684 = func16_CreateExpression(~~(42), global12_voidDatatype);
	global5_Exprs_ref[0].arrAccess(local4_Expr_2684).values[tmpPositionCache][0].attr5_array = param5_array;
	global5_Exprs_ref[0].arrAccess(local4_Expr_2684).values[tmpPositionCache][0].attr5_Exprs = param5_exprs.clone(/* In Assign */);
	return tryClone(local4_Expr_2684);
	return 0;
	
};
func23_CreateDimDataExpression = window['func23_CreateDimDataExpression'];
window['func22_CreateDeleteExpression'] = function() {
	return tryClone(func16_CreateExpression(~~(43), global12_voidDatatype));
	return 0;
	
};
func22_CreateDeleteExpression = window['func22_CreateDeleteExpression'];
window['func22_CreateDimDelExpression'] = function(param5_array, param8_position) {
	var local4_Expr_2687 = 0;
	local4_Expr_2687 = func16_CreateExpression(~~(44), global12_voidDatatype);
	global5_Exprs_ref[0].arrAccess(local4_Expr_2687).values[tmpPositionCache][0].attr5_array = param5_array;
	global5_Exprs_ref[0].arrAccess(local4_Expr_2687).values[tmpPositionCache][0].attr8_position = param8_position;
	return tryClone(local4_Expr_2687);
	return 0;
	
};
func22_CreateDimDelExpression = window['func22_CreateDimDelExpression'];
window['func21_CreateBoundExpression'] = function(param4_expr, param8_position) {
	var local4_Expr_2690 = 0;
	local4_Expr_2690 = func16_CreateExpression(~~(45), global11_intDatatype);
	global5_Exprs_ref[0].arrAccess(local4_Expr_2690).values[tmpPositionCache][0].attr5_array = param4_expr;
	global5_Exprs_ref[0].arrAccess(local4_Expr_2690).values[tmpPositionCache][0].attr8_position = param8_position;
	return tryClone(local4_Expr_2690);
	return 0;
	
};
func21_CreateBoundExpression = window['func21_CreateBoundExpression'];
window['func19_CreateNotExpression'] = function(param4_expr) {
	var local4_Expr_2692 = 0;
	local4_Expr_2692 = func16_CreateExpression(~~(46), global13_floatDatatype);
	global5_Exprs_ref[0].arrAccess(local4_Expr_2692).values[tmpPositionCache][0].attr4_expr = param4_expr;
	return tryClone(local4_Expr_2692);
	return 0;
	
};
func19_CreateNotExpression = window['func19_CreateNotExpression'];
window['func21_CreateDummyExpression'] = function() {
	return 0;
	return 0;
	
};
func21_CreateDummyExpression = window['func21_CreateDummyExpression'];
window['func25_CreateAddressOfExpression'] = function(param4_func) {
	var local4_Expr_2694 = 0;
	local4_Expr_2694 = func16_CreateExpression(~~(48), global11_intDatatype);
	global5_Exprs_ref[0].arrAccess(local4_Expr_2694).values[tmpPositionCache][0].attr4_func = param4_func;
	return tryClone(local4_Expr_2694);
	return 0;
	
};
func25_CreateAddressOfExpression = window['func25_CreateAddressOfExpression'];
window['func22_CreateAssertExpression'] = function(param4_expr) {
	var local4_Expr_2696 = 0;
	local4_Expr_2696 = func16_CreateExpression(~~(49), global12_voidDatatype);
	global5_Exprs_ref[0].arrAccess(local4_Expr_2696).values[tmpPositionCache][0].attr4_expr = param4_expr;
	return tryClone(local4_Expr_2696);
	return 0;
	
};
func22_CreateAssertExpression = window['func22_CreateAssertExpression'];
window['func27_CreateDebugOutputExpression'] = function(param4_expr) {
	var local4_Expr_2698 = 0;
	local4_Expr_2698 = func16_CreateExpression(~~(50), global12_voidDatatype);
	global5_Exprs_ref[0].arrAccess(local4_Expr_2698).values[tmpPositionCache][0].attr4_expr = param4_expr;
	return tryClone(local4_Expr_2698);
	return 0;
	
};
func27_CreateDebugOutputExpression = window['func27_CreateDebugOutputExpression'];
window['func19_CreateIIFExpression'] = function(param4_Cond, param6_onTrue, param7_onFalse) {
	var local4_Expr_2702 = 0;
	local4_Expr_2702 = func16_CreateExpression(~~(51), global5_Exprs_ref[0].arrAccess(param6_onTrue).values[tmpPositionCache][0].attr8_datatype);
	DIMDATA(global5_Exprs_ref[0].arrAccess(local4_Expr_2702).values[tmpPositionCache][0].attr10_Conditions, [param4_Cond]);
	DIMDATA(global5_Exprs_ref[0].arrAccess(local4_Expr_2702).values[tmpPositionCache][0].attr6_Scopes, [param6_onTrue]);
	global5_Exprs_ref[0].arrAccess(local4_Expr_2702).values[tmpPositionCache][0].attr9_elseScope = param7_onFalse;
	return tryClone(local4_Expr_2702);
	return 0;
	
};
func19_CreateIIFExpression = window['func19_CreateIIFExpression'];
window['func23_CreateRequireExpression'] = function(param8_Path_Str) {
	var local4_Expr_2704 = 0;
	local4_Expr_2704 = func16_CreateExpression(~~(52), global12_voidDatatype);
	if ((((REVINSTR(param8_Path_Str, ".", -(1))) != (-(1))) ? 1 : 0)) {
		{
			var local17___SelectHelper41__2705 = "";
			local17___SelectHelper41__2705 = MID_Str(param8_Path_Str, ((REVINSTR(param8_Path_Str, ".", -(1))) + (1)), -(1));
			if ((((local17___SelectHelper41__2705) == ("js")) ? 1 : 0)) {
				
			} else {
				func5_Error("Cannot not REQUIRE non javascript files...", 532, "src\Expression.gbas");
				
			};
			
		};
		
	};
	global5_Exprs_ref[0].arrAccess(local4_Expr_2704).values[tmpPositionCache][0].attr8_Name_Str = param8_Path_Str;
	global5_Exprs_ref[0].arrAccess(local4_Expr_2704).values[tmpPositionCache][0].attr11_Content_Str = func12_LoadFile_Str(param8_Path_Str);
	return tryClone(local4_Expr_2704);
	return 0;
	
};
func23_CreateRequireExpression = window['func23_CreateRequireExpression'];
window['func21_CreateSuperExpression'] = function(param3_typ) {
	var local1_d_2707 = new type8_Datatype();
	local1_d_2707.attr7_IsArray_ref[0] = 0;
	local1_d_2707.attr8_Name_Str_ref[0] = global8_Compiler.attr5_Types_ref[0].arrAccess(param3_typ).values[tmpPositionCache][0].attr8_Name_Str;
	return tryClone(func16_CreateExpression(~~(53), local1_d_2707));
	return 0;
	
};
func21_CreateSuperExpression = window['func21_CreateSuperExpression'];
window['func14_CreateCast2Obj'] = function(param7_Obj_Str, param4_expr) {
	var local1_d_2710 = new type8_Datatype(), local4_Expr_2711 = 0;
	local1_d_2710.attr7_IsArray_ref[0] = 0;
	local1_d_2710.attr8_Name_Str_ref[0] = param7_Obj_Str;
	local4_Expr_2711 = func16_CreateExpression(~~(54), local1_d_2710);
	global5_Exprs_ref[0].arrAccess(local4_Expr_2711).values[tmpPositionCache][0].attr4_expr = param4_expr;
	return tryClone(local4_Expr_2711);
	return 0;
	
};
func14_CreateCast2Obj = window['func14_CreateCast2Obj'];
window['method13_type7_HashMap_3_Put'] = function(param7_Key_Str, param5_Value, param4_self) {
	var local2_KV_1892 = new type8_KeyValue(), local4_hash_1893 = 0, alias6_Bucket_ref_1894 = [new type6_Bucket()];
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
	local2_KV_1892.attr7_Key_Str = param7_Key_Str;
	local2_KV_1892.attr5_Value = param5_Value;
	local4_hash_1893 = func7_HashStr(param7_Key_Str, ((BOUNDS(param4_self.attr7_Buckets_ref[0], 0)) - (1)));
	alias6_Bucket_ref_1894 = param4_self.attr7_Buckets_ref[0].arrAccess(local4_hash_1893).values[tmpPositionCache] /* ALIAS */;
	if (alias6_Bucket_ref_1894[0].attr3_Set) {
		if ((((BOUNDS(alias6_Bucket_ref_1894[0].attr8_Elements, 0)) == (0)) ? 1 : 0)) {
			DIMPUSH(alias6_Bucket_ref_1894[0].attr8_Elements, alias6_Bucket_ref_1894[0].attr7_Element);
			
		};
		DIMPUSH(alias6_Bucket_ref_1894[0].attr8_Elements, local2_KV_1892);
		
	} else {
		alias6_Bucket_ref_1894[0].attr3_Set = 1;
		alias6_Bucket_ref_1894[0].attr7_Element = local2_KV_1892.clone(/* In Assign */);
		
	};
	return 0;
	
};
method13_type7_HashMap_3_Put = window['method13_type7_HashMap_3_Put'];
window['method13_type7_HashMap_12_DoesKeyExist'] = function(param7_Key_Str, param4_self) {
	var local5_Value_ref_1898 = [0];
	return tryClone((param4_self).GetValue(param7_Key_Str, local5_Value_ref_1898));
	return 0;
	
};
method13_type7_HashMap_12_DoesKeyExist = window['method13_type7_HashMap_12_DoesKeyExist'];
window['method13_type7_HashMap_8_GetValue'] = function(param7_Key_Str, param5_Value_ref, param4_self) {
	var local4_hash_1903 = 0, alias6_Bucket_ref_1904 = [new type6_Bucket()];
	local4_hash_1903 = func7_HashStr(param7_Key_Str, ((BOUNDS(param4_self.attr7_Buckets_ref[0], 0)) - (1)));
	if ((((local4_hash_1903) >= (BOUNDS(param4_self.attr7_Buckets_ref[0], 0))) ? 1 : 0)) {
		return tryClone(0);
		
	};
	alias6_Bucket_ref_1904 = param4_self.attr7_Buckets_ref[0].arrAccess(local4_hash_1903).values[tmpPositionCache] /* ALIAS */;
	if (alias6_Bucket_ref_1904[0].attr3_Set) {
		if ((((BOUNDS(alias6_Bucket_ref_1904[0].attr8_Elements, 0)) == (0)) ? 1 : 0)) {
			if ((((alias6_Bucket_ref_1904[0].attr7_Element.attr7_Key_Str) != (param7_Key_Str)) ? 1 : 0)) {
				param5_Value_ref[0] = 0;
				return tryClone(0);
				
			} else {
				param5_Value_ref[0] = alias6_Bucket_ref_1904[0].attr7_Element.attr5_Value;
				return 1;
				
			};
			
		} else {
			{
				var local1_i_1905 = 0.0;
				for (local1_i_1905 = 0;toCheck(local1_i_1905, ((BOUNDS(alias6_Bucket_ref_1904[0].attr8_Elements, 0)) - (1)), 1);local1_i_1905 += 1) {
					if ((((alias6_Bucket_ref_1904[0].attr8_Elements.arrAccess(~~(local1_i_1905)).values[tmpPositionCache].attr7_Key_Str) == (param7_Key_Str)) ? 1 : 0)) {
						param5_Value_ref[0] = alias6_Bucket_ref_1904[0].attr8_Elements.arrAccess(~~(local1_i_1905)).values[tmpPositionCache].attr5_Value;
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
	var local4_hash_1909 = 0, alias6_Bucket_ref_1910 = [new type6_Bucket()];
	local4_hash_1909 = func7_HashStr(param7_Key_Str, ((BOUNDS(param4_self.attr7_Buckets_ref[0], 0)) - (1)));
	alias6_Bucket_ref_1910 = param4_self.attr7_Buckets_ref[0].arrAccess(local4_hash_1909).values[tmpPositionCache] /* ALIAS */;
	if (alias6_Bucket_ref_1910[0].attr3_Set) {
		if ((((alias6_Bucket_ref_1910[0].attr7_Element.attr7_Key_Str) == (param7_Key_Str)) ? 1 : 0)) {
			var local1_e_1911 = new type8_KeyValue();
			param4_self.attr8_Elements+=-1;
			alias6_Bucket_ref_1910[0].attr7_Element = local1_e_1911.clone(/* In Assign */);
			alias6_Bucket_ref_1910[0].attr3_Set = 0;
			
		} else {
			var local4_Find_1912 = 0;
			local4_Find_1912 = 0;
			{
				var local1_i_1913 = 0.0;
				for (local1_i_1913 = 0;toCheck(local1_i_1913, ((BOUNDS(alias6_Bucket_ref_1910[0].attr8_Elements, 0)) - (1)), 1);local1_i_1913 += 1) {
					if ((((alias6_Bucket_ref_1910[0].attr8_Elements.arrAccess(~~(local1_i_1913)).values[tmpPositionCache].attr7_Key_Str) == (param7_Key_Str)) ? 1 : 0)) {
						local4_Find_1912 = 1;
						DIMDEL(alias6_Bucket_ref_1910[0].attr8_Elements, ~~(local1_i_1913));
						break;
						
					};
					
				};
				
			};
			if ((((BOUNDS(alias6_Bucket_ref_1910[0].attr8_Elements, 0)) == (1)) ? 1 : 0)) {
				alias6_Bucket_ref_1910[0].attr7_Element = alias6_Bucket_ref_1910[0].attr8_Elements.arrAccess(0).values[tmpPositionCache].clone(/* In Assign */);
				DIMDEL(alias6_Bucket_ref_1910[0].attr8_Elements, 0);
				
			};
			if (local4_Find_1912) {
				param4_self.attr8_Elements+=-1;
				
			};
			return tryClone(local4_Find_1912);
			
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
		var local1_i_1917 = 0.0;
		for (local1_i_1917 = 0;toCheck(local1_i_1917, ((BOUNDS(param4_self.attr7_Buckets_ref[0], 0)) - (1)), 1);local1_i_1917 += 1) {
			var alias1_B_ref_1918 = [new type6_Bucket()];
			alias1_B_ref_1918 = param4_self.attr7_Buckets_ref[0].arrAccess(~~(local1_i_1917)).values[tmpPositionCache] /* ALIAS */;
			if (alias1_B_ref_1918[0].attr3_Set) {
				if (BOUNDS(alias1_B_ref_1918[0].attr8_Elements, 0)) {
					{
						var local1_j_1919 = 0.0;
						for (local1_j_1919 = 0;toCheck(local1_j_1919, ((BOUNDS(alias1_B_ref_1918[0].attr8_Elements, 0)) - (1)), 1);local1_j_1919 += 1) {
							DIMPUSH(param5_Array, alias1_B_ref_1918[0].attr8_Elements.arrAccess(~~(local1_j_1919)).values[tmpPositionCache]);
							
						};
						
					};
					
				} else {
					DIMPUSH(param5_Array, alias1_B_ref_1918[0].attr7_Element);
					
				};
				
			};
			
		};
		
	};
	return 0;
	
};
method13_type7_HashMap_7_ToArray = window['method13_type7_HashMap_7_ToArray'];
window['method13_type7_HashMap_7_SetSize'] = function(param4_Size, param4_self) {
	var local3_Arr_1923 = new GLBArray();
	(param4_self).ToArray(unref(local3_Arr_1923));
	param4_self.attr8_Elements = 0;
	REDIM(unref(param4_self.attr7_Buckets_ref[0]), [param4_Size], [new type6_Bucket()] );
	var forEachSaver5324 = local3_Arr_1923;
	for(var forEachCounter5324 = 0 ; forEachCounter5324 < forEachSaver5324.values.length ; forEachCounter5324++) {
		var local1_E_1924 = forEachSaver5324.values[forEachCounter5324];
	{
			(param4_self).Put(local1_E_1924.attr7_Key_Str, local1_E_1924.attr5_Value);
			
		}
		forEachSaver5324.values[forEachCounter5324] = local1_E_1924;
	
	};
	return 0;
	
};
method13_type7_HashMap_7_SetSize = window['method13_type7_HashMap_7_SetSize'];
window['func7_HashStr'] = function(param7_Str_Str, param6_MaxLen) {
	var local4_Hash_1927 = 0;
	{
		var local1_i_1928 = 0.0;
		for (local1_i_1928 = 0;toCheck(local1_i_1928, (((param7_Str_Str).length) - (1)), 1);local1_i_1928 += 1) {
			local4_Hash_1927+=~~(((ASC(param7_Str_Str, ~~(local1_i_1928))) + (((local1_i_1928) * (26)))));
			
		};
		
	};
	local4_Hash_1927 = MOD(local4_Hash_1927, param6_MaxLen);
	return tryClone(local4_Hash_1927);
	return 0;
	
};
func7_HashStr = window['func7_HashStr'];
window['func16_JS_Generator_Str'] = function() {
	{
		var Err_Str = "";
		try {
			var local11_InWebWorker_1929 = 0, local8_Text_Str_1930 = "", local14_StaticText_Str_1931 = "", local17_StaticDefText_Str_1932 = "";
			local11_InWebWorker_1929 = func8_IsDefine("HTML5_WEBWORKER");
			func23_ManageFuncParamOverlaps();
			global14_StaticText_Str = "";
			local8_Text_Str_1930 = "";
			if (global9_DEBUGMODE) {
				local8_Text_Str_1930 = ((((local8_Text_Str_1930) + ("var __debugInfo = \"\";"))) + (func11_NewLine_Str()));
				local8_Text_Str_1930 = ((((local8_Text_Str_1930) + ("var debugMode = true;"))) + (func11_NewLine_Str()));
				
			} else {
				local8_Text_Str_1930 = ((((local8_Text_Str_1930) + ("var debugMode = false;"))) + (func11_NewLine_Str()));
				
			};
			global11_LastDummyID = ~~(((global10_LastExprID) + (1337)));
			local8_Text_Str_1930 = ((local8_Text_Str_1930) + ("window['main'] = function()"));
			local8_Text_Str_1930 = ((((local8_Text_Str_1930) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(global8_Compiler.attr9_MainScope).values[tmpPositionCache][0]))))) + (func11_NewLine_Str()));
			if (local11_InWebWorker_1929) {
				local8_Text_Str_1930 = ((((local8_Text_Str_1930) + ("main = window['main'];"))) + (func11_NewLine_Str()));
				
			};
			local14_StaticText_Str_1931 = "";
			local17_StaticDefText_Str_1932 = "";
			var forEachSaver5629 = global8_Compiler.attr5_Funcs_ref[0];
			for(var forEachCounter5629 = 0 ; forEachCounter5629 < forEachSaver5629.values.length ; forEachCounter5629++) {
				var local4_Func_ref_1933 = forEachSaver5629.values[forEachCounter5629];
			{
					if (((((((local4_Func_ref_1933[0].attr6_Native) == (0)) ? 1 : 0)) && ((((local4_Func_ref_1933[0].attr3_Scp) != (-(1))) ? 1 : 0))) ? 1 : 0)) {
						var local4_Find_1934 = 0.0;
						if ((((BOUNDS(local4_Func_ref_1933[0].attr7_Statics, 0)) > (0)) ? 1 : 0)) {
							local17_StaticDefText_Str_1932 = ((((((((local17_StaticDefText_Str_1932) + ("var "))) + (func13_JSVariDef_Str(unref(local4_Func_ref_1933[0].attr7_Statics), 1, 0)))) + (";"))) + (func11_NewLine_Str()));
							local14_StaticText_Str_1931 = ((((((local14_StaticText_Str_1931) + (func13_JSVariDef_Str(unref(local4_Func_ref_1933[0].attr7_Statics), 0, 0)))) + (";"))) + (func11_NewLine_Str()));
							
						};
						local8_Text_Str_1930 = ((((((local8_Text_Str_1930) + ("window['"))) + (local4_Func_ref_1933[0].attr8_Name_Str))) + ("'] = function("));
						local4_Find_1934 = 0;
						var forEachSaver5555 = local4_Func_ref_1933[0].attr6_Params;
						for(var forEachCounter5555 = 0 ; forEachCounter5555 < forEachSaver5555.values.length ; forEachCounter5555++) {
							var local1_P_1935 = forEachSaver5555.values[forEachCounter5555];
						{
								if (local4_Find_1934) {
									local8_Text_Str_1930 = ((local8_Text_Str_1930) + (", "));
									
								};
								local8_Text_Str_1930 = ((local8_Text_Str_1930) + (global8_Compiler.attr5_Varis_ref[0].arrAccess(local1_P_1935).values[tmpPositionCache][0].attr8_Name_Str));
								local4_Find_1934 = 1;
								
							}
							forEachSaver5555.values[forEachCounter5555] = local1_P_1935;
						
						};
						local8_Text_Str_1930 = ((local8_Text_Str_1930) + (") "));
						local8_Text_Str_1930 = ((((((local8_Text_Str_1930) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(local4_Func_ref_1933[0].attr3_Scp).values[tmpPositionCache][0]))))) + (";"))) + (func11_NewLine_Str()));
						if (((((((global9_DEBUGMODE) == (0)) ? 1 : 0)) && ((((local4_Func_ref_1933[0].attr3_Typ) == (2)) ? 1 : 0))) ? 1 : 0)) {
							local8_Text_Str_1930 = ((((((((((((local8_Text_Str_1930) + ("window['"))) + (local4_Func_ref_1933[0].attr8_Name_Str))) + ("'] = "))) + (local4_Func_ref_1933[0].attr8_Name_Str))) + (";"))) + (func11_NewLine_Str()));
							
						};
						if (local11_InWebWorker_1929) {
							local8_Text_Str_1930 = ((((((((((local8_Text_Str_1930) + (local4_Func_ref_1933[0].attr8_Name_Str))) + (" = window['"))) + (local4_Func_ref_1933[0].attr8_Name_Str))) + ("'];"))) + (func11_NewLine_Str()));
							
						};
						
					};
					
				}
				forEachSaver5629.values[forEachCounter5629] = local4_Func_ref_1933;
			
			};
			var forEachSaver5695 = global8_Compiler.attr5_Funcs_ref[0];
			for(var forEachCounter5695 = 0 ; forEachCounter5695 < forEachSaver5695.values.length ; forEachCounter5695++) {
				var local4_Func_ref_1936 = forEachSaver5695.values[forEachCounter5695];
			{
					if ((((local4_Func_ref_1936[0].attr3_Typ) == (4)) ? 1 : 0)) {
						func8_IndentUp();
						local8_Text_Str_1930 = ((((((((local8_Text_Str_1930) + ("window['"))) + (local4_Func_ref_1936[0].attr9_OName_Str))) + ("'] = function() {"))) + (func11_NewLine_Str()));
						local8_Text_Str_1930 = ((local8_Text_Str_1930) + ("return function() { throwError(\"NullPrototypeException\"); };"));
						func10_IndentDown();
						local8_Text_Str_1930 = ((((((local8_Text_Str_1930) + (func11_NewLine_Str()))) + ("};"))) + (func11_NewLine_Str()));
						if (local11_InWebWorker_1929) {
							local8_Text_Str_1930 = ((((((((((local8_Text_Str_1930) + (local4_Func_ref_1936[0].attr9_OName_Str))) + (" = window['"))) + (local4_Func_ref_1936[0].attr9_OName_Str))) + ("'];"))) + (func11_NewLine_Str()));
							
						};
						
					};
					
				}
				forEachSaver5695.values[forEachCounter5695] = local4_Func_ref_1936;
			
			};
			var forEachSaver6407 = global8_Compiler.attr5_Types_ref[0];
			for(var forEachCounter6407 = 0 ; forEachCounter6407 < forEachSaver6407.values.length ; forEachCounter6407++) {
				var local3_Typ_ref_1937 = forEachSaver6407.values[forEachCounter6407];
			{
					var local5_typId_1938 = 0, local3_map_1939 = new type7_HashMap(), local5_First_1940 = 0, local4_map2_1949 = new type7_HashMap();
					local5_typId_1938 = local3_Typ_ref_1937[0].attr2_ID;
					func8_IndentUp();
					local8_Text_Str_1930 = ((((((((local8_Text_Str_1930) + ("var vtbl_"))) + (local3_Typ_ref_1937[0].attr8_Name_Str))) + (" = {"))) + (func11_NewLine_Str()));
					local5_First_1940 = 0;
					while ((((local5_typId_1938) != (-(1))) ? 1 : 0)) {
						var forEachSaver5819 = global8_Compiler.attr5_Types_ref[0].arrAccess(local5_typId_1938).values[tmpPositionCache][0].attr7_Methods;
						for(var forEachCounter5819 = 0 ; forEachCounter5819 < forEachSaver5819.values.length ; forEachCounter5819++) {
							var local3_Mth_1941 = forEachSaver5819.values[forEachCounter5819];
						{
								if (((((((local3_map_1939).DoesKeyExist(global8_Compiler.attr5_Funcs_ref[0].arrAccess(local3_Mth_1941).values[tmpPositionCache][0].attr9_OName_Str)) ? 0 : 1)) && ((((global8_Compiler.attr5_Funcs_ref[0].arrAccess(local3_Mth_1941).values[tmpPositionCache][0].attr3_Scp) != (-(1))) ? 1 : 0))) ? 1 : 0)) {
									if (local5_First_1940) {
										local8_Text_Str_1930 = ((((local8_Text_Str_1930) + (", "))) + (func11_NewLine_Str()));
										
									};
									local8_Text_Str_1930 = ((((((local8_Text_Str_1930) + (global8_Compiler.attr5_Funcs_ref[0].arrAccess(local3_Mth_1941).values[tmpPositionCache][0].attr9_OName_Str))) + (": "))) + (global8_Compiler.attr5_Funcs_ref[0].arrAccess(local3_Mth_1941).values[tmpPositionCache][0].attr8_Name_Str));
									(local3_map_1939).Put(global8_Compiler.attr5_Funcs_ref[0].arrAccess(local3_Mth_1941).values[tmpPositionCache][0].attr9_OName_Str, local3_Mth_1941);
									local5_First_1940 = 1;
									
								};
								
							}
							forEachSaver5819.values[forEachCounter5819] = local3_Mth_1941;
						
						};
						local5_typId_1938 = global8_Compiler.attr5_Types_ref[0].arrAccess(local5_typId_1938).values[tmpPositionCache][0].attr9_Extending;
						
					};
					func10_IndentDown();
					local8_Text_Str_1930 = ((((((local8_Text_Str_1930) + (func11_NewLine_Str()))) + ("};"))) + (func11_NewLine_Str()));
					if ((((global9_DEBUGMODE) == (0)) ? 1 : 0)) {
						local8_Text_Str_1930 = ((((local8_Text_Str_1930) + ("/**"))) + (func11_NewLine_Str()));
						local8_Text_Str_1930 = ((((local8_Text_Str_1930) + ("* @constructor"))) + (func11_NewLine_Str()));
						local8_Text_Str_1930 = ((((local8_Text_Str_1930) + ("*/"))) + (func11_NewLine_Str()));
						
					};
					func8_IndentUp();
					local8_Text_Str_1930 = ((((((((local8_Text_Str_1930) + ("window ['"))) + (local3_Typ_ref_1937[0].attr8_Name_Str))) + ("'] = function() {"))) + (func11_NewLine_Str()));
					var forEachSaver5928 = local3_Typ_ref_1937[0].attr10_Attributes;
					for(var forEachCounter5928 = 0 ; forEachCounter5928 < forEachSaver5928.values.length ; forEachCounter5928++) {
						var local4_Attr_1942 = forEachSaver5928.values[forEachCounter5928];
					{
							var alias8_variable_ref_1943 = [new type14_IdentifierVari()];
							alias8_variable_ref_1943 = global8_Compiler.attr5_Varis_ref[0].arrAccess(local4_Attr_1942).values[tmpPositionCache] /* ALIAS */;
							local8_Text_Str_1930 = ((((local8_Text_Str_1930) + ("this."))) + (alias8_variable_ref_1943[0].attr8_Name_Str));
							local8_Text_Str_1930 = ((local8_Text_Str_1930) + (" = "));
							local8_Text_Str_1930 = ((local8_Text_Str_1930) + (func21_JSGetDefaultValue_Str(alias8_variable_ref_1943[0].attr8_datatype, alias8_variable_ref_1943[0].attr3_ref, 0)));
							local8_Text_Str_1930 = ((((local8_Text_Str_1930) + (";"))) + (func11_NewLine_Str()));
							
						}
						forEachSaver5928.values[forEachCounter5928] = local4_Attr_1942;
					
					};
					local8_Text_Str_1930 = ((((((((local8_Text_Str_1930) + ("this.vtbl = vtbl_"))) + (local3_Typ_ref_1937[0].attr8_Name_Str))) + (";"))) + (func11_NewLine_Str()));
					var forEachSaver6018 = local3_Typ_ref_1937[0].attr10_Attributes;
					for(var forEachCounter6018 = 0 ; forEachCounter6018 < forEachSaver6018.values.length ; forEachCounter6018++) {
						var local4_Attr_1944 = forEachSaver6018.values[forEachCounter6018];
					{
							var alias8_variable_ref_1945 = [new type14_IdentifierVari()];
							alias8_variable_ref_1945 = global8_Compiler.attr5_Varis_ref[0].arrAccess(local4_Attr_1944).values[tmpPositionCache] /* ALIAS */;
							if ((((alias8_variable_ref_1945[0].attr6_PreDef) != (-(1))) ? 1 : 0)) {
								local8_Text_Str_1930 = ((((local8_Text_Str_1930) + ("this."))) + (alias8_variable_ref_1945[0].attr8_Name_Str));
								local8_Text_Str_1930 = ((local8_Text_Str_1930) + (" = "));
								if (alias8_variable_ref_1945[0].attr3_ref) {
									local8_Text_Str_1930 = ((local8_Text_Str_1930) + ("["));
									
								};
								local8_Text_Str_1930 = ((local8_Text_Str_1930) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(alias8_variable_ref_1945[0].attr6_PreDef).values[tmpPositionCache][0]))));
								if (alias8_variable_ref_1945[0].attr3_ref) {
									local8_Text_Str_1930 = ((local8_Text_Str_1930) + ("]"));
									
								};
								local8_Text_Str_1930 = ((((local8_Text_Str_1930) + (";"))) + (func11_NewLine_Str()));
								
							};
							
						}
						forEachSaver6018.values[forEachCounter6018] = local4_Attr_1944;
					
					};
					local8_Text_Str_1930 = ((((local8_Text_Str_1930) + ("return this;"))) + (func11_NewLine_Str()));
					func10_IndentDown();
					local8_Text_Str_1930 = ((((((local8_Text_Str_1930) + (func11_NewLine_Str()))) + ("};"))) + (func11_NewLine_Str()));
					func8_IndentUp();
					local8_Text_Str_1930 = ((((((((local8_Text_Str_1930) + ("window['"))) + (local3_Typ_ref_1937[0].attr8_Name_Str))) + ("'].prototype.clone = function() {"))) + (func11_NewLine_Str()));
					local8_Text_Str_1930 = ((((((((local8_Text_Str_1930) + ("var other = new "))) + (local3_Typ_ref_1937[0].attr8_Name_Str))) + ("();"))) + (func11_NewLine_Str()));
					var forEachSaver6197 = local3_Typ_ref_1937[0].attr10_Attributes;
					for(var forEachCounter6197 = 0 ; forEachCounter6197 < forEachSaver6197.values.length ; forEachCounter6197++) {
						var local4_Attr_1946 = forEachSaver6197.values[forEachCounter6197];
					{
							var alias8_variable_ref_1947 = [new type14_IdentifierVari()], local8_plzclone_1948 = 0;
							alias8_variable_ref_1947 = global8_Compiler.attr5_Varis_ref[0].arrAccess(local4_Attr_1946).values[tmpPositionCache] /* ALIAS */;
							local8_plzclone_1948 = 0;
							if (((((((global8_Compiler.attr5_Varis_ref[0].arrAccess(local4_Attr_1946).values[tmpPositionCache][0].attr8_datatype.attr7_IsArray_ref[0]) == (0)) ? 1 : 0)) && ((((((((((global8_Compiler.attr5_Varis_ref[0].arrAccess(local4_Attr_1946).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str_ref[0]) == ("int")) ? 1 : 0)) || ((((global8_Compiler.attr5_Varis_ref[0].arrAccess(local4_Attr_1946).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str_ref[0]) == ("float")) ? 1 : 0))) ? 1 : 0)) || ((((global8_Compiler.attr5_Varis_ref[0].arrAccess(local4_Attr_1946).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str_ref[0]) == ("string")) ? 1 : 0))) ? 1 : 0))) ? 1 : 0)) {
								local8_plzclone_1948 = 0;
								
							} else {
								local8_plzclone_1948 = 1;
								
							};
							if (global8_Compiler.attr5_Varis_ref[0].arrAccess(local4_Attr_1946).values[tmpPositionCache][0].attr3_ref) {
								local8_plzclone_1948 = 1;
								
							};
							local8_Text_Str_1930 = ((((((local8_Text_Str_1930) + ("other."))) + (alias8_variable_ref_1947[0].attr8_Name_Str))) + (" = "));
							if (local8_plzclone_1948) {
								local8_Text_Str_1930 = ((local8_Text_Str_1930) + ("tryClone("));
								
							};
							local8_Text_Str_1930 = ((((local8_Text_Str_1930) + ("this."))) + (alias8_variable_ref_1947[0].attr8_Name_Str));
							if (local8_plzclone_1948) {
								local8_Text_Str_1930 = ((local8_Text_Str_1930) + (")"));
								
							};
							local8_Text_Str_1930 = ((((local8_Text_Str_1930) + (";"))) + (func11_NewLine_Str()));
							
						}
						forEachSaver6197.values[forEachCounter6197] = local4_Attr_1946;
					
					};
					local8_Text_Str_1930 = ((((local8_Text_Str_1930) + ("other.vtbl = this.vtbl;"))) + (func11_NewLine_Str()));
					func10_IndentDown();
					local8_Text_Str_1930 = ((((local8_Text_Str_1930) + ("return other;"))) + (func11_NewLine_Str()));
					local8_Text_Str_1930 = ((((local8_Text_Str_1930) + ("};"))) + (func11_NewLine_Str()));
					if (local11_InWebWorker_1929) {
						local8_Text_Str_1930 = ((((((((((local8_Text_Str_1930) + (local3_Typ_ref_1937[0].attr8_Name_Str))) + (" = window['"))) + (local3_Typ_ref_1937[0].attr8_Name_Str))) + ("'];"))) + (func11_NewLine_Str()));
						
					};
					local5_typId_1938 = local3_Typ_ref_1937[0].attr2_ID;
					local5_First_1940 = 0;
					while ((((local5_typId_1938) != (-(1))) ? 1 : 0)) {
						var forEachSaver6396 = global8_Compiler.attr5_Types_ref[0].arrAccess(local5_typId_1938).values[tmpPositionCache][0].attr7_Methods;
						for(var forEachCounter6396 = 0 ; forEachCounter6396 < forEachSaver6396.values.length ; forEachCounter6396++) {
							var local3_Mth_1950 = forEachSaver6396.values[forEachCounter6396];
						{
								if (((((((local4_map2_1949).DoesKeyExist(global8_Compiler.attr5_Funcs_ref[0].arrAccess(local3_Mth_1950).values[tmpPositionCache][0].attr9_OName_Str)) ? 0 : 1)) && ((((global8_Compiler.attr5_Funcs_ref[0].arrAccess(local3_Mth_1950).values[tmpPositionCache][0].attr3_Scp) != (-(1))) ? 1 : 0))) ? 1 : 0)) {
									func8_IndentUp();
									local8_Text_Str_1930 = ((((((((((((local8_Text_Str_1930) + (local3_Typ_ref_1937[0].attr8_Name_Str))) + (".prototype."))) + (global8_Compiler.attr5_Funcs_ref[0].arrAccess(local3_Mth_1950).values[tmpPositionCache][0].attr9_OName_Str))) + (" = function() {"))) + (func11_NewLine_Str()))) + (" return "));
									local8_Text_Str_1930 = ((((((local8_Text_Str_1930) + ("this.vtbl."))) + (global8_Compiler.attr5_Funcs_ref[0].arrAccess(local3_Mth_1950).values[tmpPositionCache][0].attr9_OName_Str))) + ("("));
									{
										var local1_i_1951 = 0.0;
										for (local1_i_1951 = 0;toCheck(local1_i_1951, ((BOUNDS(global8_Compiler.attr5_Funcs_ref[0].arrAccess(local3_Mth_1950).values[tmpPositionCache][0].attr6_Params, 0)) - (2)), 1);local1_i_1951 += 1) {
											local8_Text_Str_1930 = ((((((local8_Text_Str_1930) + ("arguments["))) + (CAST2STRING(local1_i_1951)))) + ("], "));
											
										};
										
									};
									local8_Text_Str_1930 = ((local8_Text_Str_1930) + ("this"));
									func10_IndentDown();
									local8_Text_Str_1930 = ((((((((local8_Text_Str_1930) + (");"))) + (func11_NewLine_Str()))) + ("};"))) + (func11_NewLine_Str()));
									(local4_map2_1949).Put(global8_Compiler.attr5_Funcs_ref[0].arrAccess(local3_Mth_1950).values[tmpPositionCache][0].attr9_OName_Str, local3_Mth_1950);
									
								};
								
							}
							forEachSaver6396.values[forEachCounter6396] = local3_Mth_1950;
						
						};
						local5_typId_1938 = global8_Compiler.attr5_Types_ref[0].arrAccess(local5_typId_1938).values[tmpPositionCache][0].attr9_Extending;
						
					};
					
				}
				forEachSaver6407.values[forEachCounter6407] = local3_Typ_ref_1937;
			
			};
			var forEachSaver6466 = global8_Compiler.attr10_DataBlocks;
			for(var forEachCounter6466 = 0 ; forEachCounter6466 < forEachSaver6466.values.length ; forEachCounter6466++) {
				var local5_block_1952 = forEachSaver6466.values[forEachCounter6466];
			{
					var local4_Done_1953 = 0;
					local8_Text_Str_1930 = ((((((local8_Text_Str_1930) + ("var datablock_"))) + (local5_block_1952.attr8_Name_Str))) + (" = [ "));
					local4_Done_1953 = 0;
					var forEachSaver6458 = local5_block_1952.attr5_Datas;
					for(var forEachCounter6458 = 0 ; forEachCounter6458 < forEachSaver6458.values.length ; forEachCounter6458++) {
						var local1_d_1954 = forEachSaver6458.values[forEachCounter6458];
					{
							if (local4_Done_1953) {
								local8_Text_Str_1930 = ((local8_Text_Str_1930) + (", "));
								
							};
							local8_Text_Str_1930 = ((local8_Text_Str_1930) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(local1_d_1954).values[tmpPositionCache][0]))));
							local4_Done_1953 = 1;
							
						}
						forEachSaver6458.values[forEachCounter6458] = local1_d_1954;
					
					};
					local8_Text_Str_1930 = ((((local8_Text_Str_1930) + (" ];"))) + (func11_NewLine_Str()));
					
				}
				forEachSaver6466.values[forEachCounter6466] = local5_block_1952;
			
			};
			if ((((BOUNDS(global8_Compiler.attr7_Globals, 0)) > (0)) ? 1 : 0)) {
				local8_Text_Str_1930 = ((local8_Text_Str_1930) + ("var "));
				local8_Text_Str_1930 = ((local8_Text_Str_1930) + (func13_JSVariDef_Str(unref(global8_Compiler.attr7_Globals), 1, 0)));
				local8_Text_Str_1930 = ((((local8_Text_Str_1930) + (";"))) + (func11_NewLine_Str()));
				
			};
			if ((((TRIM_Str(local14_StaticText_Str_1931, " \t\r\n\v\f")) != ("")) ? 1 : 0)) {
				local8_Text_Str_1930 = ((((local8_Text_Str_1930) + ("// set default statics:"))) + (func11_NewLine_Str()));
				local8_Text_Str_1930 = ((local17_StaticDefText_Str_1932) + (local8_Text_Str_1930));
				func8_IndentUp();
				local8_Text_Str_1930 = ((((local8_Text_Str_1930) + ("window['initStatics'] = function() {"))) + (func11_NewLine_Str()));
				func10_IndentDown();
				local8_Text_Str_1930 = ((((local8_Text_Str_1930) + (local14_StaticText_Str_1931))) + (func11_NewLine_Str()));
				local8_Text_Str_1930 = ((((local8_Text_Str_1930) + ("}"))) + (func11_NewLine_Str()));
				
			} else {
				local8_Text_Str_1930 = ((((local8_Text_Str_1930) + ("window['initStatics'] = function() {}"))) + (func11_NewLine_Str()));
				
			};
			if (local11_InWebWorker_1929) {
				local8_Text_Str_1930 = ((((local8_Text_Str_1930) + ("initStatics = window['initStatics'];"))) + (func11_NewLine_Str()));
				
			};
			local8_Text_Str_1930 = ((((local8_Text_Str_1930) + ("for (var __init = 0; __init < preInitFuncs.length; __init++) preInitFuncs[__init]();"))) + (func11_NewLine_Str()));
			local8_Text_Str_1930 = ((((local8_Text_Str_1930) + ("delete preInitFuncs;"))) + (func11_NewLine_Str()));
			return tryClone(local8_Text_Str_1930);
			
		} catch (Err_Str) {
			if (Err_Str instanceof GLBException) Err_Str = Err_Str.getText(); else throwError(Err_Str);{
				
			}
		};
		
	};
	return "";
	
};
func16_JS_Generator_Str = window['func16_JS_Generator_Str'];
window['func14_JSGenerate_Str'] = function(param4_expr) {
	var __labels = {"Exit": 7825};
	
	var local8_Text_Str_1957 = "";
	var __pc = 6589;
	while(__pc >= 0) {
		switch(__pc) {
			case 6589:
				global8_Compiler.attr11_currentPosi = param4_expr.attr5_tokID;
				
			local8_Text_Str_1957 = "";
			
				var local16___SelectHelper7__1958 = 0;
				case 6599:
					local16___SelectHelper7__1958 = param4_expr.attr3_Typ;
					
				case 10847:
					if (!((((local16___SelectHelper7__1958) == (~~(2))) ? 1 : 0))) { __pc = 6601; break; }
				
				var local4_oScp_1959 = 0.0, local5_oFunc_1960 = 0.0, local13_oLabelDef_Str_1961 = "", local9_oIsInGoto_1962 = 0, local6_IsFunc_1963 = 0, local7_mngGoto_1964 = 0, local13_IsStackPusher_1965 = 0, local7_Def_Str_1969 = "", local8_ERes_Str_1972 = new GLBArray(), local13_FirstText_Str_1975 = "";
				case 6606:
					local4_oScp_1959 = global12_CurrentScope;
					
				local5_oFunc_1960 = global11_CurrentFunc;
				local13_oLabelDef_Str_1961 = global12_LabelDef_Str;
				local9_oIsInGoto_1962 = global8_IsInGoto;
				local6_IsFunc_1963 = 0;
				local7_mngGoto_1964 = 0;
				local13_IsStackPusher_1965 = 0;
				case 6652:
					if (!(((((((param4_expr.attr6_ScpTyp) == (2)) ? 1 : 0)) || ((((param4_expr.attr6_ScpTyp) == (4)) ? 1 : 0))) ? 1 : 0))) { __pc = 6647; break; }
				
				case 6651:
					local13_IsStackPusher_1965 = 1;
					
				
				
			case 6647: //dummy jumper1
				;
					
				case 6665:
					if (!((((func12_ScopeHasGoto(param4_expr)) && (local13_IsStackPusher_1965)) ? 1 : 0))) { __pc = 6657; break; }
				
				case 6661:
					local7_mngGoto_1964 = 1;
					
				global8_IsInGoto = 1;
				
				
			case 6657: //dummy jumper1
				;
					
				case 6702:
					if (!((((param4_expr.attr6_ScpTyp) == (2)) ? 1 : 0))) { __pc = 6671; break; }
				
				var local1_i_1966 = 0;
				case 6701:
					var forEachSaver6701 = global8_Compiler.attr5_Funcs_ref[0];
				var forEachCounter6701 = 0
				
			case 6679: //dummy for1
				if (!(forEachCounter6701 < forEachSaver6701.values.length)) {__pc = 6675; break;}
				var local4_Func_ref_1967 = forEachSaver6701.values[forEachCounter6701];
				
				
				case 6697:
					if (!((((local4_Func_ref_1967[0].attr3_Scp) == (param4_expr.attr2_ID)) ? 1 : 0))) { __pc = 6688; break; }
				
				case 6692:
					global11_CurrentFunc = local1_i_1966;
					
				local6_IsFunc_1963 = 1;
				case 6696:
					__pc = 6675; break;
					
				
				
			case 6688: //dummy jumper1
				;
					
				local1_i_1966+=1;
				
				forEachSaver6701.values[forEachCounter6701] = local4_Func_ref_1967;
				
				forEachCounter6701++
				__pc = 6679; break; //back jump
				
			case 6675: //dummy for
				;
					
				
				
			case 6671: //dummy jumper1
				;
					
				global12_CurrentScope = param4_expr.attr2_ID;
				case 6718:
					if (!((((((global8_IsInGoto) ? 0 : 1)) || (local7_mngGoto_1964)) ? 1 : 0))) { __pc = 6714; break; }
				
				case 6716:
					func8_IndentUp();
					
				
				__pc = 28684;
				break;
				
			case 6714: //dummy jumper1
				
				
				
			case 28684: //dummy jumper2
				;
					
				local8_Text_Str_1957 = ((local8_Text_Str_1957) + (func11_NewLine_Str()));
				case 6749:
					if (!((((global9_DEBUGMODE) && (local13_IsStackPusher_1965)) ? 1 : 0))) { __pc = 6727; break; }
				
				case 6740:
					local8_Text_Str_1957 = ((((((((local8_Text_Str_1957) + ("stackPush(\""))) + (func13_ScopeName_Str(param4_expr)))) + ("\", __debugInfo);"))) + (func11_NewLine_Str()));
					
				func8_IndentUp();
				local8_Text_Str_1957 = ((((local8_Text_Str_1957) + ("try {"))) + (func11_NewLine_Str()));
				
				
			case 6727: //dummy jumper1
				;
					
				case 6812:
					if (!((((local6_IsFunc_1963) && (global8_Compiler.attr5_Funcs_ref[0].arrAccess(global11_CurrentFunc).values[tmpPositionCache][0].attr15_UsedAsPrototype)) ? 1 : 0))) { __pc = 6759; break; }
				
				case 6811:
					var forEachSaver6811 = global8_Compiler.attr5_Funcs_ref[0].arrAccess(global11_CurrentFunc).values[tmpPositionCache][0].attr6_Params;
				var forEachCounter6811 = 0
				
			case 6770: //dummy for1
				if (!(forEachCounter6811 < forEachSaver6811.values.length)) {__pc = 6762; break;}
				var local1_P_1968 = forEachSaver6811.values[forEachCounter6811];
				
				
				case 6810:
					if (!((((global8_Compiler.attr5_Varis_ref[0].arrAccess(local1_P_1968).values[tmpPositionCache][0].attr3_ref) == (0)) ? 1 : 0))) { __pc = 6782; break; }
				
				case 6808:
					local8_Text_Str_1957 = ((((((((((local8_Text_Str_1957) + (global8_Compiler.attr5_Varis_ref[0].arrAccess(local1_P_1968).values[tmpPositionCache][0].attr8_Name_Str))) + (" = unref("))) + (global8_Compiler.attr5_Varis_ref[0].arrAccess(local1_P_1968).values[tmpPositionCache][0].attr8_Name_Str))) + (");"))) + (func11_NewLine_Str()));
					
				
				__pc = 28687;
				break;
				
			case 6782: //dummy jumper1
				
				
				
			case 28687: //dummy jumper2
				;
					
				
				forEachSaver6811.values[forEachCounter6811] = local1_P_1968;
				
				forEachCounter6811++
				__pc = 6770; break; //back jump
				
			case 6762: //dummy for
				;
					
				
				
			case 6759: //dummy jumper1
				;
					
				local7_Def_Str_1969 = func13_JSVariDef_Str(unref(param4_expr.attr5_Varis), 0, 1);
				case 6846:
					if (!((((TRIM_Str(local7_Def_Str_1969, " \t\r\n\v\f")) != ("")) ? 1 : 0))) { __pc = 6827; break; }
				
				case 6833:
					local8_Text_Str_1957 = ((local8_Text_Str_1957) + ("var "));
					
				local8_Text_Str_1957 = ((local8_Text_Str_1957) + (local7_Def_Str_1969));
				local8_Text_Str_1957 = ((((local8_Text_Str_1957) + (";"))) + (func11_NewLine_Str()));
				
				
			case 6827: //dummy jumper1
				;
					
				case 6924:
					if (!(((((((global11_CurrentFunc) != (-(1))) ? 1 : 0)) && ((((local5_oFunc_1960) == (-(1))) ? 1 : 0))) ? 1 : 0))) { __pc = 6859; break; }
				
				var local1_i_1970 = 0;
				case 6923:
					var forEachSaver6923 = global8_Compiler.attr5_Funcs_ref[0].arrAccess(global11_CurrentFunc).values[tmpPositionCache][0].attr6_Params;
				var forEachCounter6923 = 0
				
			case 6871: //dummy for1
				if (!(forEachCounter6923 < forEachSaver6923.values.length)) {__pc = 6863; break;}
				var local5_Param_1971 = forEachSaver6923.values[forEachCounter6923];
				
				
				case 6922:
					if (!((((global8_Compiler.attr5_Varis_ref[0].arrAccess(local5_Param_1971).values[tmpPositionCache][0].attr9_OwnerVari) != (-(1))) ? 1 : 0))) { __pc = 6884; break; }
				
				case 6918:
					local8_Text_Str_1957 = ((((((((((((local8_Text_Str_1957) + ("var "))) + (global8_Compiler.attr5_Varis_ref[0].arrAccess(global8_Compiler.attr5_Varis_ref[0].arrAccess(local5_Param_1971).values[tmpPositionCache][0].attr9_OwnerVari).values[tmpPositionCache][0].attr8_Name_Str))) + (" = ["))) + (global8_Compiler.attr5_Varis_ref[0].arrAccess(local5_Param_1971).values[tmpPositionCache][0].attr8_Name_Str))) + ("]; /* NEWCODEHERE */"))) + (func11_NewLine_Str()));
					
				local1_i_1970+=1;
				
				
			case 6884: //dummy jumper1
				;
					
				
				forEachSaver6923.values[forEachCounter6923] = local5_Param_1971;
				
				forEachCounter6923++
				__pc = 6871; break; //back jump
				
			case 6863: //dummy for
				;
					
				
				
			case 6859: //dummy jumper1
				;
					
				case 6931:
					if (!(local7_mngGoto_1964)) { __pc = 6926; break; }
				
				case 6928:
					func8_IndentUp();
					
				func8_IndentUp();
				func8_IndentUp();
				
				
			case 6926: //dummy jumper1
				;
					
				case 6963:
					var forEachSaver6963 = param4_expr.attr5_Exprs;
				var forEachCounter6963 = 0
				
			case 6938: //dummy for1
				if (!(forEachCounter6963 < forEachSaver6963.values.length)) {__pc = 6934; break;}
				var local2_Ex_1973 = forEachSaver6963.values[forEachCounter6963];
				
				
				var local7_add_Str_1974 = "";
				case 6945:
					local7_add_Str_1974 = func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(local2_Ex_1973).values[tmpPositionCache][0]));
					
				case 6962:
					if (!((((TRIM_Str(local7_add_Str_1974, " \t\r\n\v\f")) != ("")) ? 1 : 0))) { __pc = 6951; break; }
				
				case 6957:
					DIMPUSH(local8_ERes_Str_1972, CAST2STRING(local2_Ex_1973));
					
				DIMPUSH(local8_ERes_Str_1972, local7_add_Str_1974);
				
				
			case 6951: //dummy jumper1
				;
					
				
				forEachSaver6963.values[forEachCounter6963] = local2_Ex_1973;
				
				forEachCounter6963++
				__pc = 6938; break; //back jump
				
			case 6934: //dummy for
				;
					
				case 7020:
					if (!(local7_mngGoto_1964)) { __pc = 6965; break; }
				
				case 6967:
					func10_IndentDown();
					
				func10_IndentDown();
				func10_IndentDown();
				local8_Text_Str_1957 = ((local8_Text_Str_1957) + ("var __pc = "));
				case 6996:
					if (!((((BOUNDS(local8_ERes_Str_1972, 0)) > (0)) ? 1 : 0))) { __pc = 6981; break; }
				
				case 6989:
					local8_Text_Str_1957 = ((local8_Text_Str_1957) + (local8_ERes_Str_1972.arrAccess(0).values[tmpPositionCache]));
					
				
				__pc = 28694;
				break;
				
			case 6981: //dummy jumper1
				
				case 6995:
					local8_Text_Str_1957 = ((local8_Text_Str_1957) + ("0"));
					
				
				
			case 28694: //dummy jumper2
				;
					
				local8_Text_Str_1957 = ((((local8_Text_Str_1957) + (";"))) + (func11_NewLine_Str()));
				func8_IndentUp();
				local8_Text_Str_1957 = ((((local8_Text_Str_1957) + ("while(__pc >= 0) {"))) + (func11_NewLine_Str()));
				func8_IndentUp();
				local8_Text_Str_1957 = ((((local8_Text_Str_1957) + ("switch(__pc) {"))) + (func11_NewLine_Str()));
				
				
			case 6965: //dummy jumper1
				;
					
				local13_FirstText_Str_1975 = "";
				
				var local1_i_1976 = 0.0;
				case 7235:
					local1_i_1976 = 0
				
			case 7029: //dummy for1
				if (!toCheck(local1_i_1976, ((BOUNDS(local8_ERes_Str_1972, 0)) - (1)), 2)) {__pc = 7040; break;}
				
				var local7_add_Str_1977 = "", local2_Ex_1978 = 0, alias4_ExEx_ref_1979 = [new type4_Expr()], local7_HasCase_1980 = 0;
				case 7050:
					local7_add_Str_1977 = local8_ERes_Str_1972.arrAccess(~~(((local1_i_1976) + (1)))).values[tmpPositionCache];
					
				local2_Ex_1978 = INT2STR(local8_ERes_Str_1972.arrAccess(~~(local1_i_1976)).values[tmpPositionCache]);
				alias4_ExEx_ref_1979 = global5_Exprs_ref[0].arrAccess(local2_Ex_1978).values[tmpPositionCache] /* ALIAS */;
				local7_HasCase_1980 = 0;
				case 7159:
					if (!(((((((local7_mngGoto_1964) || (global8_IsInGoto)) ? 1 : 0)) && ((((((((((((((((((((((((((((((((((local1_i_1976) == (0)) ? 1 : 0)) || ((((alias4_ExEx_ref_1979[0].attr3_Typ) == (20)) ? 1 : 0))) ? 1 : 0)) || ((((alias4_ExEx_ref_1979[0].attr3_Typ) == (21)) ? 1 : 0))) ? 1 : 0)) || ((((alias4_ExEx_ref_1979[0].attr3_Typ) == (24)) ? 1 : 0))) ? 1 : 0)) || ((((alias4_ExEx_ref_1979[0].attr3_Typ) == (25)) ? 1 : 0))) ? 1 : 0)) || ((((alias4_ExEx_ref_1979[0].attr3_Typ) == (27)) ? 1 : 0))) ? 1 : 0)) || ((((alias4_ExEx_ref_1979[0].attr3_Typ) == (38)) ? 1 : 0))) ? 1 : 0)) || ((((alias4_ExEx_ref_1979[0].attr3_Typ) == (26)) ? 1 : 0))) ? 1 : 0)) || ((((alias4_ExEx_ref_1979[0].attr3_Typ) == (29)) ? 1 : 0))) ? 1 : 0)) || ((((alias4_ExEx_ref_1979[0].attr3_Typ) == (30)) ? 1 : 0))) ? 1 : 0)) || ((((local1_i_1976) == (((BOUNDS(local8_ERes_Str_1972, 0)) - (1)))) ? 1 : 0))) ? 1 : 0))) ? 1 : 0))) { __pc = 7141; break; }
				
				case 7143:
					func8_IndentUp();
					
				local7_HasCase_1980 = 1;
				local8_Text_Str_1957 = ((((((((local8_Text_Str_1957) + ("case "))) + (CAST2STRING(local2_Ex_1978)))) + (":"))) + (func11_NewLine_Str()));
				
				
			case 7141: //dummy jumper1
				;
					
				case 7212:
					if (!(global9_DEBUGMODE)) { __pc = 7161; break; }
				
				var local7_Add_Str_1981 = "";
				case 7194:
					local7_Add_Str_1981 = (((((((("__debugInfo = \"") + (CAST2STRING(global8_Compiler.attr6_Tokens.arrAccess(global5_Exprs_ref[0].arrAccess(local2_Ex_1978).values[tmpPositionCache][0].attr5_tokID).values[tmpPositionCache].attr4_Line_ref[0])))) + (":"))) + (global8_Compiler.attr6_Tokens.arrAccess(global5_Exprs_ref[0].arrAccess(local2_Ex_1978).values[tmpPositionCache][0].attr5_tokID).values[tmpPositionCache].attr8_Path_Str_ref[0]))) + ("\";"));
					
				local8_Text_Str_1957 = ((((local8_Text_Str_1957) + (local7_Add_Str_1981))) + (func11_NewLine_Str()));
				case 7211:
					if (!((((local13_FirstText_Str_1975) == ("")) ? 1 : 0))) { __pc = 7206; break; }
				
				case 7210:
					local13_FirstText_Str_1975 = local7_Add_Str_1981;
					
				
				
			case 7206: //dummy jumper1
				;
					
				
				
			case 7161: //dummy jumper1
				;
					
				local8_Text_Str_1957 = ((local8_Text_Str_1957) + (local7_add_Str_1977));
				local8_Text_Str_1957 = ((((local8_Text_Str_1957) + (";"))) + (func11_NewLine_Str()));
				case 7234:
					if (!(local7_HasCase_1980)) { __pc = 7226; break; }
				
				case 7228:
					func10_IndentDown();
					
				local8_Text_Str_1957 = ((local8_Text_Str_1957) + (func11_NewLine_Str()));
				
				
			case 7226: //dummy jumper1
				;
					
				
				local1_i_1976 += 2;
				__pc = 7029; break; //back jump
				
			case 7040: //dummy for
				;
					
				
				;
				case 7246:
					if (!((((local13_FirstText_Str_1975) != ("")) ? 1 : 0))) { __pc = 7239; break; }
				
				case 7245:
					local8_Text_Str_1957 = ((local8_Text_Str_1957) + (local13_FirstText_Str_1975));
					
				
				
			case 7239: //dummy jumper1
				;
					
				case 7307:
					if (!(local7_mngGoto_1964)) { __pc = 7248; break; }
				
				case 7256:
					local8_Text_Str_1957 = ((((local8_Text_Str_1957) + ("__pc = -1; break;"))) + (func11_NewLine_Str()));
					
				func8_IndentUp();
				local8_Text_Str_1957 = ((((local8_Text_Str_1957) + ("default:"))) + (func11_NewLine_Str()));
				func10_IndentDown();
				local8_Text_Str_1957 = ((((local8_Text_Str_1957) + ("throwError(\"Gotocounter exception pc: \"+__pc);"))) + (func11_NewLine_Str()));
				func10_IndentDown();
				local8_Text_Str_1957 = ((((local8_Text_Str_1957) + (func11_NewLine_Str()))) + ("}"));
				func10_IndentDown();
				local8_Text_Str_1957 = ((((local8_Text_Str_1957) + (func11_NewLine_Str()))) + ("}"));
				local8_Text_Str_1957 = (((((((("var __labels = {") + (func16_JSRemoveLast_Str(global12_LabelDef_Str, ", ")))) + ("};"))) + (func11_NewLine_Str()))) + (local8_Text_Str_1957));
				local8_Text_Str_1957 = ((func11_NewLine_Str()) + (local8_Text_Str_1957));
				
				
			case 7248: //dummy jumper1
				;
					
				case 7321:
					if (!((((((global8_IsInGoto) ? 0 : 1)) || (local7_mngGoto_1964)) ? 1 : 0))) { __pc = 7314; break; }
				
				case 7320:
					local8_Text_Str_1957 = (("{") + (local8_Text_Str_1957));
					
				
				
			case 7314: //dummy jumper1
				;
					
				case 7383:
					if (!((((global9_DEBUGMODE) && (local13_IsStackPusher_1965)) ? 1 : 0))) { __pc = 7325; break; }
				
				case 7327:
					func10_IndentDown();
					
				local8_Text_Str_1957 = ((((local8_Text_Str_1957) + (func11_NewLine_Str()))) + ("} catch(ex) {"));
				func8_IndentUp();
				local8_Text_Str_1957 = ((((local8_Text_Str_1957) + (func11_NewLine_Str()))) + ("if (isKnownException(ex)) throw ex;"));
				local8_Text_Str_1957 = ((((local8_Text_Str_1957) + (func11_NewLine_Str()))) + ("alert(formatError(ex));"));
				local8_Text_Str_1957 = ((((local8_Text_Str_1957) + (func11_NewLine_Str()))) + ("END();"));
				func10_IndentDown();
				local8_Text_Str_1957 = ((((local8_Text_Str_1957) + (func11_NewLine_Str()))) + ("} finally {"));
				func8_IndentUp();
				local8_Text_Str_1957 = ((((local8_Text_Str_1957) + (func11_NewLine_Str()))) + ("stackPop();"));
				func10_IndentDown();
				local8_Text_Str_1957 = ((((((local8_Text_Str_1957) + (func11_NewLine_Str()))) + ("}"))) + (func11_NewLine_Str()));
				
				
			case 7325: //dummy jumper1
				;
					
				case 7409:
					if (!((((((global8_IsInGoto) ? 0 : 1)) || (local7_mngGoto_1964)) ? 1 : 0))) { __pc = 7390; break; }
				
				case 7392:
					func10_IndentDown();
					
				local8_Text_Str_1957 = ((local8_Text_Str_1957) + (func11_NewLine_Str()));
				local8_Text_Str_1957 = ((local8_Text_Str_1957) + ("}"));
				
				__pc = 28703;
				break;
				
			case 7390: //dummy jumper1
				
				case 7408:
					local8_Text_Str_1957 = ((local8_Text_Str_1957) + (func11_NewLine_Str()));
					
				
				
			case 28703: //dummy jumper2
				;
					
				global12_CurrentScope = ~~(local4_oScp_1959);
				global11_CurrentFunc = ~~(local5_oFunc_1960);
				case 7427:
					if (!(local7_mngGoto_1964)) { __pc = 7419; break; }
				
				case 7423:
					global12_LabelDef_Str = local13_oLabelDef_Str_1961;
					
				global8_IsInGoto = local9_oIsInGoto_1962;
				
				
			case 7419: //dummy jumper1
				;
					
				
				__pc = 28679;
				break;
				
			case 6601: //dummy jumper1
				if (!((((local16___SelectHelper7__1958) == (~~(1))) ? 1 : 0))) { __pc = 7429; break; }
				
				var local7_Sym_Str_1982 = "", local10_HasToBeInt_1983 = 0.0;
				case 7439:
					local7_Sym_Str_1982 = global9_Operators_ref[0].arrAccess(param4_expr.attr2_Op).values[tmpPositionCache][0].attr7_Sym_Str;
					
				local10_HasToBeInt_1983 = 0;
				
				var local16___SelectHelper8__1984 = "";
				case 7448:
					local16___SelectHelper8__1984 = local7_Sym_Str_1982;
					
				case 7517:
					if (!((((local16___SelectHelper8__1984) == ("=")) ? 1 : 0))) { __pc = 7450; break; }
				
				case 7454:
					local7_Sym_Str_1982 = "==";
					
				local10_HasToBeInt_1983 = 1;
				
				
			case 7450: //dummy jumper1
				if (!((((local16___SelectHelper8__1984) == ("<>")) ? 1 : 0))) { __pc = 7460; break; }
				
				case 7464:
					local7_Sym_Str_1982 = "!=";
					
				local10_HasToBeInt_1983 = 1;
				
				
			case 7460: //dummy jumper1
				if (!((((local16___SelectHelper8__1984) == ("OR")) ? 1 : 0))) { __pc = 7470; break; }
				
				case 7474:
					local7_Sym_Str_1982 = "||";
					
				local10_HasToBeInt_1983 = 1;
				
				
			case 7470: //dummy jumper1
				if (!((((local16___SelectHelper8__1984) == ("AND")) ? 1 : 0))) { __pc = 7480; break; }
				
				case 7484:
					local7_Sym_Str_1982 = "&&";
					
				local10_HasToBeInt_1983 = 1;
				
				
			case 7480: //dummy jumper1
				if (!((((local16___SelectHelper8__1984) == ("<")) ? 1 : 0))) { __pc = 7490; break; }
				
				case 7495:
					local10_HasToBeInt_1983 = 1;
					
				
				
			case 7490: //dummy jumper1
				if (!((((local16___SelectHelper8__1984) == (">")) ? 1 : 0))) { __pc = 7497; break; }
				
				case 7502:
					local10_HasToBeInt_1983 = 1;
					
				
				
			case 7497: //dummy jumper1
				if (!((((local16___SelectHelper8__1984) == (">=")) ? 1 : 0))) { __pc = 7504; break; }
				
				case 7509:
					local10_HasToBeInt_1983 = 1;
					
				
				
			case 7504: //dummy jumper1
				if (!((((local16___SelectHelper8__1984) == ("<=")) ? 1 : 0))) { __pc = 7511; break; }
				
				case 7516:
					local10_HasToBeInt_1983 = 1;
					
				
				
			case 7511: //dummy jumper1
				;
					
				
				;
				case 7604:
					if (!(local10_HasToBeInt_1983)) { __pc = 7518; break; }
				
				case 7546:
					local8_Text_Str_1957 = ((((((((((((((local8_Text_Str_1957) + ("((("))) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr4_Left).values[tmpPositionCache][0]))))) + (") "))) + (local7_Sym_Str_1982))) + (" ("))) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr5_Right).values[tmpPositionCache][0]))))) + (")) ? 1 : 0)"));
					
				
				__pc = 28706;
				break;
				
			case 7518: //dummy jumper1
				
				var local5_l_Str_1985 = "";
				case 7555:
					local5_l_Str_1985 = func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr4_Left).values[tmpPositionCache][0]));
					
				case 7603:
					if (!(((((((local7_Sym_Str_1982) == ("-")) ? 1 : 0)) && ((((local5_l_Str_1985) == ("0")) ? 1 : 0))) ? 1 : 0))) { __pc = 7564; break; }
				
				case 7579:
					local8_Text_Str_1957 = ((((((local8_Text_Str_1957) + ("-("))) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr5_Right).values[tmpPositionCache][0]))))) + (")"));
					
				
				__pc = 28707;
				break;
				
			case 7564: //dummy jumper1
				
				case 7602:
					local8_Text_Str_1957 = ((((((((((((((local8_Text_Str_1957) + ("(("))) + (local5_l_Str_1985))) + (") "))) + (local7_Sym_Str_1982))) + (" ("))) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr5_Right).values[tmpPositionCache][0]))))) + ("))"));
					
				
				
			case 28707: //dummy jumper2
				;
					
				
				
			case 28706: //dummy jumper2
				;
					
				case 7641:
					if (!((((((((((local7_Sym_Str_1982) == ("/")) ? 1 : 0)) && ((((global5_Exprs_ref[0].arrAccess(param4_expr.attr4_Left).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str_ref[0]) == ("int")) ? 1 : 0))) ? 1 : 0)) && ((((global5_Exprs_ref[0].arrAccess(param4_expr.attr5_Right).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str_ref[0]) == ("int")) ? 1 : 0))) ? 1 : 0))) { __pc = 7632; break; }
				
				case 7640:
					local8_Text_Str_1957 = (((("CAST2INT(") + (local8_Text_Str_1957))) + (")"));
					
				
				
			case 7632: //dummy jumper1
				;
					
				
				__pc = 28679;
				break;
				
			case 7429: //dummy jumper1
				if (!((((local16___SelectHelper7__1958) == (~~(3))) ? 1 : 0))) { __pc = 7643; break; }
				
				case 7650:
					local8_Text_Str_1957 = CAST2STRING(param4_expr.attr6_intval);
					
				
				__pc = 28679;
				break;
				
			case 7643: //dummy jumper1
				if (!((((local16___SelectHelper7__1958) == (~~(4))) ? 1 : 0))) { __pc = 7652; break; }
				
				case 7659:
					local8_Text_Str_1957 = CAST2STRING(param4_expr.attr8_floatval);
					
				
				__pc = 28679;
				break;
				
			case 7652: //dummy jumper1
				if (!((((local16___SelectHelper7__1958) == (~~(5))) ? 1 : 0))) { __pc = 7661; break; }
				
				case 7667:
					local8_Text_Str_1957 = param4_expr.attr10_strval_Str;
					
				
				__pc = 28679;
				break;
				
			case 7661: //dummy jumper1
				if (!((((local16___SelectHelper7__1958) == (~~(6))) ? 1 : 0))) { __pc = 7669; break; }
				
				case 7876:
					if (!((((global8_Compiler.attr5_Funcs_ref[0].arrAccess(param4_expr.attr4_func).values[tmpPositionCache][0].attr3_Typ) == (3)) ? 1 : 0))) { __pc = 7682; break; }
				
				var local1_P_1986 = 0, alias2_Ex_ref_1987 = [new type4_Expr()];
				case 7692:
					local1_P_1986 = param4_expr.attr6_Params.arrAccess(-(1)).values[tmpPositionCache];
					
				alias2_Ex_ref_1987 = global5_Exprs_ref[0].arrAccess(local1_P_1986).values[tmpPositionCache] /* ALIAS */;
				case 7855:
					if (!((((alias2_Ex_ref_1987[0].attr3_Typ) == (53)) ? 1 : 0))) { __pc = 7703; break; }
				
				var local5_Found_1988 = 0, local5_typId_1989 = 0;
				case 7726:
					if (!(((func6_IsType(unref(alias2_Ex_ref_1987[0].attr8_datatype.attr8_Name_Str_ref[0]))) ? 0 : 1))) { __pc = 7712; break; }
				
				case 7725:
					func5_Error((((("Internal error (Unable to find '") + (alias2_Ex_ref_1987[0].attr8_datatype.attr8_Name_Str_ref[0]))) + ("')")), 522, "src\CompilerPasses\Generator\JSGenerator.gbas");
					
				
				
			case 7712: //dummy jumper1
				;
					
				local5_Found_1988 = 0;
				local5_typId_1989 = global8_LastType.attr2_ID;
				case 7824:
					if (!((((local5_typId_1989) != (-(1))) ? 1 : 0))) {__pc = 28712; break;}
				
				case 7814:
					var forEachSaver7814 = global8_Compiler.attr5_Types_ref[0].arrAccess(local5_typId_1989).values[tmpPositionCache][0].attr7_Methods;
				var forEachCounter7814 = 0
				
			case 7754: //dummy for1
				if (!(forEachCounter7814 < forEachSaver7814.values.length)) {__pc = 7746; break;}
				var local3_Mth_1990 = forEachSaver7814.values[forEachCounter7814];
				
				
				case 7813:
					if (!((((global8_Compiler.attr5_Funcs_ref[0].arrAccess(local3_Mth_1990).values[tmpPositionCache][0].attr9_OName_Str) == (global8_Compiler.attr5_Funcs_ref[0].arrAccess(param4_expr.attr4_func).values[tmpPositionCache][0].attr9_OName_Str)) ? 1 : 0))) { __pc = 7773; break; }
				
				var local10_Params_Str_1991 = "";
				case 7782:
					local10_Params_Str_1991 = func17_JSDoParameter_Str(param4_expr, param4_expr.attr4_func, 0);
					
				case 7794:
					if (!((((local10_Params_Str_1991) != ("")) ? 1 : 0))) { __pc = 7787; break; }
				
				case 7793:
					local10_Params_Str_1991 = ((local10_Params_Str_1991) + (", "));
					
				
				
			case 7787: //dummy jumper1
				;
					
				local8_Text_Str_1957 = ((((((((local8_Text_Str_1957) + (global8_Compiler.attr5_Funcs_ref[0].arrAccess(local3_Mth_1990).values[tmpPositionCache][0].attr8_Name_Str))) + ("("))) + (local10_Params_Str_1991))) + ("param4_self)"));
				case 7812:
					__pc = __labels["Exit"]; break;
					
				
				
			case 7773: //dummy jumper1
				;
					
				
				forEachSaver7814.values[forEachCounter7814] = local3_Mth_1990;
				
				forEachCounter7814++
				__pc = 7754; break; //back jump
				
			case 7746: //dummy for
				;
					
				local5_typId_1989 = global8_Compiler.attr5_Types_ref[0].arrAccess(local5_typId_1989).values[tmpPositionCache][0].attr9_Extending;
				
				__pc = 7824; break; //back jump
				
			case 28712:
				;
					
				case 7825:
					//label: Exit;
					
				
				__pc = 28710;
				break;
				
			case 7703: //dummy jumper1
				
				case 7854:
					local8_Text_Str_1957 = ((((((((((local8_Text_Str_1957) + ("("))) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(local1_P_1986).values[tmpPositionCache][0]))))) + (")."))) + (global8_Compiler.attr5_Funcs_ref[0].arrAccess(param4_expr.attr4_func).values[tmpPositionCache][0].attr9_OName_Str))) + (func17_JSDoParameter_Str(param4_expr, param4_expr.attr4_func, 1)));
					
				
				
			case 28710: //dummy jumper2
				;
					
				
				__pc = 28709;
				break;
				
			case 7682: //dummy jumper1
				
				case 7875:
					local8_Text_Str_1957 = ((((local8_Text_Str_1957) + (global8_Compiler.attr5_Funcs_ref[0].arrAccess(param4_expr.attr4_func).values[tmpPositionCache][0].attr8_Name_Str))) + (func17_JSDoParameter_Str(param4_expr, param4_expr.attr4_func, 1)));
					
				
				
			case 28709: //dummy jumper2
				;
					
				
				__pc = 28679;
				break;
				
			case 7669: //dummy jumper1
				if (!((((local16___SelectHelper7__1958) == (~~(23))) ? 1 : 0))) { __pc = 7878; break; }
				
				case 7895:
					local8_Text_Str_1957 = ((((local8_Text_Str_1957) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr4_expr).values[tmpPositionCache][0]))))) + (func17_JSDoParameter_Str(param4_expr, -(1), 1)));
					
				
				__pc = 28679;
				break;
				
			case 7878: //dummy jumper1
				if (!((((local16___SelectHelper7__1958) == (~~(9))) ? 1 : 0))) { __pc = 7897; break; }
				
				case 7911:
					local8_Text_Str_1957 = ((local8_Text_Str_1957) + (global8_Compiler.attr5_Varis_ref[0].arrAccess(param4_expr.attr4_vari).values[tmpPositionCache][0].attr8_Name_Str));
					
				case 7928:
					if (!(global8_Compiler.attr5_Varis_ref[0].arrAccess(param4_expr.attr4_vari).values[tmpPositionCache][0].attr3_ref)) { __pc = 7921; break; }
				
				case 7927:
					local8_Text_Str_1957 = ((local8_Text_Str_1957) + ("[0]"));
					
				
				
			case 7921: //dummy jumper1
				;
					
				
				__pc = 28679;
				break;
				
			case 7897: //dummy jumper1
				if (!((((local16___SelectHelper7__1958) == (~~(13))) ? 1 : 0))) { __pc = 7930; break; }
				
				case 7941:
					local8_Text_Str_1957 = ((local8_Text_Str_1957) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr5_array).values[tmpPositionCache][0]))));
					
				case 8028:
					if (!((((BOUNDS(param4_expr.attr4_dims, 0)) != (0)) ? 1 : 0))) { __pc = 7950; break; }
				
				var local1_s_1992 = 0, local7_Add_Str_1993 = "";
				case 7956:
					local8_Text_Str_1957 = ((local8_Text_Str_1957) + (".arrAccess("));
					
				local1_s_1992 = 0;
				local7_Add_Str_1993 = "";
				case 8020:
					var forEachSaver8020 = param4_expr.attr4_dims;
				var forEachCounter8020 = 0
				
			case 7971: //dummy for1
				if (!(forEachCounter8020 < forEachSaver8020.values.length)) {__pc = 7967; break;}
				var local1_d_1994 = forEachSaver8020.values[forEachCounter8020];
				
				
				var local1_v_1995 = 0;
				case 7981:
					if (!(local1_s_1992)) { __pc = 7974; break; }
				
				case 7980:
					local8_Text_Str_1957 = ((local8_Text_Str_1957) + (", "));
					
				
				
			case 7974: //dummy jumper1
				;
					
				local8_Text_Str_1957 = ((local8_Text_Str_1957) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(local1_d_1994).values[tmpPositionCache][0]))));
				local1_s_1992 = 1;
				local1_v_1995 = func11_GetVariable(param4_expr.attr5_array, 0);
				case 8019:
					if (!(((((((local1_v_1995) != (-(1))) ? 1 : 0)) && (global8_Compiler.attr5_Varis_ref[0].arrAccess(local1_v_1995).values[tmpPositionCache][0].attr3_ref)) ? 1 : 0))) { __pc = 8014; break; }
				
				case 8018:
					local7_Add_Str_1993 = "[0]";
					
				
				
			case 8014: //dummy jumper1
				;
					
				
				forEachSaver8020.values[forEachCounter8020] = local1_d_1994;
				
				forEachCounter8020++
				__pc = 7971; break; //back jump
				
			case 7967: //dummy for
				;
					
				local8_Text_Str_1957 = ((((local8_Text_Str_1957) + (").values[tmpPositionCache]"))) + (local7_Add_Str_1993));
				
				
			case 7950: //dummy jumper1
				;
					
				
				__pc = 28679;
				break;
				
			case 7930: //dummy jumper1
				if (!((((local16___SelectHelper7__1958) == (~~(10))) ? 1 : 0))) { __pc = 8030; break; }
				
				case 8043:
					local8_Text_Str_1957 = ((((local8_Text_Str_1957) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr4_vari).values[tmpPositionCache][0]))))) + (" = "));
					
				local8_Text_Str_1957 = ((local8_Text_Str_1957) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr5_Right).values[tmpPositionCache][0]))));
				case 8103:
					if (!((((global5_Exprs_ref[0].arrAccess(param4_expr.attr4_vari).values[tmpPositionCache][0].attr8_datatype.attr7_IsArray_ref[0]) || (func6_IsType(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr4_vari).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str_ref[0])))) ? 1 : 0))) { __pc = 8074; break; }
				
				case 8102:
					if (!(((((((global5_Exprs_ref[0].arrAccess(param4_expr.attr5_Right).values[tmpPositionCache][0].attr3_Typ) != (35)) ? 1 : 0)) && ((((global5_Exprs_ref[0].arrAccess(param4_expr.attr5_Right).values[tmpPositionCache][0].attr3_Typ) != (36)) ? 1 : 0))) ? 1 : 0))) { __pc = 8095; break; }
				
				case 8101:
					local8_Text_Str_1957 = ((local8_Text_Str_1957) + (".clone(/* In Assign */)"));
					
				
				
			case 8095: //dummy jumper1
				;
					
				
				
			case 8074: //dummy jumper1
				;
					
				
				__pc = 28679;
				break;
				
			case 8030: //dummy jumper1
				if (!((((local16___SelectHelper7__1958) == (~~(11))) ? 1 : 0))) { __pc = 8105; break; }
				
				var local1_v_1996 = 0, local6_hasRef_1997 = 0, local4_Find_1998 = 0;
				case 8113:
					local1_v_1996 = func11_GetVariable(param4_expr.attr5_array, 0);
					
				local6_hasRef_1997 = 0;
				case 8138:
					if (!(((((((local1_v_1996) == (-(1))) ? 1 : 0)) || (global8_Compiler.attr5_Varis_ref[0].arrAccess(local1_v_1996).values[tmpPositionCache][0].attr3_ref)) ? 1 : 0))) { __pc = 8133; break; }
				
				case 8137:
					local6_hasRef_1997 = 1;
					
				
				
			case 8133: //dummy jumper1
				;
					
				local8_Text_Str_1957 = ((((((local8_Text_Str_1957) + ("DIM("))) + (func14_JSTryUnref_Str(param4_expr.attr5_array)))) + (", ["));
				local4_Find_1998 = 0;
				case 8185:
					var forEachSaver8185 = param4_expr.attr4_dims;
				var forEachCounter8185 = 0
				
			case 8161: //dummy for1
				if (!(forEachCounter8185 < forEachSaver8185.values.length)) {__pc = 8157; break;}
				var local1_D_1999 = forEachSaver8185.values[forEachCounter8185];
				
				
				case 8173:
					if (!((((local4_Find_1998) == (1)) ? 1 : 0))) { __pc = 8166; break; }
				
				case 8172:
					local8_Text_Str_1957 = ((local8_Text_Str_1957) + (", "));
					
				
				
			case 8166: //dummy jumper1
				;
					
				local8_Text_Str_1957 = ((local8_Text_Str_1957) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(local1_D_1999).values[tmpPositionCache][0]))));
				local4_Find_1998 = 1;
				
				forEachSaver8185.values[forEachCounter8185] = local1_D_1999;
				
				forEachCounter8185++
				__pc = 8161; break; //back jump
				
			case 8157: //dummy for
				;
					
				local8_Text_Str_1957 = ((((((local8_Text_Str_1957) + ("], "))) + (func21_JSGetDefaultValue_Str(global5_Exprs_ref[0].arrAccess(param4_expr.attr5_array).values[tmpPositionCache][0].attr8_datatype, local6_hasRef_1997, 1)))) + (")"));
				
				__pc = 28679;
				break;
				
			case 8105: //dummy jumper1
				if (!((((local16___SelectHelper7__1958) == (~~(12))) ? 1 : 0))) { __pc = 8205; break; }
				
				var local1_v_2000 = 0, local6_hasRef_2001 = 0, local4_Find_2002 = 0;
				case 8213:
					local1_v_2000 = func11_GetVariable(param4_expr.attr5_array, 0);
					
				local6_hasRef_2001 = 0;
				case 8238:
					if (!(((((((local1_v_2000) == (-(1))) ? 1 : 0)) || (global8_Compiler.attr5_Varis_ref[0].arrAccess(local1_v_2000).values[tmpPositionCache][0].attr3_ref)) ? 1 : 0))) { __pc = 8233; break; }
				
				case 8237:
					local6_hasRef_2001 = 1;
					
				
				
			case 8233: //dummy jumper1
				;
					
				local8_Text_Str_1957 = ((((((local8_Text_Str_1957) + ("REDIM("))) + (func14_JSTryUnref_Str(param4_expr.attr5_array)))) + (", ["));
				local4_Find_2002 = 0;
				case 8285:
					var forEachSaver8285 = param4_expr.attr4_dims;
				var forEachCounter8285 = 0
				
			case 8261: //dummy for1
				if (!(forEachCounter8285 < forEachSaver8285.values.length)) {__pc = 8257; break;}
				var local1_D_2003 = forEachSaver8285.values[forEachCounter8285];
				
				
				case 8273:
					if (!((((local4_Find_2002) == (1)) ? 1 : 0))) { __pc = 8266; break; }
				
				case 8272:
					local8_Text_Str_1957 = ((local8_Text_Str_1957) + (", "));
					
				
				
			case 8266: //dummy jumper1
				;
					
				local8_Text_Str_1957 = ((local8_Text_Str_1957) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(local1_D_2003).values[tmpPositionCache][0]))));
				local4_Find_2002 = 1;
				
				forEachSaver8285.values[forEachCounter8285] = local1_D_2003;
				
				forEachCounter8285++
				__pc = 8261; break; //back jump
				
			case 8257: //dummy for
				;
					
				local8_Text_Str_1957 = ((((((local8_Text_Str_1957) + ("], "))) + (func21_JSGetDefaultValue_Str(global5_Exprs_ref[0].arrAccess(param4_expr.attr5_array).values[tmpPositionCache][0].attr8_datatype, local6_hasRef_2001, 1)))) + (" )"));
				
				__pc = 28679;
				break;
				
			case 8205: //dummy jumper1
				if (!((((local16___SelectHelper7__1958) == (~~(15))) ? 1 : 0))) { __pc = 8305; break; }
				
				var local4_cast_2004 = 0;
				case 8309:
					local4_cast_2004 = 1;
					
				case 8367:
					if (!((((global5_Exprs_ref[0].arrAccess(param4_expr.attr4_expr).values[tmpPositionCache][0].attr3_Typ) == (4)) ? 1 : 0))) { __pc = 8320; break; }
				
				var local5_f_Str_2005 = "";
				case 8325:
					local4_cast_2004 = 0;
					
				local5_f_Str_2005 = ((CAST2STRING(global5_Exprs_ref[0].arrAccess(param4_expr.attr4_expr).values[tmpPositionCache][0].attr8_floatval)) + (""));
				
				var local1_i_2006 = 0.0;
				case 8366:
					local1_i_2006 = 0
				
			case 8343: //dummy for1
				if (!toCheck(local1_i_2006, (((local5_f_Str_2005).length) - (1)), 1)) {__pc = 8350; break;}
				
				case 8365:
					if (!((((CAST2STRING(ASC(local5_f_Str_2005, ~~(local1_i_2006)))) == (CHR_Str(INT2STR(".")))) ? 1 : 0))) { __pc = 8359; break; }
				
				case 8363:
					local4_cast_2004 = 1;
					
				case 8364:
					__pc = 8350; break;
					
				
				
			case 8359: //dummy jumper1
				;
					
				
				local1_i_2006 += 1;
				__pc = 8343; break; //back jump
				
			case 8350: //dummy for
				;
					
				
				;
				
				
			case 8320: //dummy jumper1
				;
					
				case 8457:
					if (!(local4_cast_2004)) { __pc = 8369; break; }
				
				case 8380:
					
				var local16___SelectHelper9__2007 = "";
				case 8382:
					local16___SelectHelper9__2007 = global5_Exprs_ref[0].arrAccess(param4_expr.attr4_expr).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str_ref[0];
					
				case 8445:
					if (!((((local16___SelectHelper9__2007) == ("int")) ? 1 : 0))) { __pc = 8384; break; }
				
				case 8395:
					local8_Text_Str_1957 = ((local8_Text_Str_1957) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr4_expr).values[tmpPositionCache][0]))));
					
				
				__pc = 28728;
				break;
				
			case 8384: //dummy jumper1
				if (!((((local16___SelectHelper9__2007) == ("float")) ? 1 : 0))) { __pc = 8397; break; }
				
				case 8412:
					local8_Text_Str_1957 = ((((((local8_Text_Str_1957) + ("~~("))) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr4_expr).values[tmpPositionCache][0]))))) + (")"));
					
				
				__pc = 28728;
				break;
				
			case 8397: //dummy jumper1
				if (!((((local16___SelectHelper9__2007) == ("string")) ? 1 : 0))) { __pc = 8414; break; }
				
				case 8429:
					local8_Text_Str_1957 = ((((((local8_Text_Str_1957) + ("INT2STR("))) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr4_expr).values[tmpPositionCache][0]))))) + (")"));
					
				
				__pc = 28728;
				break;
				
			case 8414: //dummy jumper1
				
				case 8444:
					local8_Text_Str_1957 = ((((((local8_Text_Str_1957) + ("CAST2INT("))) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr4_expr).values[tmpPositionCache][0]))))) + (")"));
					
				
				
			case 28728: //dummy jumper2
				;
					
				
				;
					
				
				__pc = 28727;
				break;
				
			case 8369: //dummy jumper1
				
				case 8456:
					local8_Text_Str_1957 = ((local8_Text_Str_1957) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr4_expr).values[tmpPositionCache][0]))));
					
				
				
			case 28727: //dummy jumper2
				;
					
				
				__pc = 28679;
				break;
				
			case 8305: //dummy jumper1
				if (!((((local16___SelectHelper7__1958) == (~~(16))) ? 1 : 0))) { __pc = 8459; break; }
				
				case 8554:
					if (!((((global5_Exprs_ref[0].arrAccess(param4_expr.attr4_expr).values[tmpPositionCache][0].attr3_Typ) == (3)) ? 1 : 0))) { __pc = 8470; break; }
				
				case 8481:
					local8_Text_Str_1957 = ((local8_Text_Str_1957) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr4_expr).values[tmpPositionCache][0]))));
					
				
				__pc = 28729;
				break;
				
			case 8470: //dummy jumper1
				
				case 8492:
					
				var local17___SelectHelper10__2008 = "";
				case 8494:
					local17___SelectHelper10__2008 = global5_Exprs_ref[0].arrAccess(param4_expr.attr4_expr).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str_ref[0];
					
				case 8553:
					if (!((((local17___SelectHelper10__2008) == ("int")) ? 1 : 0))) { __pc = 8496; break; }
				
				case 8507:
					local8_Text_Str_1957 = ((local8_Text_Str_1957) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr4_expr).values[tmpPositionCache][0]))));
					
				
				__pc = 28730;
				break;
				
			case 8496: //dummy jumper1
				if (!((((local17___SelectHelper10__2008) == ("float")) ? 1 : 0))) { __pc = 8509; break; }
				
				case 8520:
					local8_Text_Str_1957 = ((local8_Text_Str_1957) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr4_expr).values[tmpPositionCache][0]))));
					
				
				__pc = 28730;
				break;
				
			case 8509: //dummy jumper1
				if (!((((local17___SelectHelper10__2008) == ("string")) ? 1 : 0))) { __pc = 8522; break; }
				
				case 8537:
					local8_Text_Str_1957 = ((((((local8_Text_Str_1957) + ("FLOAT2STR("))) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr4_expr).values[tmpPositionCache][0]))))) + (")"));
					
				
				__pc = 28730;
				break;
				
			case 8522: //dummy jumper1
				
				case 8552:
					local8_Text_Str_1957 = ((((((local8_Text_Str_1957) + ("CAST2FLOAT("))) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr4_expr).values[tmpPositionCache][0]))))) + (")"));
					
				
				
			case 28730: //dummy jumper2
				;
					
				
				;
					
				
				
			case 28729: //dummy jumper2
				;
					
				
				__pc = 28679;
				break;
				
			case 8459: //dummy jumper1
				if (!((((local16___SelectHelper7__1958) == (~~(17))) ? 1 : 0))) { __pc = 8556; break; }
				
				case 8571:
					local8_Text_Str_1957 = ((((((local8_Text_Str_1957) + ("CAST2STRING("))) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr4_expr).values[tmpPositionCache][0]))))) + (")"));
					
				
				__pc = 28679;
				break;
				
			case 8556: //dummy jumper1
				if (!((((local16___SelectHelper7__1958) == (~~(18))) ? 1 : 0))) { __pc = 8573; break; }
				
				case 8593:
					local8_Text_Str_1957 = ((((((local8_Text_Str_1957) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr4_expr).values[tmpPositionCache][0]))))) + ("."))) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr8_nextExpr).values[tmpPositionCache][0]))));
					
				
				__pc = 28679;
				break;
				
			case 8573: //dummy jumper1
				if (!((((local16___SelectHelper7__1958) == (~~(19))) ? 1 : 0))) { __pc = 8595; break; }
				
				var local1_F_2009 = 0;
				case 8600:
					local1_F_2009 = 0;
					
				
				var local17___SelectHelper11__2010 = 0;
				case 8611:
					local17___SelectHelper11__2010 = global5_Exprs_ref[0].arrAccess(param4_expr.attr4_expr).values[tmpPositionCache][0].attr3_Typ;
					
				case 8630:
					if (!((((local17___SelectHelper11__2010) == (~~(3))) ? 1 : 0))) { __pc = 8613; break; }
				
				case 8617:
					local1_F_2009 = 1;
					
				
				
			case 8613: //dummy jumper1
				if (!((((local17___SelectHelper11__2010) == (~~(4))) ? 1 : 0))) { __pc = 8619; break; }
				
				case 8623:
					local1_F_2009 = 1;
					
				
				
			case 8619: //dummy jumper1
				if (!((((local17___SelectHelper11__2010) == (~~(5))) ? 1 : 0))) { __pc = 8625; break; }
				
				case 8629:
					local1_F_2009 = 1;
					
				
				
			case 8625: //dummy jumper1
				;
					
				
				;
				case 8657:
					if (!(local1_F_2009)) { __pc = 8632; break; }
				
				case 8643:
					local8_Text_Str_1957 = ((((local8_Text_Str_1957) + ("return "))) + (func14_JSTryUnref_Str(param4_expr.attr4_expr)));
					
				
				__pc = 28732;
				break;
				
			case 8632: //dummy jumper1
				
				case 8656:
					local8_Text_Str_1957 = ((((((local8_Text_Str_1957) + ("return tryClone("))) + (func14_JSTryUnref_Str(param4_expr.attr4_expr)))) + (")"));
					
				
				
			case 28732: //dummy jumper2
				;
					
				
				__pc = 28679;
				break;
				
			case 8595: //dummy jumper1
				if (!((((local16___SelectHelper7__1958) == (~~(22))) ? 1 : 0))) { __pc = 8659; break; }
				
				var local8_Name_Str_2011 = "", local5_Found_2012 = 0;
				case 8670:
					local8_Name_Str_2011 = REPLACE_Str(unref(param4_expr.attr8_datatype.attr8_Name_Str_ref[0]), "$", "_Str");
					
				case 8699:
					var forEachSaver8699 = global8_Compiler.attr5_Funcs_ref[0];
				var forEachCounter8699 = 0
				
			case 8678: //dummy for1
				if (!(forEachCounter8699 < forEachSaver8699.values.length)) {__pc = 8674; break;}
				var local4_Func_ref_2013 = forEachSaver8699.values[forEachCounter8699];
				
				
				case 8698:
					if (!((((local4_Func_ref_2013[0].attr9_OName_Str) == (local8_Name_Str_2011)) ? 1 : 0))) { __pc = 8685; break; }
				
				case 8693:
					local8_Text_Str_1957 = ((local8_Text_Str_1957) + (local4_Func_ref_2013[0].attr8_Name_Str));
					
				local5_Found_2012 = 1;
				case 8697:
					__pc = 8674; break;
					
				
				
			case 8685: //dummy jumper1
				;
					
				
				forEachSaver8699.values[forEachCounter8699] = local4_Func_ref_2013;
				
				forEachCounter8699++
				__pc = 8678; break; //back jump
				
			case 8674: //dummy for
				;
					
				case 8709:
					if (!(((local5_Found_2012) ? 0 : 1))) { __pc = 8702; break; }
				
				case 8708:
					local8_Text_Str_1957 = ((local8_Text_Str_1957) + (local8_Name_Str_2011));
					
				
				
			case 8702: //dummy jumper1
				;
					
				
				__pc = 28679;
				break;
				
			case 8659: //dummy jumper1
				if (!((((local16___SelectHelper7__1958) == (~~(24))) ? 1 : 0))) { __pc = 8711; break; }
				
				case 8974:
					if (!(global8_IsInGoto)) { __pc = 8714; break; }
				
				var local5_dummy_2014 = 0;
				case 8718:
					local5_dummy_2014 = global11_LastDummyID;
					
				global11_LastDummyID+=1;
				
				var local1_i_2015 = 0.0;
				case 8835:
					local1_i_2015 = 0
				
			case 8727: //dummy for1
				if (!toCheck(local1_i_2015, ((BOUNDS(param4_expr.attr10_Conditions, 0)) - (1)), 1)) {__pc = 8738; break;}
				
				case 8768:
					local8_Text_Str_1957 = ((((((((((((local8_Text_Str_1957) + ("if (!("))) + (func23_ConditionJSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr10_Conditions.arrAccess(~~(local1_i_2015)).values[tmpPositionCache]).values[tmpPositionCache][0]))))) + (")) { __pc = "))) + (CAST2STRING(param4_expr.attr10_Conditions.arrAccess(~~(local1_i_2015)).values[tmpPositionCache])))) + ("; break; }"))) + (func11_NewLine_Str()));
					
				local8_Text_Str_1957 = ((local8_Text_Str_1957) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr6_Scopes.arrAccess(~~(local1_i_2015)).values[tmpPositionCache]).values[tmpPositionCache][0]))));
				case 8810:
					if (!((((param4_expr.attr9_elseScope) != (-(1))) ? 1 : 0))) { __pc = 8789; break; }
				
				case 8802:
					local8_Text_Str_1957 = ((((((((local8_Text_Str_1957) + ("__pc = "))) + (CAST2STRING(local5_dummy_2014)))) + (";"))) + (func11_NewLine_Str()));
					
				local8_Text_Str_1957 = ((((local8_Text_Str_1957) + ("break;"))) + (func11_NewLine_Str()));
				
				
			case 8789: //dummy jumper1
				;
					
				func10_IndentDown();
				local8_Text_Str_1957 = ((local8_Text_Str_1957) + (func11_NewLine_Str()));
				func8_IndentUp();
				local8_Text_Str_1957 = ((((((((local8_Text_Str_1957) + ("case "))) + (CAST2STRING(param4_expr.attr10_Conditions.arrAccess(~~(local1_i_2015)).values[tmpPositionCache])))) + (": //dummy jumper1"))) + (func11_NewLine_Str()));
				
				local1_i_2015 += 1;
				__pc = 8727; break; //back jump
				
			case 8738: //dummy for
				;
					
				
				;
				case 8874:
					if (!((((param4_expr.attr9_elseScope) != (-(1))) ? 1 : 0))) { __pc = 8843; break; }
				
				case 8854:
					local8_Text_Str_1957 = ((local8_Text_Str_1957) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr9_elseScope).values[tmpPositionCache][0]))));
					
				func10_IndentDown();
				local8_Text_Str_1957 = ((local8_Text_Str_1957) + (func11_NewLine_Str()));
				func8_IndentUp();
				local8_Text_Str_1957 = ((((((((local8_Text_Str_1957) + ("case "))) + (CAST2STRING(local5_dummy_2014)))) + (": //dummy jumper2"))) + (func11_NewLine_Str()));
				
				
			case 8843: //dummy jumper1
				;
					
				
				__pc = 28735;
				break;
				
			case 8714: //dummy jumper1
				
				var local8_IsSwitch_2016 = 0;
				case 8879:
					local8_IsSwitch_2016 = 0;
					
				case 8973:
					if (!(local8_IsSwitch_2016)) { __pc = 8882; break; }
				
				
				__pc = 28738;
				break;
				
			case 8882: //dummy jumper1
				
				case 8885:
					
				var local1_i_2017 = 0.0;
				case 8950:
					local1_i_2017 = 0
				
			case 8889: //dummy for1
				if (!toCheck(local1_i_2017, ((BOUNDS(param4_expr.attr10_Conditions, 0)) - (1)), 1)) {__pc = 8900; break;}
				
				case 8919:
					if (!((((local1_i_2017) == (0)) ? 1 : 0))) { __pc = 8906; break; }
				
				case 8912:
					local8_Text_Str_1957 = ((local8_Text_Str_1957) + ("if"));
					
				
				__pc = 28739;
				break;
				
			case 8906: //dummy jumper1
				
				case 8918:
					local8_Text_Str_1957 = ((local8_Text_Str_1957) + (" else if"));
					
				
				
			case 28739: //dummy jumper2
				;
					
				local8_Text_Str_1957 = ((((((local8_Text_Str_1957) + (" ("))) + (func23_ConditionJSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr10_Conditions.arrAccess(~~(local1_i_2017)).values[tmpPositionCache]).values[tmpPositionCache][0]))))) + (") "));
				local8_Text_Str_1957 = ((local8_Text_Str_1957) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr6_Scopes.arrAccess(~~(local1_i_2017)).values[tmpPositionCache]).values[tmpPositionCache][0]))));
				
				local1_i_2017 += 1;
				__pc = 8889; break; //back jump
				
			case 8900: //dummy for
				;
					
				
				;
					
				case 8972:
					if (!((((param4_expr.attr9_elseScope) != (-(1))) ? 1 : 0))) { __pc = 8958; break; }
				
				case 8971:
					local8_Text_Str_1957 = ((((local8_Text_Str_1957) + (" else "))) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr9_elseScope).values[tmpPositionCache][0]))));
					
				
				
			case 8958: //dummy jumper1
				;
					
				
				
			case 28738: //dummy jumper2
				;
					
				
				
			case 28735: //dummy jumper2
				;
					
				
				__pc = 28679;
				break;
				
			case 8711: //dummy jumper1
				if (!((((local16___SelectHelper7__1958) == (~~(25))) ? 1 : 0))) { __pc = 8976; break; }
				
				case 9095:
					if (!(global8_IsInGoto)) { __pc = 8979; break; }
				
				var local6_TmpBID_2018 = 0, local6_TmpCID_2019 = 0;
				case 8983:
					local6_TmpBID_2018 = global11_LoopBreakID;
					
				local6_TmpCID_2019 = global14_LoopContinueID;
				global11_LoopBreakID = global11_LastDummyID;
				global14_LoopContinueID = param4_expr.attr2_ID;
				global11_LastDummyID+=1;
				local8_Text_Str_1957 = ((((((((((((local8_Text_Str_1957) + ("if (!("))) + (func23_ConditionJSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr4_expr).values[tmpPositionCache][0]))))) + (")) {__pc = "))) + (CAST2STRING(global11_LoopBreakID)))) + ("; break;}"))) + (func11_NewLine_Str()));
				local8_Text_Str_1957 = ((local8_Text_Str_1957) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr3_Scp).values[tmpPositionCache][0]))));
				local8_Text_Str_1957 = ((((((((local8_Text_Str_1957) + ("__pc = "))) + (CAST2STRING(param4_expr.attr2_ID)))) + ("; break; //back jump"))) + (func11_NewLine_Str()));
				func10_IndentDown();
				local8_Text_Str_1957 = ((local8_Text_Str_1957) + (func11_NewLine_Str()));
				func8_IndentUp();
				local8_Text_Str_1957 = ((((((((local8_Text_Str_1957) + ("case "))) + (CAST2STRING(global11_LoopBreakID)))) + (":"))) + (func11_NewLine_Str()));
				global11_LoopBreakID = local6_TmpBID_2018;
				global14_LoopContinueID = local6_TmpCID_2019;
				
				__pc = 28741;
				break;
				
			case 8979: //dummy jumper1
				
				case 9084:
					local8_Text_Str_1957 = ((((((local8_Text_Str_1957) + ("while ("))) + (func23_ConditionJSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr4_expr).values[tmpPositionCache][0]))))) + (") "));
					
				local8_Text_Str_1957 = ((local8_Text_Str_1957) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr3_Scp).values[tmpPositionCache][0]))));
				
				
			case 28741: //dummy jumper2
				;
					
				
				__pc = 28679;
				break;
				
			case 8976: //dummy jumper1
				if (!((((local16___SelectHelper7__1958) == (~~(26))) ? 1 : 0))) { __pc = 9097; break; }
				
				case 9221:
					if (!(global8_IsInGoto)) { __pc = 9100; break; }
				
				var local6_TmpBID_2020 = 0, local6_TmpCID_2021 = 0;
				case 9104:
					local6_TmpBID_2020 = global11_LoopBreakID;
					
				local6_TmpCID_2021 = global14_LoopContinueID;
				global11_LoopBreakID = global11_LastDummyID;
				global14_LoopContinueID = param4_expr.attr2_ID;
				global11_LastDummyID+=1;
				local8_Text_Str_1957 = ((local8_Text_Str_1957) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr3_Scp).values[tmpPositionCache][0]))));
				local8_Text_Str_1957 = ((((((((((((local8_Text_Str_1957) + ("if ("))) + (func23_ConditionJSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr4_expr).values[tmpPositionCache][0]))))) + (") {__pc = "))) + (CAST2STRING(global11_LoopBreakID)))) + ("; break;}"))) + (func11_NewLine_Str()));
				local8_Text_Str_1957 = ((((((((local8_Text_Str_1957) + ("__pc = "))) + (CAST2STRING(param4_expr.attr2_ID)))) + ("; break; //back jump"))) + (func11_NewLine_Str()));
				func10_IndentDown();
				local8_Text_Str_1957 = ((local8_Text_Str_1957) + (func11_NewLine_Str()));
				func8_IndentUp();
				local8_Text_Str_1957 = ((((((((local8_Text_Str_1957) + ("case "))) + (CAST2STRING(global11_LoopBreakID)))) + (": //dummy repeat"))) + (func11_NewLine_Str()));
				global11_LoopBreakID = local6_TmpBID_2020;
				global14_LoopContinueID = local6_TmpCID_2021;
				
				__pc = 28742;
				break;
				
			case 9100: //dummy jumper1
				
				case 9196:
					local8_Text_Str_1957 = ((local8_Text_Str_1957) + ("do "));
					
				local8_Text_Str_1957 = ((local8_Text_Str_1957) + (func23_ConditionJSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr3_Scp).values[tmpPositionCache][0]))));
				local8_Text_Str_1957 = ((((((local8_Text_Str_1957) + (" while (!("))) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr4_expr).values[tmpPositionCache][0]))))) + ("))"));
				
				
			case 28742: //dummy jumper2
				;
					
				
				__pc = 28679;
				break;
				
			case 9097: //dummy jumper1
				if (!((((local16___SelectHelper7__1958) == (~~(27))) ? 1 : 0))) { __pc = 9223; break; }
				
				var local13_CheckComm_Str_2022 = "";
				case 9238:
					if (!(param4_expr.attr5_hasTo)) { __pc = 9229; break; }
				
				case 9233:
					local13_CheckComm_Str_2022 = "toCheck";
					
				
				__pc = 28743;
				break;
				
			case 9229: //dummy jumper1
				
				case 9237:
					local13_CheckComm_Str_2022 = "untilCheck";
					
				
				
			case 28743: //dummy jumper2
				;
					
				case 9502:
					if (!(global8_IsInGoto)) { __pc = 9240; break; }
				
				var local6_TmpBID_2023 = 0, local6_TmpCID_2024 = 0;
				case 9244:
					local6_TmpBID_2023 = global11_LoopBreakID;
					
				local6_TmpCID_2024 = global14_LoopContinueID;
				global11_LoopBreakID = param4_expr.attr8_stepExpr;
				global14_LoopContinueID = param4_expr.attr7_varExpr;
				local8_Text_Str_1957 = ((((local8_Text_Str_1957) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr7_varExpr).values[tmpPositionCache][0]))))) + (func11_NewLine_Str()));
				func10_IndentDown();
				local8_Text_Str_1957 = ((local8_Text_Str_1957) + (func11_NewLine_Str()));
				func8_IndentUp();
				local8_Text_Str_1957 = ((((((((local8_Text_Str_1957) + ("case "))) + (CAST2STRING(param4_expr.attr7_varExpr)))) + (": //dummy for1"))) + (func11_NewLine_Str()));
				local8_Text_Str_1957 = ((((((((((((((((((((((((local8_Text_Str_1957) + ("if (!"))) + (local13_CheckComm_Str_2022))) + ("("))) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(global5_Exprs_ref[0].arrAccess(param4_expr.attr7_varExpr).values[tmpPositionCache][0].attr4_vari).values[tmpPositionCache][0]))))) + (", "))) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr6_toExpr).values[tmpPositionCache][0]))))) + (", "))) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr8_stepExpr).values[tmpPositionCache][0]))))) + (")) {__pc = "))) + (CAST2STRING(param4_expr.attr8_stepExpr)))) + ("; break;}"))) + (func11_NewLine_Str()));
				local8_Text_Str_1957 = ((local8_Text_Str_1957) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr3_Scp).values[tmpPositionCache][0]))));
				local8_Text_Str_1957 = ((((((((((local8_Text_Str_1957) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(global5_Exprs_ref[0].arrAccess(param4_expr.attr7_varExpr).values[tmpPositionCache][0].attr4_vari).values[tmpPositionCache][0]))))) + (" += "))) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr8_stepExpr).values[tmpPositionCache][0]))))) + (";"))) + (func11_NewLine_Str()));
				local8_Text_Str_1957 = ((((((((local8_Text_Str_1957) + ("__pc = "))) + (CAST2STRING(param4_expr.attr7_varExpr)))) + ("; break; //back jump"))) + (func11_NewLine_Str()));
				func10_IndentDown();
				local8_Text_Str_1957 = ((local8_Text_Str_1957) + (func11_NewLine_Str()));
				func8_IndentUp();
				local8_Text_Str_1957 = ((((((((local8_Text_Str_1957) + ("case "))) + (CAST2STRING(param4_expr.attr8_stepExpr)))) + (": //dummy for"))) + (func11_NewLine_Str()));
				global11_LoopBreakID = local6_TmpBID_2023;
				global14_LoopContinueID = local6_TmpCID_2024;
				
				__pc = 28744;
				break;
				
			case 9240: //dummy jumper1
				
				case 9491:
					local8_Text_Str_1957 = ((((((((((((((((((((((((((((((local8_Text_Str_1957) + ("for ("))) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr7_varExpr).values[tmpPositionCache][0]))))) + (";"))) + (local13_CheckComm_Str_2022))) + ("("))) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(global5_Exprs_ref[0].arrAccess(param4_expr.attr7_varExpr).values[tmpPositionCache][0].attr4_vari).values[tmpPositionCache][0]))))) + (", "))) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr6_toExpr).values[tmpPositionCache][0]))))) + (", "))) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr8_stepExpr).values[tmpPositionCache][0]))))) + (");"))) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(global5_Exprs_ref[0].arrAccess(param4_expr.attr7_varExpr).values[tmpPositionCache][0].attr4_vari).values[tmpPositionCache][0]))))) + (" += "))) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr8_stepExpr).values[tmpPositionCache][0]))))) + (") "));
					
				local8_Text_Str_1957 = ((local8_Text_Str_1957) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr3_Scp).values[tmpPositionCache][0]))));
				
				
			case 28744: //dummy jumper2
				;
					
				
				__pc = 28679;
				break;
				
			case 9223: //dummy jumper1
				if (!((((local16___SelectHelper7__1958) == (~~(38))) ? 1 : 0))) { __pc = 9504; break; }
				
				var local1_c_2025 = 0, local11_varName_Str_2026 = "", local13_StartText_Str_2027 = "", local12_CondText_Str_2028 = "", local11_IncText_Str_2029 = "", local13_EachBegin_Str_2030 = "", local11_EachEnd_Str_2031 = "";
				case 9510:
					global14_ForEachCounter = param4_expr.attr2_ID;
					
				local1_c_2025 = global14_ForEachCounter;
				local8_Text_Str_1957 = ((((((((((((local8_Text_Str_1957) + ("var forEachSaver"))) + (CAST2STRING(local1_c_2025)))) + (" = "))) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr6_inExpr).values[tmpPositionCache][0]))))) + (";"))) + (func11_NewLine_Str()));
				local11_varName_Str_2026 = func16_JSRemoveLast_Str(func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr7_varExpr).values[tmpPositionCache][0])), "[0]");
				local13_StartText_Str_2027 = (((("var forEachCounter") + (CAST2STRING(local1_c_2025)))) + (" = 0"));
				local12_CondText_Str_2028 = (((((((("forEachCounter") + (CAST2STRING(local1_c_2025)))) + (" < forEachSaver"))) + (CAST2STRING(local1_c_2025)))) + (".values.length"));
				local11_IncText_Str_2029 = (((("forEachCounter") + (CAST2STRING(local1_c_2025)))) + ("++"));
				local13_EachBegin_Str_2030 = (((((((((((((("var ") + (local11_varName_Str_2026))) + (" = forEachSaver"))) + (CAST2STRING(local1_c_2025)))) + (".values[forEachCounter"))) + (CAST2STRING(local1_c_2025)))) + ("];"))) + (func11_NewLine_Str()));
				local11_EachEnd_Str_2031 = (((((((((((((("forEachSaver") + (CAST2STRING(local1_c_2025)))) + (".values[forEachCounter"))) + (CAST2STRING(local1_c_2025)))) + ("] = "))) + (local11_varName_Str_2026))) + (";"))) + (func11_NewLine_Str()));
				case 9808:
					if (!(global8_IsInGoto)) { __pc = 9619; break; }
				
				var local6_TmpBID_2032 = 0, local6_TmpCID_2033 = 0;
				case 9623:
					local6_TmpBID_2032 = global11_LoopBreakID;
					
				local6_TmpCID_2033 = global14_LoopContinueID;
				global11_LoopBreakID = param4_expr.attr7_varExpr;
				global14_LoopContinueID = param4_expr.attr6_inExpr;
				local8_Text_Str_1957 = ((((local8_Text_Str_1957) + (local13_StartText_Str_2027))) + (func11_NewLine_Str()));
				func10_IndentDown();
				local8_Text_Str_1957 = ((local8_Text_Str_1957) + (func11_NewLine_Str()));
				func8_IndentUp();
				local8_Text_Str_1957 = ((((((((local8_Text_Str_1957) + ("case "))) + (CAST2STRING(param4_expr.attr6_inExpr)))) + (": //dummy for1"))) + (func11_NewLine_Str()));
				local8_Text_Str_1957 = ((((((((((((local8_Text_Str_1957) + ("if (!("))) + (local12_CondText_Str_2028))) + (")) {__pc = "))) + (CAST2STRING(param4_expr.attr7_varExpr)))) + ("; break;}"))) + (func11_NewLine_Str()));
				local8_Text_Str_1957 = ((((local8_Text_Str_1957) + (local13_EachBegin_Str_2030))) + (func11_NewLine_Str()));
				local8_Text_Str_1957 = ((local8_Text_Str_1957) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr3_Scp).values[tmpPositionCache][0]))));
				local8_Text_Str_1957 = ((((local8_Text_Str_1957) + (local11_EachEnd_Str_2031))) + (func11_NewLine_Str()));
				local8_Text_Str_1957 = ((((local8_Text_Str_1957) + (local11_IncText_Str_2029))) + (func11_NewLine_Str()));
				local8_Text_Str_1957 = ((((((((local8_Text_Str_1957) + ("__pc = "))) + (CAST2STRING(param4_expr.attr6_inExpr)))) + ("; break; //back jump"))) + (func11_NewLine_Str()));
				func10_IndentDown();
				local8_Text_Str_1957 = ((local8_Text_Str_1957) + (func11_NewLine_Str()));
				func8_IndentUp();
				local8_Text_Str_1957 = ((((((((local8_Text_Str_1957) + ("case "))) + (CAST2STRING(param4_expr.attr7_varExpr)))) + (": //dummy for"))) + (func11_NewLine_Str()));
				global11_LoopBreakID = local6_TmpBID_2032;
				global14_LoopContinueID = local6_TmpCID_2033;
				
				__pc = 28745;
				break;
				
			case 9619: //dummy jumper1
				
				case 9758:
					func8_IndentUp();
					
				local8_Text_Str_1957 = ((((((((((((((((local8_Text_Str_1957) + ("for("))) + (local13_StartText_Str_2027))) + (" ; "))) + (local12_CondText_Str_2028))) + (" ; "))) + (local11_IncText_Str_2029))) + (") {"))) + (func11_NewLine_Str()));
				local8_Text_Str_1957 = ((local8_Text_Str_1957) + (local13_EachBegin_Str_2030));
				local8_Text_Str_1957 = ((((local8_Text_Str_1957) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr3_Scp).values[tmpPositionCache][0]))))) + (func11_NewLine_Str()));
				local8_Text_Str_1957 = ((local8_Text_Str_1957) + (local11_EachEnd_Str_2031));
				func10_IndentDown();
				local8_Text_Str_1957 = ((((local8_Text_Str_1957) + (func11_NewLine_Str()))) + ("}"));
				
				
			case 28745: //dummy jumper2
				;
					
				
				__pc = 28679;
				break;
				
			case 9504: //dummy jumper1
				if (!((((local16___SelectHelper7__1958) == (~~(30))) ? 1 : 0))) { __pc = 9810; break; }
				
				case 9831:
					if (!(global8_IsInGoto)) { __pc = 9813; break; }
				
				case 9824:
					local8_Text_Str_1957 = ((((((local8_Text_Str_1957) + ("__pc = "))) + (CAST2STRING(global14_LoopContinueID)))) + ("; break"));
					
				
				__pc = 28746;
				break;
				
			case 9813: //dummy jumper1
				
				case 9830:
					local8_Text_Str_1957 = ((local8_Text_Str_1957) + ("continue"));
					
				
				
			case 28746: //dummy jumper2
				;
					
				
				__pc = 28679;
				break;
				
			case 9810: //dummy jumper1
				if (!((((local16___SelectHelper7__1958) == (~~(29))) ? 1 : 0))) { __pc = 9833; break; }
				
				case 9854:
					if (!(global8_IsInGoto)) { __pc = 9836; break; }
				
				case 9847:
					local8_Text_Str_1957 = ((((((local8_Text_Str_1957) + ("__pc = "))) + (CAST2STRING(global11_LoopBreakID)))) + ("; break"));
					
				
				__pc = 28747;
				break;
				
			case 9836: //dummy jumper1
				
				case 9853:
					local8_Text_Str_1957 = ((local8_Text_Str_1957) + ("break"));
					
				
				
			case 28747: //dummy jumper2
				;
					
				
				__pc = 28679;
				break;
				
			case 9833: //dummy jumper1
				if (!((((local16___SelectHelper7__1958) == (~~(31))) ? 1 : 0))) { __pc = 9856; break; }
				
				var local9_oIsInGoto_2034 = 0;
				case 9860:
					local9_oIsInGoto_2034 = global8_IsInGoto;
					
				global8_IsInGoto = 0;
				local8_Text_Str_1957 = ((local8_Text_Str_1957) + ("try "));
				local8_Text_Str_1957 = ((local8_Text_Str_1957) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr3_Scp).values[tmpPositionCache][0]))));
				func8_IndentUp();
				local8_Text_Str_1957 = ((((((((local8_Text_Str_1957) + (" catch ("))) + (global8_Compiler.attr5_Varis_ref[0].arrAccess(param4_expr.attr4_vari).values[tmpPositionCache][0].attr8_Name_Str))) + (") {"))) + (func11_NewLine_Str()));
				local8_Text_Str_1957 = ((((((((((((((((((local8_Text_Str_1957) + ("if ("))) + (global8_Compiler.attr5_Varis_ref[0].arrAccess(param4_expr.attr4_vari).values[tmpPositionCache][0].attr8_Name_Str))) + (" instanceof GLBException) "))) + (global8_Compiler.attr5_Varis_ref[0].arrAccess(param4_expr.attr4_vari).values[tmpPositionCache][0].attr8_Name_Str))) + (" = "))) + (global8_Compiler.attr5_Varis_ref[0].arrAccess(param4_expr.attr4_vari).values[tmpPositionCache][0].attr8_Name_Str))) + (".getText(); else throwError("))) + (global8_Compiler.attr5_Varis_ref[0].arrAccess(param4_expr.attr4_vari).values[tmpPositionCache][0].attr8_Name_Str))) + (");"));
				local8_Text_Str_1957 = ((local8_Text_Str_1957) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr8_catchScp).values[tmpPositionCache][0]))));
				func10_IndentDown();
				local8_Text_Str_1957 = ((((local8_Text_Str_1957) + (func11_NewLine_Str()))) + ("}"));
				global8_IsInGoto = local9_oIsInGoto_2034;
				
				__pc = 28679;
				break;
				
			case 9856: //dummy jumper1
				if (!((((local16___SelectHelper7__1958) == (~~(32))) ? 1 : 0))) { __pc = 9976; break; }
				
				case 10016:
					local8_Text_Str_1957 = ((((((((((((((local8_Text_Str_1957) + ("throw new GLBException("))) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr4_expr).values[tmpPositionCache][0]))))) + (", \""))) + (global8_Compiler.attr6_Tokens.arrAccess(param4_expr.attr5_tokID).values[tmpPositionCache].attr8_Path_Str_ref[0]))) + ("\", "))) + (CAST2STRING(global8_Compiler.attr6_Tokens.arrAccess(param4_expr.attr5_tokID).values[tmpPositionCache].attr4_Line_ref[0])))) + (")"));
					
				
				__pc = 28679;
				break;
				
			case 9976: //dummy jumper1
				if (!((((local16___SelectHelper7__1958) == (~~(33))) ? 1 : 0))) { __pc = 10018; break; }
				
				case 10030:
					local8_Text_Str_1957 = ((((((local8_Text_Str_1957) + ("RESTORE(datablock_"))) + (param4_expr.attr8_Name_Str))) + (")"));
					
				
				__pc = 28679;
				break;
				
			case 10018: //dummy jumper1
				if (!((((local16___SelectHelper7__1958) == (~~(34))) ? 1 : 0))) { __pc = 10032; break; }
				
				var local1_i_2035 = 0.0;
				case 10037:
					local1_i_2035 = 0;
					
				case 10080:
					var forEachSaver10080 = param4_expr.attr5_Reads;
				var forEachCounter10080 = 0
				
			case 10044: //dummy for1
				if (!(forEachCounter10080 < forEachSaver10080.values.length)) {__pc = 10040; break;}
				var local1_R_2036 = forEachSaver10080.values[forEachCounter10080];
				
				
				case 10055:
					local8_Text_Str_1957 = ((((local8_Text_Str_1957) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(local1_R_2036).values[tmpPositionCache][0]))))) + (" = READ()"));
					
				case 10076:
					if (!((((local1_i_2035) < (((BOUNDS(param4_expr.attr5_Reads, 0)) - (1)))) ? 1 : 0))) { __pc = 10067; break; }
				
				case 10075:
					local8_Text_Str_1957 = ((((local8_Text_Str_1957) + (";"))) + (func11_NewLine_Str()));
					
				
				
			case 10067: //dummy jumper1
				;
					
				local1_i_2035+=1;
				
				forEachSaver10080.values[forEachCounter10080] = local1_R_2036;
				
				forEachCounter10080++
				__pc = 10044; break; //back jump
				
			case 10040: //dummy for
				;
					
				
				__pc = 28679;
				break;
				
			case 10032: //dummy jumper1
				if (!((((local16___SelectHelper7__1958) == (~~(35))) ? 1 : 0))) { __pc = 10082; break; }
				
				case 10093:
					local8_Text_Str_1957 = ((local8_Text_Str_1957) + (func21_JSGetDefaultValue_Str(param4_expr.attr8_datatype, 0, 0)));
					
				
				__pc = 28679;
				break;
				
			case 10082: //dummy jumper1
				if (!((((local16___SelectHelper7__1958) == (~~(36))) ? 1 : 0))) { __pc = 10095; break; }
				
				var local4_Find_2037 = 0;
				case 10101:
					local8_Text_Str_1957 = ((local8_Text_Str_1957) + ("DIM(new GLBArray(), ["));
					
				local4_Find_2037 = 0;
				case 10136:
					var forEachSaver10136 = param4_expr.attr4_dims;
				var forEachCounter10136 = 0
				
			case 10112: //dummy for1
				if (!(forEachCounter10136 < forEachSaver10136.values.length)) {__pc = 10108; break;}
				var local1_D_2038 = forEachSaver10136.values[forEachCounter10136];
				
				
				case 10124:
					if (!((((local4_Find_2037) == (1)) ? 1 : 0))) { __pc = 10117; break; }
				
				case 10123:
					local8_Text_Str_1957 = ((local8_Text_Str_1957) + (", "));
					
				
				
			case 10117: //dummy jumper1
				;
					
				local8_Text_Str_1957 = ((local8_Text_Str_1957) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(local1_D_2038).values[tmpPositionCache][0]))));
				local4_Find_2037 = 1;
				
				forEachSaver10136.values[forEachCounter10136] = local1_D_2038;
				
				forEachCounter10136++
				__pc = 10112; break; //back jump
				
			case 10108: //dummy for
				;
					
				local8_Text_Str_1957 = ((((((local8_Text_Str_1957) + ("], "))) + (func21_JSGetDefaultValue_Str(param4_expr.attr8_datatype, 1, 1)))) + (")"));
				
				__pc = 28679;
				break;
				
			case 10095: //dummy jumper1
				if (!((((local16___SelectHelper7__1958) == (~~(37))) ? 1 : 0))) { __pc = 10152; break; }
				
				case 10168:
					local8_Text_Str_1957 = ((((local8_Text_Str_1957) + (global8_Compiler.attr5_Varis_ref[0].arrAccess(param4_expr.attr4_vari).values[tmpPositionCache][0].attr8_Name_Str))) + (" = "));
					
				case 10224:
					if (!((((global5_Exprs_ref[0].arrAccess(param4_expr.attr4_expr).values[tmpPositionCache][0].attr3_Typ) == (54)) ? 1 : 0))) { __pc = 10178; break; }
				
				case 10211:
					local8_Text_Str_1957 = ((((((((((local8_Text_Str_1957) + ("castobj("))) + (func16_JSRemoveLast_Str(func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(global5_Exprs_ref[0].arrAccess(param4_expr.attr4_expr).values[tmpPositionCache][0].attr4_expr).values[tmpPositionCache][0])), "[0]")))) + (", "))) + (func18_ChangeTypeName_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr4_expr).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str_ref[0]))))) + (")"));
					
				
				__pc = 28750;
				break;
				
			case 10178: //dummy jumper1
				
				case 10223:
					local8_Text_Str_1957 = ((local8_Text_Str_1957) + (func16_JSRemoveLast_Str(func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr4_expr).values[tmpPositionCache][0])), "[0]")));
					
				
				
			case 28750: //dummy jumper2
				;
					
				local8_Text_Str_1957 = ((local8_Text_Str_1957) + (" /* ALIAS */"));
				
				__pc = 28679;
				break;
				
			case 10152: //dummy jumper1
				if (!((((local16___SelectHelper7__1958) == (~~(20))) ? 1 : 0))) { __pc = 10231; break; }
				
				case 10243:
					local8_Text_Str_1957 = ((((((local8_Text_Str_1957) + ("__pc = __labels[\""))) + (param4_expr.attr8_Name_Str))) + ("\"]; break"));
					
				
				__pc = 28679;
				break;
				
			case 10231: //dummy jumper1
				if (!((((local16___SelectHelper7__1958) == (~~(21))) ? 1 : 0))) { __pc = 10245; break; }
				
				case 10264:
					global12_LabelDef_Str = ((((((((((global12_LabelDef_Str) + ("\""))) + (param4_expr.attr8_Name_Str))) + ("\": "))) + (CAST2STRING(param4_expr.attr2_ID)))) + (", "));
					
				local8_Text_Str_1957 = ((((local8_Text_Str_1957) + ("//label: "))) + (param4_expr.attr8_Name_Str));
				
				__pc = 28679;
				break;
				
			case 10245: //dummy jumper1
				if (!((((local16___SelectHelper7__1958) == (~~(39))) ? 1 : 0))) { __pc = 10275; break; }
				
				case 10295:
					local8_Text_Str_1957 = ((((((local8_Text_Str_1957) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr4_vari).values[tmpPositionCache][0]))))) + ("+="))) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr4_expr).values[tmpPositionCache][0]))));
					
				
				__pc = 28679;
				break;
				
			case 10275: //dummy jumper1
				if (!((((local16___SelectHelper7__1958) == (~~(40))) ? 1 : 0))) { __pc = 10297; break; }
				
				case 10322:
					local8_Text_Str_1957 = ((((((((((local8_Text_Str_1957) + ("DIMPUSH("))) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr4_vari).values[tmpPositionCache][0]))))) + (", "))) + (func16_JSRemoveLast_Str(func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr4_expr).values[tmpPositionCache][0])), "[0]")))) + (")"));
					
				
				__pc = 28679;
				break;
				
			case 10297: //dummy jumper1
				if (!((((local16___SelectHelper7__1958) == (~~(41))) ? 1 : 0))) { __pc = 10324; break; }
				
				case 10373:
					if (!((((param4_expr.attr4_kern) != (-(1))) ? 1 : 0))) { __pc = 10333; break; }
				
				case 10357:
					local8_Text_Str_1957 = ((((((((((local8_Text_Str_1957) + ("KERNLEN("))) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr4_expr).values[tmpPositionCache][0]))))) + (", "))) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr4_kern).values[tmpPositionCache][0]))))) + (")"));
					
				
				__pc = 28751;
				break;
				
			case 10333: //dummy jumper1
				
				case 10372:
					local8_Text_Str_1957 = ((((((local8_Text_Str_1957) + ("("))) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr4_expr).values[tmpPositionCache][0]))))) + (").length"));
					
				
				
			case 28751: //dummy jumper2
				;
					
				
				__pc = 28679;
				break;
				
			case 10324: //dummy jumper1
				if (!((((local16___SelectHelper7__1958) == (~~(45))) ? 1 : 0))) { __pc = 10375; break; }
				
				case 10399:
					local8_Text_Str_1957 = ((((((((((local8_Text_Str_1957) + ("BOUNDS("))) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr5_array).values[tmpPositionCache][0]))))) + (", "))) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr8_position).values[tmpPositionCache][0]))))) + (")"));
					
				
				__pc = 28679;
				break;
				
			case 10375: //dummy jumper1
				if (!((((local16___SelectHelper7__1958) == (~~(42))) ? 1 : 0))) { __pc = 10401; break; }
				
				var local4_Find_2039 = 0;
				case 10416:
					local8_Text_Str_1957 = ((((((local8_Text_Str_1957) + ("DIMDATA("))) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr5_array).values[tmpPositionCache][0]))))) + (", ["));
					
				case 10445:
					var forEachSaver10445 = param4_expr.attr5_Exprs;
				var forEachCounter10445 = 0
				
			case 10423: //dummy for1
				if (!(forEachCounter10445 < forEachSaver10445.values.length)) {__pc = 10419; break;}
				var local4_Elem_2040 = forEachSaver10445.values[forEachCounter10445];
				
				
				case 10433:
					if (!(local4_Find_2039)) { __pc = 10426; break; }
				
				case 10432:
					local8_Text_Str_1957 = ((local8_Text_Str_1957) + (", "));
					
				
				
			case 10426: //dummy jumper1
				;
					
				local8_Text_Str_1957 = ((local8_Text_Str_1957) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(local4_Elem_2040).values[tmpPositionCache][0]))));
				local4_Find_2039 = 1;
				
				forEachSaver10445.values[forEachCounter10445] = local4_Elem_2040;
				
				forEachCounter10445++
				__pc = 10423; break; //back jump
				
			case 10419: //dummy for
				;
					
				local8_Text_Str_1957 = ((local8_Text_Str_1957) + ("])"));
				
				__pc = 28679;
				break;
				
			case 10401: //dummy jumper1
				if (!((((local16___SelectHelper7__1958) == (~~(43))) ? 1 : 0))) { __pc = 10452; break; }
				
				case 10460:
					local8_Text_Str_1957 = ((((local8_Text_Str_1957) + ("//DELETE!!111"))) + (func11_NewLine_Str()));
					
				local8_Text_Str_1957 = ((((((((((((((((local8_Text_Str_1957) + ("forEachSaver"))) + (CAST2STRING(global14_ForEachCounter)))) + (".values[forEachCounter"))) + (CAST2STRING(global14_ForEachCounter)))) + ("] = "))) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(global5_Exprs_ref[0].arrAccess(global14_ForEachCounter).values[tmpPositionCache][0].attr7_varExpr).values[tmpPositionCache][0]))))) + (";"))) + (func11_NewLine_Str()));
				local8_Text_Str_1957 = ((((((((((((local8_Text_Str_1957) + ("DIMDEL(forEachSaver"))) + (CAST2STRING(global14_ForEachCounter)))) + (", forEachCounter"))) + (CAST2STRING(global14_ForEachCounter)))) + (");"))) + (func11_NewLine_Str()));
				local8_Text_Str_1957 = ((((((((local8_Text_Str_1957) + ("forEachCounter"))) + (CAST2STRING(global14_ForEachCounter)))) + ("--;"))) + (func11_NewLine_Str()));
				local8_Text_Str_1957 = ((local8_Text_Str_1957) + ("continue"));
				
				__pc = 28679;
				break;
				
			case 10452: //dummy jumper1
				if (!((((local16___SelectHelper7__1958) == (~~(44))) ? 1 : 0))) { __pc = 10524; break; }
				
				case 10548:
					local8_Text_Str_1957 = ((((((((((local8_Text_Str_1957) + ("DIMDEL("))) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr5_array).values[tmpPositionCache][0]))))) + (", "))) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr8_position).values[tmpPositionCache][0]))))) + (")"));
					
				
				__pc = 28679;
				break;
				
			case 10524: //dummy jumper1
				if (!((((local16___SelectHelper7__1958) == (~~(46))) ? 1 : 0))) { __pc = 10550; break; }
				
				case 10565:
					local8_Text_Str_1957 = ((((((local8_Text_Str_1957) + ("(("))) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr4_expr).values[tmpPositionCache][0]))))) + (") ? 0 : 1)"));
					
				
				__pc = 28679;
				break;
				
			case 10550: //dummy jumper1
				if (!((((local16___SelectHelper7__1958) == (~~(48))) ? 1 : 0))) { __pc = 10567; break; }
				
				case 10581:
					local8_Text_Str_1957 = ((local8_Text_Str_1957) + (global8_Compiler.attr5_Funcs_ref[0].arrAccess(param4_expr.attr4_func).values[tmpPositionCache][0].attr8_Name_Str));
					
				
				__pc = 28679;
				break;
				
			case 10567: //dummy jumper1
				if (!((((local16___SelectHelper7__1958) == (~~(49))) ? 1 : 0))) { __pc = 10583; break; }
				
				var local8_Cond_Str_2041 = "";
				case 10592:
					local8_Cond_Str_2041 = func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr4_expr).values[tmpPositionCache][0]));
					
				local8_Text_Str_1957 = ((((((((((local8_Text_Str_1957) + ("if (!("))) + (local8_Cond_Str_2041))) + (")) throwError(\"AssertException "))) + (REPLACE_Str(local8_Cond_Str_2041, "\"", "'")))) + ("\")"));
				
				__pc = 28679;
				break;
				
			case 10583: //dummy jumper1
				if (!((((local16___SelectHelper7__1958) == (~~(50))) ? 1 : 0))) { __pc = 10611; break; }
				
				case 10626:
					local8_Text_Str_1957 = ((((((local8_Text_Str_1957) + ("DEBUG("))) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr4_expr).values[tmpPositionCache][0]))))) + (")"));
					
				
				__pc = 28679;
				break;
				
			case 10611: //dummy jumper1
				if (!((((local16___SelectHelper7__1958) == (~~(51))) ? 1 : 0))) { __pc = 10628; break; }
				
				case 10665:
					local8_Text_Str_1957 = ((((((((((((((local8_Text_Str_1957) + ("(("))) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr10_Conditions.arrAccess(0).values[tmpPositionCache]).values[tmpPositionCache][0]))))) + (") ? ("))) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr6_Scopes.arrAccess(0).values[tmpPositionCache]).values[tmpPositionCache][0]))))) + (") : ("))) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr9_elseScope).values[tmpPositionCache][0]))))) + ("))"));
					
				
				__pc = 28679;
				break;
				
			case 10628: //dummy jumper1
				if (!((((local16___SelectHelper7__1958) == (~~(52))) ? 1 : 0))) { __pc = 10667; break; }
				
				case 10679:
					local8_Text_Str_1957 = ((((((local8_Text_Str_1957) + ("//REQUIRE: "))) + (param4_expr.attr8_Name_Str))) + ("\n"));
					
				local8_Text_Str_1957 = ((((local8_Text_Str_1957) + (param4_expr.attr11_Content_Str))) + (func11_NewLine_Str()));
				local8_Text_Str_1957 = ((((((local8_Text_Str_1957) + ("//ENDREQUIRE: "))) + (param4_expr.attr8_Name_Str))) + (func11_NewLine_Str()));
				
				__pc = 28679;
				break;
				
			case 10667: //dummy jumper1
				if (!((((local16___SelectHelper7__1958) == (~~(53))) ? 1 : 0))) { __pc = 10701; break; }
				
				var local5_Found_2042 = 0, local3_Scp_2043 = 0;
				case 10706:
					local5_Found_2042 = 0;
					
				local3_Scp_2043 = global12_CurrentScope;
				case 10791:
					if (!((((((((((local3_Scp_2043) != (-(1))) ? 1 : 0)) && (((((((((global5_Exprs_ref[0].arrAccess(local3_Scp_2043).values[tmpPositionCache][0].attr6_ScpTyp) == (2)) ? 1 : 0)) || ((((global5_Exprs_ref[0].arrAccess(local3_Scp_2043).values[tmpPositionCache][0].attr6_ScpTyp) == (4)) ? 1 : 0))) ? 1 : 0)) ? 0 : 1))) ? 1 : 0)) && (((local5_Found_2042) ? 0 : 1))) ? 1 : 0))) {__pc = 28753; break;}
				
				var local5_Varis_2044 = new GLBArray();
				case 10747:
					func8_GetVaris(unref(local5_Varis_2044), local3_Scp_2043, 0);
					
				case 10783:
					var forEachSaver10783 = local5_Varis_2044;
				var forEachCounter10783 = 0
				
			case 10751: //dummy for1
				if (!(forEachCounter10783 < forEachSaver10783.values.length)) {__pc = 10749; break;}
				var local1_V_2045 = forEachSaver10783.values[forEachCounter10783];
				
				
				var alias3_Var_ref_2046 = [new type14_IdentifierVari()];
				case 10758:
					alias3_Var_ref_2046 = global8_Compiler.attr5_Varis_ref[0].arrAccess(local1_V_2045).values[tmpPositionCache] /* ALIAS */;
					
				case 10782:
					if (!((((alias3_Var_ref_2046[0].attr8_Name_Str) == ((("param4_self_") + (CAST2STRING(alias3_Var_ref_2046[0].attr2_ID))))) ? 1 : 0))) { __pc = 10769; break; }
				
				case 10777:
					local8_Text_Str_1957 = ((local8_Text_Str_1957) + (alias3_Var_ref_2046[0].attr8_Name_Str));
					
				local5_Found_2042 = 1;
				case 10781:
					__pc = 10749; break;
					
				
				
			case 10769: //dummy jumper1
				;
					
				
				forEachSaver10783.values[forEachCounter10783] = local1_V_2045;
				
				forEachCounter10783++
				__pc = 10751; break; //back jump
				
			case 10749: //dummy for
				;
					
				local3_Scp_2043 = global5_Exprs_ref[0].arrAccess(local3_Scp_2043).values[tmpPositionCache][0].attr10_SuperScope;
				
				__pc = 10791; break; //back jump
				
			case 28753:
				;
					
				case 10800:
					if (!(((local5_Found_2042) ? 0 : 1))) { __pc = 10794; break; }
				
				case 10799:
					func5_Error("Self not found for super", 1049, "src\CompilerPasses\Generator\JSGenerator.gbas");
					
				
				
			case 10794: //dummy jumper1
				;
					
				
				__pc = 28679;
				break;
				
			case 10701: //dummy jumper1
				if (!((((local16___SelectHelper7__1958) == (~~(54))) ? 1 : 0))) { __pc = 10802; break; }
				
				case 10826:
					local8_Text_Str_1957 = ((((((((((local8_Text_Str_1957) + ("castobj("))) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr4_expr).values[tmpPositionCache][0]))))) + (", "))) + (func18_ChangeTypeName_Str(unref(param4_expr.attr8_datatype.attr8_Name_Str_ref[0]))))) + (")"));
					
				
				__pc = 28679;
				break;
				
			case 10802: //dummy jumper1
				if (!((((local16___SelectHelper7__1958) == (~~(7))) ? 1 : 0))) { __pc = 10828; break; }
				
				
				__pc = 28679;
				break;
				
			case 10828: //dummy jumper1
				if (!((((local16___SelectHelper7__1958) == (~~(8))) ? 1 : 0))) { __pc = 10831; break; }
				
				case 10836:
					func5_Error("Invalid Expression", 1055, "src\CompilerPasses\Generator\JSGenerator.gbas");
					
				
				__pc = 28679;
				break;
				
			case 10831: //dummy jumper1
				
				case 10846:
					func5_Error((("Unknown expression type: ") + (CAST2STRING(param4_expr.attr3_Typ))), 1057, "src\CompilerPasses\Generator\JSGenerator.gbas");
					
				
				
			case 28679: //dummy jumper2
				;
					
				
				;
			return tryClone(local8_Text_Str_1957);
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
	var local5_unref_2049 = 0;
	local5_unref_2049 = 1;
	if (((global5_Exprs_ref[0].arrAccess(param4_Expr).values[tmpPositionCache][0].attr8_datatype.attr7_IsArray_ref[0]) ? 0 : 1)) {
		{
			var local17___SelectHelper12__2050 = 0;
			local17___SelectHelper12__2050 = global5_Exprs_ref[0].arrAccess(param4_Expr).values[tmpPositionCache][0].attr3_Typ;
			if ((((local17___SelectHelper12__2050) == (~~(3))) ? 1 : 0)) {
				local5_unref_2049 = 0;
				
			} else if ((((local17___SelectHelper12__2050) == (~~(4))) ? 1 : 0)) {
				local5_unref_2049 = 0;
				
			} else if ((((local17___SelectHelper12__2050) == (~~(5))) ? 1 : 0)) {
				local5_unref_2049 = 0;
				
			} else if ((((local17___SelectHelper12__2050) == (~~(15))) ? 1 : 0)) {
				local5_unref_2049 = func11_JSDoesUnref(global5_Exprs_ref[0].arrAccess(param4_Expr).values[tmpPositionCache][0].attr4_expr);
				
			} else if ((((local17___SelectHelper12__2050) == (~~(16))) ? 1 : 0)) {
				local5_unref_2049 = func11_JSDoesUnref(global5_Exprs_ref[0].arrAccess(param4_Expr).values[tmpPositionCache][0].attr4_expr);
				
			} else if ((((local17___SelectHelper12__2050) == (~~(17))) ? 1 : 0)) {
				local5_unref_2049 = func11_JSDoesUnref(global5_Exprs_ref[0].arrAccess(param4_Expr).values[tmpPositionCache][0].attr4_expr);
				
			} else if ((((local17___SelectHelper12__2050) == (~~(1))) ? 1 : 0)) {
				local5_unref_2049 = 0;
				
			} else if ((((local17___SelectHelper12__2050) == (~~(6))) ? 1 : 0)) {
				local5_unref_2049 = 0;
				
			} else if ((((local17___SelectHelper12__2050) == (~~(23))) ? 1 : 0)) {
				local5_unref_2049 = 0;
				
			} else if ((((local17___SelectHelper12__2050) == (~~(45))) ? 1 : 0)) {
				local5_unref_2049 = 0;
				
			} else if ((((local17___SelectHelper12__2050) == (~~(41))) ? 1 : 0)) {
				local5_unref_2049 = 0;
				
			} else {
				var local1_v_2051 = 0;
				local1_v_2051 = func11_GetVariable(param4_Expr, 0);
				if ((((local1_v_2051) != (-(1))) ? 1 : 0)) {
					if (((global8_Compiler.attr5_Varis_ref[0].arrAccess(local1_v_2051).values[tmpPositionCache][0].attr3_ref) ? 0 : 1)) {
						local5_unref_2049 = 0;
						
					};
					
				};
				
			};
			
		};
		
	};
	return tryClone(local5_unref_2049);
	return 0;
	
};
func11_JSDoesUnref = window['func11_JSDoesUnref'];
window['func17_JSDoParameter_Str'] = function(param4_expr, param4_func, param7_DoParam) {
	var local8_Text_Str_2055 = "", local1_i_2056 = 0.0;
	if (param7_DoParam) {
		local8_Text_Str_2055 = "(";
		
	};
	local1_i_2056 = 0;
	var forEachSaver11141 = param4_expr.attr6_Params;
	for(var forEachCounter11141 = 0 ; forEachCounter11141 < forEachSaver11141.values.length ; forEachCounter11141++) {
		var local5_param_2057 = forEachSaver11141.values[forEachCounter11141];
	{
			if ((((((((((param4_func) != (-(1))) ? 1 : 0)) && ((((global8_Compiler.attr5_Funcs_ref[0].arrAccess(param4_func).values[tmpPositionCache][0].attr3_Typ) == (3)) ? 1 : 0))) ? 1 : 0)) && ((((local1_i_2056) == (((BOUNDS(param4_expr.attr6_Params, 0)) - (1)))) ? 1 : 0))) ? 1 : 0)) {
				break;
				
			};
			if (local1_i_2056) {
				local8_Text_Str_2055 = ((local8_Text_Str_2055) + (", "));
				
			};
			if ((((((((((param4_func) != (-(1))) ? 1 : 0)) && (((global8_Compiler.attr5_Funcs_ref[0].arrAccess(param4_func).values[tmpPositionCache][0].attr15_UsedAsPrototype) ? 0 : 1))) ? 1 : 0)) && ((((global8_Compiler.attr5_Varis_ref[0].arrAccess(global8_Compiler.attr5_Funcs_ref[0].arrAccess(param4_func).values[tmpPositionCache][0].attr6_Params.arrAccess(~~(local1_i_2056)).values[tmpPositionCache]).values[tmpPositionCache][0].attr3_ref) == (0)) ? 1 : 0))) ? 1 : 0)) {
				local8_Text_Str_2055 = ((local8_Text_Str_2055) + (func14_JSTryUnref_Str(local5_param_2057)));
				
			} else {
				local8_Text_Str_2055 = ((local8_Text_Str_2055) + (func16_JSRemoveLast_Str(func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(local5_param_2057).values[tmpPositionCache][0])), "[0]")));
				
			};
			local1_i_2056+=1;
			
		}
		forEachSaver11141.values[forEachCounter11141] = local5_param_2057;
	
	};
	if (param7_DoParam) {
		local8_Text_Str_2055 = ((local8_Text_Str_2055) + (")"));
		
	};
	return tryClone(local8_Text_Str_2055);
	return "";
	
};
func17_JSDoParameter_Str = window['func17_JSDoParameter_Str'];
window['func13_JSVariDef_Str'] = function(param5_Varis, param12_ForceDefault, param8_NoStatic) {
	var local8_Text_Str_2061 = "", local4_Find_2062 = 0.0;
	local8_Text_Str_2061 = "";
	local4_Find_2062 = 0;
	var forEachSaver11288 = param5_Varis;
	for(var forEachCounter11288 = 0 ; forEachCounter11288 < forEachSaver11288.values.length ; forEachCounter11288++) {
		var local3_Var_2063 = forEachSaver11288.values[forEachCounter11288];
	{
			if ((((((((((global8_Compiler.attr5_Varis_ref[0].arrAccess(local3_Var_2063).values[tmpPositionCache][0].attr3_Typ) != (5)) ? 1 : 0)) && (((((((param8_NoStatic) == (0)) ? 1 : 0)) || ((((global8_Compiler.attr5_Varis_ref[0].arrAccess(local3_Var_2063).values[tmpPositionCache][0].attr3_Typ) != (4)) ? 1 : 0))) ? 1 : 0))) ? 1 : 0)) && (func17_JSShouldRedeclare(local3_Var_2063))) ? 1 : 0)) {
				if (local4_Find_2062) {
					local8_Text_Str_2061 = ((local8_Text_Str_2061) + (", "));
					
				};
				local8_Text_Str_2061 = ((((local8_Text_Str_2061) + (global8_Compiler.attr5_Varis_ref[0].arrAccess(local3_Var_2063).values[tmpPositionCache][0].attr8_Name_Str))) + (" = "));
				if (((((((global8_Compiler.attr5_Varis_ref[0].arrAccess(local3_Var_2063).values[tmpPositionCache][0].attr6_PreDef) != (-(1))) ? 1 : 0)) && (((((((param12_ForceDefault) == (0)) ? 1 : 0)) || ((((global8_Compiler.attr5_Varis_ref[0].arrAccess(local3_Var_2063).values[tmpPositionCache][0].attr3_Typ) == (6)) ? 1 : 0))) ? 1 : 0))) ? 1 : 0)) {
					local8_Text_Str_2061 = ((local8_Text_Str_2061) + (func14_JSGenerate_Str(unref(global5_Exprs_ref[0].arrAccess(global8_Compiler.attr5_Varis_ref[0].arrAccess(local3_Var_2063).values[tmpPositionCache][0].attr6_PreDef).values[tmpPositionCache][0]))));
					
				} else {
					local8_Text_Str_2061 = ((local8_Text_Str_2061) + (func21_JSGetDefaultValue_Str(global8_Compiler.attr5_Varis_ref[0].arrAccess(local3_Var_2063).values[tmpPositionCache][0].attr8_datatype, global8_Compiler.attr5_Varis_ref[0].arrAccess(local3_Var_2063).values[tmpPositionCache][0].attr3_ref, 0)));
					
				};
				local4_Find_2062 = 1;
				
			};
			
		}
		forEachSaver11288.values[forEachCounter11288] = local3_Var_2063;
	
	};
	return tryClone(local8_Text_Str_2061);
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
		var forEachSaver11343 = global8_Compiler.attr5_Funcs_ref[0].arrAccess(global11_CurrentFunc).values[tmpPositionCache][0].attr10_CopyParams;
		for(var forEachCounter11343 = 0 ; forEachCounter11343 < forEachSaver11343.values.length ; forEachCounter11343++) {
			var local1_P_2066 = forEachSaver11343.values[forEachCounter11343];
		{
				if ((((local1_P_2066) == (param3_Var)) ? 1 : 0)) {
					return tryClone(0);
					
				};
				
			}
			forEachSaver11343.values[forEachCounter11343] = local1_P_2066;
		
		};
		
	};
	return 1;
	return 0;
	
};
func17_JSShouldRedeclare = window['func17_JSShouldRedeclare'];
window['func21_JSGetDefaultValue_Str'] = function(param8_datatype, param3_Ref, param11_IgnoreArray) {
	var local10_RetVal_Str_2070 = "";
	local10_RetVal_Str_2070 = "";
	if ((((param8_datatype.attr7_IsArray_ref[0]) && ((((param11_IgnoreArray) == (0)) ? 1 : 0))) ? 1 : 0)) {
		local10_RetVal_Str_2070 = "new GLBArray()";
		
	} else {
		{
			var local17___SelectHelper13__2071 = "";
			local17___SelectHelper13__2071 = param8_datatype.attr8_Name_Str_ref[0];
			if ((((local17___SelectHelper13__2071) == ("int")) ? 1 : 0)) {
				local10_RetVal_Str_2070 = "0";
				
			} else if ((((local17___SelectHelper13__2071) == ("float")) ? 1 : 0)) {
				local10_RetVal_Str_2070 = "0.0";
				
			} else if ((((local17___SelectHelper13__2071) == ("string")) ? 1 : 0)) {
				local10_RetVal_Str_2070 = "\"\"";
				
			} else {
				if (func6_IsType(unref(param8_datatype.attr8_Name_Str_ref[0]))) {
					local10_RetVal_Str_2070 = (((("new ") + (global8_LastType.attr8_Name_Str))) + ("()"));
					
				} else {
					local10_RetVal_Str_2070 = REPLACE_Str(unref(param8_datatype.attr8_Name_Str_ref[0]), "$", "_Str");
					
				};
				
			};
			
		};
		
	};
	if (param3_Ref) {
		local10_RetVal_Str_2070 = (((("[") + (local10_RetVal_Str_2070))) + ("]"));
		
	};
	return tryClone(local10_RetVal_Str_2070);
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
	var local12_Splitter_Str_2074 = new GLBArray(), local11_SplitterMap_2075 = new type7_HashMap(), local9_LastFound_2077 = 0, local4_Line_2078 = 0, local15_LineContent_Str_2079 = "", local18_NewLineContent_Str_2080 = "", local8_Path_Str_2081 = "", local9_Character_2082 = 0, local5_WasNL_2096 = 0, local6_WasRem_2097 = 0, local6_HasDel_2098 = 0, local1_i_2102 = 0.0;
	REDIM(global8_Compiler.attr6_Tokens, [0], new type5_Token() );
	global8_Compiler.attr11_LastTokenID = 0;
	DIMDATA(local12_Splitter_Str_2074, [" ", "\t", "\n", "-", "+", "*", "/", "^", ",", "=", "<", ">", "|", "&", "[", "]", "(", ")", "!", "\"", "?", ";", ".", ":", CHR_Str(8), CHR_Str(12), "\r", "\f"]);
	(local11_SplitterMap_2075).SetSize(((BOUNDS(local12_Splitter_Str_2074, 0)) * (8)));
	var forEachSaver11528 = local12_Splitter_Str_2074;
	for(var forEachCounter11528 = 0 ; forEachCounter11528 < forEachSaver11528.values.length ; forEachCounter11528++) {
		var local9_Split_Str_2076 = forEachSaver11528.values[forEachCounter11528];
	{
			(local11_SplitterMap_2075).Put(local9_Split_Str_2076, 1);
			
		}
		forEachSaver11528.values[forEachCounter11528] = local9_Split_Str_2076;
	
	};
	global8_Compiler.attr8_Code_Str = (("\n") + (global8_Compiler.attr8_Code_Str));
	{
		var local1_i_2083 = 0;
		for (local1_i_2083 = 0;toCheck(local1_i_2083, (((global8_Compiler.attr8_Code_Str).length) - (1)), 1);local1_i_2083 += 1) {
			var local14_DoubleChar_Str_2084 = "", local11_curChar_Str_2087 = "", local15_TmpLineCont_Str_2088 = "";
			local9_Character_2082+=1;
			if ((((local1_i_2083) < ((((global8_Compiler.attr8_Code_Str).length) - (2)))) ? 1 : 0)) {
				local14_DoubleChar_Str_2084 = MID_Str(global8_Compiler.attr8_Code_Str, local1_i_2083, 2);
				
			};
			if ((((local14_DoubleChar_Str_2084) == ("//")) ? 1 : 0)) {
				var local8_Text_Str_2085 = "", local3_Pos_2086 = 0;
				local8_Text_Str_2085 = MID_Str(global8_Compiler.attr8_Code_Str, local9_LastFound_2077, ((local1_i_2083) - (local9_LastFound_2077)));
				if ((((TRIM_Str(local8_Text_Str_2085, " \t\r\n\v\f")) != ("")) ? 1 : 0)) {
					func11_CreateToken(local8_Text_Str_2085, local15_LineContent_Str_2079, local4_Line_2078, local9_Character_2082, local8_Path_Str_2081);
					
				};
				local3_Pos_2086 = local1_i_2083;
				while (((((((MID_Str(global8_Compiler.attr8_Code_Str, local1_i_2083, 1)) != ("\n")) ? 1 : 0)) && ((((MID_Str(global8_Compiler.attr8_Code_Str, local1_i_2083, 1)) != ("\f")) ? 1 : 0))) ? 1 : 0)) {
					local1_i_2083+=1;
					
				};
				local8_Text_Str_2085 = MID_Str(global8_Compiler.attr8_Code_Str, local3_Pos_2086, ((local1_i_2083) - (local3_Pos_2086)));
				if ((((((((local8_Text_Str_2085).length) > (("//$$RESETFILE").length)) ? 1 : 0)) && ((((LEFT_Str(local8_Text_Str_2085, ("//$$RESETFILE").length)) == ("//$$RESETFILE")) ? 1 : 0))) ? 1 : 0)) {
					local8_Text_Str_2085 = MID_Str(local8_Text_Str_2085, ((("//$$RESETFILE").length) + (1)), -(1));
					local8_Path_Str_2081 = local8_Text_Str_2085;
					local4_Line_2078 = 0;
					
				};
				local9_LastFound_2077 = local1_i_2083;
				
			};
			local11_curChar_Str_2087 = MID_Str(global8_Compiler.attr8_Code_Str, local1_i_2083, 1);
			local15_TmpLineCont_Str_2088 = local15_LineContent_Str_2079;
			if ((((local11_curChar_Str_2087) == ("\f")) ? 1 : 0)) {
				local11_curChar_Str_2087 = "\n";
				
			};
			{
				var local17___SelectHelper14__2089 = "";
				local17___SelectHelper14__2089 = local11_curChar_Str_2087;
				if ((((local17___SelectHelper14__2089) == ("\n")) ? 1 : 0)) {
					local9_Character_2082 = 0;
					local4_Line_2078+=1;
					{
						var local1_j_2090 = 0;
						for (local1_j_2090 = ((local1_i_2083) + (1));toCheck(local1_j_2090, (((global8_Compiler.attr8_Code_Str).length) - (1)), 1);local1_j_2090 += 1) {
							if (((((((MID_Str(global8_Compiler.attr8_Code_Str, local1_j_2090, 1)) == ("\n")) ? 1 : 0)) || ((((MID_Str(global8_Compiler.attr8_Code_Str, local1_j_2090, 1)) == ("\f")) ? 1 : 0))) ? 1 : 0)) {
								local15_TmpLineCont_Str_2088 = TRIM_Str(MID_Str(global8_Compiler.attr8_Code_Str, local1_i_2083, ((local1_j_2090) - (local1_i_2083))), " \t\r\n\v\f");
								if ((((RIGHT_Str(local15_TmpLineCont_Str_2088, 1)) == ("\f")) ? 1 : 0)) {
									local15_TmpLineCont_Str_2088 = ((MID_Str(local15_TmpLineCont_Str_2088, 0, (((local15_TmpLineCont_Str_2088).length) - (1)))) + ("\n"));
									
								};
								break;
								
							};
							
						};
						
					};
					
				} else if ((((local17___SelectHelper14__2089) == ("\"")) ? 1 : 0)) {
					var local12_WasBackSlash_2091 = 0, local10_WasWasBack_2092 = 0;
					local12_WasBackSlash_2091 = 0;
					local10_WasWasBack_2092 = 0;
					{
						var local1_j_2093 = 0;
						for (local1_j_2093 = ((local1_i_2083) + (1));toCheck(local1_j_2093, (((global8_Compiler.attr8_Code_Str).length) - (1)), 1);local1_j_2093 += 1) {
							if (((((((MID_Str(global8_Compiler.attr8_Code_Str, local1_j_2093, 1)) == ("\"")) ? 1 : 0)) && (((((((local12_WasBackSlash_2091) == (0)) ? 1 : 0)) || (local10_WasWasBack_2092)) ? 1 : 0))) ? 1 : 0)) {
								local1_i_2083 = local1_j_2093;
								break;
								
							};
							local10_WasWasBack_2092 = local12_WasBackSlash_2091;
							local12_WasBackSlash_2091 = 0;
							if ((((MID_Str(global8_Compiler.attr8_Code_Str, local1_j_2093, 1)) == ("\\")) ? 1 : 0)) {
								local12_WasBackSlash_2091 = 1;
								
							};
							
						};
						
					};
					continue;
					
				};
				
			};
			if ((local11_SplitterMap_2075).DoesKeyExist(local11_curChar_Str_2087)) {
				var local9_Split_Str_2094 = "", local8_Text_Str_2095 = "";
				local9_Split_Str_2094 = local11_curChar_Str_2087;
				local8_Text_Str_2095 = MID_Str(global8_Compiler.attr8_Code_Str, local9_LastFound_2077, ((local1_i_2083) - (local9_LastFound_2077)));
				if ((((local8_Text_Str_2095) == (";")) ? 1 : 0)) {
					local8_Text_Str_2095 = "\n";
					
				};
				func11_CreateToken(local8_Text_Str_2095, local15_LineContent_Str_2079, local4_Line_2078, local9_Character_2082, local8_Path_Str_2081);
				local8_Text_Str_2095 = MID_Str(global8_Compiler.attr8_Code_Str, local1_i_2083, (local9_Split_Str_2094).length);
				if ((((local8_Text_Str_2095) == (";")) ? 1 : 0)) {
					local8_Text_Str_2095 = "\n";
					
				};
				func11_CreateToken(local8_Text_Str_2095, local15_LineContent_Str_2079, local4_Line_2078, local9_Character_2082, local8_Path_Str_2081);
				local9_LastFound_2077 = ((local1_i_2083) + ((local9_Split_Str_2094).length));
				
			};
			local15_LineContent_Str_2079 = local15_TmpLineCont_Str_2088;
			
		};
		
	};
	func11_CreateToken("__EOFFILE__", "__EOFFILE__", local4_Line_2078, 0, local8_Path_Str_2081);
	func11_CreateToken("\n", "__EOFFILE__", local4_Line_2078, 0, local8_Path_Str_2081);
	local5_WasNL_2096 = 0;
	local6_WasRem_2097 = 0;
	local6_HasDel_2098 = 0;
	{
		var local1_i_2099 = 0.0;
		for (local1_i_2099 = 0;toCheck(local1_i_2099, ((global8_Compiler.attr11_LastTokenID) - (1)), 1);local1_i_2099 += 1) {
			var local8_Text_Str_2100 = "";
			if (local6_HasDel_2098) {
				local6_HasDel_2098 = 0;
				global8_Compiler.attr6_Tokens.arrAccess(~~(local1_i_2099)).values[tmpPositionCache].attr5_IsDel = 1;
				continue;
				
			};
			local8_Text_Str_2100 = global8_Compiler.attr6_Tokens.arrAccess(~~(local1_i_2099)).values[tmpPositionCache].attr8_Text_Str_ref[0];
			if ((((global8_Compiler.attr6_Tokens.arrAccess(~~(local1_i_2099)).values[tmpPositionCache].attr8_Text_Str_ref[0]) == ("\n")) ? 1 : 0)) {
				local8_Text_Str_2100 = "NEWLINE";
				if (local5_WasNL_2096) {
					global8_Compiler.attr6_Tokens.arrAccess(~~(local1_i_2099)).values[tmpPositionCache].attr5_IsDel = 1;
					continue;
					
				};
				local5_WasNL_2096 = 1;
				
			} else {
				local5_WasNL_2096 = 0;
				
			};
			if ((((global8_Compiler.attr6_Tokens.arrAccess(~~(local1_i_2099)).values[tmpPositionCache].attr8_Text_Str_ref[0]) == ("REM")) ? 1 : 0)) {
				local6_WasRem_2097 = 1;
				
			};
			if ((((local6_WasRem_2097) && ((((global8_Compiler.attr6_Tokens.arrAccess(~~(local1_i_2099)).values[tmpPositionCache].attr8_Text_Str_ref[0]) == ("ENDREM")) ? 1 : 0))) ? 1 : 0)) {
				local6_WasRem_2097 = 0;
				local6_HasDel_2098 = 1;
				global8_Compiler.attr6_Tokens.arrAccess(~~(local1_i_2099)).values[tmpPositionCache].attr5_IsDel = 1;
				continue;
				
			};
			if (local6_WasRem_2097) {
				global8_Compiler.attr6_Tokens.arrAccess(~~(local1_i_2099)).values[tmpPositionCache].attr5_IsDel = 1;
				continue;
				
			};
			if ((((local1_i_2099) < (((global8_Compiler.attr11_LastTokenID) - (1)))) ? 1 : 0)) {
				{
					var local17___SelectHelper15__2101 = "";
					local17___SelectHelper15__2101 = global8_Compiler.attr6_Tokens.arrAccess(~~(local1_i_2099)).values[tmpPositionCache].attr8_Text_Str_ref[0];
					if ((((local17___SelectHelper15__2101) == ("<")) ? 1 : 0)) {
						if ((((global8_Compiler.attr6_Tokens.arrAccess(~~(((local1_i_2099) + (1)))).values[tmpPositionCache].attr8_Text_Str_ref[0]) == (">")) ? 1 : 0)) {
							global8_Compiler.attr6_Tokens.arrAccess(~~(((local1_i_2099) + (1)))).values[tmpPositionCache].attr5_IsDel = 1;
							global8_Compiler.attr6_Tokens.arrAccess(~~(local1_i_2099)).values[tmpPositionCache].attr8_Text_Str_ref[0] = "<>";
							
						};
						if ((((global8_Compiler.attr6_Tokens.arrAccess(~~(((local1_i_2099) + (1)))).values[tmpPositionCache].attr8_Text_Str_ref[0]) == ("=")) ? 1 : 0)) {
							global8_Compiler.attr6_Tokens.arrAccess(~~(((local1_i_2099) + (1)))).values[tmpPositionCache].attr5_IsDel = 1;
							global8_Compiler.attr6_Tokens.arrAccess(~~(local1_i_2099)).values[tmpPositionCache].attr8_Text_Str_ref[0] = "<=";
							
						};
						
					} else if ((((local17___SelectHelper15__2101) == (">")) ? 1 : 0)) {
						if ((((global8_Compiler.attr6_Tokens.arrAccess(~~(((local1_i_2099) + (1)))).values[tmpPositionCache].attr8_Text_Str_ref[0]) == ("=")) ? 1 : 0)) {
							global8_Compiler.attr6_Tokens.arrAccess(~~(((local1_i_2099) + (1)))).values[tmpPositionCache].attr5_IsDel = 1;
							global8_Compiler.attr6_Tokens.arrAccess(~~(local1_i_2099)).values[tmpPositionCache].attr8_Text_Str_ref[0] = ">=";
							
						};
						
					};
					
				};
				
			};
			
		};
		
	};
	local1_i_2102 = 0;
	return 0;
	
};
func5_Lexer = window['func5_Lexer'];
window['func7_VariDef'] = function(param9_NoDefault) {
	var local8_Name_Str_2104 = "", local12_datatype_Str_2105 = "", local7_IsArray_2106 = 0, local12_RightTok_Str_2107 = "", local11_LeftTok_Str_2108 = "", local6_DefVal_2109 = 0, local4_dims_2110 = new GLBArray(), local4_vari_2113 = new type14_IdentifierVari();
	local8_Name_Str_2104 = func14_GetCurrent_Str();
	func14_IsValidVarName();
	func5_Match(local8_Name_Str_2104, 10, "src\CompilerPasses\Parser.gbas");
	local12_datatype_Str_2105 = "float";
	local7_IsArray_2106 = 0;
	local12_RightTok_Str_2107 = RIGHT_Str(local8_Name_Str_2104, 1);
	local11_LeftTok_Str_2108 = LEFT_Str(local8_Name_Str_2104, (((local8_Name_Str_2104).length) - (1)));
	local6_DefVal_2109 = -(1);
	{
		var local17___SelectHelper16__2111 = "";
		local17___SelectHelper16__2111 = local12_RightTok_Str_2107;
		if ((((local17___SelectHelper16__2111) == ("%")) ? 1 : 0)) {
			local12_datatype_Str_2105 = "int";
			local8_Name_Str_2104 = local11_LeftTok_Str_2108;
			
		} else if ((((local17___SelectHelper16__2111) == ("#")) ? 1 : 0)) {
			local12_datatype_Str_2105 = "float";
			local8_Name_Str_2104 = local11_LeftTok_Str_2108;
			
		} else if ((((local17___SelectHelper16__2111) == ("$")) ? 1 : 0)) {
			local12_datatype_Str_2105 = "string";
			
		};
		
	};
	if (func7_IsToken("[")) {
		func5_Match("[", 32, "src\CompilerPasses\Parser.gbas");
		if (func7_IsToken("]")) {
			func5_Match("]", 34, "src\CompilerPasses\Parser.gbas");
			
		} else {
			var local1_E_2112 = 0;
			local1_E_2112 = func14_EnsureDatatype(func10_Expression(0), global11_intDatatype, 36, 0);
			func5_Match("]", 37, "src\CompilerPasses\Parser.gbas");
			DIMPUSH(local4_dims_2110, local1_E_2112);
			while (func7_IsToken("[")) {
				func5_Match("[", 40, "src\CompilerPasses\Parser.gbas");
				local1_E_2112 = func14_EnsureDatatype(func10_Expression(0), global11_intDatatype, 41, 0);
				DIMPUSH(local4_dims_2110, local1_E_2112);
				func5_Match("]", 43, "src\CompilerPasses\Parser.gbas");
				
			};
			
		};
		local7_IsArray_2106 = 1;
		
	};
	if (func7_IsToken("AS")) {
		if ((((local12_datatype_Str_2105) == ("float")) ? 1 : 0)) {
			func5_Match("AS", 51, "src\CompilerPasses\Parser.gbas");
			if (((((((((((((((((((func7_IsToken("int")) || (func7_IsToken("short"))) ? 1 : 0)) || (func7_IsToken("byte"))) ? 1 : 0)) || (func7_IsToken("bool"))) ? 1 : 0)) || (func7_IsToken("boolean"))) ? 1 : 0)) || (func7_IsToken("long"))) ? 1 : 0)) || (func7_IsToken("single"))) ? 1 : 0)) {
				local12_datatype_Str_2105 = "int";
				
			} else if ((((func7_IsToken("float")) || (func7_IsToken("double"))) ? 1 : 0)) {
				local12_datatype_Str_2105 = "float";
				
			} else if (func7_IsToken("void")) {
				local12_datatype_Str_2105 = "void";
				
			} else if (func7_IsToken("string")) {
				local12_datatype_Str_2105 = "string";
				
			} else {
				func15_IsValidDatatype();
				local12_datatype_Str_2105 = func14_GetCurrent_Str();
				
			};
			func7_GetNext();
			
		} else {
			func5_Error("Unexpected AS", 66, "src\CompilerPasses\Parser.gbas");
			
		};
		
	};
	local4_vari_2113.attr8_Name_Str = local8_Name_Str_2104;
	local4_vari_2113.attr8_datatype.attr8_Name_Str_ref[0] = local12_datatype_Str_2105;
	local4_vari_2113.attr8_datatype.attr7_IsArray_ref[0] = local7_IsArray_2106;
	if ((((BOUNDS(local4_dims_2110, 0)) > (0)) ? 1 : 0)) {
		local6_DefVal_2109 = func25_CreateDimAsExprExpression(local4_vari_2113.attr8_datatype, unref(local4_dims_2110));
		
	};
	if ((((func7_IsToken("=")) && (((param9_NoDefault) ? 0 : 1))) ? 1 : 0)) {
		func5_Match("=", 80, "src\CompilerPasses\Parser.gbas");
		local6_DefVal_2109 = func14_EnsureDatatype(func10_Expression(0), local4_vari_2113.attr8_datatype, 81, 0);
		
	};
	local4_vari_2113.attr6_PreDef = local6_DefVal_2109;
	return tryClone(local4_vari_2113);
	return tryClone(unref(new type14_IdentifierVari()));
	
};
func7_VariDef = window['func7_VariDef'];
window['func7_FuncDef'] = function(param6_Native, param10_IsCallBack, param3_Typ, param6_CurTyp) {
	var local8_Name_Str_2118 = "";
	if ((((param3_Typ) == (4)) ? 1 : 0)) {
		func5_Match("PROTOTYPE", 91, "src\CompilerPasses\Parser.gbas");
		
	} else {
		func5_Match("FUNCTION", 93, "src\CompilerPasses\Parser.gbas");
		
	};
	local8_Name_Str_2118 = func14_GetCurrent_Str();
	var forEachSaver12782 = global8_Compiler.attr5_Funcs_ref[0];
	for(var forEachCounter12782 = 0 ; forEachCounter12782 < forEachSaver12782.values.length ; forEachCounter12782++) {
		var local4_func_ref_2119 = forEachSaver12782.values[forEachCounter12782];
	{
			if (((((((((((((func7_IsToken(func16_AddDataChars_Str(local4_func_ref_2119[0].attr8_Name_Str, unref(local4_func_ref_2119[0])))) || (func7_IsToken(local4_func_ref_2119[0].attr8_Name_Str))) ? 1 : 0)) && ((((local4_func_ref_2119[0].attr10_IsCallback) == (param10_IsCallBack)) ? 1 : 0))) ? 1 : 0)) && ((((local4_func_ref_2119[0].attr3_Typ) == (param3_Typ)) ? 1 : 0))) ? 1 : 0)) && ((((local4_func_ref_2119[0].attr6_MyType) == (param6_CurTyp)) ? 1 : 0))) ? 1 : 0)) {
				var local7_tmpVari_2120 = new type14_IdentifierVari(), local10_MustDefVal_2121 = 0;
				local7_tmpVari_2120 = func7_VariDef(0).clone(/* In Assign */);
				func5_Match(":", 104, "src\CompilerPasses\Parser.gbas");
				local10_MustDefVal_2121 = 0;
				while ((((func7_IsToken("\n")) == (0)) ? 1 : 0)) {
					var local3_ref_2122 = 0, local4_vari_ref_2123 = [new type14_IdentifierVari()];
					local3_ref_2122 = 0;
					if (func7_IsToken("BYREF")) {
						local3_ref_2122 = 1;
						func5_Match("BYREF", 111, "src\CompilerPasses\Parser.gbas");
						local4_func_ref_2119[0].attr6_HasRef = 1;
						
					};
					local4_vari_ref_2123[0] = func7_VariDef(0).clone(/* In Assign */);
					if (local10_MustDefVal_2121) {
						if ((((local4_vari_ref_2123[0].attr6_PreDef) == (-(1))) ? 1 : 0)) {
							func5_Error((((("Parameter '") + (local4_vari_ref_2123[0].attr8_Name_Str))) + ("' has to have default value.")), 117, "src\CompilerPasses\Parser.gbas");
							
						};
						
					} else {
						if ((((local4_vari_ref_2123[0].attr6_PreDef) != (-(1))) ? 1 : 0)) {
							local10_MustDefVal_2121 = 1;
							
						};
						
					};
					local4_vari_ref_2123[0].attr3_Typ = ~~(5);
					local4_vari_ref_2123[0].attr3_ref = local3_ref_2122;
					local4_vari_ref_2123[0].attr2_ID = BOUNDS(global8_Compiler.attr5_Varis_ref[0], 0);
					DIMPUSH(global8_Compiler.attr5_Varis_ref[0], local4_vari_ref_2123);
					DIMPUSH(local4_func_ref_2119[0].attr6_Params, ((BOUNDS(global8_Compiler.attr5_Varis_ref[0], 0)) - (1)));
					if ((((func7_IsToken("\n")) == (0)) ? 1 : 0)) {
						func5_Match(",", 126, "src\CompilerPasses\Parser.gbas");
						
					};
					
				};
				(global8_Compiler.attr11_GlobalFuncs).Put(local4_func_ref_2119[0].attr8_Name_Str, local4_func_ref_2119[0].attr2_ID);
				if ((((param3_Typ) != (4)) ? 1 : 0)) {
					if (((((((param6_Native) == (0)) ? 1 : 0)) && ((((local4_func_ref_2119[0].attr10_IsAbstract) == (0)) ? 1 : 0))) ? 1 : 0)) {
						local4_func_ref_2119[0].attr6_Native = 0;
						func5_Match("\n", 143, "src\CompilerPasses\Parser.gbas");
						local4_func_ref_2119[0].attr3_Tok = global8_Compiler.attr11_currentPosi;
						func10_SkipTokens("FUNCTION", "ENDFUNCTION", local4_func_ref_2119[0].attr8_Name_Str);
						
					} else {
						if (((local4_func_ref_2119[0].attr10_IsAbstract) ? 0 : 1)) {
							local4_func_ref_2119[0].attr6_Native = 1;
							
						};
						
					};
					
				};
				return 0;
				
			};
			
		}
		forEachSaver12782.values[forEachCounter12782] = local4_func_ref_2119;
	
	};
	if (param10_IsCallBack) {
		func10_SkipTokens("FUNCTION", "ENDFUNCTION", local8_Name_Str_2118);
		
	} else {
		func5_Error((((("Internal error (func definition for unknown type: ") + (local8_Name_Str_2118))) + (")")), 158, "src\CompilerPasses\Parser.gbas");
		
	};
	return 0;
	
};
func7_FuncDef = window['func7_FuncDef'];
window['func6_SubDef'] = function() {
	func5_Match("SUB", 164, "src\CompilerPasses\Parser.gbas");
	var forEachSaver12875 = global8_Compiler.attr5_Funcs_ref[0];
	for(var forEachCounter12875 = 0 ; forEachCounter12875 < forEachSaver12875.values.length ; forEachCounter12875++) {
		var local4_func_ref_2124 = forEachSaver12875.values[forEachCounter12875];
	{
			if (func7_IsToken(local4_func_ref_2124[0].attr8_Name_Str)) {
				local4_func_ref_2124[0].attr8_Name_Str = func14_GetCurrent_Str();
				local4_func_ref_2124[0].attr8_datatype = global12_voidDatatype.clone(/* In Assign */);
				local4_func_ref_2124[0].attr3_Typ = ~~(2);
				(global8_Compiler.attr11_GlobalFuncs).Put(local4_func_ref_2124[0].attr8_Name_Str, local4_func_ref_2124[0].attr2_ID);
				func5_Match(local4_func_ref_2124[0].attr8_Name_Str, 173, "src\CompilerPasses\Parser.gbas");
				func5_Match(":", 174, "src\CompilerPasses\Parser.gbas");
				func5_Match("\n", 175, "src\CompilerPasses\Parser.gbas");
				local4_func_ref_2124[0].attr3_Tok = global8_Compiler.attr11_currentPosi;
				func10_SkipTokens("SUB", "ENDSUB", local4_func_ref_2124[0].attr8_Name_Str);
				return 0;
				
			};
			
		}
		forEachSaver12875.values[forEachCounter12875] = local4_func_ref_2124;
	
	};
	func5_Error("Internal error (sub definition for unknown type)", 181, "src\CompilerPasses\Parser.gbas");
	return 0;
	
};
func6_SubDef = window['func6_SubDef'];
window['func8_TypeDefi'] = function() {
	func5_Match("TYPE", 186, "src\CompilerPasses\Parser.gbas");
	var forEachSaver13130 = global8_Compiler.attr5_Types_ref[0];
	for(var forEachCounter13130 = 0 ; forEachCounter13130 < forEachSaver13130.values.length ; forEachCounter13130++) {
		var local3_typ_ref_2125 = forEachSaver13130.values[forEachCounter13130];
	{
			if (func7_IsToken(local3_typ_ref_2125[0].attr8_Name_Str)) {
				var local11_ExtName_Str_2126 = "";
				local3_typ_ref_2125[0].attr8_Name_Str = func14_GetCurrent_Str();
				func5_Match(local3_typ_ref_2125[0].attr8_Name_Str, 190, "src\CompilerPasses\Parser.gbas");
				if (func7_IsToken("EXTENDS")) {
					func5_Match("EXTENDS", 195, "src\CompilerPasses\Parser.gbas");
					local11_ExtName_Str_2126 = func14_GetCurrent_Str();
					func7_GetNext();
					
				} else if ((((local3_typ_ref_2125[0].attr8_Name_Str) != ("TObject")) ? 1 : 0)) {
					local11_ExtName_Str_2126 = "TObject";
					
				};
				if ((((local11_ExtName_Str_2126) != ("")) ? 1 : 0)) {
					if ((((local11_ExtName_Str_2126) == (local3_typ_ref_2125[0].attr8_Name_Str)) ? 1 : 0)) {
						func5_Error("Type cannot extend itself!", 202, "src\CompilerPasses\Parser.gbas");
						
					};
					var forEachSaver12975 = global8_Compiler.attr5_Types_ref[0];
					for(var forEachCounter12975 = 0 ; forEachCounter12975 < forEachSaver12975.values.length ; forEachCounter12975++) {
						var local1_T_ref_2127 = forEachSaver12975.values[forEachCounter12975];
					{
							if ((((local1_T_ref_2127[0].attr8_Name_Str) == (local11_ExtName_Str_2126)) ? 1 : 0)) {
								local3_typ_ref_2125[0].attr9_Extending = local1_T_ref_2127[0].attr2_ID;
								break;
								
							};
							
						}
						forEachSaver12975.values[forEachCounter12975] = local1_T_ref_2127;
					
					};
					
				};
				if (func7_IsToken(":")) {
					func5_Match(":", 211, "src\CompilerPasses\Parser.gbas");
					
				};
				func5_Match("\n", 212, "src\CompilerPasses\Parser.gbas");
				var forEachSaver13041 = local3_typ_ref_2125[0].attr7_Methods;
				for(var forEachCounter13041 = 0 ; forEachCounter13041 < forEachSaver13041.values.length ; forEachCounter13041++) {
					var local2_M1_2128 = forEachSaver13041.values[forEachCounter13041];
				{
						var forEachSaver13040 = local3_typ_ref_2125[0].attr7_Methods;
						for(var forEachCounter13040 = 0 ; forEachCounter13040 < forEachSaver13040.values.length ; forEachCounter13040++) {
							var local2_M2_2129 = forEachSaver13040.values[forEachCounter13040];
						{
								if (((((((local2_M1_2128) != (local2_M2_2129)) ? 1 : 0)) && ((((global8_Compiler.attr5_Funcs_ref[0].arrAccess(local2_M2_2129).values[tmpPositionCache][0].attr8_Name_Str) == (global8_Compiler.attr5_Funcs_ref[0].arrAccess(local2_M1_2128).values[tmpPositionCache][0].attr8_Name_Str)) ? 1 : 0))) ? 1 : 0)) {
									func5_Error((((("Method '") + (global8_Compiler.attr5_Funcs_ref[0].arrAccess(local2_M1_2128).values[tmpPositionCache][0].attr8_Name_Str))) + ("' already exists")), 215, "src\CompilerPasses\Parser.gbas");
									
								};
								
							}
							forEachSaver13040.values[forEachCounter13040] = local2_M2_2129;
						
						};
						
					}
					forEachSaver13041.values[forEachCounter13041] = local2_M1_2128;
				
				};
				while ((((func7_IsToken("ENDTYPE")) == (0)) ? 1 : 0)) {
					var local10_IsAbstract_2130 = 0;
					local10_IsAbstract_2130 = 0;
					if (func7_IsToken("ABSTRACT")) {
						func5_Match("ABSTRACT", 221, "src\CompilerPasses\Parser.gbas");
						local10_IsAbstract_2130 = 1;
						
					};
					if (func7_IsToken("FUNCTION")) {
						if (local10_IsAbstract_2130) {
							func10_SkipTokens("FUNCTION", "\n", "ABSTRACT FUNCTION");
							
						} else {
							func10_SkipTokens("FUNCTION", "ENDFUNCTION", "FUNCTION IN TYPE");
							
						};
						
					} else {
						var local4_Vari_2131 = new type14_IdentifierVari();
						local4_Vari_2131 = func7_VariDef(0).clone(/* In Assign */);
						local4_Vari_2131.attr3_Typ = ~~(3);
						func11_AddVariable(local4_Vari_2131, 1);
						DIMPUSH(local3_typ_ref_2125[0].attr10_Attributes, ((BOUNDS(global8_Compiler.attr5_Varis_ref[0], 0)) - (1)));
						
					};
					if ((((func7_IsToken("ENDTYPE")) == (0)) ? 1 : 0)) {
						func5_Match("\n", 248, "src\CompilerPasses\Parser.gbas");
						
					};
					
				};
				func5_Match("ENDTYPE", 251, "src\CompilerPasses\Parser.gbas");
				return 0;
				
			};
			
		}
		forEachSaver13130.values[forEachCounter13130] = local3_typ_ref_2125;
	
	};
	func5_Error("Internal error (type definition for unknown type)", 255, "src\CompilerPasses\Parser.gbas");
	return 0;
	
};
func8_TypeDefi = window['func8_TypeDefi'];
window['func11_CompileFunc'] = function(param4_func) {
	if ((((((((((param4_func.attr3_Scp) == (-(1))) ? 1 : 0)) && ((((param4_func.attr6_Native) == (0)) ? 1 : 0))) ? 1 : 0)) && ((((param4_func.attr10_PlzCompile) == (1)) ? 1 : 0))) ? 1 : 0)) {
		var local6_TmpScp_2713 = 0.0, local3_Tok_2714 = 0, local7_Curfunc_2715 = 0.0, local3_Scp_2717 = 0;
		if (param4_func.attr10_IsAbstract) {
			
		};
		local6_TmpScp_2713 = global8_Compiler.attr12_CurrentScope;
		global8_Compiler.attr12_CurrentScope = global8_Compiler.attr9_MainScope;
		local3_Tok_2714 = global8_Compiler.attr11_currentPosi;
		local7_Curfunc_2715 = global8_Compiler.attr11_currentFunc;
		global8_Compiler.attr11_currentFunc = param4_func.attr2_ID;
		global8_Compiler.attr11_currentPosi = ((param4_func.attr3_Tok) - (1));
		if (((((((param4_func.attr3_Tok) == (0)) ? 1 : 0)) && (((param4_func.attr10_IsAbstract) ? 0 : 1))) ? 1 : 0)) {
			func5_Error("Internal error (function has no start token)", 270, "src\CompilerPasses\Parser.gbas");
			
		};
		if ((((param4_func.attr3_Typ) == (3)) ? 1 : 0)) {
			var local4_Vari_2716 = new type14_IdentifierVari();
			local4_Vari_2716.attr8_Name_Str = "self";
			local4_Vari_2716.attr8_datatype.attr8_Name_Str_ref[0] = global8_Compiler.attr5_Types_ref[0].arrAccess(param4_func.attr6_MyType).values[tmpPositionCache][0].attr8_Name_Str;
			local4_Vari_2716.attr8_datatype.attr7_IsArray_ref[0] = 0;
			local4_Vari_2716.attr3_Typ = ~~(5);
			func11_AddVariable(local4_Vari_2716, 1);
			DIMPUSH(param4_func.attr6_Params, local4_Vari_2716.attr2_ID);
			param4_func.attr7_SelfVar = local4_Vari_2716.attr2_ID;
			
		};
		func7_GetNext();
		{
			var Err_Str = "";
			try {
				if (((param4_func.attr10_IsAbstract) ? 0 : 1)) {
					if ((((param4_func.attr3_Typ) == (2)) ? 1 : 0)) {
						local3_Scp_2717 = func5_Scope("ENDSUB", param4_func.attr2_ID);
						
					} else {
						var local1_e_2718 = 0;
						local3_Scp_2717 = func5_Scope("ENDFUNCTION", param4_func.attr2_ID);
						local1_e_2718 = func22_CreateReturnExpression(func28_CreateDefaultValueExpression(param4_func.attr8_datatype));
						DIMPUSH(global5_Exprs_ref[0].arrAccess(local3_Scp_2717).values[tmpPositionCache][0].attr5_Exprs, local1_e_2718);
						
					};
					
				} else {
					local3_Scp_2717 = func21_CreateScopeExpression(~~(2));
					DIMPUSH(global5_Exprs_ref[0].arrAccess(local3_Scp_2717).values[tmpPositionCache][0].attr5_Exprs, func21_CreateEmptyExpression());
					
				};
				
			} catch (Err_Str) {
				if (Err_Str instanceof GLBException) Err_Str = Err_Str.getText(); else throwError(Err_Str);{
					local3_Scp_2717 = func21_CreateEmptyExpression();
					
				}
			};
			
		};
		param4_func.attr3_Scp = local3_Scp_2717;
		global8_Compiler.attr11_currentPosi = ((local3_Tok_2714) - (1));
		func7_GetNext();
		global8_Compiler.attr11_currentFunc = ~~(local7_Curfunc_2715);
		global8_Compiler.attr12_CurrentScope = ~~(local6_TmpScp_2713);
		return 1;
		
	} else {
		return tryClone(0);
		
	};
	return 0;
	
};
func11_CompileFunc = window['func11_CompileFunc'];
window['func10_Expression'] = function(param4_Prio) {
	if ((((param4_Prio) < (15)) ? 1 : 0)) {
		var local4_Left_2133 = 0, local5_Right_2134 = 0, local5_Found_2135 = 0;
		local4_Left_2133 = func10_Expression(((param4_Prio) + (1)));
		local5_Right_2134 = -(1);
		local5_Found_2135 = 0;
		do {
			local5_Found_2135 = 0;
			var forEachSaver13233 = global9_Operators_ref[0];
			for(var forEachCounter13233 = 0 ; forEachCounter13233 < forEachSaver13233.values.length ; forEachCounter13233++) {
				var local2_Op_ref_2136 = forEachSaver13233.values[forEachCounter13233];
			{
					while (((((((local2_Op_ref_2136[0].attr4_Prio) == (param4_Prio)) ? 1 : 0)) && (func7_IsToken(local2_Op_ref_2136[0].attr7_Sym_Str))) ? 1 : 0)) {
						func5_Match(local2_Op_ref_2136[0].attr7_Sym_Str, 335, "src\CompilerPasses\Parser.gbas");
						local5_Right_2134 = func10_Expression(((param4_Prio) + (1)));
						local4_Left_2133 = func24_CreateOperatorExpression(unref(local2_Op_ref_2136[0]), local4_Left_2133, local5_Right_2134);
						{
							var Error_Str = "";
							try {
								var local6_Result_2137 = 0.0;
								local6_Result_2137 = func13_CalculateTree(unref(global5_Exprs_ref[0].arrAccess(local4_Left_2133).values[tmpPositionCache][0]));
								if ((((INTEGER(local6_Result_2137)) == (local6_Result_2137)) ? 1 : 0)) {
									local4_Left_2133 = func19_CreateIntExpression(~~(local6_Result_2137));
									
								} else {
									local5_Right_2134 = func21_CreateFloatExpression(local6_Result_2137);
									
								};
								
							} catch (Error_Str) {
								if (Error_Str instanceof GLBException) Error_Str = Error_Str.getText(); else throwError(Error_Str);{
									
								}
							};
							
						};
						local5_Found_2135 = 1;
						break;
						
					};
					
				}
				forEachSaver13233.values[forEachCounter13233] = local2_Op_ref_2136;
			
			};
			
		} while (!((((local5_Found_2135) == (0)) ? 1 : 0)));
		return tryClone(local4_Left_2133);
		
	} else {
		return tryClone(func6_Factor());
		
	};
	return 0;
	
};
func10_Expression = window['func10_Expression'];
window['func12_CastDatatype'] = function(param8_RetData1_ref, param8_RetData2_ref) {
	var local5_Data1_2722 = 0, local5_Data2_2723 = 0;
	local5_Data1_2722 = param8_RetData1_ref[0];
	local5_Data2_2723 = param8_RetData2_ref[0];
	if ((((global5_Exprs_ref[0].arrAccess(local5_Data1_2722).values[tmpPositionCache][0].attr8_datatype.attr7_IsArray_ref[0]) == (global5_Exprs_ref[0].arrAccess(local5_Data2_2723).values[tmpPositionCache][0].attr8_datatype.attr7_IsArray_ref[0])) ? 1 : 0)) {
		if ((((global5_Exprs_ref[0].arrAccess(local5_Data1_2722).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str_ref[0]) == (global5_Exprs_ref[0].arrAccess(local5_Data2_2723).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str_ref[0])) ? 1 : 0)) {
			param8_RetData1_ref[0] = local5_Data1_2722;
			param8_RetData2_ref[0] = local5_Data2_2723;
			return tryClone(global5_Exprs_ref[0].arrAccess(param8_RetData1_ref[0]).values[tmpPositionCache][0].attr8_datatype);
			
		} else {
			if ((((global5_Exprs_ref[0].arrAccess(local5_Data1_2722).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str_ref[0]) == ("string")) ? 1 : 0)) {
				param8_RetData2_ref[0] = func27_CreateCast2StringExpression(local5_Data2_2723);
				
			} else if ((((global5_Exprs_ref[0].arrAccess(local5_Data2_2723).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str_ref[0]) == ("string")) ? 1 : 0)) {
				param8_RetData1_ref[0] = func27_CreateCast2StringExpression(local5_Data1_2722);
				
			} else if ((((global5_Exprs_ref[0].arrAccess(local5_Data1_2722).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str_ref[0]) == ("float")) ? 1 : 0)) {
				param8_RetData2_ref[0] = func26_CreateCast2FloatExpression(local5_Data2_2723);
				
			} else if ((((global5_Exprs_ref[0].arrAccess(local5_Data2_2723).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str_ref[0]) == ("float")) ? 1 : 0)) {
				param8_RetData1_ref[0] = func26_CreateCast2FloatExpression(local5_Data1_2722);
				
			} else {
				func5_Error((((((((((((("Cannot cast '") + (global5_Exprs_ref[0].arrAccess(local5_Data1_2722).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str_ref[0]))) + (func20_BuildArrBrackets_Str(unref(global5_Exprs_ref[0].arrAccess(local5_Data1_2722).values[tmpPositionCache][0].attr8_datatype.attr7_IsArray_ref[0]))))) + ("' to '"))) + (global5_Exprs_ref[0].arrAccess(local5_Data2_2723).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str_ref[0]))) + (func20_BuildArrBrackets_Str(unref(global5_Exprs_ref[0].arrAccess(local5_Data2_2723).values[tmpPositionCache][0].attr8_datatype.attr7_IsArray_ref[0]))))) + ("'")), 380, "src\CompilerPasses\Parser.gbas");
				
			};
			return tryClone(global5_Exprs_ref[0].arrAccess(param8_RetData1_ref[0]).values[tmpPositionCache][0].attr8_datatype);
			
		};
		
	} else {
		func5_Error((((((((((("Dimensions are different: ") + (global5_Exprs_ref[0].arrAccess(local5_Data1_2722).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str_ref[0]))) + (func20_BuildArrBrackets_Str(unref(global5_Exprs_ref[0].arrAccess(local5_Data1_2722).values[tmpPositionCache][0].attr8_datatype.attr7_IsArray_ref[0]))))) + (", "))) + (global5_Exprs_ref[0].arrAccess(local5_Data2_2723).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str_ref[0]))) + (func20_BuildArrBrackets_Str(unref(global5_Exprs_ref[0].arrAccess(local5_Data2_2723).values[tmpPositionCache][0].attr8_datatype.attr7_IsArray_ref[0])))), 386, "src\CompilerPasses\Parser.gbas");
		
	};
	return tryClone(unref(new type8_Datatype()));
	
};
func12_CastDatatype = window['func12_CastDatatype'];
window['func14_EnsureDatatype'] = function(param4_Expr, param8_NeedData, param4_Line, param6_Strict) {
	var local6_myData_2143 = new type8_Datatype();
	param6_Strict = 0;
	if ((((param8_NeedData.attr8_Name_Str_ref[0]) == ("")) ? 1 : 0)) {
		func5_Error("Internal error (datatype is empty)", 399, "src\CompilerPasses\Parser.gbas");
		
	};
	local6_myData_2143 = global5_Exprs_ref[0].arrAccess(param4_Expr).values[tmpPositionCache][0].attr8_datatype.clone(/* In Assign */);
	if (((((((local6_myData_2143.attr8_Name_Str_ref[0]) == (param8_NeedData.attr8_Name_Str_ref[0])) ? 1 : 0)) && ((((local6_myData_2143.attr7_IsArray_ref[0]) == (param8_NeedData.attr7_IsArray_ref[0])) ? 1 : 0))) ? 1 : 0)) {
		return tryClone(param4_Expr);
		
	} else {
		var local5_func1_2145 = 0, local5_func2_2146 = 0, local7_add_Str_2149 = "";
		if ((((param6_Strict) == (0)) ? 1 : 0)) {
			if ((((local6_myData_2143.attr7_IsArray_ref[0]) == (param8_NeedData.attr7_IsArray_ref[0])) ? 1 : 0)) {
				if ((((((((((local6_myData_2143.attr8_Name_Str_ref[0]) == ("int")) ? 1 : 0)) || ((((local6_myData_2143.attr8_Name_Str_ref[0]) == ("float")) ? 1 : 0))) ? 1 : 0)) || ((((local6_myData_2143.attr8_Name_Str_ref[0]) == ("string")) ? 1 : 0))) ? 1 : 0)) {
					if ((((((((((param8_NeedData.attr8_Name_Str_ref[0]) == ("int")) ? 1 : 0)) || ((((param8_NeedData.attr8_Name_Str_ref[0]) == ("float")) ? 1 : 0))) ? 1 : 0)) || ((((param8_NeedData.attr8_Name_Str_ref[0]) == ("string")) ? 1 : 0))) ? 1 : 0)) {
						{
							var local17___SelectHelper17__2144 = "";
							local17___SelectHelper17__2144 = param8_NeedData.attr8_Name_Str_ref[0];
							if ((((local17___SelectHelper17__2144) == ("int")) ? 1 : 0)) {
								return tryClone(func24_CreateCast2IntExpression(param4_Expr));
								
							} else if ((((local17___SelectHelper17__2144) == ("float")) ? 1 : 0)) {
								return tryClone(func26_CreateCast2FloatExpression(param4_Expr));
								
							} else if ((((local17___SelectHelper17__2144) == ("string")) ? 1 : 0)) {
								return tryClone(func27_CreateCast2StringExpression(param4_Expr));
								
							};
							
						};
						
					};
					
				};
				
			};
			
		};
		local5_func1_2145 = func14_SearchPrototyp(unref(local6_myData_2143.attr8_Name_Str_ref[0]));
		local5_func2_2146 = func14_SearchPrototyp(unref(param8_NeedData.attr8_Name_Str_ref[0]));
		if ((((local5_func1_2145) != (-(1))) ? 1 : 0)) {
			if ((((local5_func2_2146) != (-(1))) ? 1 : 0)) {
				var local7_checker_2147 = new type12_ProtoChecker();
				if ((((local6_myData_2143.attr7_IsArray_ref[0]) || (param8_NeedData.attr7_IsArray_ref[0])) ? 1 : 0)) {
					func5_Error("PROTOTYPE cannot be an array.", 426, "src\CompilerPasses\Parser.gbas");
					
				};
				local7_checker_2147.attr8_fromFunc = global8_Compiler.attr5_Funcs_ref[0].arrAccess(local5_func1_2145).values[tmpPositionCache][0].attr2_ID;
				local7_checker_2147.attr6_toFunc = global8_Compiler.attr5_Funcs_ref[0].arrAccess(local5_func2_2146).values[tmpPositionCache][0].attr2_ID;
				local7_checker_2147.attr3_Tok = func15_GetCurrentToken().clone(/* In Assign */);
				DIMPUSH(global8_Compiler.attr13_protoCheckers, local7_checker_2147);
				return tryClone(param4_Expr);
				
			} else {
				if (((((((((((((param8_NeedData.attr8_Name_Str_ref[0]) == ("int")) ? 1 : 0)) || ((((param8_NeedData.attr8_Name_Str_ref[0]) == ("float")) ? 1 : 0))) ? 1 : 0)) || ((((param8_NeedData.attr8_Name_Str_ref[0]) == ("string")) ? 1 : 0))) ? 1 : 0)) && ((((param8_NeedData.attr7_IsArray_ref[0]) == (0)) ? 1 : 0))) ? 1 : 0)) {
					{
						var local17___SelectHelper18__2148 = "";
						local17___SelectHelper18__2148 = param8_NeedData.attr8_Name_Str_ref[0];
						if ((((local17___SelectHelper18__2148) == ("int")) ? 1 : 0)) {
							return tryClone(func24_CreateCast2IntExpression(param4_Expr));
							
						} else if ((((local17___SelectHelper18__2148) == ("float")) ? 1 : 0)) {
							return tryClone(func26_CreateCast2FloatExpression(param4_Expr));
							
						} else if ((((local17___SelectHelper18__2148) == ("string")) ? 1 : 0)) {
							return tryClone(func27_CreateCast2StringExpression(param4_Expr));
							
						};
						
					};
					
				};
				
			};
			
		};
		if ((((func6_IsType(unref(local6_myData_2143.attr8_Name_Str_ref[0]))) && (func6_IsType(unref(param8_NeedData.attr8_Name_Str_ref[0])))) ? 1 : 0)) {
			return tryClone(param4_Expr);
			
		};
		local7_add_Str_2149 = "";
		if (param6_Strict) {
			local7_add_Str_2149 = " , and maybe can't cast, because it is BYREF (screw you BYREF >:O)!!";
			
		};
		func5_Error((((((((((((((("Cannot cast datatypes. Needs '") + (param8_NeedData.attr8_Name_Str_ref[0]))) + (func20_BuildArrBrackets_Str(unref(param8_NeedData.attr7_IsArray_ref[0]))))) + ("', got '"))) + (local6_myData_2143.attr8_Name_Str_ref[0]))) + (func20_BuildArrBrackets_Str(unref(local6_myData_2143.attr7_IsArray_ref[0]))))) + ("'"))) + (local7_add_Str_2149)), param4_Line, "src\CompilerPasses\Parser.gbas");
		
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
	var local1_i_2725 = 0, local1_j_2726 = 0, local4_loop_2727 = 0;
	local1_i_2725 = 0;
	local1_j_2726 = 0;
	{
		for (local4_loop_2727 = 0;toCheck(local4_loop_2727, (((param7_hex_Str).length) - (1)), 1);local4_loop_2727 += 1) {
			local1_i_2725 = ((ASC(MID_Str(param7_hex_Str, local4_loop_2727, 1), 0)) - (48));
			if ((((9) < (local1_i_2725)) ? 1 : 0)) {
				local1_i_2725+=-(7);
				
			};
			local1_j_2726 = ((local1_j_2726) * (16));
			local1_j_2726 = bOR(local1_j_2726, bAND(local1_i_2725, 15));
			
		};
		
	};
	return tryClone(local1_j_2726);
	return 0;
	
};
func7_Hex2Dec = window['func7_Hex2Dec'];
window['func6_Factor'] = function() {
	if (func7_IsToken("(")) {
		var local4_Expr_2151 = 0;
		func5_Match("(", 496, "src\CompilerPasses\Parser.gbas");
		local4_Expr_2151 = func10_Expression(0);
		func5_Match(")", 498, "src\CompilerPasses\Parser.gbas");
		return tryClone(local4_Expr_2151);
		
	} else if (func12_IsIdentifier(1)) {
		return tryClone(func10_Identifier(0));
		
	} else if (func8_IsString()) {
		var local7_Str_Str_2152 = "";
		local7_Str_Str_2152 = func14_GetCurrent_Str();
		if ((((INSTR(local7_Str_Str_2152, "\n", 0)) != (-(1))) ? 1 : 0)) {
			func5_Error("Expecting '\"'", 506, "src\CompilerPasses\Parser.gbas");
			
		};
		func7_GetNext();
		return tryClone(func19_CreateStrExpression(local7_Str_Str_2152));
		
	} else if ((((MID_Str(func14_GetCurrent_Str(), 0, 2)) == ("0x")) ? 1 : 0)) {
		var local7_hex_Str_2153 = "";
		local7_hex_Str_2153 = MID_Str(func14_GetCurrent_Str(), 2, -(1));
		func7_GetNext();
		return tryClone(func19_CreateIntExpression(func7_Hex2Dec(local7_hex_Str_2153)));
		
	} else if ((((func8_IsNumber()) || (func7_IsToken("."))) ? 1 : 0)) {
		var local3_Num_2154 = 0, local12_hasToHaveNum_2155 = 0;
		local12_hasToHaveNum_2155 = 0;
		if (func7_IsToken(".")) {
			local3_Num_2154 = 0;
			local12_hasToHaveNum_2155 = 1;
			
		} else {
			local3_Num_2154 = INT2STR(func14_GetCurrent_Str());
			func7_GetNext();
			
		};
		if (func7_IsToken(".")) {
			var local4_Num2_2156 = 0, local3_pos_2157 = 0, local4_FNum_2158 = 0.0;
			func5_Match(".", 526, "src\CompilerPasses\Parser.gbas");
			local4_Num2_2156 = INT2STR(func14_GetCurrent_Str());
			local3_pos_2157 = global8_Compiler.attr11_currentPosi;
			if (func8_IsNumber()) {
				func7_GetNext();
				
			};
			local4_FNum_2158 = FLOAT2STR(((((((CAST2STRING(local3_Num_2154)) + ("."))) + (CAST2STRING(local4_Num2_2156)))) + (CAST2STRING(0))));
			return tryClone(func21_CreateFloatExpression(local4_FNum_2158));
			
		} else {
			if (local12_hasToHaveNum_2155) {
				func5_Error("Expecting number!", 539, "src\CompilerPasses\Parser.gbas");
				
			};
			return tryClone(func19_CreateIntExpression(local3_Num_2154));
			
		};
		
	} else if (func7_IsToken("-")) {
		var local4_Expr_2159 = 0, alias2_Op_ref_2160 = [new type8_Operator()], local7_tmpData_2161 = new type8_Datatype();
		func5_Match("-", 543, "src\CompilerPasses\Parser.gbas");
		local4_Expr_2159 = func6_Factor();
		alias2_Op_ref_2160 = global9_Operators_ref[0].arrAccess(func14_SearchOperator("sub")).values[tmpPositionCache] /* ALIAS */;
		local7_tmpData_2161 = global5_Exprs_ref[0].arrAccess(local4_Expr_2159).values[tmpPositionCache][0].attr8_datatype.clone(/* In Assign */);
		local7_tmpData_2161.attr7_IsArray_ref[0] = 0;
		local4_Expr_2159 = func14_EnsureDatatype(local4_Expr_2159, local7_tmpData_2161, 550, 0);
		if ((((global5_Exprs_ref[0].arrAccess(local4_Expr_2159).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str_ref[0]) == ("float")) ? 1 : 0)) {
			local4_Expr_2159 = func24_CreateOperatorExpression(unref(alias2_Op_ref_2160[0]), func21_CreateFloatExpression(0), func14_EnsureDatatype(local4_Expr_2159, global13_floatDatatype, 552, 0));
			
		} else if (((((((global5_Exprs_ref[0].arrAccess(local4_Expr_2159).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str_ref[0]) == ("int")) ? 1 : 0)) || ((((global5_Exprs_ref[0].arrAccess(local4_Expr_2159).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str_ref[0]) == ("string")) ? 1 : 0))) ? 1 : 0)) {
			local4_Expr_2159 = func24_CreateOperatorExpression(unref(alias2_Op_ref_2160[0]), func19_CreateIntExpression(0), func14_EnsureDatatype(local4_Expr_2159, global11_intDatatype, 554, 0));
			
		} else {
			func5_Error((((("Unexpected datatype, expecting 'float/int' got '") + (global5_Exprs_ref[0].arrAccess(local4_Expr_2159).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str_ref[0]))) + ("'")), 556, "src\CompilerPasses\Parser.gbas");
			
		};
		return tryClone(local4_Expr_2159);
		
	} else if (func7_IsToken("TRUE")) {
		func5_Match("TRUE", 560, "src\CompilerPasses\Parser.gbas");
		return tryClone(func19_CreateIntExpression(1));
		
	} else if (func7_IsToken("FALSE")) {
		func5_Match("FALSE", 563, "src\CompilerPasses\Parser.gbas");
		return tryClone(func21_CreateFloatExpression(0));
		
	} else if (func7_IsToken("CODELINE")) {
		func5_Match("CODELINE", 566, "src\CompilerPasses\Parser.gbas");
		func5_Match("(", 567, "src\CompilerPasses\Parser.gbas");
		func5_Match(")", 568, "src\CompilerPasses\Parser.gbas");
		return tryClone(func19_CreateIntExpression(unref(global8_Compiler.attr6_Tokens.arrAccess(global8_Compiler.attr11_currentPosi).values[tmpPositionCache].attr4_Line_ref[0])));
		
	} else if (func7_IsToken("CODEFILE$")) {
		func5_Match("CODEFILE$", 571, "src\CompilerPasses\Parser.gbas");
		func5_Match("(", 572, "src\CompilerPasses\Parser.gbas");
		func5_Match(")", 573, "src\CompilerPasses\Parser.gbas");
		return tryClone(func19_CreateStrExpression((((("\"") + (MID_Str(unref(global8_Compiler.attr6_Tokens.arrAccess(global8_Compiler.attr11_currentPosi).values[tmpPositionCache].attr8_Path_Str_ref[0]), 1, -(1))))) + ("\""))));
		
	} else if (func7_IsToken("LEN")) {
		var local4_Expr_2162 = 0, local7_Kerning_2163 = 0;
		func5_Match("LEN", 576, "src\CompilerPasses\Parser.gbas");
		func5_Match("(", 577, "src\CompilerPasses\Parser.gbas");
		local4_Expr_2162 = func10_Expression(0);
		local7_Kerning_2163 = 0;
		if (func7_IsToken(",")) {
			func5_Match(",", 582, "src\CompilerPasses\Parser.gbas");
			local7_Kerning_2163 = func14_EnsureDatatype(func10_Expression(0), global11_intDatatype, 583, 0);
			func5_Match(")", 584, "src\CompilerPasses\Parser.gbas");
			local4_Expr_2162 = func14_EnsureDatatype(local4_Expr_2162, global11_strDatatype, 587, 0);
			return tryClone(func19_CreateLenExpression(local4_Expr_2162, local7_Kerning_2163));
			
		} else {
			func5_Match(")", 591, "src\CompilerPasses\Parser.gbas");
			if ((((global5_Exprs_ref[0].arrAccess(local4_Expr_2162).values[tmpPositionCache][0].attr8_datatype.attr7_IsArray_ref[0]) == (0)) ? 1 : 0)) {
				if ((((((((((global5_Exprs_ref[0].arrAccess(local4_Expr_2162).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str_ref[0]) == ("int")) ? 1 : 0)) || ((((global5_Exprs_ref[0].arrAccess(local4_Expr_2162).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str_ref[0]) == ("float")) ? 1 : 0))) ? 1 : 0)) || ((((global5_Exprs_ref[0].arrAccess(local4_Expr_2162).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str_ref[0]) == ("string")) ? 1 : 0))) ? 1 : 0)) {
					local4_Expr_2162 = func14_EnsureDatatype(local4_Expr_2162, global11_strDatatype, 595, 0);
					return tryClone(func19_CreateLenExpression(local4_Expr_2162, -(1)));
					
				} else {
					func5_Error((((("Cannot get the length of Type '") + (global5_Exprs_ref[0].arrAccess(local4_Expr_2162).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str_ref[0]))) + ("'")), 599, "src\CompilerPasses\Parser.gbas");
					
				};
				
			} else {
				return tryClone(func21_CreateBoundExpression(local4_Expr_2162, func19_CreateIntExpression(0)));
				
			};
			
		};
		
	} else if (func7_IsToken("BOUNDS")) {
		var local4_Expr_2164 = 0, local9_Dimension_2165 = 0;
		func5_Match("BOUNDS", 606, "src\CompilerPasses\Parser.gbas");
		func5_Match("(", 607, "src\CompilerPasses\Parser.gbas");
		local4_Expr_2164 = func10_Expression(0);
		func5_Match(",", 609, "src\CompilerPasses\Parser.gbas");
		if ((((global5_Exprs_ref[0].arrAccess(local4_Expr_2164).values[tmpPositionCache][0].attr8_datatype.attr7_IsArray_ref[0]) == (0)) ? 1 : 0)) {
			func5_Error("BOUNDS needs array!", 610, "src\CompilerPasses\Parser.gbas");
			
		};
		local9_Dimension_2165 = func14_EnsureDatatype(func10_Expression(0), global11_intDatatype, 611, 0);
		func5_Match(")", 612, "src\CompilerPasses\Parser.gbas");
		return tryClone(func21_CreateBoundExpression(local4_Expr_2164, local9_Dimension_2165));
		
	} else if (func7_IsToken("ADDRESSOF")) {
		var local8_Name_Str_2166 = "", local6_MyFunc_2167 = 0;
		func5_Match("ADDRESSOF", 616, "src\CompilerPasses\Parser.gbas");
		func5_Match("(", 617, "src\CompilerPasses\Parser.gbas");
		local8_Name_Str_2166 = func14_GetCurrent_Str();
		local6_MyFunc_2167 = -(1);
		var forEachSaver14151 = global8_Compiler.attr5_Funcs_ref[0];
		for(var forEachCounter14151 = 0 ; forEachCounter14151 < forEachSaver14151.values.length ; forEachCounter14151++) {
			var local4_Func_ref_2168 = forEachSaver14151.values[forEachCounter14151];
		{
				if ((((((((((local4_Func_ref_2168[0].attr3_Typ) == (1)) ? 1 : 0)) || ((((local4_Func_ref_2168[0].attr3_Typ) == (2)) ? 1 : 0))) ? 1 : 0)) && ((((local4_Func_ref_2168[0].attr8_Name_Str) == (local8_Name_Str_2166)) ? 1 : 0))) ? 1 : 0)) {
					local6_MyFunc_2167 = local4_Func_ref_2168[0].attr2_ID;
					break;
					
				};
				
			}
			forEachSaver14151.values[forEachCounter14151] = local4_Func_ref_2168;
		
		};
		if ((((local6_MyFunc_2167) == (-(1))) ? 1 : 0)) {
			func5_Error((((("Function '") + (local8_Name_Str_2166))) + ("' is unknown!")), 626, "src\CompilerPasses\Parser.gbas");
			
		};
		global8_Compiler.attr5_Funcs_ref[0].arrAccess(local6_MyFunc_2167).values[tmpPositionCache][0].attr10_PlzCompile = 1;
		func7_GetNext();
		func5_Match(")", 629, "src\CompilerPasses\Parser.gbas");
		return tryClone(func25_CreateAddressOfExpression(local6_MyFunc_2167));
		
	} else if (func7_IsToken("NOT")) {
		func5_Match("NOT", 633, "src\CompilerPasses\Parser.gbas");
		return tryClone(func19_CreateNotExpression(func14_EnsureDatatype(func6_Factor(), global13_floatDatatype, 634, 0)));
		
	} else if ((((((((((func7_IsToken("DIM")) || (func7_IsToken("DIM%"))) ? 1 : 0)) || (func7_IsToken("DIM$"))) ? 1 : 0)) || (func7_IsToken("DIM#"))) ? 1 : 0)) {
		var local8_datatype_2170 = new type8_Datatype(), local4_dims_2171 = new GLBArray();
		if (((static12_Factor_DIMASEXPRErr) ? 0 : 1)) {
			static12_Factor_DIMASEXPRErr = 1;
			func7_Warning("Experimental feature 'DIMASEXPR'");
			
		};
		local8_datatype_2170.attr7_IsArray_ref[0] = 1;
		local8_datatype_2170.attr8_Name_Str_ref[0] = "float";
		if (func7_IsToken("DIM%")) {
			local8_datatype_2170.attr8_Name_Str_ref[0] = "int";
			
		};
		if (func7_IsToken("DIM$")) {
			local8_datatype_2170.attr8_Name_Str_ref[0] = "string";
			
		};
		if (func7_IsToken("DIM#")) {
			local8_datatype_2170.attr8_Name_Str_ref[0] = "float";
			
		};
		func7_GetNext();
		do {
			var local1_E_2172 = 0;
			func5_Match("[", 651, "src\CompilerPasses\Parser.gbas");
			local1_E_2172 = func14_EnsureDatatype(func10_Expression(0), global11_intDatatype, 652, 0);
			func5_Match("]", 653, "src\CompilerPasses\Parser.gbas");
			DIMPUSH(local4_dims_2171, local1_E_2172);
			
		} while (!((((func7_IsToken("[")) == (0)) ? 1 : 0)));
		if (func7_IsToken("AS")) {
			if ((((local8_datatype_2170.attr8_Name_Str_ref[0]) == ("float")) ? 1 : 0)) {
				func5_Match("AS", 659, "src\CompilerPasses\Parser.gbas");
				func15_IsValidDatatype();
				local8_datatype_2170.attr8_Name_Str_ref[0] = func14_GetCurrent_Str();
				
			} else {
				func5_Error("Unexpected AS", 663, "src\CompilerPasses\Parser.gbas");
				
			};
			
		};
		return tryClone(func25_CreateDimAsExprExpression(local8_datatype_2170, unref(local4_dims_2171)));
		
	} else if (func7_IsToken("DEFINED")) {
		var local4_Find_2173 = 0;
		func5_Match("DEFINED", 669, "src\CompilerPasses\Parser.gbas");
		func5_Match("(", 670, "src\CompilerPasses\Parser.gbas");
		local4_Find_2173 = 0;
		var forEachSaver14366 = global7_Defines;
		for(var forEachCounter14366 = 0 ; forEachCounter14366 < forEachSaver14366.values.length ; forEachCounter14366++) {
			var local3_Def_2174 = forEachSaver14366.values[forEachCounter14366];
		{
				if ((((func7_IsToken(local3_Def_2174.attr7_Key_Str)) && ((((INTEGER(FLOAT2STR(local3_Def_2174.attr9_Value_Str))) != (0)) ? 1 : 0))) ? 1 : 0)) {
					local4_Find_2173 = 1;
					break;
					
				};
				
			}
			forEachSaver14366.values[forEachCounter14366] = local3_Def_2174;
		
		};
		func7_GetNext();
		func5_Match(")", 679, "src\CompilerPasses\Parser.gbas");
		return tryClone(func19_CreateIntExpression(local4_Find_2173));
		
	} else if (func7_IsToken("IIF")) {
		var local4_Cond_2175 = 0, local6_onTrue_2176 = 0, local7_onFalse_2177 = 0;
		func5_Match("IIF", 683, "src\CompilerPasses\Parser.gbas");
		func5_Match("(", 684, "src\CompilerPasses\Parser.gbas");
		local4_Cond_2175 = func14_EnsureDatatype(func10_Expression(0), global13_floatDatatype, 686, 0);
		func5_Match(",", 687, "src\CompilerPasses\Parser.gbas");
		local6_onTrue_2176 = func10_Expression(0);
		func5_Match(",", 689, "src\CompilerPasses\Parser.gbas");
		local7_onFalse_2177 = func10_Expression(0);
		func5_Match(")", 691, "src\CompilerPasses\Parser.gbas");
		if (((((((global5_Exprs_ref[0].arrAccess(local6_onTrue_2176).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str_ref[0]) != (global5_Exprs_ref[0].arrAccess(local7_onFalse_2177).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str_ref[0])) ? 1 : 0)) || ((((global5_Exprs_ref[0].arrAccess(local6_onTrue_2176).values[tmpPositionCache][0].attr8_datatype.attr7_IsArray_ref[0]) != (global5_Exprs_ref[0].arrAccess(local7_onFalse_2177).values[tmpPositionCache][0].attr8_datatype.attr7_IsArray_ref[0])) ? 1 : 0))) ? 1 : 0)) {
			func5_Error("IIF parameters do not match!", 694, "src\CompilerPasses\Parser.gbas");
			
		};
		return tryClone(func19_CreateIIFExpression(local4_Cond_2175, local6_onTrue_2176, local7_onFalse_2177));
		
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
			var local8_vars_Str_2178 = "", local5_Varis_2179 = new GLBArray();
			func14_ImplicitDefine();
			local8_vars_Str_2178 = "";
			func8_GetVaris(unref(local5_Varis_2179), -(1), 0);
			var forEachSaver14547 = local5_Varis_2179;
			for(var forEachCounter14547 = 0 ; forEachCounter14547 < forEachSaver14547.values.length ; forEachCounter14547++) {
				var local4_Vari_2180 = forEachSaver14547.values[forEachCounter14547];
			{
					local8_vars_Str_2178 = ((((local8_vars_Str_2178) + (global8_Compiler.attr5_Varis_ref[0].arrAccess(local4_Vari_2180).values[tmpPositionCache][0].attr8_Name_Str))) + (", "));
					
				}
				forEachSaver14547.values[forEachCounter14547] = local4_Vari_2180;
			
			};
			func5_Error((((((((("Unknown variable/function: ") + (func14_GetCurrent_Str()))) + (" possible variables: '"))) + (local8_vars_Str_2178))) + ("'")), 722, "src\CompilerPasses\Parser.gbas");
			
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
			var local5_found_2199 = 0;
			func5_Start();
			func5_Scope("__EOFFILE__", -(1));
			var forEachSaver14619 = global8_Compiler.attr5_Funcs_ref[0];
			for(var forEachCounter14619 = 0 ; forEachCounter14619 < forEachSaver14619.values.length ; forEachCounter14619++) {
				var local4_func_ref_2181 = forEachSaver14619.values[forEachCounter14619];
			{
					if (((((((local4_func_ref_2181[0].attr3_Typ) == (2)) ? 1 : 0)) || ((((local4_func_ref_2181[0].attr3_Typ) == (3)) ? 1 : 0))) ? 1 : 0)) {
						local4_func_ref_2181[0].attr10_PlzCompile = 1;
						
					};
					
				}
				forEachSaver14619.values[forEachCounter14619] = local4_func_ref_2181;
			
			};
			while (1) {
				var local5_Found_2182 = 0;
				local5_Found_2182 = 0;
				var forEachSaver14657 = global8_Compiler.attr5_Funcs_ref[0];
				for(var forEachCounter14657 = 0 ; forEachCounter14657 < forEachSaver14657.values.length ; forEachCounter14657++) {
					var local4_func_ref_2183 = forEachSaver14657.values[forEachCounter14657];
				{
						if ((((local4_func_ref_2183[0].attr10_PlzCompile) && ((((local4_func_ref_2183[0].attr3_Scp) == (-(1))) ? 1 : 0))) ? 1 : 0)) {
							if (func11_CompileFunc(unref(local4_func_ref_2183[0]))) {
								local5_Found_2182 = 1;
								
							};
							
						};
						
					}
					forEachSaver14657.values[forEachCounter14657] = local4_func_ref_2183;
				
				};
				if ((((local5_Found_2182) == (0)) ? 1 : 0)) {
					break;
					
				};
				
			};
			{
				var local1_i_2184 = 0.0;
				for (local1_i_2184 = 0;toCheck(local1_i_2184, ((global10_LastExprID) - (1)), 1);local1_i_2184 += 1) {
					var alias4_Expr_ref_2185 = [new type4_Expr()];
					alias4_Expr_ref_2185 = global5_Exprs_ref[0].arrAccess(~~(local1_i_2184)).values[tmpPositionCache] /* ALIAS */;
					if (((((((alias4_Expr_ref_2185[0].attr3_Typ) == (6)) ? 1 : 0)) || ((((alias4_Expr_ref_2185[0].attr3_Typ) == (23)) ? 1 : 0))) ? 1 : 0)) {
						if (((((((BOUNDS(alias4_Expr_ref_2185[0].attr6_Params, 0)) < (BOUNDS(global8_Compiler.attr5_Funcs_ref[0].arrAccess(alias4_Expr_ref_2185[0].attr4_func).values[tmpPositionCache][0].attr6_Params, 0))) ? 1 : 0)) && ((((alias4_Expr_ref_2185[0].attr8_wasAdded) == (0)) ? 1 : 0))) ? 1 : 0)) {
							var local4_Meth_2186 = 0, local7_TmpSave_2187 = 0;
							alias4_Expr_ref_2185[0].attr8_wasAdded = 1;
							local4_Meth_2186 = 0;
							if ((((global8_Compiler.attr5_Funcs_ref[0].arrAccess(alias4_Expr_ref_2185[0].attr4_func).values[tmpPositionCache][0].attr3_Typ) == (3)) ? 1 : 0)) {
								if ((((BOUNDS(alias4_Expr_ref_2185[0].attr6_Params, 0)) == (0)) ? 1 : 0)) {
									func5_Error((((("Internal error (method '") + (global8_Compiler.attr5_Funcs_ref[0].arrAccess(alias4_Expr_ref_2185[0].attr4_func).values[tmpPositionCache][0].attr8_Name_Str))) + ("' didn't get self parameter)")), 798, "src\CompilerPasses\Parser.gbas");
									
								};
								local4_Meth_2186 = 1;
								local7_TmpSave_2187 = alias4_Expr_ref_2185[0].attr6_Params.arrAccess(-(1)).values[tmpPositionCache];
								DIMDEL(alias4_Expr_ref_2185[0].attr6_Params, -(1));
								
							};
							{
								for (local1_i_2184 = BOUNDS(alias4_Expr_ref_2185[0].attr6_Params, 0);toCheck(local1_i_2184, ((((BOUNDS(global8_Compiler.attr5_Funcs_ref[0].arrAccess(alias4_Expr_ref_2185[0].attr4_func).values[tmpPositionCache][0].attr6_Params, 0)) - (1))) - (local4_Meth_2186)), 1);local1_i_2184 += 1) {
									if ((((global8_Compiler.attr5_Varis_ref[0].arrAccess(global8_Compiler.attr5_Funcs_ref[0].arrAccess(alias4_Expr_ref_2185[0].attr4_func).values[tmpPositionCache][0].attr6_Params.arrAccess(~~(local1_i_2184)).values[tmpPositionCache]).values[tmpPositionCache][0].attr6_PreDef) != (-(1))) ? 1 : 0)) {
										DIMPUSH(alias4_Expr_ref_2185[0].attr6_Params, global8_Compiler.attr5_Varis_ref[0].arrAccess(global8_Compiler.attr5_Funcs_ref[0].arrAccess(alias4_Expr_ref_2185[0].attr4_func).values[tmpPositionCache][0].attr6_Params.arrAccess(~~(local1_i_2184)).values[tmpPositionCache]).values[tmpPositionCache][0].attr6_PreDef);
										
									};
									
								};
								
							};
							if (local4_Meth_2186) {
								DIMPUSH(alias4_Expr_ref_2185[0].attr6_Params, local7_TmpSave_2187);
								
							};
							
						};
						
					};
					
				};
				
			};
			func15_CheckPrototypes();
			{
				var local1_i_2188 = 0.0;
				for (local1_i_2188 = 0;toCheck(local1_i_2188, ((global10_LastExprID) - (1)), 1);local1_i_2188 += 1) {
					if (((((((global5_Exprs_ref[0].arrAccess(~~(local1_i_2188)).values[tmpPositionCache][0].attr3_Typ) == (6)) ? 1 : 0)) || ((((global5_Exprs_ref[0].arrAccess(~~(local1_i_2188)).values[tmpPositionCache][0].attr3_Typ) == (23)) ? 1 : 0))) ? 1 : 0)) {
						var local4_Meth_2189 = 0;
						local4_Meth_2189 = 0;
						if ((((global8_Compiler.attr5_Funcs_ref[0].arrAccess(global5_Exprs_ref[0].arrAccess(~~(local1_i_2188)).values[tmpPositionCache][0].attr4_func).values[tmpPositionCache][0].attr3_Typ) == (3)) ? 1 : 0)) {
							local4_Meth_2189 = 1;
							
						};
						global8_Compiler.attr11_currentPosi = global5_Exprs_ref[0].arrAccess(~~(local1_i_2188)).values[tmpPositionCache][0].attr5_tokID;
						if ((((BOUNDS(global5_Exprs_ref[0].arrAccess(~~(local1_i_2188)).values[tmpPositionCache][0].attr6_Params, 0)) == (BOUNDS(global8_Compiler.attr5_Funcs_ref[0].arrAccess(global5_Exprs_ref[0].arrAccess(~~(local1_i_2188)).values[tmpPositionCache][0].attr4_func).values[tmpPositionCache][0].attr6_Params, 0))) ? 1 : 0)) {
							var local1_j_2190 = 0.0, local9_NewParams_2191 = new GLBArray();
							local1_j_2190 = 0;
							var forEachSaver15084 = global5_Exprs_ref[0].arrAccess(~~(local1_i_2188)).values[tmpPositionCache][0].attr6_Params;
							for(var forEachCounter15084 = 0 ; forEachCounter15084 < forEachSaver15084.values.length ; forEachCounter15084++) {
								var local1_P_2192 = forEachSaver15084.values[forEachCounter15084];
							{
									var local1_S_2193 = 0, local3_Tmp_2194 = 0;
									local1_S_2193 = 0;
									if (global8_Compiler.attr5_Varis_ref[0].arrAccess(global8_Compiler.attr5_Funcs_ref[0].arrAccess(global5_Exprs_ref[0].arrAccess(~~(local1_i_2188)).values[tmpPositionCache][0].attr4_func).values[tmpPositionCache][0].attr6_Params.arrAccess(~~(local1_j_2190)).values[tmpPositionCache]).values[tmpPositionCache][0].attr3_ref) {
										global8_Compiler.attr5_Varis_ref[0].arrAccess(func11_GetVariable(local1_P_2192, 1)).values[tmpPositionCache][0].attr3_ref = 1;
										local1_S_2193 = 1;
										
									};
									if (((local1_S_2193) ? 0 : 1)) {
										local3_Tmp_2194 = func14_EnsureDatatype(local1_P_2192, global8_Compiler.attr5_Varis_ref[0].arrAccess(global8_Compiler.attr5_Funcs_ref[0].arrAccess(global5_Exprs_ref[0].arrAccess(~~(local1_i_2188)).values[tmpPositionCache][0].attr4_func).values[tmpPositionCache][0].attr6_Params.arrAccess(~~(local1_j_2190)).values[tmpPositionCache]).values[tmpPositionCache][0].attr8_datatype, 847, local1_S_2193);
										
									} else {
										local3_Tmp_2194 = local1_P_2192;
										
									};
									DIMPUSH(local9_NewParams_2191, local3_Tmp_2194);
									local1_j_2190+=1;
									
								}
								forEachSaver15084.values[forEachCounter15084] = local1_P_2192;
							
							};
							global5_Exprs_ref[0].arrAccess(~~(local1_i_2188)).values[tmpPositionCache][0].attr6_Params = local9_NewParams_2191.clone(/* In Assign */);
							
						} else {
							var local8_miss_Str_2195 = "", local9_datas_Str_2196 = "";
							local8_miss_Str_2195 = "";
							if ((((BOUNDS(global5_Exprs_ref[0].arrAccess(~~(local1_i_2188)).values[tmpPositionCache][0].attr6_Params, 0)) < (BOUNDS(global8_Compiler.attr5_Funcs_ref[0].arrAccess(global5_Exprs_ref[0].arrAccess(~~(local1_i_2188)).values[tmpPositionCache][0].attr4_func).values[tmpPositionCache][0].attr6_Params, 0))) ? 1 : 0)) {
								{
									var local1_j_2197 = 0.0;
									for (local1_j_2197 = BOUNDS(global5_Exprs_ref[0].arrAccess(~~(local1_i_2188)).values[tmpPositionCache][0].attr6_Params, 0);toCheck(local1_j_2197, ((((BOUNDS(global8_Compiler.attr5_Funcs_ref[0].arrAccess(global5_Exprs_ref[0].arrAccess(~~(local1_i_2188)).values[tmpPositionCache][0].attr4_func).values[tmpPositionCache][0].attr6_Params, 0)) - (1))) - (local4_Meth_2189)), 1);local1_j_2197 += 1) {
										local8_miss_Str_2195 = ((((local8_miss_Str_2195) + (global8_Compiler.attr5_Varis_ref[0].arrAccess(global8_Compiler.attr5_Funcs_ref[0].arrAccess(global5_Exprs_ref[0].arrAccess(~~(local1_i_2188)).values[tmpPositionCache][0].attr4_func).values[tmpPositionCache][0].attr6_Params.arrAccess(~~(local1_j_2197)).values[tmpPositionCache]).values[tmpPositionCache][0].attr8_Name_Str))) + (", "));
										
									};
									
								};
								
							} else if ((((BOUNDS(global5_Exprs_ref[0].arrAccess(~~(local1_i_2188)).values[tmpPositionCache][0].attr6_Params, 0)) > (BOUNDS(global8_Compiler.attr5_Funcs_ref[0].arrAccess(global5_Exprs_ref[0].arrAccess(~~(local1_i_2188)).values[tmpPositionCache][0].attr4_func).values[tmpPositionCache][0].attr6_Params, 0))) ? 1 : 0)) {
								{
									var local1_j_2198 = 0.0;
									for (local1_j_2198 = BOUNDS(global8_Compiler.attr5_Funcs_ref[0].arrAccess(global5_Exprs_ref[0].arrAccess(~~(local1_i_2188)).values[tmpPositionCache][0].attr4_func).values[tmpPositionCache][0].attr6_Params, 0);toCheck(local1_j_2198, ((((BOUNDS(global5_Exprs_ref[0].arrAccess(~~(local1_i_2188)).values[tmpPositionCache][0].attr6_Params, 0)) - (local4_Meth_2189))) - (1)), 1);local1_j_2198 += 1) {
										if ((((global5_Exprs_ref[0].arrAccess(~~(local1_i_2188)).values[tmpPositionCache][0].attr6_Params.arrAccess(~~(local1_j_2198)).values[tmpPositionCache]) < (BOUNDS(global8_Compiler.attr5_Varis_ref[0], 0))) ? 1 : 0)) {
											local9_datas_Str_2196 = ((((local9_datas_Str_2196) + (global8_Compiler.attr5_Varis_ref[0].arrAccess(global5_Exprs_ref[0].arrAccess(~~(local1_i_2188)).values[tmpPositionCache][0].attr6_Params.arrAccess(~~(local1_j_2198)).values[tmpPositionCache]).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str_ref[0]))) + (", "));
											
										};
										
									};
									
								};
								
							};
							global8_Compiler.attr11_currentPosi = global5_Exprs_ref[0].arrAccess(~~(local1_i_2188)).values[tmpPositionCache][0].attr5_tokID;
							if ((((BOUNDS(global5_Exprs_ref[0].arrAccess(~~(local1_i_2188)).values[tmpPositionCache][0].attr6_Params, 0)) > (BOUNDS(global8_Compiler.attr5_Funcs_ref[0].arrAccess(global5_Exprs_ref[0].arrAccess(~~(local1_i_2188)).values[tmpPositionCache][0].attr4_func).values[tmpPositionCache][0].attr6_Params, 0))) ? 1 : 0)) {
								func5_Error((((((((((((((((("Too many parameters, function '") + (global8_Compiler.attr5_Funcs_ref[0].arrAccess(global5_Exprs_ref[0].arrAccess(~~(local1_i_2188)).values[tmpPositionCache][0].attr4_func).values[tmpPositionCache][0].attr8_Name_Str))) + ("' has: '"))) + (CAST2STRING(((BOUNDS(global8_Compiler.attr5_Funcs_ref[0].arrAccess(global5_Exprs_ref[0].arrAccess(~~(local1_i_2188)).values[tmpPositionCache][0].attr4_func).values[tmpPositionCache][0].attr6_Params, 0)) - (local4_Meth_2189)))))) + ("' got '"))) + (CAST2STRING(BOUNDS(global5_Exprs_ref[0].arrAccess(~~(local1_i_2188)).values[tmpPositionCache][0].attr6_Params, 0))))) + ("' datatypes '"))) + (local9_datas_Str_2196))) + ("'")), 870, "src\CompilerPasses\Parser.gbas");
								
							} else if ((((BOUNDS(global5_Exprs_ref[0].arrAccess(~~(local1_i_2188)).values[tmpPositionCache][0].attr6_Params, 0)) < (BOUNDS(global8_Compiler.attr5_Funcs_ref[0].arrAccess(global5_Exprs_ref[0].arrAccess(~~(local1_i_2188)).values[tmpPositionCache][0].attr4_func).values[tmpPositionCache][0].attr6_Params, 0))) ? 1 : 0)) {
								func5_Error((((((((((((((((("Too less parameters, function '") + (global8_Compiler.attr5_Funcs_ref[0].arrAccess(global5_Exprs_ref[0].arrAccess(~~(local1_i_2188)).values[tmpPositionCache][0].attr4_func).values[tmpPositionCache][0].attr8_Name_Str))) + ("' has: '"))) + (CAST2STRING(((BOUNDS(global8_Compiler.attr5_Funcs_ref[0].arrAccess(global5_Exprs_ref[0].arrAccess(~~(local1_i_2188)).values[tmpPositionCache][0].attr4_func).values[tmpPositionCache][0].attr6_Params, 0)) - (local4_Meth_2189)))))) + ("' got '"))) + (CAST2STRING(BOUNDS(global5_Exprs_ref[0].arrAccess(~~(local1_i_2188)).values[tmpPositionCache][0].attr6_Params, 0))))) + ("' missing '"))) + (local8_miss_Str_2195))) + ("'")), 872, "src\CompilerPasses\Parser.gbas");
								
							} else {
								func5_Error((((((((("Internal error (wtf? call: ") + (CAST2STRING(BOUNDS(global5_Exprs_ref[0].arrAccess(~~(local1_i_2188)).values[tmpPositionCache][0].attr6_Params, 0))))) + (", "))) + (CAST2STRING(BOUNDS(global8_Compiler.attr5_Funcs_ref[0].arrAccess(global5_Exprs_ref[0].arrAccess(~~(local1_i_2188)).values[tmpPositionCache][0].attr4_func).values[tmpPositionCache][0].attr6_Params, 0))))) + (")")), 874, "src\CompilerPasses\Parser.gbas");
								
							};
							
						};
						
					};
					
				};
				
			};
			func15_CheckPrototypes();
			local5_found_2199 = 1;
			while (local5_found_2199) {
				local5_found_2199 = 0;
				{
					var local1_i_2200 = 0.0;
					for (local1_i_2200 = 0;toCheck(local1_i_2200, ((global10_LastExprID) - (1)), 1);local1_i_2200 += 1) {
						var alias1_E_ref_2201 = [new type4_Expr()], local3_set_2202 = 0, local4_Vari_2203 = 0, local3_var_2204 = 0;
						alias1_E_ref_2201 = global5_Exprs_ref[0].arrAccess(~~(local1_i_2200)).values[tmpPositionCache] /* ALIAS */;
						local3_set_2202 = 0;
						{
							var local17___SelectHelper19__2205 = 0;
							local17___SelectHelper19__2205 = alias1_E_ref_2201[0].attr3_Typ;
							if ((((local17___SelectHelper19__2205) == (~~(40))) ? 1 : 0)) {
								local4_Vari_2203 = alias1_E_ref_2201[0].attr4_vari;
								local3_var_2204 = func11_GetVariable(alias1_E_ref_2201[0].attr4_expr, 0);
								local3_set_2202 = 1;
								
							} else if ((((local17___SelectHelper19__2205) == (~~(38))) ? 1 : 0)) {
								local4_Vari_2203 = alias1_E_ref_2201[0].attr6_inExpr;
								local3_var_2204 = func11_GetVariable(alias1_E_ref_2201[0].attr7_varExpr, 0);
								local3_set_2202 = 1;
								
							} else if ((((local17___SelectHelper19__2205) == (~~(6))) ? 1 : 0)) {
								
							};
							
						};
						if ((((local3_set_2202) && ((((local3_var_2204) >= (0)) ? 1 : 0))) ? 1 : 0)) {
							var local1_v_2206 = 0;
							local1_v_2206 = func11_GetVariable(local4_Vari_2203, 1);
							if ((((global8_Compiler.attr5_Varis_ref[0].arrAccess(local3_var_2204).values[tmpPositionCache][0].attr3_ref) != (global8_Compiler.attr5_Varis_ref[0].arrAccess(local1_v_2206).values[tmpPositionCache][0].attr3_ref)) ? 1 : 0)) {
								local5_found_2199 = 1;
								
							};
							global8_Compiler.attr5_Varis_ref[0].arrAccess(local3_var_2204).values[tmpPositionCache][0].attr3_ref = global8_Compiler.attr5_Varis_ref[0].arrAccess(local1_v_2206).values[tmpPositionCache][0].attr3_ref;
							
						};
						
					};
					
				};
				
			};
			{
				var local1_i_2207 = 0.0;
				for (local1_i_2207 = 0;toCheck(local1_i_2207, ((global10_LastExprID) - (1)), 1);local1_i_2207 += 1) {
					var alias4_Expr_ref_2208 = [new type4_Expr()];
					alias4_Expr_ref_2208 = global5_Exprs_ref[0].arrAccess(~~(local1_i_2207)).values[tmpPositionCache] /* ALIAS */;
					{
						var local17___SelectHelper20__2209 = 0;
						local17___SelectHelper20__2209 = alias4_Expr_ref_2208[0].attr3_Typ;
						if ((((local17___SelectHelper20__2209) == (~~(2))) ? 1 : 0)) {
							if ((((((((((alias4_Expr_ref_2208[0].attr6_ScpTyp) == (2)) ? 1 : 0)) || ((((alias4_Expr_ref_2208[0].attr6_ScpTyp) == (4)) ? 1 : 0))) ? 1 : 0)) && (BOUNDS(alias4_Expr_ref_2208[0].attr5_Gotos, 0))) ? 1 : 0)) {
								if (((func12_ScopeHasGoto(unref(alias4_Expr_ref_2208[0]))) ? 0 : 1)) {
									func5_Error("Internal Error (There is a goto, but I can't find it)", 937, "src\CompilerPasses\Parser.gbas");
									
								};
								var forEachSaver15769 = alias4_Expr_ref_2208[0].attr5_Gotos;
								for(var forEachCounter15769 = 0 ; forEachCounter15769 < forEachSaver15769.values.length ; forEachCounter15769++) {
									var local1_G_2210 = forEachSaver15769.values[forEachCounter15769];
								{
										var local5_Found_2211 = 0;
										local5_Found_2211 = 0;
										var forEachSaver15742 = alias4_Expr_ref_2208[0].attr6_Labels;
										for(var forEachCounter15742 = 0 ; forEachCounter15742 < forEachSaver15742.values.length ; forEachCounter15742++) {
											var local1_L_2212 = forEachSaver15742.values[forEachCounter15742];
										{
												if ((((global5_Exprs_ref[0].arrAccess(local1_L_2212).values[tmpPositionCache][0].attr8_Name_Str) == (global5_Exprs_ref[0].arrAccess(local1_G_2210).values[tmpPositionCache][0].attr8_Name_Str)) ? 1 : 0)) {
													local5_Found_2211 = 1;
													break;
													
												};
												
											}
											forEachSaver15742.values[forEachCounter15742] = local1_L_2212;
										
										};
										if (((local5_Found_2211) ? 0 : 1)) {
											global8_Compiler.attr11_currentPosi = global5_Exprs_ref[0].arrAccess(local1_G_2210).values[tmpPositionCache][0].attr5_tokID;
											func5_Error((((("Label '") + (global5_Exprs_ref[0].arrAccess(local1_G_2210).values[tmpPositionCache][0].attr8_Name_Str))) + ("' does not exist, please use an existing label badass!")), 948, "src\CompilerPasses\Parser.gbas");
											
										};
										
									}
									forEachSaver15769.values[forEachCounter15769] = local1_G_2210;
								
								};
								
							};
							
						};
						
					};
					
				};
				
			};
			var forEachSaver15788 = global8_Compiler.attr5_Types_ref[0];
			for(var forEachCounter15788 = 0 ; forEachCounter15788 < forEachSaver15788.values.length ; forEachCounter15788++) {
				var local3_Typ_ref_2213 = forEachSaver15788.values[forEachCounter15788];
			{
					local3_Typ_ref_2213[0].attr8_Name_Str = func18_ChangeTypeName_Str(local3_Typ_ref_2213[0].attr8_Name_Str);
					
				}
				forEachSaver15788.values[forEachCounter15788] = local3_Typ_ref_2213;
			
			};
			var forEachSaver15798 = global8_Compiler.attr5_Funcs_ref[0];
			for(var forEachCounter15798 = 0 ; forEachCounter15798 < forEachSaver15798.values.length ; forEachCounter15798++) {
				var local4_Func_ref_2214 = forEachSaver15798.values[forEachCounter15798];
			{
					func14_ChangeFuncName(unref(local4_Func_ref_2214[0]));
					
				}
				forEachSaver15798.values[forEachCounter15798] = local4_Func_ref_2214;
			
			};
			var forEachSaver15808 = global8_Compiler.attr5_Varis_ref[0];
			for(var forEachCounter15808 = 0 ; forEachCounter15808 < forEachSaver15808.values.length ; forEachCounter15808++) {
				var local4_Vari_ref_2215 = forEachSaver15808.values[forEachCounter15808];
			{
					func13_ChangeVarName(unref(local4_Vari_ref_2215[0]));
					
				}
				forEachSaver15808.values[forEachCounter15808] = local4_Vari_ref_2215;
			
			};
			var forEachSaver15844 = global8_Compiler.attr5_Varis_ref[0];
			for(var forEachCounter15844 = 0 ; forEachCounter15844 < forEachSaver15844.values.length ; forEachCounter15844++) {
				var local1_V_ref_2216 = forEachSaver15844.values[forEachCounter15844];
			{
					if (((((((local1_V_ref_2216[0].attr3_Typ) == (1)) ? 1 : 0)) || ((((local1_V_ref_2216[0].attr3_Typ) == (7)) ? 1 : 0))) ? 1 : 0)) {
						local1_V_ref_2216[0].attr8_Name_Str = ((((local1_V_ref_2216[0].attr8_Name_Str) + ("_"))) + (CAST2STRING(local1_V_ref_2216[0].attr2_ID)));
						
					};
					
				}
				forEachSaver15844.values[forEachCounter15844] = local1_V_ref_2216;
			
			};
			{
				var local1_i_2217 = 0.0;
				for (local1_i_2217 = 0;toCheck(local1_i_2217, ((global10_LastExprID) - (1)), 1);local1_i_2217 += 1) {
					var alias1_E_ref_2218 = [new type4_Expr()];
					alias1_E_ref_2218 = global5_Exprs_ref[0].arrAccess(~~(local1_i_2217)).values[tmpPositionCache] /* ALIAS */;
					if (((((((((((((alias1_E_ref_2218[0].attr8_datatype.attr8_Name_Str_ref[0]) == ("void")) ? 1 : 0)) || ((((alias1_E_ref_2218[0].attr8_datatype.attr8_Name_Str_ref[0]) == ("int")) ? 1 : 0))) ? 1 : 0)) || ((((alias1_E_ref_2218[0].attr8_datatype.attr8_Name_Str_ref[0]) == ("float")) ? 1 : 0))) ? 1 : 0)) || ((((alias1_E_ref_2218[0].attr8_datatype.attr8_Name_Str_ref[0]) == ("string")) ? 1 : 0))) ? 1 : 0)) {
						
					} else {
						if ((((func6_IsType(unref(alias1_E_ref_2218[0].attr8_datatype.attr8_Name_Str_ref[0]))) == (0)) ? 1 : 0)) {
							var forEachSaver15935 = global8_Compiler.attr5_Funcs_ref[0];
							for(var forEachCounter15935 = 0 ; forEachCounter15935 < forEachSaver15935.values.length ; forEachCounter15935++) {
								var local1_F_ref_2219 = forEachSaver15935.values[forEachCounter15935];
							{
									if ((((alias1_E_ref_2218[0].attr8_datatype.attr8_Name_Str_ref[0]) == (local1_F_ref_2219[0].attr9_OName_Str)) ? 1 : 0)) {
										alias1_E_ref_2218[0].attr8_datatype.attr8_Name_Str_ref[0] = local1_F_ref_2219[0].attr8_Name_Str;
										
									};
									
								}
								forEachSaver15935.values[forEachCounter15935] = local1_F_ref_2219;
							
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
		var forEachSaver16124 = global8_Compiler.attr13_protoCheckers;
		for(var forEachCounter16124 = 0 ; forEachCounter16124 < forEachSaver16124.values.length ; forEachCounter16124++) {
			var local7_checker_2221 = forEachSaver16124.values[forEachCounter16124];
		{
				var alias5_func1_ref_2222 = [new type14_IdentifierFunc()], alias5_func2_ref_2223 = [new type14_IdentifierFunc()], local5_valid_2224 = 0;
				alias5_func1_ref_2222 = global8_Compiler.attr5_Funcs_ref[0].arrAccess(local7_checker_2221.attr8_fromFunc).values[tmpPositionCache] /* ALIAS */;
				alias5_func2_ref_2223 = global8_Compiler.attr5_Funcs_ref[0].arrAccess(local7_checker_2221.attr6_toFunc).values[tmpPositionCache] /* ALIAS */;
				local5_valid_2224 = 0;
				if (((((((alias5_func1_ref_2222[0].attr8_datatype.attr8_Name_Str_ref[0]) == (alias5_func2_ref_2223[0].attr8_datatype.attr8_Name_Str_ref[0])) ? 1 : 0)) && ((((alias5_func1_ref_2222[0].attr8_datatype.attr7_IsArray_ref[0]) == (alias5_func2_ref_2223[0].attr8_datatype.attr7_IsArray_ref[0])) ? 1 : 0))) ? 1 : 0)) {
					if ((((BOUNDS(alias5_func1_ref_2222[0].attr6_Params, 0)) == (BOUNDS(alias5_func2_ref_2223[0].attr6_Params, 0))) ? 1 : 0)) {
						local5_valid_2224 = 1;
						{
							var local1_i_2225 = 0.0;
							for (local1_i_2225 = 0;toCheck(local1_i_2225, ((BOUNDS(alias5_func1_ref_2222[0].attr6_Params, 0)) - (1)), 1);local1_i_2225 += 1) {
								var alias2_p1_ref_2226 = [new type14_IdentifierVari()], alias2_p2_ref_2227 = [new type14_IdentifierVari()];
								alias2_p1_ref_2226 = global8_Compiler.attr5_Varis_ref[0].arrAccess(alias5_func1_ref_2222[0].attr6_Params.arrAccess(~~(local1_i_2225)).values[tmpPositionCache]).values[tmpPositionCache] /* ALIAS */;
								alias2_p2_ref_2227 = global8_Compiler.attr5_Varis_ref[0].arrAccess(alias5_func2_ref_2223[0].attr6_Params.arrAccess(~~(local1_i_2225)).values[tmpPositionCache]).values[tmpPositionCache] /* ALIAS */;
								if (((((((alias2_p1_ref_2226[0].attr8_datatype.attr8_Name_Str_ref[0]) != (alias2_p2_ref_2227[0].attr8_datatype.attr8_Name_Str_ref[0])) ? 1 : 0)) || ((((alias2_p1_ref_2226[0].attr8_datatype.attr7_IsArray_ref[0]) != (alias2_p2_ref_2227[0].attr8_datatype.attr7_IsArray_ref[0])) ? 1 : 0))) ? 1 : 0)) {
									local5_valid_2224 = 0;
									
								};
								
							};
							
						};
						
					};
					
				};
				if ((((local5_valid_2224) == (0)) ? 1 : 0)) {
					func5_Error((((((((("Cannot cast prototype '") + (func17_BuildPrototyp_Str(local7_checker_2221.attr8_fromFunc)))) + ("' to '"))) + (func17_BuildPrototyp_Str(local7_checker_2221.attr6_toFunc)))) + ("'")), 1031, "src\CompilerPasses\Parser.gbas");
					
				};
				
			}
			forEachSaver16124.values[forEachCounter16124] = local7_checker_2221;
		
		};
		REDIM(global8_Compiler.attr13_protoCheckers, [0], new type12_ProtoChecker() );
		
	};
	return 0;
	
};
func15_CheckPrototypes = window['func15_CheckPrototypes'];
window['func5_Scope'] = function(param12_CloseStr_Str, param4_func) {
	var local6_ScpTyp_2230 = 0, local9_Important_2231 = 0, local7_befLoop_2233 = 0, local8_TmpScope_2234 = 0.0, local12_TmpImportant_2235 = 0, local7_OneLine_2238 = 0, local13_OCloseStr_Str_2239 = "", local7_MyScope_2246 = 0;
	var local12_CloseStr_Str_ref_2228 = [param12_CloseStr_Str]; /* NEWCODEHERE */
	local6_ScpTyp_2230 = 0;
	local9_Important_2231 = 0;
	{
		var local17___SelectHelper21__2232 = "";
		local17___SelectHelper21__2232 = local12_CloseStr_Str_ref_2228[0];
		if ((((local17___SelectHelper21__2232) == ("ENDIF")) ? 1 : 0)) {
			local6_ScpTyp_2230 = ~~(1);
			
		} else if ((((local17___SelectHelper21__2232) == ("ENDSELECT")) ? 1 : 0)) {
			local6_ScpTyp_2230 = ~~(6);
			
		} else if ((((local17___SelectHelper21__2232) == ("WEND")) ? 1 : 0)) {
			local6_ScpTyp_2230 = ~~(3);
			
		} else if ((((local17___SelectHelper21__2232) == ("UNTIL")) ? 1 : 0)) {
			local6_ScpTyp_2230 = ~~(3);
			
		} else if ((((local17___SelectHelper21__2232) == ("NEXT")) ? 1 : 0)) {
			local6_ScpTyp_2230 = ~~(3);
			
		} else if ((((local17___SelectHelper21__2232) == ("ENDFUNCTION")) ? 1 : 0)) {
			local6_ScpTyp_2230 = ~~(2);
			local9_Important_2231 = 1;
			
		} else if ((((local17___SelectHelper21__2232) == ("ENDSUB")) ? 1 : 0)) {
			local6_ScpTyp_2230 = ~~(2);
			local9_Important_2231 = 1;
			
		} else if ((((local17___SelectHelper21__2232) == ("CATCH")) ? 1 : 0)) {
			local6_ScpTyp_2230 = ~~(5);
			
		} else if ((((local17___SelectHelper21__2232) == ("FINALLY")) ? 1 : 0)) {
			local6_ScpTyp_2230 = ~~(5);
			
		} else if ((((local17___SelectHelper21__2232) == ("__EOFFILE__")) ? 1 : 0)) {
			local6_ScpTyp_2230 = ~~(4);
			local9_Important_2231 = 1;
			
		} else {
			func5_Error("Internal error (unknown scope type)", 1068, "src\CompilerPasses\Parser.gbas");
			
		};
		
	};
	local7_befLoop_2233 = global8_Compiler.attr6_inLoop;
	if ((((local6_ScpTyp_2230) == (3)) ? 1 : 0)) {
		global8_Compiler.attr6_inLoop = 1;
		
	};
	local8_TmpScope_2234 = global8_Compiler.attr12_CurrentScope;
	local12_TmpImportant_2235 = global8_Compiler.attr14_ImportantScope;
	global8_Compiler.attr12_CurrentScope = func21_CreateScopeExpression(local6_ScpTyp_2230);
	if ((((local12_CloseStr_Str_ref_2228[0]) == ("__EOFFILE__")) ? 1 : 0)) {
		global8_Compiler.attr9_MainScope = global8_Compiler.attr12_CurrentScope;
		
	};
	if (local9_Important_2231) {
		global8_Compiler.attr14_ImportantScope = global8_Compiler.attr12_CurrentScope;
		
	};
	if (((((((local6_ScpTyp_2230) == (2)) ? 1 : 0)) && ((((param4_func) != (-(1))) ? 1 : 0))) ? 1 : 0)) {
		var forEachSaver16354 = global8_Compiler.attr5_Funcs_ref[0].arrAccess(param4_func).values[tmpPositionCache][0].attr6_Params;
		for(var forEachCounter16354 = 0 ; forEachCounter16354 < forEachSaver16354.values.length ; forEachCounter16354++) {
			var local5_param_2236 = forEachSaver16354.values[forEachCounter16354];
		{
				var local4_vari_2237 = new type14_IdentifierVari();
				local4_vari_2237 = global8_Compiler.attr5_Varis_ref[0].arrAccess(local5_param_2236).values[tmpPositionCache][0].clone(/* In Assign */);
				local4_vari_2237.attr3_Typ = ~~(1);
				func11_AddVariable(local4_vari_2237, 1);
				DIMPUSH(global5_Exprs_ref[0].arrAccess(global8_Compiler.attr12_CurrentScope).values[tmpPositionCache][0].attr5_Varis, ((BOUNDS(global8_Compiler.attr5_Varis_ref[0], 0)) - (1)));
				DIMPUSH(global8_Compiler.attr5_Funcs_ref[0].arrAccess(param4_func).values[tmpPositionCache][0].attr10_CopyParams, ((BOUNDS(global8_Compiler.attr5_Varis_ref[0], 0)) - (1)));
				
			}
			forEachSaver16354.values[forEachCounter16354] = local5_param_2236;
		
		};
		
	};
	local7_OneLine_2238 = 0;
	if (func7_IsToken("THEN")) {
		local7_OneLine_2238 = 1;
		func5_Match("THEN", 1097, "src\CompilerPasses\Parser.gbas");
		
	};
	local13_OCloseStr_Str_2239 = local12_CloseStr_Str_ref_2228[0];
	while ((((func7_IsToken(func13_IsClosing_Str(local12_CloseStr_Str_ref_2228, local6_ScpTyp_2230))) == (0)) ? 1 : 0)) {
		if ((((func8_EOFParse()) == (0)) ? 1 : 0)) {
			func5_Error((("Missing closing: ") + (local12_CloseStr_Str_ref_2228[0])), 1101, "src\CompilerPasses\Parser.gbas");
			
		};
		{
			var Err_Str = "";
			try {
				var local4_Expr_2240 = 0;
				local4_Expr_2240 = -(1);
				if (func7_IsToken("LET")) {
					func5_Match("LET", 1108, "src\CompilerPasses\Parser.gbas");
					if ((((func12_IsIdentifier(0)) == (0)) ? 1 : 0)) {
						func5_Error("Expecting identifier after LET.", 1110, "src\CompilerPasses\Parser.gbas");
						
					};
					
				};
				if (func7_IsToken("GOSUB")) {
					func5_Match("GOSUB", 1114, "src\CompilerPasses\Parser.gbas");
					if ((((func14_IsFuncExisting(func14_GetCurrent_Str(), 0)) == (0)) ? 1 : 0)) {
						func5_Error("Expecting sub after GOSUB.", 1116, "src\CompilerPasses\Parser.gbas");
						
					};
					
				};
				if (func9_IsKeyword()) {
					local4_Expr_2240 = func7_Keyword();
					
				} else if (func12_IsIdentifier(1)) {
					local4_Expr_2240 = func10_Identifier(1);
					
				} else if (func7_IsToken("super")) {
					local4_Expr_2240 = func10_Identifier(1);
					
				} else {
					var local3_pos_2241 = 0, local8_Name_Str_2242 = "";
					local3_pos_2241 = global8_Compiler.attr11_currentPosi;
					local8_Name_Str_2242 = REPLACE_Str(func14_GetCurrent_Str(), "@", "");
					func7_GetNext();
					if (func7_IsToken(":")) {
						var local3_Scp_2243 = 0;
						func5_Match(":", 1132, "src\CompilerPasses\Parser.gbas");
						local4_Expr_2240 = func21_CreateLabelExpression(local8_Name_Str_2242);
						local3_Scp_2243 = global8_Compiler.attr12_CurrentScope;
						do {
							var forEachSaver16530 = global5_Exprs_ref[0].arrAccess(local3_Scp_2243).values[tmpPositionCache][0].attr6_Labels;
							for(var forEachCounter16530 = 0 ; forEachCounter16530 < forEachSaver16530.values.length ; forEachCounter16530++) {
								var local3_lbl_2244 = forEachSaver16530.values[forEachCounter16530];
							{
									if ((((global5_Exprs_ref[0].arrAccess(local3_lbl_2244).values[tmpPositionCache][0].attr8_Name_Str) == (local8_Name_Str_2242)) ? 1 : 0)) {
										func10_ResetError((((("Duplicate label identifier '") + (local8_Name_Str_2242))) + ("'")), local3_pos_2241);
										
									};
									
								}
								forEachSaver16530.values[forEachCounter16530] = local3_lbl_2244;
							
							};
							local3_Scp_2243 = global5_Exprs_ref[0].arrAccess(local3_Scp_2243).values[tmpPositionCache][0].attr10_SuperScope;
							
						} while (!(((((((local3_Scp_2243) == (-(1))) ? 1 : 0)) || ((((global5_Exprs_ref[0].arrAccess(local3_Scp_2243).values[tmpPositionCache][0].attr6_ScpTyp) == (2)) ? 1 : 0))) ? 1 : 0)));
						DIMPUSH(global5_Exprs_ref[0].arrAccess(global8_Compiler.attr14_ImportantScope).values[tmpPositionCache][0].attr6_Labels, local4_Expr_2240);
						
					} else {
						if (func7_IsToken("[")) {
							func5_Match("[", 1147, "src\CompilerPasses\Parser.gbas");
							func5_Match("]", 1148, "src\CompilerPasses\Parser.gbas");
							
						};
						if ((((func7_IsToken("=")) && (((global6_STRICT) ? 0 : 1))) ? 1 : 0)) {
							global8_Compiler.attr11_currentPosi = ((local3_pos_2241) - (1));
							func7_GetNext();
							func14_ImplicitDefine();
							if (func12_IsIdentifier(0)) {
								local4_Expr_2240 = func10_Identifier(1);
								
							} else {
								func5_Error("Internal error (implicit not created)", 1160, "src\CompilerPasses\Parser.gbas");
								
							};
							
						} else {
							func10_ResetError("Invalid command (unknown function, variable or keyword).", local3_pos_2241);
							
						};
						
					};
					
				};
				if ((((local4_Expr_2240) != (-(1))) ? 1 : 0)) {
					DIMPUSH(global5_Exprs_ref[0].arrAccess(global8_Compiler.attr12_CurrentScope).values[tmpPositionCache][0].attr5_Exprs, local4_Expr_2240);
					
				};
				if (local7_OneLine_2238) {
					break;
					
				};
				do {
					func5_Match("\n", 1173, "src\CompilerPasses\Parser.gbas");
					
				} while (!((((func7_IsToken("\n")) == (0)) ? 1 : 0)));
				
			} catch (Err_Str) {
				if (Err_Str instanceof GLBException) Err_Str = Err_Str.getText(); else throwError(Err_Str);{
					func8_FixError();
					
				}
			};
			
		};
		
	};
	if (((((((local7_OneLine_2238) == (0)) ? 1 : 0)) && ((((local12_CloseStr_Str_ref_2228[0]) == (local13_OCloseStr_Str_2239)) ? 1 : 0))) ? 1 : 0)) {
		func5_Match(unref(local12_CloseStr_Str_ref_2228[0]), 1181, "src\CompilerPasses\Parser.gbas");
		
	};
	local7_MyScope_2246 = global8_Compiler.attr12_CurrentScope;
	global8_Compiler.attr12_CurrentScope = ~~(local8_TmpScope_2234);
	global8_Compiler.attr6_inLoop = local7_befLoop_2233;
	if (local9_Important_2231) {
		global8_Compiler.attr14_ImportantScope = local12_TmpImportant_2235;
		
	};
	return tryClone(local7_MyScope_2246);
	return 0;
	
};
func5_Scope = window['func5_Scope'];
window['func10_ResetError'] = function(param7_err_Str, param3_pos) {
	var local3_tmp_2249 = 0.0;
	local3_tmp_2249 = global8_Compiler.attr11_currentPosi;
	global8_Compiler.attr11_currentPosi = param3_pos;
	{
		var Ex_Str = "";
		try {
			func5_Error(param7_err_Str, 1198, "src\CompilerPasses\Parser.gbas");
			
		} catch (Ex_Str) {
			if (Ex_Str instanceof GLBException) Ex_Str = Ex_Str.getText(); else throwError(Ex_Str);{
				global8_Compiler.attr11_currentPosi = ~~(local3_tmp_2249);
				throw new GLBException(Ex_Str, "\src\CompilerPasses\Parser.gbas", 1202);
				
			}
		};
		
	};
	return 0;
	
};
func10_ResetError = window['func10_ResetError'];
window['func13_IsClosing_Str'] = function(param12_CloseStr_Str_ref, param6_ScpTyp) {
	{
		var local17___SelectHelper22__2253 = 0;
		local17___SelectHelper22__2253 = param6_ScpTyp;
		if ((((local17___SelectHelper22__2253) == (~~(1))) ? 1 : 0)) {
			if (func7_IsToken("ELSE")) {
				param12_CloseStr_Str_ref[0] = "ELSE";
				
			};
			if (func7_IsToken("ELSEIF")) {
				param12_CloseStr_Str_ref[0] = "ELSEIF";
				
			};
			
		} else if ((((local17___SelectHelper22__2253) == (~~(6))) ? 1 : 0)) {
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
	var local9_PreferVar_2255 = 0, local4_Expr_ref_2256 = [0], local5_IsAcc_2257 = 0;
	local9_PreferVar_2255 = 0;
	if ((((func7_IsToken("LOCAL")) && ((((param9_IsCommand) == (0)) ? 1 : 0))) ? 1 : 0)) {
		local9_PreferVar_2255 = 1;
		
	};
	if ((((func7_IsToken("GLOBAL")) && ((((param9_IsCommand) == (0)) ? 1 : 0))) ? 1 : 0)) {
		local9_PreferVar_2255 = -(1);
		
	};
	if ((((local9_PreferVar_2255) != (0)) ? 1 : 0)) {
		func7_GetNext();
		
	};
	local4_Expr_ref_2256[0] = -(1);
	local5_IsAcc_2257 = 0;
	if (func7_IsToken("super")) {
		func5_Match("super", 1231, "src\CompilerPasses\Parser.gbas");
		if (((((((global8_Compiler.attr11_currentFunc) != (-(1))) ? 1 : 0)) && ((((global8_Compiler.attr5_Funcs_ref[0].arrAccess(global8_Compiler.attr11_currentFunc).values[tmpPositionCache][0].attr6_MyType) != (-(1))) ? 1 : 0))) ? 1 : 0)) {
			var local3_typ_2258 = 0;
			local3_typ_2258 = global8_Compiler.attr5_Funcs_ref[0].arrAccess(global8_Compiler.attr11_currentFunc).values[tmpPositionCache][0].attr6_MyType;
			if ((((global8_Compiler.attr5_Types_ref[0].arrAccess(local3_typ_2258).values[tmpPositionCache][0].attr9_Extending) != (-(1))) ? 1 : 0)) {
				local4_Expr_ref_2256[0] = func21_CreateSuperExpression(global8_Compiler.attr5_Types_ref[0].arrAccess(local3_typ_2258).values[tmpPositionCache][0].attr9_Extending);
				func5_Match(".", 1236, "src\CompilerPasses\Parser.gbas");
				local5_IsAcc_2257 = 1;
				
			} else {
				func5_Error("There is no super class/type", 1239, "src\CompilerPasses\Parser.gbas");
				
			};
			
		} else {
			func5_Error("Super has to be in method", 1242, "src\CompilerPasses\Parser.gbas");
			
		};
		
	};
	if ((((func6_IsType("")) && (((func12_IsIdentifier(0)) ? 0 : 1))) ? 1 : 0)) {
		var local4_posi_2259 = 0.0, local7_typ_Str_2260 = "";
		local4_posi_2259 = global8_Compiler.attr11_currentPosi;
		local7_typ_Str_2260 = func14_GetCurrent_Str();
		func7_GetNext();
		if (func7_IsToken("(")) {
			func5_Match("(", 1251, "src\CompilerPasses\Parser.gbas");
			local4_Expr_ref_2256[0] = func10_Expression(0);
			func5_Match(")", 1253, "src\CompilerPasses\Parser.gbas");
			if ((((func6_IsType(unref(global5_Exprs_ref[0].arrAccess(local4_Expr_ref_2256[0]).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str_ref[0]))) && ((((global5_Exprs_ref[0].arrAccess(local4_Expr_ref_2256[0]).values[tmpPositionCache][0].attr8_datatype.attr7_IsArray_ref[0]) == (0)) ? 1 : 0))) ? 1 : 0)) {
				local4_Expr_ref_2256[0] = func14_CreateCast2Obj(local7_typ_Str_2260, unref(local4_Expr_ref_2256[0]));
				if (func7_IsToken(".")) {
					func5_Match(".", 1257, "src\CompilerPasses\Parser.gbas");
					local5_IsAcc_2257 = 1;
					
				} else {
					return tryClone(unref(local4_Expr_ref_2256[0]));
					
				};
				
			} else {
				func5_Error("Cannot cast non TYPE or array", 1263, "src\CompilerPasses\Parser.gbas");
				
			};
			
		} else {
			global8_Compiler.attr11_currentPosi = ~~(local4_posi_2259);
			
		};
		
	};
	do {
		var local8_Name_Str_2261 = "", local9_SuperExpr_ref_2262 = [0], local5_Varis_2263 = new GLBArray(), local5_Found_2264 = 0;
		local8_Name_Str_2261 = func17_CleanVariable_Str(func14_GetCurrent_Str());
		func7_GetNext();
		if ((((func7_IsToken("%")) || (func7_IsToken("%"))) ? 1 : 0)) {
			func7_GetNext();
			
		};
		local9_SuperExpr_ref_2262[0] = local4_Expr_ref_2256[0];
		if ((((local4_Expr_ref_2256[0]) == (-(1))) ? 1 : 0)) {
			func8_GetVaris(unref(local5_Varis_2263), -(1), local9_PreferVar_2255);
			local9_PreferVar_2255 = 0;
			
		} else {
			if ((((func6_IsType(unref(global5_Exprs_ref[0].arrAccess(local4_Expr_ref_2256[0]).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str_ref[0]))) == (0)) ? 1 : 0)) {
				func5_Error((((("Expecting type, got primitive datatype '") + (global5_Exprs_ref[0].arrAccess(local4_Expr_ref_2256[0]).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str_ref[0]))) + ("'")), 1288, "src\CompilerPasses\Parser.gbas");
				
			};
			local5_Varis_2263 = global8_LastType.attr10_Attributes.clone(/* In Assign */);
			
		};
		local5_Found_2264 = 0;
		var forEachSaver17183 = local5_Varis_2263;
		for(var forEachCounter17183 = 0 ; forEachCounter17183 < forEachSaver17183.values.length ; forEachCounter17183++) {
			var local4_Vari_2265 = forEachSaver17183.values[forEachCounter17183];
		{
				if ((((local8_Name_Str_2261) == (global8_Compiler.attr5_Varis_ref[0].arrAccess(local4_Vari_2265).values[tmpPositionCache][0].attr8_Name_Str)) ? 1 : 0)) {
					if ((((((((((global8_Compiler.attr11_currentFunc) != (-(1))) ? 1 : 0)) && ((((global8_Compiler.attr5_Funcs_ref[0].arrAccess(global8_Compiler.attr11_currentFunc).values[tmpPositionCache][0].attr6_MyType) != (-(1))) ? 1 : 0))) ? 1 : 0)) && ((((local4_Expr_ref_2256[0]) == (-(1))) ? 1 : 0))) ? 1 : 0)) {
						var alias3_Typ_ref_2266 = [new type14_IdentifierType()];
						alias3_Typ_ref_2266 = global8_Compiler.attr5_Types_ref[0].arrAccess(global8_Compiler.attr5_Funcs_ref[0].arrAccess(global8_Compiler.attr11_currentFunc).values[tmpPositionCache][0].attr6_MyType).values[tmpPositionCache] /* ALIAS */;
						var forEachSaver17172 = alias3_Typ_ref_2266[0].attr10_Attributes;
						for(var forEachCounter17172 = 0 ; forEachCounter17172 < forEachSaver17172.values.length ; forEachCounter17172++) {
							var local1_A_2267 = forEachSaver17172.values[forEachCounter17172];
						{
								if ((((local4_Vari_2265) == (local1_A_2267)) ? 1 : 0)) {
									local9_SuperExpr_ref_2262[0] = func24_CreateVariableExpression(global8_Compiler.attr5_Funcs_ref[0].arrAccess(global8_Compiler.attr11_currentFunc).values[tmpPositionCache][0].attr7_SelfVar);
									break;
									
								};
								
							}
							forEachSaver17172.values[forEachCounter17172] = local1_A_2267;
						
						};
						
					};
					local4_Expr_ref_2256[0] = func24_CreateVariableExpression(local4_Vari_2265);
					local5_Found_2264 = 1;
					break;
					
				};
				
			}
			forEachSaver17183.values[forEachCounter17183] = local4_Vari_2265;
		
		};
		while ((((func7_IsToken("(")) && (local5_Found_2264)) ? 1 : 0)) {
			var local4_func_2268 = 0;
			local4_func_2268 = func14_SearchPrototyp(unref(global5_Exprs_ref[0].arrAccess(local4_Expr_ref_2256[0]).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str_ref[0]));
			if ((((local4_func_2268) != (-(1))) ? 1 : 0)) {
				var local6_Params_2269 = new GLBArray();
				func13_ParseFuncCall(global8_Compiler.attr5_Funcs_ref[0].arrAccess(local4_func_2268).values[tmpPositionCache][0].attr8_datatype, unref(local6_Params_2269), param9_IsCommand);
				local4_Expr_ref_2256[0] = func25_CreateProtoCallExpression(unref(local4_Expr_ref_2256[0]), unref(local6_Params_2269));
				
			};
			
		};
		if ((((local5_Found_2264) == (0)) ? 1 : 0)) {
			if ((((local4_Expr_ref_2256[0]) != (-(1))) ? 1 : 0)) {
				var local5_typId_2270 = 0;
				func6_IsType(unref(global5_Exprs_ref[0].arrAccess(local4_Expr_ref_2256[0]).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str_ref[0]));
				if (global5_Exprs_ref[0].arrAccess(local4_Expr_ref_2256[0]).values[tmpPositionCache][0].attr8_datatype.attr7_IsArray_ref[0]) {
					func5_Error("Cannot access to array.", 1324, "src\CompilerPasses\Parser.gbas");
					
				};
				local5_typId_2270 = global8_LastType.attr2_ID;
				while ((((local5_typId_2270) != (-(1))) ? 1 : 0)) {
					var forEachSaver17326 = global8_Compiler.attr5_Types_ref[0].arrAccess(local5_typId_2270).values[tmpPositionCache][0].attr7_Methods;
					for(var forEachCounter17326 = 0 ; forEachCounter17326 < forEachSaver17326.values.length ; forEachCounter17326++) {
						var local1_M_2271 = forEachSaver17326.values[forEachCounter17326];
					{
							if ((((global8_Compiler.attr5_Funcs_ref[0].arrAccess(local1_M_2271).values[tmpPositionCache][0].attr8_Name_Str) == (local8_Name_Str_2261)) ? 1 : 0)) {
								if (((local5_Found_2264) ? 0 : 1)) {
									var local1_a_2272 = 0;
									local1_a_2272 = func19_ParseIdentifierFunc(local4_Expr_ref_2256, local9_SuperExpr_ref_2262, param9_IsCommand, local8_Name_Str_2261, local1_M_2271);
									if ((((local1_a_2272) != (-(1))) ? 1 : 0)) {
										return tryClone(local1_a_2272);
										
									};
									
								};
								local5_Found_2264 = 1;
								
							};
							
						}
						forEachSaver17326.values[forEachCounter17326] = local1_M_2271;
					
					};
					local5_typId_2270 = global8_Compiler.attr5_Types_ref[0].arrAccess(local5_typId_2270).values[tmpPositionCache][0].attr9_Extending;
					
				};
				
			} else {
				var local3_Val_ref_2273 = [0];
				if ((global8_Compiler.attr11_GlobalFuncs).GetValue(local8_Name_Str_2261, local3_Val_ref_2273)) {
					var local1_a_2274 = 0;
					local1_a_2274 = func19_ParseIdentifierFunc(local4_Expr_ref_2256, local9_SuperExpr_ref_2262, param9_IsCommand, local8_Name_Str_2261, unref(local3_Val_ref_2273[0]));
					if ((((local1_a_2274) != (-(1))) ? 1 : 0)) {
						return tryClone(local1_a_2274);
						
					};
					local5_Found_2264 = 1;
					
				} else if (((((((global8_Compiler.attr11_currentFunc) != (-(1))) ? 1 : 0)) && ((((global8_Compiler.attr5_Funcs_ref[0].arrAccess(global8_Compiler.attr11_currentFunc).values[tmpPositionCache][0].attr6_MyType) != (-(1))) ? 1 : 0))) ? 1 : 0)) {
					var alias3_Typ_ref_2275 = [new type14_IdentifierType()], local5_typId_2276 = 0;
					alias3_Typ_ref_2275 = global8_Compiler.attr5_Types_ref[0].arrAccess(global8_Compiler.attr5_Funcs_ref[0].arrAccess(global8_Compiler.attr11_currentFunc).values[tmpPositionCache][0].attr6_MyType).values[tmpPositionCache] /* ALIAS */;
					local5_typId_2276 = alias3_Typ_ref_2275[0].attr2_ID;
					while ((((local5_typId_2276) != (-(1))) ? 1 : 0)) {
						var forEachSaver17469 = global8_Compiler.attr5_Types_ref[0].arrAccess(local5_typId_2276).values[tmpPositionCache][0].attr7_Methods;
						for(var forEachCounter17469 = 0 ; forEachCounter17469 < forEachSaver17469.values.length ; forEachCounter17469++) {
							var local1_M_2277 = forEachSaver17469.values[forEachCounter17469];
						{
								if ((((global8_Compiler.attr5_Funcs_ref[0].arrAccess(local1_M_2277).values[tmpPositionCache][0].attr8_Name_Str) == (local8_Name_Str_2261)) ? 1 : 0)) {
									if (((local5_Found_2264) ? 0 : 1)) {
										var local1_a_2278 = 0;
										local1_a_2278 = func19_ParseIdentifierFunc(local4_Expr_ref_2256, local9_SuperExpr_ref_2262, param9_IsCommand, local8_Name_Str_2261, local1_M_2277);
										if ((((local1_a_2278) != (-(1))) ? 1 : 0)) {
											return tryClone(local1_a_2278);
											
										};
										
									};
									local5_Found_2264 = 1;
									
								};
								
							}
							forEachSaver17469.values[forEachCounter17469] = local1_M_2277;
						
						};
						local5_typId_2276 = global8_Compiler.attr5_Types_ref[0].arrAccess(local5_typId_2276).values[tmpPositionCache][0].attr9_Extending;
						
					};
					
				};
				
			};
			while ((((func7_IsToken("(")) && (local5_Found_2264)) ? 1 : 0)) {
				var local4_func_2279 = 0;
				local4_func_2279 = func14_SearchPrototyp(unref(global5_Exprs_ref[0].arrAccess(local4_Expr_ref_2256[0]).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str_ref[0]));
				if ((((local4_func_2279) != (-(1))) ? 1 : 0)) {
					var local6_Params_2280 = new GLBArray();
					func13_ParseFuncCall(global8_Compiler.attr5_Funcs_ref[0].arrAccess(local4_func_2279).values[tmpPositionCache][0].attr8_datatype, unref(local6_Params_2280), param9_IsCommand);
					local4_Expr_ref_2256[0] = func25_CreateProtoCallExpression(unref(local4_Expr_ref_2256[0]), unref(local6_Params_2280));
					
				};
				
			};
			if ((((local5_Found_2264) == (0)) ? 1 : 0)) {
				if ((((local4_Expr_ref_2256[0]) != (-(1))) ? 1 : 0)) {
					var local8_Atts_Str_2281 = "";
					local8_Atts_Str_2281 = "";
					var forEachSaver17573 = local5_Varis_2263;
					for(var forEachCounter17573 = 0 ; forEachCounter17573 < forEachSaver17573.values.length ; forEachCounter17573++) {
						var local4_Vari_2282 = forEachSaver17573.values[forEachCounter17573];
					{
							if ((((local8_Name_Str_2261) == (global8_Compiler.attr5_Varis_ref[0].arrAccess(local4_Vari_2282).values[tmpPositionCache][0].attr8_Name_Str)) ? 1 : 0)) {
								local8_Atts_Str_2281 = ((((local8_Atts_Str_2281) + (global8_Compiler.attr5_Varis_ref[0].arrAccess(local4_Vari_2282).values[tmpPositionCache][0].attr8_Name_Str))) + (", "));
								
							};
							
						}
						forEachSaver17573.values[forEachCounter17573] = local4_Vari_2282;
					
					};
					func6_IsType(unref(global5_Exprs_ref[0].arrAccess(local4_Expr_ref_2256[0]).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str_ref[0]));
					func5_Error((((((((((((("Cannot find attribute '") + (local8_Name_Str_2261))) + ("' in type '"))) + (global8_LastType.attr8_Name_Str))) + ("' possible attributes '"))) + (local8_Atts_Str_2281))) + ("'")), 1388, "src\CompilerPasses\Parser.gbas");
					
				} else {
					func5_Error((((("Internal error ") + (local8_Name_Str_2261))) + (" (expected identifier).")), 1390, "src\CompilerPasses\Parser.gbas");
					
				};
				
			};
			
		};
		if (func7_IsToken("[")) {
			var local4_Dims_2283 = new GLBArray();
			if ((((global5_Exprs_ref[0].arrAccess(local4_Expr_ref_2256[0]).values[tmpPositionCache][0].attr8_datatype.attr7_IsArray_ref[0]) == (0)) ? 1 : 0)) {
				func5_Error("Array access, but this identifier is no array", 1399, "src\CompilerPasses\Parser.gbas");
				
			};
			while (func7_IsToken("[")) {
				var local7_dimExpr_2284 = 0;
				func5_Match("[", 1402, "src\CompilerPasses\Parser.gbas");
				if (func7_IsToken("]")) {
					func5_Match("]", 1404, "src\CompilerPasses\Parser.gbas");
					break;
					
				};
				local7_dimExpr_2284 = func14_EnsureDatatype(func10_Expression(0), global11_intDatatype, 1407, 0);
				func5_Match("]", 1408, "src\CompilerPasses\Parser.gbas");
				DIMPUSH(local4_Dims_2283, local7_dimExpr_2284);
				
			};
			local4_Expr_ref_2256[0] = func21_CreateArrayExpression(unref(local4_Expr_ref_2256[0]), unref(local4_Dims_2283));
			
		};
		local4_Expr_ref_2256[0] = func22_CreateAccessExpression(unref(local9_SuperExpr_ref_2262[0]), unref(local4_Expr_ref_2256[0]));
		if (func7_IsToken(".")) {
			func5_Match(".", 1419, "src\CompilerPasses\Parser.gbas");
			local5_IsAcc_2257 = 1;
			
		} else {
			local5_IsAcc_2257 = 0;
			
		};
		
	} while (!((((local5_IsAcc_2257) == (0)) ? 1 : 0)));
	if (((((((func7_IsToken("=")) && ((((local4_Expr_ref_2256[0]) != (-(1))) ? 1 : 0))) ? 1 : 0)) && (param9_IsCommand)) ? 1 : 0)) {
		var local7_tmpData_2285 = new type8_Datatype();
		if ((((global8_Compiler.attr5_Varis_ref[0].arrAccess(func11_GetVariable(unref(local4_Expr_ref_2256[0]), 1)).values[tmpPositionCache][0].attr3_Typ) == (6)) ? 1 : 0)) {
			func5_Error("Assignment invalid, because of CONSTANT variable.", 1428, "src\CompilerPasses\Parser.gbas");
			
		};
		if (((((((global5_Exprs_ref[0].arrAccess(func12_GetRightExpr(unref(local4_Expr_ref_2256[0]))).values[tmpPositionCache][0].attr3_Typ) == (6)) ? 1 : 0)) || ((((global5_Exprs_ref[0].arrAccess(func12_GetRightExpr(unref(local4_Expr_ref_2256[0]))).values[tmpPositionCache][0].attr3_Typ) == (23)) ? 1 : 0))) ? 1 : 0)) {
			func5_Error("Cannot assign to function call.", 1430, "src\CompilerPasses\Parser.gbas");
			
		};
		func5_Match("=", 1431, "src\CompilerPasses\Parser.gbas");
		if ((((param9_IsCommand) == (0)) ? 1 : 0)) {
			func5_Error("Assignment is a statement.", 1432, "src\CompilerPasses\Parser.gbas");
			
		};
		local7_tmpData_2285 = global5_Exprs_ref[0].arrAccess(local4_Expr_ref_2256[0]).values[tmpPositionCache][0].attr8_datatype.clone(/* In Assign */);
		return tryClone(func22_CreateAssignExpression(unref(local4_Expr_ref_2256[0]), func14_EnsureDatatype(func10_Expression(0), local7_tmpData_2285, 1436, 0)));
		
	};
	if ((((local4_Expr_ref_2256[0]) != (-(1))) ? 1 : 0)) {
		return tryClone(unref(local4_Expr_ref_2256[0]));
		
	} else {
		func5_Error("Internal error (Expecting identifier)", 1442, "src\CompilerPasses\Parser.gbas");
		
	};
	return 0;
	
};
func10_Identifier = window['func10_Identifier'];
window['func19_ParseIdentifierFunc'] = function(param4_Expr_ref, param9_SuperExpr_ref, param9_IsCommand, param8_Name_Str, param4_func) {
	if ((((param4_func) == (-(1))) ? 1 : 0)) {
		func5_Error("Internal Error (func is -1, ParseIdentifierFunc", 1448, "src\CompilerPasses\Parser.gbas");
		
	};
	if ((((((((((global8_Compiler.attr11_currentFunc) != (-(1))) ? 1 : 0)) && ((((global8_Compiler.attr5_Funcs_ref[0].arrAccess(global8_Compiler.attr11_currentFunc).values[tmpPositionCache][0].attr6_MyType) != (-(1))) ? 1 : 0))) ? 1 : 0)) && ((((param4_Expr_ref[0]) == (-(1))) ? 1 : 0))) ? 1 : 0)) {
		var local3_typ_2291 = 0;
		local3_typ_2291 = global8_Compiler.attr5_Funcs_ref[0].arrAccess(global8_Compiler.attr11_currentFunc).values[tmpPositionCache][0].attr6_MyType;
		while ((((local3_typ_2291) != (-(1))) ? 1 : 0)) {
			if (((((((global8_Compiler.attr5_Funcs_ref[0].arrAccess(param4_func).values[tmpPositionCache][0].attr6_MyType) == (local3_typ_2291)) ? 1 : 0)) && ((((global8_Compiler.attr5_Funcs_ref[0].arrAccess(param4_func).values[tmpPositionCache][0].attr6_MyType) != (-(1))) ? 1 : 0))) ? 1 : 0)) {
				param9_SuperExpr_ref[0] = func24_CreateVariableExpression(global8_Compiler.attr5_Funcs_ref[0].arrAccess(global8_Compiler.attr11_currentFunc).values[tmpPositionCache][0].attr7_SelfVar);
				break;
				
			};
			local3_typ_2291 = global8_Compiler.attr5_Types_ref[0].arrAccess(local3_typ_2291).values[tmpPositionCache][0].attr9_Extending;
			
		};
		
	};
	global8_Compiler.attr5_Funcs_ref[0].arrAccess(param4_func).values[tmpPositionCache][0].attr10_PlzCompile = 1;
	if (((((((func7_IsToken("(")) == (0)) ? 1 : 0)) && ((((param9_IsCommand) == (0)) ? 1 : 0))) ? 1 : 0)) {
		var local8_datatype_2292 = new type8_Datatype();
		local8_datatype_2292.attr8_Name_Str_ref[0] = param8_Name_Str;
		local8_datatype_2292.attr7_IsArray_ref[0] = 0;
		global8_Compiler.attr5_Funcs_ref[0].arrAccess(param4_func).values[tmpPositionCache][0].attr15_UsedAsPrototype = 1;
		return tryClone(func24_CreateFuncDataExpression(local8_datatype_2292));
		
	} else {
		var local6_Params_2293 = new GLBArray();
		func13_ParseFuncCall(global8_Compiler.attr5_Funcs_ref[0].arrAccess(param4_func).values[tmpPositionCache][0].attr8_datatype, unref(local6_Params_2293), param9_IsCommand);
		param4_Expr_ref[0] = func24_CreateFuncCallExpression(global8_Compiler.attr5_Funcs_ref[0].arrAccess(param4_func).values[tmpPositionCache][0].attr2_ID, unref(local6_Params_2293));
		
	};
	return tryClone(-(1));
	return 0;
	
};
func19_ParseIdentifierFunc = window['func19_ParseIdentifierFunc'];
window['func13_ParseFuncCall'] = function(param8_datatype, param6_Params, param9_IsCommand) {
	var local9_OpBracket_2297 = 0, local4_Find_2298 = 0.0, local12_CloseBracket_2299 = 0;
	local9_OpBracket_2297 = func7_IsToken("(");
	if ((((param8_datatype.attr8_Name_Str_ref[0]) == ("void")) ? 1 : 0)) {
		if (((param9_IsCommand) ? 0 : 1)) {
			func5_Error("Void function has to be a command!", 1492, "src\CompilerPasses\Parser.gbas");
			
		};
		local9_OpBracket_2297 = 0;
		
	} else {
		if (local9_OpBracket_2297) {
			func5_Match("(", 1499, "src\CompilerPasses\Parser.gbas");
			
		};
		
	};
	local4_Find_2298 = 0;
	while (((((((func7_IsToken("\n")) == (0)) ? 1 : 0)) && ((((func7_IsToken(")")) == (0)) ? 1 : 0))) ? 1 : 0)) {
		if (local4_Find_2298) {
			func5_Match(",", 1507, "src\CompilerPasses\Parser.gbas");
			
		};
		DIMPUSH(param6_Params, func10_Expression(0));
		local4_Find_2298 = 1;
		
	};
	local12_CloseBracket_2299 = func7_IsToken(")");
	if (local12_CloseBracket_2299) {
		func5_Match(")", 1513, "src\CompilerPasses\Parser.gbas");
		
	};
	if ((((local12_CloseBracket_2299) != (local9_OpBracket_2297)) ? 1 : 0)) {
		func5_Error("Brackets are not closed.", 1516, "src\CompilerPasses\Parser.gbas");
		
	};
	return 0;
	
};
func13_ParseFuncCall = window['func13_ParseFuncCall'];
window['func7_Keyword'] = function() {
	{
		var local17___SelectHelper23__2300 = 0;
		local17___SelectHelper23__2300 = 1;
		if ((((local17___SelectHelper23__2300) == (func7_IsToken("CALLBACK"))) ? 1 : 0)) {
			func5_Match("CALLBACK", 1525, "src\CompilerPasses\Parser.gbas");
			func7_Keyword();
			
		} else if ((((local17___SelectHelper23__2300) == (func7_IsToken("NATIVE"))) ? 1 : 0)) {
			func5_Match("NATIVE", 1528, "src\CompilerPasses\Parser.gbas");
			func10_SkipTokens("NATIVE", "\n", "");
			
		} else if ((((local17___SelectHelper23__2300) == (func7_IsToken("ABSTRACT"))) ? 1 : 0)) {
			func5_Match("ABSTRACT", 1531, "src\CompilerPasses\Parser.gbas");
			func10_SkipTokens("ABSTRACT", "\n", "");
			
		} else if ((((local17___SelectHelper23__2300) == (func7_IsToken("FUNCTION"))) ? 1 : 0)) {
			func10_SkipTokens("FUNCTION", "ENDFUNCTION", "");
			
		} else if ((((local17___SelectHelper23__2300) == (func7_IsToken("SUB"))) ? 1 : 0)) {
			func10_SkipTokens("SUB", "ENDSUB", "");
			
		} else if ((((local17___SelectHelper23__2300) == (func7_IsToken("TYPE"))) ? 1 : 0)) {
			func10_SkipTokens("TYPE", "ENDTYPE", "");
			
		} else if ((((local17___SelectHelper23__2300) == (func7_IsToken("PROTOTYPE"))) ? 1 : 0)) {
			func10_SkipTokens("PROTOTYPE", "\n", "");
			
		} else if ((((local17___SelectHelper23__2300) == (func7_IsToken("CONSTANT"))) ? 1 : 0)) {
			func10_SkipTokens("CONSTANT", "\n", "");
			
		} else if ((((local17___SelectHelper23__2300) == (func7_IsToken("GLOBAL"))) ? 1 : 0)) {
			do {
				var local7_tmpVari_2301 = new type14_IdentifierVari();
				if (func7_IsToken("GLOBAL")) {
					func5_Match("GLOBAL", 1546, "src\CompilerPasses\Parser.gbas");
					
				} else {
					func5_Match(",", 1548, "src\CompilerPasses\Parser.gbas");
					
				};
				local7_tmpVari_2301 = func7_VariDef(0).clone(/* In Assign */);
				var forEachSaver18257 = global8_Compiler.attr7_Globals;
				for(var forEachCounter18257 = 0 ; forEachCounter18257 < forEachSaver18257.values.length ; forEachCounter18257++) {
					var local1_V_2302 = forEachSaver18257.values[forEachCounter18257];
				{
						var alias4_Vari_ref_2303 = [new type14_IdentifierVari()];
						alias4_Vari_ref_2303 = global8_Compiler.attr5_Varis_ref[0].arrAccess(local1_V_2302).values[tmpPositionCache] /* ALIAS */;
						if (((((((alias4_Vari_ref_2303[0].attr8_Name_Str) == (local7_tmpVari_2301.attr8_Name_Str)) ? 1 : 0)) && ((((alias4_Vari_ref_2303[0].attr6_PreDef) != (-(1))) ? 1 : 0))) ? 1 : 0)) {
							var local7_tmpExpr_2304 = 0;
							if ((((global8_Compiler.attr12_CurrentScope) == (-(1))) ? 1 : 0)) {
								func5_Error("Internal error (GLOBAL in -1 scope)", 1555, "src\CompilerPasses\Parser.gbas");
								
							};
							local7_tmpExpr_2304 = func22_CreateAssignExpression(func24_CreateVariableExpression(alias4_Vari_ref_2303[0].attr2_ID), alias4_Vari_ref_2303[0].attr6_PreDef);
							DIMPUSH(global5_Exprs_ref[0].arrAccess(global8_Compiler.attr12_CurrentScope).values[tmpPositionCache][0].attr5_Exprs, local7_tmpExpr_2304);
							alias4_Vari_ref_2303[0].attr6_PreDef = -(1);
							
						};
						
					}
					forEachSaver18257.values[forEachCounter18257] = local1_V_2302;
				
				};
				
			} while (!((((func7_IsToken(",")) == (0)) ? 1 : 0)));
			
		} else if ((((local17___SelectHelper23__2300) == (func7_IsToken("LOCAL"))) ? 1 : 0)) {
			do {
				var local10_DontCreate_2305 = 0;
				if (func7_IsToken("LOCAL")) {
					func5_Match("LOCAL", 1565, "src\CompilerPasses\Parser.gbas");
					
				} else {
					func5_Match(",", 1567, "src\CompilerPasses\Parser.gbas");
					
				};
				local10_DontCreate_2305 = 0;
				if (func13_IsVarExisting(func17_CleanVariable_Str(func14_GetCurrent_Str()))) {
					var local5_Varis_2306 = new GLBArray();
					local10_DontCreate_2305 = 1;
					func8_GetVaris(unref(local5_Varis_2306), -(1), 0);
					var forEachSaver18336 = local5_Varis_2306;
					for(var forEachCounter18336 = 0 ; forEachCounter18336 < forEachSaver18336.values.length ; forEachCounter18336++) {
						var local1_V_2307 = forEachSaver18336.values[forEachCounter18336];
					{
							if ((((global8_Compiler.attr5_Varis_ref[0].arrAccess(local1_V_2307).values[tmpPositionCache][0].attr8_Name_Str) == (func17_CleanVariable_Str(func14_GetCurrent_Str()))) ? 1 : 0)) {
								if ((((global8_Compiler.attr5_Varis_ref[0].arrAccess(local1_V_2307).values[tmpPositionCache][0].attr3_Typ) == (2)) ? 1 : 0)) {
									local10_DontCreate_2305 = 0;
									break;
									
								};
								
							};
							
						}
						forEachSaver18336.values[forEachCounter18336] = local1_V_2307;
					
					};
					if (local10_DontCreate_2305) {
						var local4_Expr_2308 = 0;
						func7_Warning((((("Variable '") + (func14_GetCurrent_Str()))) + ("' already exists...")));
						local4_Expr_2308 = func10_Identifier(1);
						DIMPUSH(global5_Exprs_ref[0].arrAccess(global8_Compiler.attr12_CurrentScope).values[tmpPositionCache][0].attr5_Exprs, local4_Expr_2308);
						
					};
					
				};
				if (((local10_DontCreate_2305) ? 0 : 1)) {
					var local4_Vari_2309 = new type14_IdentifierVari(), local4_PDef_2310 = 0;
					local4_Vari_2309 = func7_VariDef(0).clone(/* In Assign */);
					local4_Vari_2309.attr3_Typ = ~~(1);
					local4_PDef_2310 = -(1);
					if ((((local4_Vari_2309.attr6_PreDef) != (-(1))) ? 1 : 0)) {
						local4_PDef_2310 = local4_Vari_2309.attr6_PreDef;
						local4_Vari_2309.attr6_PreDef = -(1);
						
					};
					func11_AddVariable(local4_Vari_2309, 1);
					DIMPUSH(global5_Exprs_ref[0].arrAccess(global8_Compiler.attr12_CurrentScope).values[tmpPositionCache][0].attr5_Varis, ((BOUNDS(global8_Compiler.attr5_Varis_ref[0], 0)) - (1)));
					if ((((local4_PDef_2310) != (-(1))) ? 1 : 0)) {
						var local7_tmpExpr_2311 = 0;
						if ((((global8_Compiler.attr12_CurrentScope) == (-(1))) ? 1 : 0)) {
							func5_Error("Internal error (LOCAL in -1 scope)", 1606, "src\CompilerPasses\Parser.gbas");
							
						};
						local7_tmpExpr_2311 = func22_CreateAssignExpression(func24_CreateVariableExpression(((BOUNDS(global8_Compiler.attr5_Varis_ref[0], 0)) - (1))), local4_PDef_2310);
						DIMPUSH(global5_Exprs_ref[0].arrAccess(global8_Compiler.attr12_CurrentScope).values[tmpPositionCache][0].attr5_Exprs, local7_tmpExpr_2311);
						
					};
					
				};
				
			} while (!((((func7_IsToken(",")) == (0)) ? 1 : 0)));
			
		} else if ((((local17___SelectHelper23__2300) == (func7_IsToken("ALIAS"))) ? 1 : 0)) {
			do {
				var local4_Vari_2312 = new type14_IdentifierVari(), local4_PDef_2313 = 0, local7_tmpExpr_2314 = 0;
				if (func7_IsToken("ALIAS")) {
					func5_Match("ALIAS", 1617, "src\CompilerPasses\Parser.gbas");
					
				} else {
					func5_Match(",", 1619, "src\CompilerPasses\Parser.gbas");
					
				};
				func14_IsValidVarName();
				local4_Vari_2312.attr8_Name_Str = func14_GetCurrent_Str();
				local4_Vari_2312.attr3_Typ = ~~(7);
				local4_Vari_2312.attr3_ref = 1;
				func5_Match(local4_Vari_2312.attr8_Name_Str, 1627, "src\CompilerPasses\Parser.gbas");
				func5_Match("AS", 1628, "src\CompilerPasses\Parser.gbas");
				local4_PDef_2313 = func10_Identifier(0);
				global8_Compiler.attr5_Varis_ref[0].arrAccess(func11_GetVariable(local4_PDef_2313, 1)).values[tmpPositionCache][0].attr3_ref = 1;
				local4_Vari_2312.attr8_datatype = global5_Exprs_ref[0].arrAccess(local4_PDef_2313).values[tmpPositionCache][0].attr8_datatype.clone(/* In Assign */);
				func11_AddVariable(local4_Vari_2312, 1);
				DIMPUSH(global5_Exprs_ref[0].arrAccess(global8_Compiler.attr12_CurrentScope).values[tmpPositionCache][0].attr5_Varis, ((BOUNDS(global8_Compiler.attr5_Varis_ref[0], 0)) - (1)));
				local7_tmpExpr_2314 = func21_CreateAliasExpression(((BOUNDS(global8_Compiler.attr5_Varis_ref[0], 0)) - (1)), local4_PDef_2313);
				if (func7_IsToken(",")) {
					DIMPUSH(global5_Exprs_ref[0].arrAccess(global8_Compiler.attr12_CurrentScope).values[tmpPositionCache][0].attr5_Exprs, local7_tmpExpr_2314);
					
				} else {
					return tryClone(local7_tmpExpr_2314);
					
				};
				
			} while (!((((func7_IsToken(",")) == (0)) ? 1 : 0)));
			
		} else if ((((local17___SelectHelper23__2300) == (func7_IsToken("STATIC"))) ? 1 : 0)) {
			if ((((global8_Compiler.attr11_currentFunc) == (-(1))) ? 1 : 0)) {
				func5_Error("Static has to be in a FUNCTION", 1647, "src\CompilerPasses\Parser.gbas");
				
			};
			do {
				var local4_Vari_2315 = new type14_IdentifierVari();
				if (func7_IsToken("STATIC")) {
					func5_Match("STATIC", 1651, "src\CompilerPasses\Parser.gbas");
					
				} else {
					func5_Match(",", 1653, "src\CompilerPasses\Parser.gbas");
					
				};
				local4_Vari_2315 = func7_VariDef(0).clone(/* In Assign */);
				local4_Vari_2315.attr3_Typ = ~~(4);
				local4_Vari_2315.attr4_func = global8_Compiler.attr11_currentFunc;
				func11_AddVariable(local4_Vari_2315, 1);
				DIMPUSH(global8_Compiler.attr5_Funcs_ref[0].arrAccess(global8_Compiler.attr11_currentFunc).values[tmpPositionCache][0].attr7_Statics, ((BOUNDS(global8_Compiler.attr5_Varis_ref[0], 0)) - (1)));
				DIMPUSH(global5_Exprs_ref[0].arrAccess(global8_Compiler.attr12_CurrentScope).values[tmpPositionCache][0].attr5_Varis, ((BOUNDS(global8_Compiler.attr5_Varis_ref[0], 0)) - (1)));
				
			} while (!((((func7_IsToken(",")) == (0)) ? 1 : 0)));
			
		} else if ((((local17___SelectHelper23__2300) == (func7_IsToken("DIMPUSH"))) ? 1 : 0)) {
			var local4_Vari_2316 = 0, local8_datatype_2317 = new type8_Datatype(), local4_Expr_2318 = 0;
			func5_Match("DIMPUSH", 1665, "src\CompilerPasses\Parser.gbas");
			local4_Vari_2316 = func10_Identifier(0);
			if ((((global5_Exprs_ref[0].arrAccess(local4_Vari_2316).values[tmpPositionCache][0].attr8_datatype.attr7_IsArray_ref[0]) == (0)) ? 1 : 0)) {
				func5_Error("DIMPUSH needs array", 1667, "src\CompilerPasses\Parser.gbas");
				
			};
			func5_Match(",", 1668, "src\CompilerPasses\Parser.gbas");
			local8_datatype_2317 = global5_Exprs_ref[0].arrAccess(local4_Vari_2316).values[tmpPositionCache][0].attr8_datatype.clone(/* In Assign */);
			local8_datatype_2317.attr7_IsArray_ref[0] = 0;
			local4_Expr_2318 = func14_EnsureDatatype(func10_Expression(0), local8_datatype_2317, 1673, 0);
			return tryClone(func23_CreateDimpushExpression(local4_Vari_2316, local4_Expr_2318));
			
		} else if ((((local17___SelectHelper23__2300) == (func7_IsToken("DIM"))) ? 1 : 0)) {
			var local3_Arr_2319 = 0;
			func5_Match("DIM", 1684, "src\CompilerPasses\Parser.gbas");
			local3_Arr_2319 = func14_ImplicitDefine();
			if ((((local3_Arr_2319) != (-(1))) ? 1 : 0)) {
				global8_Compiler.attr5_Varis_ref[0].arrAccess(local3_Arr_2319).values[tmpPositionCache][0].attr8_datatype.attr7_IsArray_ref[0] = 1;
				
			};
			if (func12_IsIdentifier(0)) {
				var local4_expr_2320 = 0, local5_LExpr_2321 = 0, local4_Dims_2322 = new GLBArray();
				local4_expr_2320 = func10_Identifier(0);
				local5_LExpr_2321 = func12_GetRightExpr(local4_expr_2320);
				if ((((global8_Compiler.attr5_Varis_ref[0].arrAccess(func11_GetVariable(local4_expr_2320, 1)).values[tmpPositionCache][0].attr8_datatype.attr7_IsArray_ref[0]) == (0)) ? 1 : 0)) {
					func5_Error("Array expected.", 1693, "src\CompilerPasses\Parser.gbas");
					
				};
				{
					var local17___SelectHelper24__2323 = 0;
					local17___SelectHelper24__2323 = global5_Exprs_ref[0].arrAccess(local5_LExpr_2321).values[tmpPositionCache][0].attr3_Typ;
					if ((((local17___SelectHelper24__2323) == (~~(13))) ? 1 : 0)) {
						local4_Dims_2322 = global5_Exprs_ref[0].arrAccess(local5_LExpr_2321).values[tmpPositionCache][0].attr4_dims.clone(/* In Assign */);
						DIM(global5_Exprs_ref[0].arrAccess(local5_LExpr_2321).values[tmpPositionCache][0].attr4_dims, [0], 0);
						
					} else {
						func5_Error("Internal error (array not parsed)", 1700, "src\CompilerPasses\Parser.gbas");
						
					};
					
				};
				return tryClone(func19_CreateDimExpression(local4_expr_2320, unref(local4_Dims_2322)));
				
			} else {
				func5_Error("DIM needs identifier", 1705, "src\CompilerPasses\Parser.gbas");
				
			};
			
		} else if ((((local17___SelectHelper23__2300) == (func7_IsToken("REDIM"))) ? 1 : 0)) {
			var local3_Arr_2324 = 0;
			func5_Match("REDIM", 1708, "src\CompilerPasses\Parser.gbas");
			local3_Arr_2324 = func14_ImplicitDefine();
			if ((((local3_Arr_2324) != (-(1))) ? 1 : 0)) {
				global8_Compiler.attr5_Varis_ref[0].arrAccess(local3_Arr_2324).values[tmpPositionCache][0].attr8_datatype.attr7_IsArray_ref[0] = 1;
				
			};
			if (func12_IsIdentifier(0)) {
				var local4_expr_2325 = 0, local5_LExpr_2326 = 0, local4_Dims_2327 = new GLBArray();
				local4_expr_2325 = func10_Identifier(0);
				local5_LExpr_2326 = func12_GetRightExpr(local4_expr_2325);
				if ((((global8_Compiler.attr5_Varis_ref[0].arrAccess(func11_GetVariable(local4_expr_2325, 1)).values[tmpPositionCache][0].attr8_datatype.attr7_IsArray_ref[0]) == (0)) ? 1 : 0)) {
					func5_Error("Array expected.", 1716, "src\CompilerPasses\Parser.gbas");
					
				};
				{
					var local17___SelectHelper25__2328 = 0;
					local17___SelectHelper25__2328 = global5_Exprs_ref[0].arrAccess(local5_LExpr_2326).values[tmpPositionCache][0].attr3_Typ;
					if ((((local17___SelectHelper25__2328) == (~~(13))) ? 1 : 0)) {
						local4_Dims_2327 = global5_Exprs_ref[0].arrAccess(local5_LExpr_2326).values[tmpPositionCache][0].attr4_dims.clone(/* In Assign */);
						DIM(global5_Exprs_ref[0].arrAccess(local5_LExpr_2326).values[tmpPositionCache][0].attr4_dims, [0], 0);
						
					} else {
						func5_Error("Internal error (array not parsed)", 1723, "src\CompilerPasses\Parser.gbas");
						
					};
					
				};
				return tryClone(func21_CreateReDimExpression(local4_expr_2325, unref(local4_Dims_2327)));
				
			} else {
				func5_Error("REDIM needs identifier", 1727, "src\CompilerPasses\Parser.gbas");
				
			};
			
		} else if ((((local17___SelectHelper23__2300) == (func7_IsToken("DIMDATA"))) ? 1 : 0)) {
			var local5_Array_2329 = 0, local2_Ex_2330 = new GLBArray();
			func5_Match("DIMDATA", 1730, "src\CompilerPasses\Parser.gbas");
			local5_Array_2329 = func14_ImplicitDefine();
			if ((((local5_Array_2329) != (-(1))) ? 1 : 0)) {
				global8_Compiler.attr5_Varis_ref[0].arrAccess(local5_Array_2329).values[tmpPositionCache][0].attr8_datatype.attr7_IsArray_ref[0] = 1;
				local5_Array_2329 = func10_Identifier(0);
				
			} else {
				local5_Array_2329 = func10_Expression(0);
				
			};
			if ((((global5_Exprs_ref[0].arrAccess(local5_Array_2329).values[tmpPositionCache][0].attr8_datatype.attr7_IsArray_ref[0]) == (0)) ? 1 : 0)) {
				func5_Error("DIMDATA needs array, stupid...", 1740, "src\CompilerPasses\Parser.gbas");
				
			};
			while ((((func7_IsToken("\n")) == (0)) ? 1 : 0)) {
				func5_Match(",", 1743, "src\CompilerPasses\Parser.gbas");
				if ((((BOUNDS(local2_Ex_2330, 0)) == (0)) ? 1 : 0)) {
					DIMPUSH(local2_Ex_2330, func10_Expression(0));
					
				} else {
					var local7_datatyp_2331 = new type8_Datatype(), local1_E_2332 = 0;
					local7_datatyp_2331 = global5_Exprs_ref[0].arrAccess(local2_Ex_2330.arrAccess(0).values[tmpPositionCache]).values[tmpPositionCache][0].attr8_datatype.clone(/* In Assign */);
					local1_E_2332 = func14_EnsureDatatype(func10_Expression(0), local7_datatyp_2331, 1749, 0);
					DIMPUSH(local2_Ex_2330, local1_E_2332);
					
				};
				
			};
			return tryClone(func23_CreateDimDataExpression(local5_Array_2329, unref(local2_Ex_2330)));
			
		} else if ((((local17___SelectHelper23__2300) == (func7_IsToken("DELETE"))) ? 1 : 0)) {
			var local11_VarName_Str_2333 = "";
			func5_Match("DELETE", 1756, "src\CompilerPasses\Parser.gbas");
			local11_VarName_Str_2333 = func14_GetCurrent_Str();
			if (((((((local11_VarName_Str_2333) != (global8_Compiler.attr18_currentForEach_Str)) ? 1 : 0)) && ((((local11_VarName_Str_2333) != ("\n")) ? 1 : 0))) ? 1 : 0)) {
				func5_Error((((((((("DELETE, invalid name '") + (local11_VarName_Str_2333))) + ("' expecting '"))) + (global8_Compiler.attr18_currentForEach_Str))) + ("'")), 1758, "src\CompilerPasses\Parser.gbas");
				
			};
			if ((((func7_IsToken("\n")) == (0)) ? 1 : 0)) {
				func7_GetNext();
				
			};
			return tryClone(func22_CreateDeleteExpression());
			
		} else if ((((local17___SelectHelper23__2300) == (func7_IsToken("DIMDEL"))) ? 1 : 0)) {
			var local5_Array_2334 = 0;
			func5_Match("DIMDEL", 1762, "src\CompilerPasses\Parser.gbas");
			local5_Array_2334 = func10_Identifier(0);
			func5_Match(",", 1764, "src\CompilerPasses\Parser.gbas");
			return tryClone(func22_CreateDimDelExpression(local5_Array_2334, func14_EnsureDatatype(func10_Expression(0), global11_intDatatype, 1765, 0)));
			
		} else if ((((local17___SelectHelper23__2300) == (func7_IsToken("RETURN"))) ? 1 : 0)) {
			if ((((global8_Compiler.attr11_currentFunc) != (-(1))) ? 1 : 0)) {
				var local4_Expr_2335 = 0, local8_datatype_2336 = new type8_Datatype();
				func5_Match("RETURN", 1768, "src\CompilerPasses\Parser.gbas");
				local8_datatype_2336 = global8_Compiler.attr5_Funcs_ref[0].arrAccess(global8_Compiler.attr11_currentFunc).values[tmpPositionCache][0].attr8_datatype.clone(/* In Assign */);
				if (func7_IsToken("\n")) {
					local4_Expr_2335 = func28_CreateDefaultValueExpression(local8_datatype_2336);
					
				} else if ((((global8_Compiler.attr5_Funcs_ref[0].arrAccess(global8_Compiler.attr11_currentFunc).values[tmpPositionCache][0].attr3_Typ) == (2)) ? 1 : 0)) {
					func5_Error("Sub cannot return a value", 1775, "src\CompilerPasses\Parser.gbas");
					
				} else {
					local4_Expr_2335 = func14_EnsureDatatype(func10_Expression(0), local8_datatype_2336, 1777, 0);
					
				};
				return tryClone(func22_CreateReturnExpression(local4_Expr_2335));
				
			} else {
				func5_Error("RETURN have to be in a function or sub.", 1781, "src\CompilerPasses\Parser.gbas");
				
			};
			
		} else if ((((local17___SelectHelper23__2300) == (func7_IsToken("INLINE"))) ? 1 : 0)) {
			func5_Error("INLINE/ENDINLINE not supported", 1784, "src\CompilerPasses\Parser.gbas");
			
		} else if ((((local17___SelectHelper23__2300) == (func7_IsToken("REQUIRE"))) ? 1 : 0)) {
			var local8_Name_Str_2337 = "";
			func5_Match("REQUIRE", 1786, "src\CompilerPasses\Parser.gbas");
			local8_Name_Str_2337 = REPLACE_Str(func14_GetCurrent_Str(), "\"", "");
			func7_GetNext();
			return tryClone(~~(func23_CreateRequireExpression(local8_Name_Str_2337)));
			
		} else if ((((local17___SelectHelper23__2300) == (func7_IsToken("EXPORT"))) ? 1 : 0)) {
			var local3_Exp_2338 = new type7_TExport(), local5_Found_2339 = 0;
			func5_Match("EXPORT", 1791, "src\CompilerPasses\Parser.gbas");
			local3_Exp_2338.attr8_Name_Str = REPLACE_Str(func14_GetCurrent_Str(), "\"", "");
			local5_Found_2339 = 0;
			var forEachSaver19313 = global8_Compiler.attr5_Funcs_ref[0];
			for(var forEachCounter19313 = 0 ; forEachCounter19313 < forEachSaver19313.values.length ; forEachCounter19313++) {
				var local1_F_ref_2340 = forEachSaver19313.values[forEachCounter19313];
			{
					if (((((((local1_F_ref_2340[0].attr3_Typ) == (1)) ? 1 : 0)) && ((((local3_Exp_2338.attr8_Name_Str) == (local1_F_ref_2340[0].attr8_Name_Str)) ? 1 : 0))) ? 1 : 0)) {
						local1_F_ref_2340[0].attr10_PlzCompile = 1;
						local5_Found_2339 = 1;
						break;
						
					};
					
				}
				forEachSaver19313.values[forEachCounter19313] = local1_F_ref_2340;
			
			};
			if (((local5_Found_2339) ? 0 : 1)) {
				var forEachSaver19353 = global8_Compiler.attr7_Globals;
				for(var forEachCounter19353 = 0 ; forEachCounter19353 < forEachSaver19353.values.length ; forEachCounter19353++) {
					var local1_V_2341 = forEachSaver19353.values[forEachCounter19353];
				{
						if (((((((global8_Compiler.attr5_Varis_ref[0].arrAccess(local1_V_2341).values[tmpPositionCache][0].attr3_Typ) == (2)) ? 1 : 0)) && ((((global8_Compiler.attr5_Varis_ref[0].arrAccess(local1_V_2341).values[tmpPositionCache][0].attr8_Name_Str) == (local3_Exp_2338.attr8_Name_Str)) ? 1 : 0))) ? 1 : 0)) {
							local5_Found_2339 = 1;
							break;
							
						};
						
					}
					forEachSaver19353.values[forEachCounter19353] = local1_V_2341;
				
				};
				
			};
			if (((local5_Found_2339) ? 0 : 1)) {
				func5_Error((((("Cannot export undefined function/global '") + (local3_Exp_2338.attr8_Name_Str))) + ("'")), 1814, "src\CompilerPasses\Parser.gbas");
				
			};
			local3_Exp_2338.attr8_Name_Str = REPLACE_Str(local3_Exp_2338.attr8_Name_Str, "$", "_Str");
			func7_GetNext();
			if (func7_IsToken(",")) {
				func5_Match(",", 1818, "src\CompilerPasses\Parser.gbas");
				local3_Exp_2338.attr12_RealName_Str = REPLACE_Str(func14_GetCurrent_Str(), "\"", "");
				func7_GetNext();
				
			};
			DIMPUSH(global8_Compiler.attr7_Exports, local3_Exp_2338);
			return tryClone(func21_CreateEmptyExpression());
			
		} else if ((((local17___SelectHelper23__2300) == (func7_IsToken("IF"))) ? 1 : 0)) {
			var local4_Cnds_2342 = new GLBArray(), local4_Scps_2343 = new GLBArray(), local7_elseScp_2344 = 0;
			func5_Match("IF", 1827, "src\CompilerPasses\Parser.gbas");
			DIMPUSH(local4_Cnds_2342, func14_EnsureDatatype(func10_Expression(0), global13_floatDatatype, 1829, 0));
			if ((((func7_IsToken("THEN")) == (0)) ? 1 : 0)) {
				func5_Match("\n", 1831, "src\CompilerPasses\Parser.gbas");
				
			};
			DIMPUSH(local4_Scps_2343, func5_Scope("ENDIF", -(1)));
			while (func7_IsToken("ELSEIF")) {
				func5_Match("ELSEIF", 1838, "src\CompilerPasses\Parser.gbas");
				DIMPUSH(local4_Cnds_2342, func14_EnsureDatatype(func10_Expression(0), global13_floatDatatype, 1839, 0));
				func5_Match("\n", 1840, "src\CompilerPasses\Parser.gbas");
				DIMPUSH(local4_Scps_2343, func5_Scope("ENDIF", -(1)));
				
			};
			if (func7_IsToken("ELSE")) {
				func5_Match("ELSE", 1844, "src\CompilerPasses\Parser.gbas");
				func5_Match("\n", 1845, "src\CompilerPasses\Parser.gbas");
				local7_elseScp_2344 = func5_Scope("ENDIF", -(1));
				
			} else {
				local7_elseScp_2344 = -(1);
				
			};
			return tryClone(func18_CreateIfExpression(unref(local4_Cnds_2342), unref(local4_Scps_2343), local7_elseScp_2344));
			
		} else if ((((local17___SelectHelper23__2300) == (func7_IsToken("WHILE"))) ? 1 : 0)) {
			var local4_Expr_2345 = 0, local3_Scp_2346 = 0;
			func5_Match("WHILE", 1853, "src\CompilerPasses\Parser.gbas");
			local4_Expr_2345 = func14_EnsureDatatype(func10_Expression(0), global13_floatDatatype, 1854, 0);
			func5_Match("\n", 1855, "src\CompilerPasses\Parser.gbas");
			local3_Scp_2346 = func5_Scope("WEND", -(1));
			return tryClone(func21_CreateWhileExpression(local4_Expr_2345, local3_Scp_2346));
			
		} else if ((((local17___SelectHelper23__2300) == (func7_IsToken("REPEAT"))) ? 1 : 0)) {
			var local3_Scp_2347 = 0, local4_Expr_2348 = 0;
			func5_Match("REPEAT", 1859, "src\CompilerPasses\Parser.gbas");
			func5_Match("\n", 1860, "src\CompilerPasses\Parser.gbas");
			local3_Scp_2347 = func5_Scope("UNTIL", -(1));
			local4_Expr_2348 = func14_EnsureDatatype(func10_Expression(0), global13_floatDatatype, 1862, 0);
			return tryClone(func22_CreateRepeatExpression(local4_Expr_2348, local3_Scp_2347));
			
		} else if ((((local17___SelectHelper23__2300) == (func7_IsToken("FOR"))) ? 1 : 0)) {
			var local8_TmpScope_2349 = 0.0, local4_Expr_2350 = 0, local6_OScope_2360 = 0;
			local8_TmpScope_2349 = global8_Compiler.attr12_CurrentScope;
			global8_Compiler.attr12_CurrentScope = func21_CreateScopeExpression(~~(3));
			local4_Expr_2350 = -(1);
			{
				var Error_Str = "";
				try {
					var local10_IsImplicit_2351 = 0, local7_varExpr_2352 = 0, local3_Var_2355 = 0.0, local5_hasTo_2356 = 0, local6_toExpr_2357 = 0, local8_stepExpr_2358 = 0;
					func5_Match("FOR", 1869, "src\CompilerPasses\Parser.gbas");
					local10_IsImplicit_2351 = -(1);
					if (func12_IsIdentifier(0)) {
						local7_varExpr_2352 = func10_Identifier(1);
						
					} else {
						var local4_Vari_2353 = new type14_IdentifierVari(), local4_PDef_2354 = 0;
						local10_IsImplicit_2351 = 1;
						local4_Vari_2353 = func7_VariDef(0).clone(/* In Assign */);
						local4_Vari_2353.attr3_Typ = ~~(1);
						local4_PDef_2354 = -(1);
						if ((((local4_Vari_2353.attr6_PreDef) != (-(1))) ? 1 : 0)) {
							local4_PDef_2354 = local4_Vari_2353.attr6_PreDef;
							local4_Vari_2353.attr6_PreDef = -(1);
							
						};
						func11_AddVariable(local4_Vari_2353, 1);
						local10_IsImplicit_2351 = ((BOUNDS(global8_Compiler.attr5_Varis_ref[0], 0)) - (1));
						DIMPUSH(global5_Exprs_ref[0].arrAccess(global8_Compiler.attr12_CurrentScope).values[tmpPositionCache][0].attr5_Varis, ((BOUNDS(global8_Compiler.attr5_Varis_ref[0], 0)) - (1)));
						if ((((local4_PDef_2354) != (-(1))) ? 1 : 0)) {
							local7_varExpr_2352 = func22_CreateAssignExpression(func24_CreateVariableExpression(((BOUNDS(global8_Compiler.attr5_Varis_ref[0], 0)) - (1))), local4_PDef_2354);
							
						};
						
					};
					if ((((global5_Exprs_ref[0].arrAccess(local7_varExpr_2352).values[tmpPositionCache][0].attr3_Typ) != (10)) ? 1 : 0)) {
						func5_Error("FOR, variable needs assignment.", 1899, "src\CompilerPasses\Parser.gbas");
						
					};
					local3_Var_2355 = func11_GetVariable(global5_Exprs_ref[0].arrAccess(local7_varExpr_2352).values[tmpPositionCache][0].attr4_vari, 1);
					if (func7_IsToken("TO")) {
						local5_hasTo_2356 = 1;
						func5_Match("TO", 1904, "src\CompilerPasses\Parser.gbas");
						
					} else if (func7_IsToken("UNTIL")) {
						local5_hasTo_2356 = 0;
						func5_Match("UNTIL", 1907, "src\CompilerPasses\Parser.gbas");
						
					} else {
						func5_Error("FOR needs TO or UNTIL!", 1909, "src\CompilerPasses\Parser.gbas");
						
					};
					local6_toExpr_2357 = func14_EnsureDatatype(func10_Expression(0), global8_Compiler.attr5_Varis_ref[0].arrAccess(~~(local3_Var_2355)).values[tmpPositionCache][0].attr8_datatype, 1911, 0);
					local8_stepExpr_2358 = func14_EnsureDatatype(func19_CreateIntExpression(1), global8_Compiler.attr5_Varis_ref[0].arrAccess(~~(local3_Var_2355)).values[tmpPositionCache][0].attr8_datatype, 1912, 0);
					if (func7_IsToken("STEP")) {
						func5_Match("STEP", 1914, "src\CompilerPasses\Parser.gbas");
						local8_stepExpr_2358 = func14_EnsureDatatype(func10_Expression(0), global8_Compiler.attr5_Varis_ref[0].arrAccess(~~(local3_Var_2355)).values[tmpPositionCache][0].attr8_datatype, 1915, 0);
						
					};
					func5_Match("\n", 1917, "src\CompilerPasses\Parser.gbas");
					local4_Expr_2350 = func19_CreateForExpression(local7_varExpr_2352, local6_toExpr_2357, local8_stepExpr_2358, local5_hasTo_2356, func5_Scope("NEXT", -(1)));
					DIMPUSH(global5_Exprs_ref[0].arrAccess(global8_Compiler.attr12_CurrentScope).values[tmpPositionCache][0].attr5_Exprs, local4_Expr_2350);
					
				} catch (Error_Str) {
					if (Error_Str instanceof GLBException) Error_Str = Error_Str.getText(); else throwError(Error_Str);{
						func8_FixError();
						
					}
				};
				
			};
			local6_OScope_2360 = global8_Compiler.attr12_CurrentScope;
			global8_Compiler.attr12_CurrentScope = ~~(local8_TmpScope_2349);
			return tryClone(local6_OScope_2360);
			
		} else if ((((local17___SelectHelper23__2300) == (func7_IsToken("FOREACH"))) ? 1 : 0)) {
			var local8_TmpScope_2361 = 0.0, local14_TmpForEach_Str_2362 = "", local4_Expr_2363 = 0;
			local8_TmpScope_2361 = global8_Compiler.attr12_CurrentScope;
			local14_TmpForEach_Str_2362 = global8_Compiler.attr18_currentForEach_Str;
			global8_Compiler.attr12_CurrentScope = func21_CreateScopeExpression(~~(3));
			local4_Expr_2363 = -(1);
			{
				var Error_Str = "";
				try {
					var local7_varExpr_2364 = 0, local4_Vari_2365 = new type14_IdentifierVari(), local6_InExpr_2366 = 0, local3_var_2367 = 0;
					func5_Match("FOREACH", 1935, "src\CompilerPasses\Parser.gbas");
					local4_Vari_2365 = func7_VariDef(0).clone(/* In Assign */);
					local4_Vari_2365.attr3_Typ = ~~(1);
					if ((((local4_Vari_2365.attr6_PreDef) != (-(1))) ? 1 : 0)) {
						func5_Error("No default value, in FOREACH", 1950, "src\CompilerPasses\Parser.gbas");
						
					};
					func11_AddVariable(local4_Vari_2365, 1);
					DIMPUSH(global5_Exprs_ref[0].arrAccess(global8_Compiler.attr12_CurrentScope).values[tmpPositionCache][0].attr5_Varis, ((BOUNDS(global8_Compiler.attr5_Varis_ref[0], 0)) - (1)));
					local7_varExpr_2364 = func24_CreateVariableExpression(((BOUNDS(global8_Compiler.attr5_Varis_ref[0], 0)) - (1)));
					global8_Compiler.attr18_currentForEach_Str = global8_Compiler.attr5_Varis_ref[0].arrAccess(func11_GetVariable(local7_varExpr_2364, 1)).values[tmpPositionCache][0].attr8_Name_Str;
					func5_Match("IN", 1957, "src\CompilerPasses\Parser.gbas");
					local6_InExpr_2366 = func10_Identifier(0);
					if ((((global5_Exprs_ref[0].arrAccess(local6_InExpr_2366).values[tmpPositionCache][0].attr8_datatype.attr7_IsArray_ref[0]) == (0)) ? 1 : 0)) {
						func5_Error("Expecting Array", 1960, "src\CompilerPasses\Parser.gbas");
						
					};
					global5_Exprs_ref[0].arrAccess(local7_varExpr_2364).values[tmpPositionCache][0].attr8_datatype = global5_Exprs_ref[0].arrAccess(local6_InExpr_2366).values[tmpPositionCache][0].attr8_datatype.clone(/* In Assign */);
					global5_Exprs_ref[0].arrAccess(local7_varExpr_2364).values[tmpPositionCache][0].attr8_datatype.attr7_IsArray_ref[0] = 0;
					local3_var_2367 = func11_GetVariable(local7_varExpr_2364, 1);
					global8_Compiler.attr5_Varis_ref[0].arrAccess(local3_var_2367).values[tmpPositionCache][0].attr8_datatype = global5_Exprs_ref[0].arrAccess(local6_InExpr_2366).values[tmpPositionCache][0].attr8_datatype.clone(/* In Assign */);
					global8_Compiler.attr5_Varis_ref[0].arrAccess(local3_var_2367).values[tmpPositionCache][0].attr8_datatype.attr7_IsArray_ref[0] = 0;
					global8_Compiler.attr5_Varis_ref[0].arrAccess(local3_var_2367).values[tmpPositionCache][0].attr3_ref = global8_Compiler.attr5_Varis_ref[0].arrAccess(func11_GetVariable(local6_InExpr_2366, 1)).values[tmpPositionCache][0].attr3_ref;
					func5_Match("\n", 1970, "src\CompilerPasses\Parser.gbas");
					local4_Expr_2363 = func23_CreateForEachExpression(local7_varExpr_2364, local6_InExpr_2366, func5_Scope("NEXT", -(1)));
					
				} catch (Error_Str) {
					if (Error_Str instanceof GLBException) Error_Str = Error_Str.getText(); else throwError(Error_Str);{
						func8_FixError();
						
					}
				};
				
			};
			global8_Compiler.attr12_CurrentScope = ~~(local8_TmpScope_2361);
			global8_Compiler.attr18_currentForEach_Str = local14_TmpForEach_Str_2362;
			return tryClone(local4_Expr_2363);
			
		} else if ((((local17___SelectHelper23__2300) == (func7_IsToken("BREAK"))) ? 1 : 0)) {
			func5_Match("BREAK", 1979, "src\CompilerPasses\Parser.gbas");
			if ((((global8_Compiler.attr6_inLoop) == (0)) ? 1 : 0)) {
				func5_Error("BREAK not inside loop", 1980, "src\CompilerPasses\Parser.gbas");
				
			};
			return tryClone(func21_CreateBreakExpression());
			
		} else if ((((local17___SelectHelper23__2300) == (func7_IsToken("CONTINUE"))) ? 1 : 0)) {
			func5_Match("CONTINUE", 1983, "src\CompilerPasses\Parser.gbas");
			if ((((global8_Compiler.attr6_inLoop) == (0)) ? 1 : 0)) {
				func5_Error("CONTINUE not inside loop", 1984, "src\CompilerPasses\Parser.gbas");
				
			};
			return tryClone(func24_CreateContinueExpression());
			
		} else if ((((local17___SelectHelper23__2300) == (func7_IsToken("TRY"))) ? 1 : 0)) {
			var local6_tryScp_2369 = 0, local4_Vari_2370 = new type14_IdentifierVari(), local2_id_2371 = 0.0, local7_myScope_2372 = 0, local8_TmpScope_2373 = 0.0;
			func5_Match("TRY", 1987, "src\CompilerPasses\Parser.gbas");
			func5_Match("\n", 1988, "src\CompilerPasses\Parser.gbas");
			local6_tryScp_2369 = func5_Scope("CATCH", -(1));
			local4_Vari_2370 = func7_VariDef(0).clone(/* In Assign */);
			if ((((local4_Vari_2370.attr8_datatype.attr8_Name_Str_ref[0]) != ("string")) ? 1 : 0)) {
				func5_Error("Catch variable must be string", 1992, "src\CompilerPasses\Parser.gbas");
				
			};
			if (local4_Vari_2370.attr8_datatype.attr7_IsArray_ref[0]) {
				func5_Error("Catch variable must be non array", 1993, "src\CompilerPasses\Parser.gbas");
				
			};
			local2_id_2371 = BOUNDS(global8_Compiler.attr5_Varis_ref[0], 0);
			func11_AddVariable(local4_Vari_2370, 0);
			local7_myScope_2372 = -(1);
			local8_TmpScope_2373 = global8_Compiler.attr12_CurrentScope;
			global8_Compiler.attr12_CurrentScope = func21_CreateScopeExpression(~~(1));
			{
				var Error_Str = "";
				try {
					var local7_ctchScp_2374 = 0, local1_e_2375 = 0;
					DIMPUSH(global5_Exprs_ref[0].arrAccess(global8_Compiler.attr12_CurrentScope).values[tmpPositionCache][0].attr5_Varis, ~~(local2_id_2371));
					func5_Match("\n", 2003, "src\CompilerPasses\Parser.gbas");
					local7_ctchScp_2374 = func5_Scope("FINALLY", -(1));
					local1_e_2375 = func19_CreateTryExpression(local6_tryScp_2369, local7_ctchScp_2374, ~~(local2_id_2371));
					DIMPUSH(global5_Exprs_ref[0].arrAccess(global8_Compiler.attr12_CurrentScope).values[tmpPositionCache][0].attr5_Exprs, local1_e_2375);
					local7_myScope_2372 = global8_Compiler.attr12_CurrentScope;
					
				} catch (Error_Str) {
					if (Error_Str instanceof GLBException) Error_Str = Error_Str.getText(); else throwError(Error_Str);{
						func8_FixError();
						
					}
				};
				
			};
			global8_Compiler.attr12_CurrentScope = ~~(local8_TmpScope_2373);
			return tryClone(local7_myScope_2372);
			
		} else if ((((local17___SelectHelper23__2300) == (func7_IsToken("THROW"))) ? 1 : 0)) {
			func5_Match("THROW", 2017, "src\CompilerPasses\Parser.gbas");
			return tryClone(func21_CreateThrowExpression(func14_EnsureDatatype(func10_Expression(0), global11_strDatatype, 2018, 0)));
			
		} else if ((((local17___SelectHelper23__2300) == (func7_IsToken("SELECT"))) ? 1 : 0)) {
			var local4_Vari_2378 = new type14_IdentifierVari(), local5_Cond1_2379 = 0, local8_datatype_2380 = new type8_Datatype(), local5_Conds_2381 = new GLBArray(), local4_Scps_2382 = new GLBArray(), local7_elseScp_2383 = 0, local8_TmpScope_2384 = 0.0, local8_VariExpr_2385 = 0, local1_e_2386 = 0, local7_myScope_2392 = 0;
			static12_Keyword_SelectHelper+=1;
			local4_Vari_2378.attr8_Name_Str = (((("__SelectHelper") + (CAST2STRING(static12_Keyword_SelectHelper)))) + ("_"));
			local4_Vari_2378.attr3_Typ = ~~(1);
			func5_Match("SELECT", 2027, "src\CompilerPasses\Parser.gbas");
			local5_Cond1_2379 = func10_Expression(0);
			local8_datatype_2380 = global5_Exprs_ref[0].arrAccess(local5_Cond1_2379).values[tmpPositionCache][0].attr8_datatype.clone(/* In Assign */);
			local4_Vari_2378.attr8_datatype = local8_datatype_2380.clone(/* In Assign */);
			local7_elseScp_2383 = -(1);
			func11_AddVariable(local4_Vari_2378, 0);
			local8_TmpScope_2384 = global8_Compiler.attr12_CurrentScope;
			global8_Compiler.attr12_CurrentScope = func21_CreateScopeExpression(~~(1));
			DIMPUSH(global5_Exprs_ref[0].arrAccess(global8_Compiler.attr12_CurrentScope).values[tmpPositionCache][0].attr5_Varis, ((BOUNDS(global8_Compiler.attr5_Varis_ref[0], 0)) - (1)));
			local8_VariExpr_2385 = func24_CreateVariableExpression(((BOUNDS(global8_Compiler.attr5_Varis_ref[0], 0)) - (1)));
			local1_e_2386 = func22_CreateAssignExpression(local8_VariExpr_2385, local5_Cond1_2379);
			DIMPUSH(global5_Exprs_ref[0].arrAccess(global8_Compiler.attr12_CurrentScope).values[tmpPositionCache][0].attr5_Exprs, local1_e_2386);
			local5_Cond1_2379 = local8_VariExpr_2385;
			func5_Match("\n", 2051, "src\CompilerPasses\Parser.gbas");
			while (func7_IsToken("CASE")) {
				var local5_Cond2_2387 = 0;
				func5_Match("CASE", 2053, "src\CompilerPasses\Parser.gbas");
				local5_Cond2_2387 = -(1);
				do {
					var local2_Op_2388 = 0.0, local5_Expr1_2389 = 0, local5_Expr2_2390 = 0, local7_tmpCond_2391 = 0;
					if (func7_IsToken(",")) {
						func5_Match(",", 2056, "src\CompilerPasses\Parser.gbas");
						
					};
					local2_Op_2388 = func14_SearchOperator("=");
					if (func10_IsOperator()) {
						local2_Op_2388 = func14_SearchOperator(func14_GetCurrent_Str());
						func7_GetNext();
						
					};
					local5_Expr1_2389 = -(1);
					local5_Expr2_2390 = -(1);
					local5_Expr1_2389 = func14_EnsureDatatype(func10_Expression(0), local8_datatype_2380, 2066, 0);
					if (func7_IsToken("TO")) {
						func5_Match("TO", 2068, "src\CompilerPasses\Parser.gbas");
						local5_Expr2_2390 = func14_EnsureDatatype(func10_Expression(0), local8_datatype_2380, 2069, 0);
						local5_Expr1_2389 = func24_CreateOperatorExpression(unref(global9_Operators_ref[0].arrAccess(func14_SearchOperator(">=")).values[tmpPositionCache][0]), local5_Cond1_2379, local5_Expr1_2389);
						local5_Expr2_2390 = func24_CreateOperatorExpression(unref(global9_Operators_ref[0].arrAccess(func14_SearchOperator("<=")).values[tmpPositionCache][0]), local5_Cond1_2379, local5_Expr2_2390);
						local7_tmpCond_2391 = func24_CreateOperatorExpression(unref(global9_Operators_ref[0].arrAccess(func14_SearchOperator("AND")).values[tmpPositionCache][0]), local5_Expr1_2389, local5_Expr2_2390);
						
					} else {
						local7_tmpCond_2391 = func24_CreateOperatorExpression(unref(global9_Operators_ref[0].arrAccess(~~(local2_Op_2388)).values[tmpPositionCache][0]), local5_Cond1_2379, local5_Expr1_2389);
						
					};
					if ((((local5_Cond2_2387) == (-(1))) ? 1 : 0)) {
						local5_Cond2_2387 = local7_tmpCond_2391;
						
					} else {
						local5_Cond2_2387 = func24_CreateOperatorExpression(unref(global9_Operators_ref[0].arrAccess(func14_SearchOperator("OR")).values[tmpPositionCache][0]), local5_Cond2_2387, local7_tmpCond_2391);
						
					};
					
				} while (!((((func7_IsToken(",")) == (0)) ? 1 : 0)));
				func5_Match("\n", 2085, "src\CompilerPasses\Parser.gbas");
				DIMPUSH(local5_Conds_2381, local5_Cond2_2387);
				DIMPUSH(local4_Scps_2382, func5_Scope("ENDSELECT", -(1)));
				
			};
			if (func7_IsToken("DEFAULT")) {
				func5_Match("DEFAULT", 2090, "src\CompilerPasses\Parser.gbas");
				func5_Match("\n", 2091, "src\CompilerPasses\Parser.gbas");
				local7_elseScp_2383 = func5_Scope("ENDSELECT", -(1));
				
			};
			if (((((((local7_elseScp_2383) == (-(1))) ? 1 : 0)) && ((((BOUNDS(local5_Conds_2381, 0)) == (0)) ? 1 : 0))) ? 1 : 0)) {
				func5_Match("ENDSELECT", 2095, "src\CompilerPasses\Parser.gbas");
				
			};
			local1_e_2386 = func18_CreateIfExpression(unref(local5_Conds_2381), unref(local4_Scps_2382), local7_elseScp_2383);
			DIMPUSH(global5_Exprs_ref[0].arrAccess(global8_Compiler.attr12_CurrentScope).values[tmpPositionCache][0].attr5_Exprs, local1_e_2386);
			local7_myScope_2392 = global8_Compiler.attr12_CurrentScope;
			global8_Compiler.attr12_CurrentScope = ~~(local8_TmpScope_2384);
			return tryClone(local7_myScope_2392);
			
		} else if ((((local17___SelectHelper23__2300) == (func7_IsToken("STARTDATA"))) ? 1 : 0)) {
			func5_Match("STARTDATA", 2104, "src\CompilerPasses\Parser.gbas");
			func10_SkipTokens("STARTDATA", "ENDDATA", func14_GetCurrent_Str());
			
		} else if ((((local17___SelectHelper23__2300) == (func7_IsToken("RESTORE"))) ? 1 : 0)) {
			var local8_Name_Str_2393 = "";
			func5_Match("RESTORE", 2107, "src\CompilerPasses\Parser.gbas");
			local8_Name_Str_2393 = func14_GetCurrent_Str();
			func5_Match(local8_Name_Str_2393, 2109, "src\CompilerPasses\Parser.gbas");
			var forEachSaver20628 = global8_Compiler.attr10_DataBlocks;
			for(var forEachCounter20628 = 0 ; forEachCounter20628 < forEachSaver20628.values.length ; forEachCounter20628++) {
				var local5_block_2394 = forEachSaver20628.values[forEachCounter20628];
			{
					if ((((local5_block_2394.attr8_Name_Str) == (local8_Name_Str_2393)) ? 1 : 0)) {
						return tryClone(func23_CreateRestoreExpression(local8_Name_Str_2393));
						
					};
					
				}
				forEachSaver20628.values[forEachCounter20628] = local5_block_2394;
			
			};
			func5_Error((((("RESTORE label '") + (local8_Name_Str_2393))) + ("' unknown.")), 2115, "src\CompilerPasses\Parser.gbas");
			
		} else if ((((local17___SelectHelper23__2300) == (func7_IsToken("READ"))) ? 1 : 0)) {
			var local5_Reads_2395 = new GLBArray();
			func5_Match("READ", 2117, "src\CompilerPasses\Parser.gbas");
			do {
				var local1_e_2396 = 0;
				if (func7_IsToken(",")) {
					func5_Match(",", 2120, "src\CompilerPasses\Parser.gbas");
					
				};
				local1_e_2396 = func10_Identifier(0);
				DIMPUSH(local5_Reads_2395, local1_e_2396);
				
			} while (!((((func7_IsToken(",")) == (0)) ? 1 : 0)));
			return tryClone(func20_CreateReadExpression(unref(local5_Reads_2395)));
			
		} else if ((((local17___SelectHelper23__2300) == (func7_IsToken("GOTO"))) ? 1 : 0)) {
			var local8_Name_Str_2398 = "", local4_Expr_2399 = 0, local3_Scp_2400 = 0;
			func5_Match("GOTO", 2128, "src\CompilerPasses\Parser.gbas");
			local8_Name_Str_2398 = func14_GetCurrent_Str();
			func7_GetNext();
			global8_Compiler.attr7_HasGoto = 1;
			if (((static7_Keyword_GOTOErr) ? 0 : 1)) {
				static7_Keyword_GOTOErr = 1;
				func7_Warning("GOTO may cause problems!");
				
			};
			local4_Expr_2399 = func20_CreateGotoExpression(local8_Name_Str_2398);
			local3_Scp_2400 = global8_Compiler.attr14_ImportantScope;
			if ((((local3_Scp_2400) == (-(1))) ? 1 : 0)) {
				func5_Error("Internal error (GOTO Scp is -1", 2141, "src\CompilerPasses\Parser.gbas");
				
			};
			DIMPUSH(global5_Exprs_ref[0].arrAccess(local3_Scp_2400).values[tmpPositionCache][0].attr5_Gotos, local4_Expr_2399);
			return tryClone(local4_Expr_2399);
			
		} else if ((((local17___SelectHelper23__2300) == (func7_IsToken("INC"))) ? 1 : 0)) {
			var local4_Vari_2401 = 0, local7_AddExpr_2402 = 0;
			func5_Match("INC", 2147, "src\CompilerPasses\Parser.gbas");
			local4_Vari_2401 = func10_Identifier(0);
			if (global5_Exprs_ref[0].arrAccess(local4_Vari_2401).values[tmpPositionCache][0].attr8_datatype.attr7_IsArray_ref[0]) {
				func5_Error("Cannot increment array...", 2149, "src\CompilerPasses\Parser.gbas");
				
			};
			{
				var local17___SelectHelper26__2403 = "";
				local17___SelectHelper26__2403 = global5_Exprs_ref[0].arrAccess(local4_Vari_2401).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str_ref[0];
				if ((((local17___SelectHelper26__2403) == ("int")) ? 1 : 0)) {
					if (func7_IsToken(",")) {
						func5_Match(",", 2154, "src\CompilerPasses\Parser.gbas");
						local7_AddExpr_2402 = func14_EnsureDatatype(func10_Expression(0), global11_intDatatype, 2155, 0);
						
					} else {
						local7_AddExpr_2402 = func19_CreateIntExpression(1);
						
					};
					
				} else if ((((local17___SelectHelper26__2403) == ("float")) ? 1 : 0)) {
					if (func7_IsToken(",")) {
						func5_Match(",", 2161, "src\CompilerPasses\Parser.gbas");
						local7_AddExpr_2402 = func14_EnsureDatatype(func10_Expression(0), global13_floatDatatype, 2162, 0);
						
					} else {
						local7_AddExpr_2402 = func21_CreateFloatExpression(1);
						
					};
					
				} else if ((((local17___SelectHelper26__2403) == ("string")) ? 1 : 0)) {
					if (func7_IsToken(",")) {
						func5_Match(",", 2168, "src\CompilerPasses\Parser.gbas");
						local7_AddExpr_2402 = func14_EnsureDatatype(func10_Expression(0), global11_strDatatype, 2169, 0);
						
					} else {
						local7_AddExpr_2402 = func19_CreateStrExpression(" ");
						
					};
					
				} else {
					func5_Error("Cannot increment type or prototype", 2174, "src\CompilerPasses\Parser.gbas");
					
				};
				
			};
			return tryClone(func19_CreateIncExpression(local4_Vari_2401, local7_AddExpr_2402));
			
		} else if ((((local17___SelectHelper23__2300) == (func7_IsToken("DEC"))) ? 1 : 0)) {
			var local4_Vari_2404 = 0, local7_AddExpr_2405 = 0;
			func5_Match("DEC", 2178, "src\CompilerPasses\Parser.gbas");
			local4_Vari_2404 = func10_Identifier(0);
			if (global5_Exprs_ref[0].arrAccess(local4_Vari_2404).values[tmpPositionCache][0].attr8_datatype.attr7_IsArray_ref[0]) {
				func5_Error("Cannot decrement array...", 2181, "src\CompilerPasses\Parser.gbas");
				
			};
			{
				var local17___SelectHelper27__2406 = "";
				local17___SelectHelper27__2406 = global5_Exprs_ref[0].arrAccess(local4_Vari_2404).values[tmpPositionCache][0].attr8_datatype.attr8_Name_Str_ref[0];
				if ((((local17___SelectHelper27__2406) == ("int")) ? 1 : 0)) {
					if (func7_IsToken(",")) {
						var alias2_Op_ref_2407 = [new type8_Operator()];
						func5_Match(",", 2185, "src\CompilerPasses\Parser.gbas");
						alias2_Op_ref_2407 = global9_Operators_ref[0].arrAccess(func14_SearchOperator("sub")).values[tmpPositionCache] /* ALIAS */;
						local7_AddExpr_2405 = func24_CreateOperatorExpression(unref(alias2_Op_ref_2407[0]), func19_CreateIntExpression(0), func14_EnsureDatatype(func10_Expression(0), global11_intDatatype, 2187, 0));
						
					} else {
						local7_AddExpr_2405 = func19_CreateIntExpression(-(1));
						
					};
					
				} else if ((((local17___SelectHelper27__2406) == ("float")) ? 1 : 0)) {
					if (func7_IsToken(",")) {
						var alias2_Op_ref_2408 = [new type8_Operator()];
						func5_Match(",", 2193, "src\CompilerPasses\Parser.gbas");
						alias2_Op_ref_2408 = global9_Operators_ref[0].arrAccess(func14_SearchOperator("sub")).values[tmpPositionCache] /* ALIAS */;
						local7_AddExpr_2405 = func24_CreateOperatorExpression(unref(alias2_Op_ref_2408[0]), func21_CreateFloatExpression(0), func14_EnsureDatatype(func10_Expression(0), global13_floatDatatype, 2195, 0));
						
					} else {
						local7_AddExpr_2405 = func21_CreateFloatExpression(-(1));
						
					};
					
				} else if ((((local17___SelectHelper27__2406) == ("string")) ? 1 : 0)) {
					func5_Error("Cannot decrement string...", 2200, "src\CompilerPasses\Parser.gbas");
					
				} else {
					func5_Error("Cannot decrement type or prototype", 2202, "src\CompilerPasses\Parser.gbas");
					
				};
				
			};
			return tryClone(func19_CreateIncExpression(local4_Vari_2404, local7_AddExpr_2405));
			
		} else if ((((local17___SelectHelper23__2300) == (func7_IsToken("ASSERT"))) ? 1 : 0)) {
			var local4_Expr_2409 = 0;
			func5_Match("ASSERT", 2206, "src\CompilerPasses\Parser.gbas");
			local4_Expr_2409 = func14_EnsureDatatype(func10_Expression(0), global11_intDatatype, 2207, 0);
			if (global9_DEBUGMODE) {
				return tryClone(func22_CreateAssertExpression(local4_Expr_2409));
				
			};
			
		} else if ((((local17___SelectHelper23__2300) == (func7_IsToken("DEBUG"))) ? 1 : 0)) {
			var local4_Expr_2410 = 0;
			func5_Match("DEBUG", 2213, "src\CompilerPasses\Parser.gbas");
			local4_Expr_2410 = func14_EnsureDatatype(func10_Expression(0), global11_strDatatype, 2214, 0);
			if (global9_DEBUGMODE) {
				return tryClone(func27_CreateDebugOutputExpression(local4_Expr_2410));
				
			};
			
		} else {
			func5_Error("Unexpected keyword", 2220, "src\CompilerPasses\Parser.gbas");
			
		};
		
	};
	return tryClone(func21_CreateEmptyExpression());
	return 0;
	
};
func7_Keyword = window['func7_Keyword'];
window['func14_ImplicitDefine'] = function() {
	if ((((global6_STRICT) == (0)) ? 1 : 0)) {
		if (((func12_IsIdentifier(0)) ? 0 : 1)) {
			var local3_pos_2411 = 0, local4_Vari_2412 = new type14_IdentifierVari();
			local3_pos_2411 = global8_Compiler.attr11_currentPosi;
			local4_Vari_2412 = func7_VariDef(1).clone(/* In Assign */);
			local4_Vari_2412.attr3_Typ = ~~(2);
			func11_AddVariable(local4_Vari_2412, 0);
			DIMPUSH(global8_Compiler.attr7_Globals, ((BOUNDS(global8_Compiler.attr5_Varis_ref[0], 0)) - (1)));
			func7_Warning((((("Implicit variable declaration '") + (local4_Vari_2412.attr8_Name_Str))) + ("'")));
			global8_Compiler.attr11_currentPosi = ((local3_pos_2411) - (1));
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
	var local11_Current_Str_2416 = "", local5_dummy_ref_2417 = [0], local5_Varis_2418 = new GLBArray();
	if ((((func7_IsToken("GLOBAL")) || (func7_IsToken("LOCAL"))) ? 1 : 0)) {
		return 1;
		
	};
	if ((((func6_IsType("")) && (param9_CheckType)) ? 1 : 0)) {
		var local3_pos_2414 = 0, local3_ret_2415 = 0;
		local3_pos_2414 = global8_Compiler.attr11_currentPosi;
		func7_GetNext();
		if (func7_IsToken("(")) {
			local3_ret_2415 = 1;
			
		} else {
			local3_ret_2415 = 0;
			
		};
		global8_Compiler.attr11_currentPosi = local3_pos_2414;
		
	};
	local11_Current_Str_2416 = func14_GetCurrent_Str();
	if ((global8_Compiler.attr11_GlobalFuncs).GetValue(local11_Current_Str_2416, local5_dummy_ref_2417)) {
		return 1;
		
	};
	func8_GetVaris(unref(local5_Varis_2418), -(1), 0);
	{
		var local1_i_2419 = 0.0;
		for (local1_i_2419 = ((BOUNDS(local5_Varis_2418, 0)) - (1));toCheck(local1_i_2419, 0, -(1));local1_i_2419 += -(1)) {
			if ((((func17_CleanVariable_Str(local11_Current_Str_2416)) == (global8_Compiler.attr5_Varis_ref[0].arrAccess(local5_Varis_2418.arrAccess(~~(local1_i_2419)).values[tmpPositionCache]).values[tmpPositionCache][0].attr8_Name_Str)) ? 1 : 0)) {
				return 1;
				
			};
			
		};
		
	};
	if (((((((global8_Compiler.attr11_currentFunc) != (-(1))) ? 1 : 0)) && ((((global8_Compiler.attr5_Funcs_ref[0].arrAccess(global8_Compiler.attr11_currentFunc).values[tmpPositionCache][0].attr6_MyType) != (-(1))) ? 1 : 0))) ? 1 : 0)) {
		var alias3_Typ_ref_2420 = [new type14_IdentifierType()], local5_myTyp_2421 = 0;
		alias3_Typ_ref_2420 = global8_Compiler.attr5_Types_ref[0].arrAccess(global8_Compiler.attr5_Funcs_ref[0].arrAccess(global8_Compiler.attr11_currentFunc).values[tmpPositionCache][0].attr6_MyType).values[tmpPositionCache] /* ALIAS */;
		local5_myTyp_2421 = alias3_Typ_ref_2420[0].attr2_ID;
		while ((((local5_myTyp_2421) != (-(1))) ? 1 : 0)) {
			var forEachSaver21289 = global8_Compiler.attr5_Types_ref[0].arrAccess(local5_myTyp_2421).values[tmpPositionCache][0].attr7_Methods;
			for(var forEachCounter21289 = 0 ; forEachCounter21289 < forEachSaver21289.values.length ; forEachCounter21289++) {
				var local1_M_2422 = forEachSaver21289.values[forEachCounter21289];
			{
					if (func7_IsToken(global8_Compiler.attr5_Funcs_ref[0].arrAccess(local1_M_2422).values[tmpPositionCache][0].attr8_Name_Str)) {
						return 1;
						
					};
					
				}
				forEachSaver21289.values[forEachCounter21289] = local1_M_2422;
			
			};
			local5_myTyp_2421 = global8_Compiler.attr5_Types_ref[0].arrAccess(local5_myTyp_2421).values[tmpPositionCache][0].attr9_Extending;
			
		};
		var forEachSaver21320 = alias3_Typ_ref_2420[0].attr10_Attributes;
		for(var forEachCounter21320 = 0 ; forEachCounter21320 < forEachSaver21320.values.length ; forEachCounter21320++) {
			var local1_A_2423 = forEachSaver21320.values[forEachCounter21320];
		{
				if (func7_IsToken(global8_Compiler.attr5_Varis_ref[0].arrAccess(local1_A_2423).values[tmpPositionCache][0].attr8_Name_Str)) {
					return 1;
					
				};
				
			}
			forEachSaver21320.values[forEachCounter21320] = local1_A_2423;
		
		};
		
	};
	return tryClone(0);
	return 0;
	
};
func12_IsIdentifier = window['func12_IsIdentifier'];
window['func8_IsNumber'] = function() {
	{
		var local1_i_2424 = 0.0;
		for (local1_i_2424 = 0;toCheck(local1_i_2424, (((func14_GetCurrent_Str()).length) - (1)), 1);local1_i_2424 += 1) {
			if (((((((ASC(func14_GetCurrent_Str(), ~~(local1_i_2424))) < (48)) ? 1 : 0)) || ((((ASC(func14_GetCurrent_Str(), ~~(local1_i_2424))) > (57)) ? 1 : 0))) ? 1 : 0)) {
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
	var forEachSaver21421 = global8_Compiler.attr5_Types_ref[0];
	for(var forEachCounter21421 = 0 ; forEachCounter21421 < forEachSaver21421.values.length ; forEachCounter21421++) {
		var local3_typ_ref_2426 = forEachSaver21421.values[forEachCounter21421];
	{
			if ((((local3_typ_ref_2426[0].attr12_RealName_Str) == (param7_Str_Str)) ? 1 : 0)) {
				global8_LastType = local3_typ_ref_2426[0].clone(/* In Assign */);
				return 1;
				
			};
			
		}
		forEachSaver21421.values[forEachCounter21421] = local3_typ_ref_2426;
	
	};
	return tryClone(0);
	return 0;
	
};
func6_IsType = window['func6_IsType'];
window['func13_IsVarExisting'] = function(param7_Var_Str) {
	var local4_Vars_2428 = new GLBArray();
	func8_GetVaris(unref(local4_Vars_2428), -(1), 0);
	{
		var local1_i_2429 = 0.0;
		for (local1_i_2429 = ((BOUNDS(local4_Vars_2428, 0)) - (1));toCheck(local1_i_2429, 0, -(1));local1_i_2429 += -(1)) {
			if ((((global8_Compiler.attr5_Varis_ref[0].arrAccess(local4_Vars_2428.arrAccess(~~(local1_i_2429)).values[tmpPositionCache]).values[tmpPositionCache][0].attr8_Name_Str) == (param7_Var_Str)) ? 1 : 0)) {
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
		func5_Error((((("Invalid identifier name: '") + (func14_GetCurrent_Str()))) + ("' is already a keyword")), 2361, "src\CompilerPasses\Parser.gbas");
		
	};
	if (func8_IsNumber()) {
		func5_Error((((("Invalid Identifier name: '") + (func14_GetCurrent_Str()))) + ("' is a number")), 2363, "src\CompilerPasses\Parser.gbas");
		
	};
	if (func8_IsString()) {
		func5_Error((((("Invalid identifier name: '") + (func14_GetCurrent_Str()))) + ("' is a string")), 2364, "src\CompilerPasses\Parser.gbas");
		
	};
	if (func10_IsOperator()) {
		func5_Error((((("Invalid identifier name: '") + (func14_GetCurrent_Str()))) + ("' is an operator")), 2365, "src\CompilerPasses\Parser.gbas");
		
	};
	return 1;
	return 0;
	
};
func14_IsValidVarName = window['func14_IsValidVarName'];
window['func14_IsFuncExisting'] = function(param8_func_Str, param10_IsCallback) {
	var forEachSaver21546 = global8_Compiler.attr5_Types_ref[0];
	for(var forEachCounter21546 = 0 ; forEachCounter21546 < forEachSaver21546.values.length ; forEachCounter21546++) {
		var local1_T_ref_2432 = forEachSaver21546.values[forEachCounter21546];
	{
			if ((((local1_T_ref_2432[0].attr8_Name_Str) == (param8_func_Str)) ? 1 : 0)) {
				return 1;
				
			};
			
		}
		forEachSaver21546.values[forEachCounter21546] = local1_T_ref_2432;
	
	};
	if ((global10_KeywordMap).DoesKeyExist(param8_func_Str)) {
		return 1;
		
	};
	var forEachSaver21590 = global8_Compiler.attr5_Funcs_ref[0];
	for(var forEachCounter21590 = 0 ; forEachCounter21590 < forEachSaver21590.values.length ; forEachCounter21590++) {
		var local1_F_ref_2433 = forEachSaver21590.values[forEachCounter21590];
	{
			if ((((((((((param8_func_Str) == (local1_F_ref_2433[0].attr8_Name_Str)) ? 1 : 0)) && (((((((local1_F_ref_2433[0].attr3_Typ) == (2)) ? 1 : 0)) || ((((local1_F_ref_2433[0].attr3_Typ) == (1)) ? 1 : 0))) ? 1 : 0))) ? 1 : 0)) && ((((local1_F_ref_2433[0].attr10_IsCallback) == (param10_IsCallback)) ? 1 : 0))) ? 1 : 0)) {
				return 1;
				
			};
			
		}
		forEachSaver21590.values[forEachCounter21590] = local1_F_ref_2433;
	
	};
	return tryClone(0);
	return 0;
	
};
func14_IsFuncExisting = window['func14_IsFuncExisting'];
window['func10_IsOperator'] = function() {
	var forEachSaver21611 = global9_Operators_ref[0];
	for(var forEachCounter21611 = 0 ; forEachCounter21611 < forEachSaver21611.values.length ; forEachCounter21611++) {
		var local2_Op_ref_2434 = forEachSaver21611.values[forEachCounter21611];
	{
			if (func7_IsToken(local2_Op_ref_2434[0].attr7_Sym_Str)) {
				return 1;
				
			};
			
		}
		forEachSaver21611.values[forEachCounter21611] = local2_Op_ref_2434;
	
	};
	return tryClone(0);
	return 0;
	
};
func10_IsOperator = window['func10_IsOperator'];
window['func15_IsValidDatatype'] = function() {
	if (func6_IsType("")) {
		return 1;
		
	};
	var forEachSaver21646 = global8_Compiler.attr5_Funcs_ref[0];
	for(var forEachCounter21646 = 0 ; forEachCounter21646 < forEachSaver21646.values.length ; forEachCounter21646++) {
		var local4_func_ref_2435 = forEachSaver21646.values[forEachCounter21646];
	{
			if (((((((local4_func_ref_2435[0].attr3_Typ) == (4)) ? 1 : 0)) && (func7_IsToken(local4_func_ref_2435[0].attr8_Name_Str))) ? 1 : 0)) {
				return 1;
				
			};
			
		}
		forEachSaver21646.values[forEachCounter21646] = local4_func_ref_2435;
	
	};
	var forEachSaver21660 = global8_Compiler.attr5_Types_ref[0];
	for(var forEachCounter21660 = 0 ; forEachCounter21660 < forEachSaver21660.values.length ; forEachCounter21660++) {
		var local3_typ_ref_2436 = forEachSaver21660.values[forEachCounter21660];
	{
			STDOUT(((local3_typ_ref_2436[0].attr12_RealName_Str) + ("\n")));
			
		}
		forEachSaver21660.values[forEachCounter21660] = local3_typ_ref_2436;
	
	};
	func5_Error((("Unknown datatype: ") + (func14_GetCurrent_Str())), 2408, "src\CompilerPasses\Parser.gbas");
	return 0;
	
};
func15_IsValidDatatype = window['func15_IsValidDatatype'];
window['func8_IsDefine'] = function(param7_Def_Str) {
	if ((((param7_Def_Str) == ("")) ? 1 : 0)) {
		param7_Def_Str = func14_GetCurrent_Str();
		
	};
	var forEachSaver21697 = global7_Defines;
	for(var forEachCounter21697 = 0 ; forEachCounter21697 < forEachSaver21697.values.length ; forEachCounter21697++) {
		var local3_Def_2438 = forEachSaver21697.values[forEachCounter21697];
	{
			if ((((local3_Def_2438.attr7_Key_Str) == (param7_Def_Str)) ? 1 : 0)) {
				global10_LastDefine = local3_Def_2438.clone(/* In Assign */);
				return 1;
				
			};
			
		}
		forEachSaver21697.values[forEachCounter21697] = local3_Def_2438;
	
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
		var forEachSaver21744 = global8_Compiler.attr7_Globals;
		for(var forEachCounter21744 = 0 ; forEachCounter21744 < forEachSaver21744.values.length ; forEachCounter21744++) {
			var local4_Vari_2442 = forEachSaver21744.values[forEachCounter21744];
		{
				DIMPUSH(param5_Varis, local4_Vari_2442);
				
			}
			forEachSaver21744.values[forEachCounter21744] = local4_Vari_2442;
		
		};
		
	};
	if ((((param3_Scp) != (-(1))) ? 1 : 0)) {
		var forEachSaver21768 = global5_Exprs_ref[0].arrAccess(~~(param3_Scp)).values[tmpPositionCache][0].attr5_Varis;
		for(var forEachCounter21768 = 0 ; forEachCounter21768 < forEachSaver21768.values.length ; forEachCounter21768++) {
			var local4_Vari_2443 = forEachSaver21768.values[forEachCounter21768];
		{
				DIMPUSH(param5_Varis, local4_Vari_2443);
				
			}
			forEachSaver21768.values[forEachCounter21768] = local4_Vari_2443;
		
		};
		if (((((((global8_Compiler.attr11_currentFunc) != (-(1))) ? 1 : 0)) && ((((global8_Compiler.attr5_Funcs_ref[0].arrAccess(global8_Compiler.attr11_currentFunc).values[tmpPositionCache][0].attr6_MyType) != (-(1))) ? 1 : 0))) ? 1 : 0)) {
			var alias3_Typ_ref_2444 = [new type14_IdentifierType()];
			alias3_Typ_ref_2444 = global8_Compiler.attr5_Types_ref[0].arrAccess(global8_Compiler.attr5_Funcs_ref[0].arrAccess(global8_Compiler.attr11_currentFunc).values[tmpPositionCache][0].attr6_MyType).values[tmpPositionCache] /* ALIAS */;
			var forEachSaver21817 = alias3_Typ_ref_2444[0].attr10_Attributes;
			for(var forEachCounter21817 = 0 ; forEachCounter21817 < forEachSaver21817.values.length ; forEachCounter21817++) {
				var local1_A_2445 = forEachSaver21817.values[forEachCounter21817];
			{
					DIMPUSH(param5_Varis, local1_A_2445);
					
				}
				forEachSaver21817.values[forEachCounter21817] = local1_A_2445;
			
			};
			
		};
		
	};
	if (((((((global5_Exprs_ref[0].arrAccess(~~(param3_Scp)).values[tmpPositionCache][0].attr10_SuperScope) != (-(1))) ? 1 : 0)) && ((((global5_Exprs_ref[0].arrAccess(~~(param3_Scp)).values[tmpPositionCache][0].attr6_ScpTyp) != (2)) ? 1 : 0))) ? 1 : 0)) {
		func8_GetVaris(unref(param5_Varis), global5_Exprs_ref[0].arrAccess(~~(param3_Scp)).values[tmpPositionCache][0].attr10_SuperScope, 0);
		
	} else if ((((param9_PreferVar) >= (0)) ? 1 : 0)) {
		var forEachSaver21866 = global8_Compiler.attr7_Globals;
		for(var forEachCounter21866 = 0 ; forEachCounter21866 < forEachSaver21866.values.length ; forEachCounter21866++) {
			var local4_Vari_2446 = forEachSaver21866.values[forEachCounter21866];
		{
				DIMPUSH(param5_Varis, local4_Vari_2446);
				
			}
			forEachSaver21866.values[forEachCounter21866] = local4_Vari_2446;
		
		};
		
	};
	return 0;
	
};
func8_GetVaris = window['func8_GetVaris'];
window['func11_GetVariable'] = function(param4_expr, param3_err) {
	var local6_hasErr_2449 = 0;
	local6_hasErr_2449 = 0;
	{
		var local17___SelectHelper28__2450 = 0;
		local17___SelectHelper28__2450 = global5_Exprs_ref[0].arrAccess(param4_expr).values[tmpPositionCache][0].attr3_Typ;
		if ((((local17___SelectHelper28__2450) == (~~(9))) ? 1 : 0)) {
			return tryClone(global5_Exprs_ref[0].arrAccess(param4_expr).values[tmpPositionCache][0].attr4_vari);
			
		} else if ((((local17___SelectHelper28__2450) == (~~(13))) ? 1 : 0)) {
			return tryClone(func11_GetVariable(global5_Exprs_ref[0].arrAccess(param4_expr).values[tmpPositionCache][0].attr5_array, param3_err));
			
		} else if ((((local17___SelectHelper28__2450) == (~~(18))) ? 1 : 0)) {
			return tryClone(func11_GetVariable(global5_Exprs_ref[0].arrAccess(param4_expr).values[tmpPositionCache][0].attr8_nextExpr, param3_err));
			
		} else if ((((local17___SelectHelper28__2450) == (~~(54))) ? 1 : 0)) {
			return tryClone(func11_GetVariable(global5_Exprs_ref[0].arrAccess(param4_expr).values[tmpPositionCache][0].attr4_expr, param3_err));
			
		} else if ((((local17___SelectHelper28__2450) == (~~(6))) ? 1 : 0)) {
			if ((((global5_Exprs_ref[0].arrAccess(param4_expr).values[tmpPositionCache][0].attr4_func) != (-(1))) ? 1 : 0)) {
				var alias4_func_ref_2451 = [new type14_IdentifierFunc()];
				alias4_func_ref_2451 = global8_Compiler.attr5_Funcs_ref[0].arrAccess(global5_Exprs_ref[0].arrAccess(param4_expr).values[tmpPositionCache][0].attr4_func).values[tmpPositionCache] /* ALIAS */;
				if ((((alias4_func_ref_2451[0].attr3_Typ) == (3)) ? 1 : 0)) {
					return tryClone(-(1));
					
				} else {
					local6_hasErr_2449 = 1;
					
				};
				
			} else {
				local6_hasErr_2449 = 1;
				
			};
			
		} else {
			local6_hasErr_2449 = 1;
			
		};
		
	};
	if ((((local6_hasErr_2449) && (param3_err)) ? 1 : 0)) {
		var local7_add_Str_2452 = "";
		local7_add_Str_2452 = "";
		func5_Error((("Variable expected.") + (local7_add_Str_2452)), 2493, "src\CompilerPasses\Parser.gbas");
		
	} else {
		return tryClone(-(1));
		
	};
	return 0;
	
};
func11_GetVariable = window['func11_GetVariable'];
window['func12_GetRightExpr'] = function(param4_expr) {
	{
		var local17___SelectHelper29__2454 = 0;
		local17___SelectHelper29__2454 = global5_Exprs_ref[0].arrAccess(param4_expr).values[tmpPositionCache][0].attr3_Typ;
		if ((((local17___SelectHelper29__2454) == (~~(18))) ? 1 : 0)) {
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
	var local8_startpos_2460 = 0;
	local8_startpos_2460 = global8_Compiler.attr11_currentPosi;
	while (((((((func7_IsToken(param9_Close_Str)) == (0)) ? 1 : 0)) && (func7_HasNext())) ? 1 : 0)) {
		if (func7_HasNext()) {
			func7_GetNext();
			
		};
		
	};
	if ((((func7_HasNext()) == (0)) ? 1 : 0)) {
		var local6_tmpPos_2461 = 0.0;
		local6_tmpPos_2461 = global8_Compiler.attr11_currentPosi;
		global8_Compiler.attr11_currentPosi = local8_startpos_2460;
		{
			var ex_Str = "";
			try {
				func5_Error(((((((((((param8_Open_Str) + (" "))) + (param8_Name_Str))) + (" needs '"))) + (param9_Close_Str))) + ("', unexpected end of file.")), 2529, "src\CompilerPasses\Parser.gbas");
				
			} catch (ex_Str) {
				if (ex_Str instanceof GLBException) ex_Str = ex_Str.getText(); else throwError(ex_Str);{
					global8_Compiler.attr11_currentPosi = ~~(local6_tmpPos_2461);
					throw new GLBException(ex_Str, "\src\CompilerPasses\Parser.gbas", 2533);
					
				}
			};
			
		};
		
	};
	if ((((param9_Close_Str) != ("\n")) ? 1 : 0)) {
		func5_Match(param9_Close_Str, 2535, "src\CompilerPasses\Parser.gbas");
		
	};
	return 0;
	
};
func10_SkipTokens = window['func10_SkipTokens'];
window['func17_BuildPrototyp_Str'] = function(param1_F) {
	var alias4_Func_ref_2464 = [new type14_IdentifierFunc()], local8_Text_Str_2465 = "", local5_Found_2466 = 0;
	alias4_Func_ref_2464 = global8_Compiler.attr5_Funcs_ref[0].arrAccess(param1_F).values[tmpPositionCache] /* ALIAS */;
	local8_Text_Str_2465 = (((((("RETURN TYPE: ") + (alias4_Func_ref_2464[0].attr8_datatype.attr8_Name_Str_ref[0]))) + (func20_BuildArrBrackets_Str(unref(alias4_Func_ref_2464[0].attr8_datatype.attr7_IsArray_ref[0]))))) + (" PARAMETER:"));
	local5_Found_2466 = 0;
	var forEachSaver22208 = alias4_Func_ref_2464[0].attr6_Params;
	for(var forEachCounter22208 = 0 ; forEachCounter22208 < forEachSaver22208.values.length ; forEachCounter22208++) {
		var local1_P_2467 = forEachSaver22208.values[forEachCounter22208];
	{
			var alias5_Param_ref_2468 = [new type14_IdentifierVari()];
			alias5_Param_ref_2468 = global8_Compiler.attr5_Varis_ref[0].arrAccess(local1_P_2467).values[tmpPositionCache] /* ALIAS */;
			if (local5_Found_2466) {
				local8_Text_Str_2465 = ((local8_Text_Str_2465) + (", "));
				
			};
			local8_Text_Str_2465 = ((((local8_Text_Str_2465) + (alias5_Param_ref_2468[0].attr8_datatype.attr8_Name_Str_ref[0]))) + (func20_BuildArrBrackets_Str(unref(alias5_Param_ref_2468[0].attr8_datatype.attr7_IsArray_ref[0]))));
			local5_Found_2466 = 1;
			
		}
		forEachSaver22208.values[forEachCounter22208] = local1_P_2467;
	
	};
	return tryClone(local8_Text_Str_2465);
	return "";
	
};
func17_BuildPrototyp_Str = window['func17_BuildPrototyp_Str'];
window['func14_SearchPrototyp'] = function(param8_Name_Str) {
	var local3_Ret_ref_2470 = [0];
	if ((global8_Compiler.attr11_GlobalFuncs).GetValue(param8_Name_Str, local3_Ret_ref_2470)) {
		if ((((global8_Compiler.attr5_Funcs_ref[0].arrAccess(local3_Ret_ref_2470[0]).values[tmpPositionCache][0].attr3_Typ) == (2)) ? 1 : 0)) {
			return tryClone(-(1));
			
		} else {
			return tryClone(unref(local3_Ret_ref_2470[0]));
			
		};
		
	} else {
		return tryClone(-(1));
		
	};
	return 0;
	
};
func14_SearchPrototyp = window['func14_SearchPrototyp'];
window['func14_SearchOperator'] = function(param8_Name_Str) {
	var forEachSaver22274 = global9_Operators_ref[0];
	for(var forEachCounter22274 = 0 ; forEachCounter22274 < forEachSaver22274.values.length ; forEachCounter22274++) {
		var local2_Op_ref_2472 = forEachSaver22274.values[forEachCounter22274];
	{
			if (((((((local2_Op_ref_2472[0].attr7_Sym_Str) == (param8_Name_Str)) ? 1 : 0)) || ((((local2_Op_ref_2472[0].attr8_Name_Str) == (param8_Name_Str)) ? 1 : 0))) ? 1 : 0)) {
				return tryClone(local2_Op_ref_2472[0].attr2_ID);
				
			};
			
		}
		forEachSaver22274.values[forEachCounter22274] = local2_Op_ref_2472;
	
	};
	return tryClone(-(1));
	return 0;
	
};
func14_SearchOperator = window['func14_SearchOperator'];
window['func17_CleanVariable_Str'] = function(param7_Var_Str) {
	var local11_Postfix_Str_2474 = "";
	local11_Postfix_Str_2474 = RIGHT_Str(param7_Var_Str, 1);
	if (((((((local11_Postfix_Str_2474) == ("%")) ? 1 : 0)) || ((((local11_Postfix_Str_2474) == ("#")) ? 1 : 0))) ? 1 : 0)) {
		return tryClone(LEFT_Str(param7_Var_Str, (((param7_Var_Str).length) - (1))));
		
	} else {
		return tryClone(param7_Var_Str);
		
	};
	return "";
	
};
func17_CleanVariable_Str = window['func17_CleanVariable_Str'];
window['func12_ScopeHasGoto'] = function(param3_scp) {
	if ((((param3_scp.attr3_Typ) != (2)) ? 1 : 0)) {
		func5_Error("Internal error (Cant look for Scope)", 2590, "src\CompilerPasses\Parser.gbas");
		
	};
	var forEachSaver22479 = param3_scp.attr5_Exprs;
	for(var forEachCounter22479 = 0 ; forEachCounter22479 < forEachSaver22479.values.length ; forEachCounter22479++) {
		var local1_E_2476 = forEachSaver22479.values[forEachCounter22479];
	{
			var alias4_SubE_ref_2477 = [new type4_Expr()];
			alias4_SubE_ref_2477 = global5_Exprs_ref[0].arrAccess(local1_E_2476).values[tmpPositionCache] /* ALIAS */;
			{
				var local17___SelectHelper30__2478 = 0;
				local17___SelectHelper30__2478 = alias4_SubE_ref_2477[0].attr3_Typ;
				if ((((local17___SelectHelper30__2478) == (~~(24))) ? 1 : 0)) {
					var forEachSaver22359 = alias4_SubE_ref_2477[0].attr6_Scopes;
					for(var forEachCounter22359 = 0 ; forEachCounter22359 < forEachSaver22359.values.length ; forEachCounter22359++) {
						var local1_E_2479 = forEachSaver22359.values[forEachCounter22359];
					{
							if (func12_ScopeHasGoto(unref(global5_Exprs_ref[0].arrAccess(local1_E_2479).values[tmpPositionCache][0]))) {
								return 1;
								
							};
							
						}
						forEachSaver22359.values[forEachCounter22359] = local1_E_2479;
					
					};
					if ((((alias4_SubE_ref_2477[0].attr9_elseScope) != (-(1))) ? 1 : 0)) {
						if (func12_ScopeHasGoto(unref(global5_Exprs_ref[0].arrAccess(alias4_SubE_ref_2477[0].attr9_elseScope).values[tmpPositionCache][0]))) {
							return 1;
							
						};
						
					};
					
				} else if ((((local17___SelectHelper30__2478) == (~~(25))) ? 1 : 0)) {
					if (func12_ScopeHasGoto(unref(global5_Exprs_ref[0].arrAccess(alias4_SubE_ref_2477[0].attr3_Scp).values[tmpPositionCache][0]))) {
						return 1;
						
					};
					
				} else if ((((local17___SelectHelper30__2478) == (~~(26))) ? 1 : 0)) {
					if (func12_ScopeHasGoto(unref(global5_Exprs_ref[0].arrAccess(alias4_SubE_ref_2477[0].attr3_Scp).values[tmpPositionCache][0]))) {
						return 1;
						
					};
					
				} else if ((((local17___SelectHelper30__2478) == (~~(27))) ? 1 : 0)) {
					if (func12_ScopeHasGoto(unref(global5_Exprs_ref[0].arrAccess(alias4_SubE_ref_2477[0].attr3_Scp).values[tmpPositionCache][0]))) {
						return 1;
						
					};
					
				} else if ((((local17___SelectHelper30__2478) == (~~(38))) ? 1 : 0)) {
					if (func12_ScopeHasGoto(unref(global5_Exprs_ref[0].arrAccess(alias4_SubE_ref_2477[0].attr3_Scp).values[tmpPositionCache][0]))) {
						return 1;
						
					};
					
				} else if ((((local17___SelectHelper30__2478) == (~~(31))) ? 1 : 0)) {
					if (func12_ScopeHasGoto(unref(global5_Exprs_ref[0].arrAccess(alias4_SubE_ref_2477[0].attr3_Scp).values[tmpPositionCache][0]))) {
						return 1;
						
					};
					if (func12_ScopeHasGoto(unref(global5_Exprs_ref[0].arrAccess(alias4_SubE_ref_2477[0].attr8_catchScp).values[tmpPositionCache][0]))) {
						return 1;
						
					};
					
				} else if ((((local17___SelectHelper30__2478) == (~~(20))) ? 1 : 0)) {
					return 1;
					
				} else if ((((local17___SelectHelper30__2478) == (~~(2))) ? 1 : 0)) {
					if (func12_ScopeHasGoto(unref(alias4_SubE_ref_2477[0]))) {
						return 1;
						
					};
					
				} else {
					
				};
				
			};
			
		}
		forEachSaver22479.values[forEachCounter22479] = local1_E_2476;
	
	};
	return tryClone(0);
	return 0;
	
};
func12_ScopeHasGoto = window['func12_ScopeHasGoto'];
window['func13_ScopeName_Str'] = function(param4_expr) {
	{
		var local17___SelectHelper31__2481 = 0;
		local17___SelectHelper31__2481 = param4_expr.attr6_ScpTyp;
		if ((((local17___SelectHelper31__2481) == (~~(1))) ? 1 : 0)) {
			return "if";
			
		} else if ((((local17___SelectHelper31__2481) == (~~(3))) ? 1 : 0)) {
			return "loop";
			
		} else if ((((local17___SelectHelper31__2481) == (~~(5))) ? 1 : 0)) {
			return "try";
			
		} else if ((((local17___SelectHelper31__2481) == (~~(4))) ? 1 : 0)) {
			return "main";
			
		} else if ((((local17___SelectHelper31__2481) == (~~(2))) ? 1 : 0)) {
			{
				var local17___SelectHelper32__2482 = 0;
				local17___SelectHelper32__2482 = global8_Compiler.attr5_Funcs_ref[0].arrAccess(global11_CurrentFunc).values[tmpPositionCache][0].attr3_Typ;
				if ((((local17___SelectHelper32__2482) == (~~(2))) ? 1 : 0)) {
					return tryClone((("sub: ") + (global8_Compiler.attr5_Funcs_ref[0].arrAccess(global11_CurrentFunc).values[tmpPositionCache][0].attr9_OName_Str)));
					
				} else if ((((local17___SelectHelper32__2482) == (~~(3))) ? 1 : 0)) {
					return tryClone((("method: ") + (global8_Compiler.attr5_Funcs_ref[0].arrAccess(global11_CurrentFunc).values[tmpPositionCache][0].attr9_OName_Str)));
					
				} else if ((((local17___SelectHelper32__2482) == (~~(1))) ? 1 : 0)) {
					return tryClone((("function: ") + (global8_Compiler.attr5_Funcs_ref[0].arrAccess(global11_CurrentFunc).values[tmpPositionCache][0].attr9_OName_Str)));
					
				} else if ((((local17___SelectHelper32__2482) == (~~(4))) ? 1 : 0)) {
					return tryClone((("prototype: ") + (global8_Compiler.attr5_Funcs_ref[0].arrAccess(global11_CurrentFunc).values[tmpPositionCache][0].attr9_OName_Str)));
					
				};
				
			};
			
		} else if ((((local17___SelectHelper31__2481) == (~~(6))) ? 1 : 0)) {
			return "select";
			
		} else {
			func5_Error("Internal error (unknown scope type)", 2650, "src\CompilerPasses\Parser.gbas");
			
		};
		
	};
	return "";
	
};
func13_ScopeName_Str = window['func13_ScopeName_Str'];
window['func13_ChangeVarName'] = function(param4_Vari) {
	param4_Vari.attr8_Name_Str = TRIM_Str(REPLACE_Str(param4_Vari.attr8_Name_Str, "$", "_Str"), " \t\r\n\v\f");
	{
		var local17___SelectHelper33__2484 = 0;
		local17___SelectHelper33__2484 = param4_Vari.attr3_Typ;
		if ((((local17___SelectHelper33__2484) == (~~(1))) ? 1 : 0)) {
			param4_Vari.attr8_Name_Str = (((((("local") + (CAST2STRING((param4_Vari.attr8_Name_Str).length)))) + ("_"))) + (param4_Vari.attr8_Name_Str));
			
		} else if ((((local17___SelectHelper33__2484) == (~~(2))) ? 1 : 0)) {
			var local5_Found_2485 = 0;
			local5_Found_2485 = 0;
			var forEachSaver22690 = global8_Compiler.attr7_Exports;
			for(var forEachCounter22690 = 0 ; forEachCounter22690 < forEachSaver22690.values.length ; forEachCounter22690++) {
				var local3_Exp_2486 = forEachSaver22690.values[forEachCounter22690];
			{
					if ((((local3_Exp_2486.attr8_Name_Str) == (param4_Vari.attr8_Name_Str)) ? 1 : 0)) {
						local5_Found_2485 = 1;
						if (param4_Vari.attr3_ref) {
							func5_Error((((("Cannot export '") + (param4_Vari.attr8_Name_Str))) + ("' because it is a reference (dont use in connection with BYREF and ALIAS!)")), 2668, "src\CompilerPasses\Parser.gbas");
							
						};
						if ((((local3_Exp_2486.attr12_RealName_Str) != ("")) ? 1 : 0)) {
							param4_Vari.attr8_Name_Str = local3_Exp_2486.attr12_RealName_Str;
							
						};
						return 0;
						
					};
					
				}
				forEachSaver22690.values[forEachCounter22690] = local3_Exp_2486;
			
			};
			param4_Vari.attr8_Name_Str = (((((("global") + (CAST2STRING((param4_Vari.attr8_Name_Str).length)))) + ("_"))) + (param4_Vari.attr8_Name_Str));
			
		} else if ((((local17___SelectHelper33__2484) == (~~(3))) ? 1 : 0)) {
			param4_Vari.attr8_Name_Str = (((((("attr") + (CAST2STRING((param4_Vari.attr8_Name_Str).length)))) + ("_"))) + (param4_Vari.attr8_Name_Str));
			
		} else if ((((local17___SelectHelper33__2484) == (~~(4))) ? 1 : 0)) {
			param4_Vari.attr8_Name_Str = (((((((((("static") + (CAST2STRING((param4_Vari.attr8_Name_Str).length)))) + ("_"))) + (global8_Compiler.attr5_Funcs_ref[0].arrAccess(param4_Vari.attr4_func).values[tmpPositionCache][0].attr9_OName_Str))) + ("_"))) + (param4_Vari.attr8_Name_Str));
			
		} else if ((((local17___SelectHelper33__2484) == (~~(5))) ? 1 : 0)) {
			param4_Vari.attr8_Name_Str = (((((("param") + (CAST2STRING((param4_Vari.attr8_Name_Str).length)))) + ("_"))) + (param4_Vari.attr8_Name_Str));
			
		} else if ((((local17___SelectHelper33__2484) == (~~(6))) ? 1 : 0)) {
			param4_Vari.attr8_Name_Str = (((((("const") + (CAST2STRING((param4_Vari.attr8_Name_Str).length)))) + ("_"))) + (param4_Vari.attr8_Name_Str));
			
		} else if ((((local17___SelectHelper33__2484) == (~~(7))) ? 1 : 0)) {
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
		var local17___SelectHelper34__2488 = 0;
		local17___SelectHelper34__2488 = param4_Func.attr3_Typ;
		if ((((local17___SelectHelper34__2488) == (~~(3))) ? 1 : 0)) {
			param4_Func.attr8_Name_Str = (((((((((((((("method") + (CAST2STRING((global8_Compiler.attr5_Types_ref[0].arrAccess(param4_Func.attr6_MyType).values[tmpPositionCache][0].attr8_Name_Str).length)))) + ("_"))) + (global8_Compiler.attr5_Types_ref[0].arrAccess(param4_Func.attr6_MyType).values[tmpPositionCache][0].attr8_Name_Str))) + ("_"))) + (CAST2STRING((param4_Func.attr8_Name_Str).length)))) + ("_"))) + (param4_Func.attr8_Name_Str));
			
		} else if ((((local17___SelectHelper34__2488) == (~~(1))) ? 1 : 0)) {
			if ((((param4_Func.attr6_Native) == (0)) ? 1 : 0)) {
				var local5_Found_2489 = 0;
				local5_Found_2489 = 0;
				var forEachSaver22994 = global8_Compiler.attr7_Exports;
				for(var forEachCounter22994 = 0 ; forEachCounter22994 < forEachSaver22994.values.length ; forEachCounter22994++) {
					var local3_Exp_2490 = forEachSaver22994.values[forEachCounter22994];
				{
						if ((((local3_Exp_2490.attr8_Name_Str) == (param4_Func.attr8_Name_Str)) ? 1 : 0)) {
							local5_Found_2489 = 1;
							if ((((local3_Exp_2490.attr12_RealName_Str) != ("")) ? 1 : 0)) {
								param4_Func.attr8_Name_Str = local3_Exp_2490.attr12_RealName_Str;
								
							};
							break;
							
						};
						
					}
					forEachSaver22994.values[forEachCounter22994] = local3_Exp_2490;
				
				};
				if (((local5_Found_2489) ? 0 : 1)) {
					param4_Func.attr8_Name_Str = (((((("func") + (CAST2STRING((param4_Func.attr8_Name_Str).length)))) + ("_"))) + (param4_Func.attr8_Name_Str));
					
				};
				
			};
			
		} else if ((((local17___SelectHelper34__2488) == (~~(2))) ? 1 : 0)) {
			
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
	var local8_Text_Str_2492 = "";
	local8_Text_Str_2492 = "\n";
	{
		var local1_i_2493 = 0.0;
		for (local1_i_2493 = 1;toCheck(local1_i_2493, global6_Indent, 1);local1_i_2493 += 1) {
			local8_Text_Str_2492 = ((local8_Text_Str_2492) + ("\t"));
			
		};
		
	};
	return tryClone(local8_Text_Str_2492);
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
	var forEachSaver23225 = global8_Compiler.attr5_Funcs_ref[0];
	for(var forEachCounter23225 = 0 ; forEachCounter23225 < forEachSaver23225.values.length ; forEachCounter23225++) {
		var local4_Func_ref_2494 = forEachSaver23225.values[forEachCounter23225];
	{
			if ((((((((((local4_Func_ref_2494[0].attr6_Native) == (0)) ? 1 : 0)) && ((((local4_Func_ref_2494[0].attr3_Scp) != (-(1))) ? 1 : 0))) ? 1 : 0)) && ((((local4_Func_ref_2494[0].attr10_IsAbstract) == (0)) ? 1 : 0))) ? 1 : 0)) {
				var local1_i_2495 = 0;
				local1_i_2495 = 0;
				var forEachSaver23223 = local4_Func_ref_2494[0].attr6_Params;
				for(var forEachCounter23223 = 0 ; forEachCounter23223 < forEachSaver23223.values.length ; forEachCounter23223++) {
					var local1_P_2496 = forEachSaver23223.values[forEachCounter23223];
				{
						if ((((global8_Compiler.attr5_Varis_ref[0].arrAccess(local1_P_2496).values[tmpPositionCache][0].attr3_ref) != (global8_Compiler.attr5_Varis_ref[0].arrAccess(local4_Func_ref_2494[0].attr10_CopyParams.arrAccess(local1_i_2495).values[tmpPositionCache]).values[tmpPositionCache][0].attr3_ref)) ? 1 : 0)) {
							global8_Compiler.attr5_Varis_ref[0].arrAccess(local1_P_2496).values[tmpPositionCache][0].attr9_OwnerVari = local4_Func_ref_2494[0].attr10_CopyParams.arrAccess(local1_i_2495).values[tmpPositionCache];
							
						} else {
							global8_Compiler.attr5_Varis_ref[0].arrAccess(local4_Func_ref_2494[0].attr10_CopyParams.arrAccess(local1_i_2495).values[tmpPositionCache]).values[tmpPositionCache][0].attr8_Name_Str = global8_Compiler.attr5_Varis_ref[0].arrAccess(local1_P_2496).values[tmpPositionCache][0].attr8_Name_Str;
							
						};
						local1_i_2495+=1;
						
					}
					forEachSaver23223.values[forEachCounter23223] = local1_P_2496;
				
				};
				
			};
			
		}
		forEachSaver23225.values[forEachCounter23225] = local4_Func_ref_2494;
	
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
		var local7_Cur_Str_2499 = "";
		func14_MatchAndRemove("?", 17, "src\CompilerPasses\Preprocessor.gbas");
		local7_Cur_Str_2499 = func14_GetCurrent_Str();
		func13_RemoveCurrent();
		{
			var local17___SelectHelper35__2500 = "";
			local17___SelectHelper35__2500 = local7_Cur_Str_2499;
			if ((((local17___SelectHelper35__2500) == ("DEFINE")) ? 1 : 0)) {
				var local3_Def_2501 = new type7_TDefine();
				local3_Def_2501.attr7_Key_Str = func14_GetCurrent_Str();
				func13_RemoveCurrent();
				if ((((func7_IsToken("\n")) == (0)) ? 1 : 0)) {
					local3_Def_2501.attr9_Value_Str = func14_GetCurrent_Str();
					func13_RemoveCurrent();
					
				} else {
					local3_Def_2501.attr9_Value_Str = CAST2STRING(1);
					
				};
				if (((param9_IgnoreAll) ? 0 : 1)) {
					DIMPUSH(global7_Defines, local3_Def_2501);
					
				};
				
			} else if ((((local17___SelectHelper35__2500) == ("UNDEF")) ? 1 : 0)) {
				if (((param9_IgnoreAll) ? 0 : 1)) {
					var forEachSaver23320 = global7_Defines;
					for(var forEachCounter23320 = 0 ; forEachCounter23320 < forEachSaver23320.values.length ; forEachCounter23320++) {
						var local3_Def_2502 = forEachSaver23320.values[forEachCounter23320];
					{
							if (func7_IsToken(local3_Def_2502.attr7_Key_Str)) {
								//DELETE!!111
								forEachSaver23320.values[forEachCounter23320] = local3_Def_2502;
								DIMDEL(forEachSaver23320, forEachCounter23320);
								forEachCounter23320--;
								continue;
								
							};
							
						}
						forEachSaver23320.values[forEachCounter23320] = local3_Def_2502;
					
					};
					
				};
				func13_RemoveCurrent();
				
			} else if ((((local17___SelectHelper35__2500) == ("IFDEF")) ? 1 : 0)) {
				if (((param9_IgnoreAll) ? 0 : 1)) {
					var local4_doIt_2503 = 0;
					local4_doIt_2503 = 0;
					var forEachSaver23351 = global7_Defines;
					for(var forEachCounter23351 = 0 ; forEachCounter23351 < forEachSaver23351.values.length ; forEachCounter23351++) {
						var local3_Def_2504 = forEachSaver23351.values[forEachCounter23351];
					{
							if (func7_IsToken(local3_Def_2504.attr7_Key_Str)) {
								local4_doIt_2503 = 1;
								break;
								
							};
							
						}
						forEachSaver23351.values[forEachCounter23351] = local3_Def_2504;
					
					};
					func13_RemoveCurrent();
					func14_MatchAndRemove("\n", 49, "src\CompilerPasses\Preprocessor.gbas");
					func5_PreIf(local4_doIt_2503);
					
				} else {
					func13_RemoveCurrent();
					func14_MatchAndRemove("\n", 53, "src\CompilerPasses\Preprocessor.gbas");
					func5_PreIf(2);
					
				};
				
			} else if ((((local17___SelectHelper35__2500) == ("IFNDEF")) ? 1 : 0)) {
				if (((param9_IgnoreAll) ? 0 : 1)) {
					var local4_doIt_2505 = 0;
					local4_doIt_2505 = 1;
					var forEachSaver23396 = global7_Defines;
					for(var forEachCounter23396 = 0 ; forEachCounter23396 < forEachSaver23396.values.length ; forEachCounter23396++) {
						var local3_Def_2506 = forEachSaver23396.values[forEachCounter23396];
					{
							if (func7_IsToken(local3_Def_2506.attr7_Key_Str)) {
								local4_doIt_2505 = 0;
								break;
								
							};
							
						}
						forEachSaver23396.values[forEachCounter23396] = local3_Def_2506;
					
					};
					func13_RemoveCurrent();
					func14_MatchAndRemove("\n", 66, "src\CompilerPasses\Preprocessor.gbas");
					func5_PreIf(local4_doIt_2505);
					
				} else {
					func13_RemoveCurrent();
					func14_MatchAndRemove("\n", 71, "src\CompilerPasses\Preprocessor.gbas");
					func5_PreIf(2);
					
				};
				
			} else if ((((local17___SelectHelper35__2500) == ("IF")) ? 1 : 0)) {
				if (((param9_IgnoreAll) ? 0 : 1)) {
					var local6_Result_2507 = 0, local3_Pos_2508 = 0.0;
					local6_Result_2507 = 0;
					local3_Pos_2508 = global8_Compiler.attr11_currentPosi;
					{
						var Error_Str = "";
						try {
							local6_Result_2507 = ~~(func13_CalculateTree(unref(global5_Exprs_ref[0].arrAccess(func10_Expression(0)).values[tmpPositionCache][0])));
							
						} catch (Error_Str) {
							if (Error_Str instanceof GLBException) Error_Str = Error_Str.getText(); else throwError(Error_Str);{
								func5_Error((((("Unable to evaluate IF (syntax error?) '") + (Error_Str))) + ("'")), 82, "src\CompilerPasses\Preprocessor.gbas");
								
							}
						};
						
					};
					global8_Compiler.attr11_currentPosi = ~~(((local3_Pos_2508) - (1)));
					func7_GetNext();
					while (((func7_IsToken("\n")) ? 0 : 1)) {
						func13_RemoveCurrent();
						
					};
					func14_MatchAndRemove("\n", 91, "src\CompilerPasses\Preprocessor.gbas");
					if ((((local6_Result_2507) == (1)) ? 1 : 0)) {
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
				
			} else if ((((local17___SelectHelper35__2500) == ("WARNING")) ? 1 : 0)) {
				if (((param9_IgnoreAll) ? 0 : 1)) {
					func7_Warning(func14_GetCurrent_Str());
					
				};
				func13_RemoveCurrent();
				
			} else if ((((local17___SelectHelper35__2500) == ("ERROR")) ? 1 : 0)) {
				if (((param9_IgnoreAll) ? 0 : 1)) {
					func5_Error(func14_GetCurrent_Str(), 111, "src\CompilerPasses\Preprocessor.gbas");
					
				};
				func13_RemoveCurrent();
				
			} else if ((((local17___SelectHelper35__2500) == ("ELSE")) ? 1 : 0)) {
				return 1;
				
			} else if ((((local17___SelectHelper35__2500) == ("ENDIF")) ? 1 : 0)) {
				return 2;
				
			} else if ((((local17___SelectHelper35__2500) == ("OPTIMIZE")) ? 1 : 0)) {
				if (((param9_IgnoreAll) ? 0 : 1)) {
					{
						var local17___SelectHelper36__2510 = "";
						local17___SelectHelper36__2510 = func14_GetCurrent_Str();
						if ((((local17___SelectHelper36__2510) == ("SIMPLE")) ? 1 : 0)) {
							global13_OptimizeLevel = 1;
							
						} else if ((((local17___SelectHelper36__2510) == ("AGGRESSIVE")) ? 1 : 0)) {
							global13_OptimizeLevel = 2;
							
						} else if ((((local17___SelectHelper36__2510) == ("NONE")) ? 1 : 0)) {
							global13_OptimizeLevel = 0;
							
						} else {
							func5_Error("Unknown optimization level", 137, "src\CompilerPasses\Preprocessor.gbas");
							
						};
						
					};
					
				};
				func13_RemoveCurrent();
				
			} else if ((((local17___SelectHelper35__2500) == ("GRAPHICS")) ? 1 : 0)) {
				if (((param9_IgnoreAll) ? 0 : 1)) {
					global7_CONSOLE = 0;
					
				};
				
			} else {
				func5_Error((((("Expecting preprocessor command got '") + (local7_Cur_Str_2499))) + ("'")), 145, "src\CompilerPasses\Preprocessor.gbas");
				
			};
			
		};
		func14_MatchAndRemove("\n", 148, "src\CompilerPasses\Preprocessor.gbas");
		
	} else {
		var local6_Is_Str_2511 = "";
		local6_Is_Str_2511 = func14_GetCurrent_Str();
		if ((((local6_Is_Str_2511) == ("_")) ? 1 : 0)) {
			func13_RemoveCurrent();
			func14_MatchAndRemove("\n", 153, "src\CompilerPasses\Preprocessor.gbas");
			
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
	var local8_Text_Str_2513 = "";
	if ((((param4_doIt) == (0)) ? 1 : 0)) {
		if ((((func7_PreSkip(1)) == (1)) ? 1 : 0)) {
			func14_MatchAndRemove("\n", 170, "src\CompilerPasses\Preprocessor.gbas");
			if ((((func7_PreSkip(0)) == (1)) ? 1 : 0)) {
				func5_Error("Expecting '?ENDIF'", 172, "src\CompilerPasses\Preprocessor.gbas");
				
			};
			
		};
		
	} else if ((((param4_doIt) == (1)) ? 1 : 0)) {
		if ((((func7_PreSkip(0)) == (1)) ? 1 : 0)) {
			if ((((func7_PreSkip(1)) == (1)) ? 1 : 0)) {
				func5_Error("Expectiong '?ENDIF'", 176, "src\CompilerPasses\Preprocessor.gbas");
				
			};
			
		};
		
	} else if ((((param4_doIt) == (2)) ? 1 : 0)) {
		if ((((func7_PreSkip(1)) == (1)) ? 1 : 0)) {
			if ((((func7_PreSkip(1)) == (1)) ? 1 : 0)) {
				func5_Error("Expecting '?ENDIF'", 181, "src\CompilerPasses\Preprocessor.gbas");
				
			};
			
		};
		
	} else {
		func5_Error("Internal error (unknown preif)", 184, "src\CompilerPasses\Preprocessor.gbas");
		
	};
	return 0;
	
};
func5_PreIf = window['func5_PreIf'];
window['func7_PreSkip'] = function(param9_RemoveAll) {
	while (func8_EOFParse()) {
		var local1_E_2515 = 0;
		local1_E_2515 = func10_PreCommand(param9_RemoveAll);
		if ((((local1_E_2515) > (0)) ? 1 : 0)) {
			return tryClone(local1_E_2515);
			
		};
		
	};
	func5_Error("Unexpected End Of File (maybe missing ?ENDIF)", 195, "src\CompilerPasses\Preprocessor.gbas");
	return 0;
	
};
func7_PreSkip = window['func7_PreSkip'];
window['func13_CalculateTree'] = function(param4_expr) {
	{
		var local17___SelectHelper37__2517 = 0;
		local17___SelectHelper37__2517 = param4_expr.attr3_Typ;
		if ((((local17___SelectHelper37__2517) == (~~(3))) ? 1 : 0)) {
			return tryClone(param4_expr.attr6_intval);
			
		} else if ((((local17___SelectHelper37__2517) == (~~(4))) ? 1 : 0)) {
			return tryClone(param4_expr.attr8_floatval);
			
		} else if ((((local17___SelectHelper37__2517) == (~~(46))) ? 1 : 0)) {
			return tryClone(unref(((func13_CalculateTree(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr4_expr).values[tmpPositionCache][0]))) ? 0 : 1)));
			
		} else if ((((local17___SelectHelper37__2517) == (~~(15))) ? 1 : 0)) {
			return tryClone(INTEGER(func13_CalculateTree(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr4_expr).values[tmpPositionCache][0]))));
			
		} else if ((((local17___SelectHelper37__2517) == (~~(16))) ? 1 : 0)) {
			return tryClone(func13_CalculateTree(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr4_expr).values[tmpPositionCache][0])));
			
		} else if ((((local17___SelectHelper37__2517) == (~~(1))) ? 1 : 0)) {
			var local4_Left_2518 = 0.0, local5_Right_2519 = 0.0;
			local4_Left_2518 = func13_CalculateTree(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr4_Left).values[tmpPositionCache][0]));
			local5_Right_2519 = func13_CalculateTree(unref(global5_Exprs_ref[0].arrAccess(param4_expr.attr5_Right).values[tmpPositionCache][0]));
			{
				var local17___SelectHelper38__2520 = "";
				local17___SelectHelper38__2520 = global9_Operators_ref[0].arrAccess(param4_expr.attr2_Op).values[tmpPositionCache][0].attr7_Sym_Str;
				if ((((local17___SelectHelper38__2520) == ("+")) ? 1 : 0)) {
					return tryClone(((local4_Left_2518) + (local5_Right_2519)));
					
				} else if ((((local17___SelectHelper38__2520) == ("-")) ? 1 : 0)) {
					return tryClone(((local4_Left_2518) - (local5_Right_2519)));
					
				} else if ((((local17___SelectHelper38__2520) == ("*")) ? 1 : 0)) {
					return tryClone(((local4_Left_2518) * (local5_Right_2519)));
					
				} else if ((((local17___SelectHelper38__2520) == ("/")) ? 1 : 0)) {
					return tryClone(((local4_Left_2518) / (local5_Right_2519)));
					
				} else if ((((local17___SelectHelper38__2520) == ("^")) ? 1 : 0)) {
					return tryClone(POW(local4_Left_2518, local5_Right_2519));
					
				} else if ((((local17___SelectHelper38__2520) == ("=")) ? 1 : 0)) {
					return tryClone((((local4_Left_2518) == (local5_Right_2519)) ? 1 : 0));
					
				} else if ((((local17___SelectHelper38__2520) == (">")) ? 1 : 0)) {
					return tryClone((((local4_Left_2518) > (local5_Right_2519)) ? 1 : 0));
					
				} else if ((((local17___SelectHelper38__2520) == ("<")) ? 1 : 0)) {
					return tryClone((((local4_Left_2518) < (local5_Right_2519)) ? 1 : 0));
					
				} else if ((((local17___SelectHelper38__2520) == ("<=")) ? 1 : 0)) {
					return tryClone((((local4_Left_2518) <= (local5_Right_2519)) ? 1 : 0));
					
				} else if ((((local17___SelectHelper38__2520) == (">=")) ? 1 : 0)) {
					return tryClone((((local4_Left_2518) >= (local5_Right_2519)) ? 1 : 0));
					
				} else if ((((local17___SelectHelper38__2520) == ("AND")) ? 1 : 0)) {
					return tryClone((((local4_Left_2518) && (local5_Right_2519)) ? 1 : 0));
					
				} else if ((((local17___SelectHelper38__2520) == ("OR")) ? 1 : 0)) {
					return tryClone((((local4_Left_2518) || (local5_Right_2519)) ? 1 : 0));
					
				} else {
					func5_Error("Internal error (unimplemented operator!)", 239, "src\CompilerPasses\Preprocessor.gbas");
					
				};
				
			};
			
		} else {
			throw new GLBException((((("Unable to resolve '") + (CAST2STRING(param4_expr.attr3_Typ)))) + ("'")), "\src\CompilerPasses\Preprocessor.gbas", 243);
			
		};
		
	};
	return 0;
	
};
func13_CalculateTree = window['func13_CalculateTree'];
window['func12_DoTarget_Str'] = function(param8_Name_Str) {
	var local10_Output_Str_2522 = "";
	global8_Compiler.attr14_errorState_Str = ((((" (target '") + (param8_Name_Str))) + ("' error)"));
	global10_Target_Str = param8_Name_Str;
	global13_SettingIn_Str = "";
	REDIM(global9_Templates, [0], new type9_TTemplate() );
	REDIM(global9_Libraries, [0], new type8_TLibrary() );
	REDIM(global10_Blacklists, [0], new type10_TBlackList() );
	REDIM(global7_Actions, [0], new type7_TAction() );
	local10_Output_Str_2522 = "";
	var forEachSaver24006 = global10_Generators;
	for(var forEachCounter24006 = 0 ; forEachCounter24006 < forEachSaver24006.values.length ; forEachCounter24006++) {
		var local1_G_2523 = forEachSaver24006.values[forEachCounter24006];
	{
			if ((((UCASE_Str(local1_G_2523.attr8_Name_Str)) == (UCASE_Str(global8_Lang_Str))) ? 1 : 0)) {
				global8_Compiler.attr14_errorState_Str = " (generate error)";
				local10_Output_Str_2522 = CAST2STRING(local1_G_2523.attr8_genProto());
				global8_Compiler.attr14_errorState_Str = ((((" (target '") + (param8_Name_Str))) + ("' error)"));
				break;
				
			};
			
		}
		forEachSaver24006.values[forEachCounter24006] = local1_G_2523;
	
	};
	if ((((local10_Output_Str_2522) == ("")) ? 1 : 0)) {
		func5_Error("Empty output!", 80, "src\Target.gbas");
		
	};
	return tryClone(local10_Output_Str_2522);
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
		var local8_HasSlash_2532 = 0;
		local8_HasSlash_2532 = 0;
		param4_self.attr8_Position+=1;
		(param4_self).SkipWhitespaces();
		if (((((param4_self).Get_Str()) == ("/")) ? 1 : 0)) {
			local8_HasSlash_2532 = 1;
			
		};
		while (((((param4_self).Get_Str()) != ("<")) ? 1 : 0)) {
			param4_self.attr8_Position+=-1;
			
		};
		if (local8_HasSlash_2532) {
			return tryClone(0);
			
		};
		(param4_self).ParseNode();
		
	};
	return tryClone(1);
	return 0;
	
};
method9_type3_XML_10_ParseLayer = window['method9_type3_XML_10_ParseLayer'];
window['method9_type3_XML_9_ParseNode'] = function(param4_self) {
	var local8_Name_Str_2535 = "", local10_Attributes_2536 = new GLBArray();
	if (((((param4_self).Get_Str()) != ("<")) ? 1 : 0)) {
		throw new GLBException("XML Error - Expecting '<'", "\src\Utils\XMLReader.gbas", 65);
		
	};
	param4_self.attr8_Position+=1;
	(param4_self).SkipWhitespaces();
	local8_Name_Str_2535 = (param4_self).ParseIdentifier_Str();
	if (((((param4_self).Get_Str()) == (" ")) ? 1 : 0)) {
		(param4_self).SkipWhitespaces();
		while ((((((((param4_self).Get_Str()) != ("/")) ? 1 : 0)) && (((((param4_self).Get_Str()) != (">")) ? 1 : 0))) ? 1 : 0)) {
			var local3_Att_2537 = new type12_xmlAttribute(), local3_Pos_2538 = 0;
			(param4_self).SkipWhitespaces();
			local3_Att_2537.attr8_Name_Str = (param4_self).ParseIdentifier_Str();
			(param4_self).SkipWhitespaces();
			if (((((param4_self).Get_Str()) != ("=")) ? 1 : 0)) {
				throw new GLBException("XML Error - Expecting '='", "\src\Utils\XMLReader.gbas", 82);
				
			};
			param4_self.attr8_Position+=1;
			(param4_self).SkipWhitespaces();
			if (((((param4_self).Get_Str()) != ("\"")) ? 1 : 0)) {
				throw new GLBException("XML Error - Expecting '\"'", "\src\Utils\XMLReader.gbas", 87);
				
			};
			param4_self.attr8_Position+=1;
			local3_Pos_2538 = param4_self.attr8_Position;
			while (((((param4_self).Get_Str()) != ("\"")) ? 1 : 0)) {
				param4_self.attr8_Position+=1;
				
			};
			param4_self.attr8_Position+=1;
			local3_Att_2537.attr9_Value_Str = MID_Str(param4_self.attr8_Text_Str, local3_Pos_2538, ((((param4_self.attr8_Position) - (local3_Pos_2538))) - (1)));
			(param4_self).SkipWhitespaces();
			DIMPUSH(local10_Attributes_2536, local3_Att_2537);
			
		};
		
	};
	param4_self.attr5_Event(local8_Name_Str_2535, local10_Attributes_2536);
	{
		var local17___SelectHelper39__2539 = "";
		local17___SelectHelper39__2539 = (param4_self).Get_Str();
		if ((((local17___SelectHelper39__2539) == (">")) ? 1 : 0)) {
			param4_self.attr8_Position+=1;
			(param4_self).SkipWhitespaces();
			if ((param4_self).ParseLayer()) {
				throw new GLBException((((("XML Error - Unexpected End of File, expecting </") + (local8_Name_Str_2535))) + (">")), "\src\Utils\XMLReader.gbas", 109);
				
			};
			(param4_self).SkipWhitespaces();
			if (((((param4_self).Get_Str()) != ("<")) ? 1 : 0)) {
				throw new GLBException("XML Error - Expecting '<'", "\src\Utils\XMLReader.gbas", 113);
				
			};
			param4_self.attr8_Position+=1;
			(param4_self).SkipWhitespaces();
			if (((((param4_self).Get_Str()) != ("/")) ? 1 : 0)) {
				throw new GLBException("XML Error - Expecting '/'", "\src\Utils\XMLReader.gbas", 116);
				
			};
			param4_self.attr8_Position+=1;
			if ((((local8_Name_Str_2535) != ((param4_self).ParseIdentifier_Str())) ? 1 : 0)) {
				throw new GLBException("XML Error - Nodes do not match", "\src\Utils\XMLReader.gbas", 119);
				
			};
			if (((((param4_self).Get_Str()) != (">")) ? 1 : 0)) {
				throw new GLBException("XML Error Expecting '>'", "\src\Utils\XMLReader.gbas", 120);
				
			};
			param4_self.attr8_Position+=1;
			(param4_self).SkipWhitespaces();
			
		} else if ((((local17___SelectHelper39__2539) == ("/")) ? 1 : 0)) {
			param4_self.attr8_Position+=1;
			if (((((param4_self).Get_Str()) != (">")) ? 1 : 0)) {
				throw new GLBException("XML Error - Expecting '>'", "\src\Utils\XMLReader.gbas", 126);
				
			};
			param4_self.attr8_Position+=1;
			(param4_self).SkipWhitespaces();
			
		} else {
			throw new GLBException("XML Error", "\src\Utils\XMLReader.gbas", 130);
			
		};
		
	};
	return 0;
	
};
method9_type3_XML_9_ParseNode = window['method9_type3_XML_9_ParseNode'];
window['method9_type3_XML_19_ParseIdentifier_Str'] = function(param4_self) {
	var local3_Pos_2542 = 0;
	local3_Pos_2542 = param4_self.attr8_Position;
	while ((((((((((((((param4_self).Get_Str()) != (" ")) ? 1 : 0)) && (((((param4_self).Get_Str()) != ("/")) ? 1 : 0))) ? 1 : 0)) && (((((param4_self).Get_Str()) != (">")) ? 1 : 0))) ? 1 : 0)) && (((((param4_self).Get_Str()) != ("=")) ? 1 : 0))) ? 1 : 0)) {
		param4_self.attr8_Position+=1;
		
	};
	if ((((param4_self.attr8_Position) >= ((param4_self.attr8_Text_Str).length)) ? 1 : 0)) {
		throw new GLBException("XML Error", "\src\Utils\XMLReader.gbas", 139);
		
	};
	return tryClone(UCASE_Str(MID_Str(param4_self.attr8_Text_Str, local3_Pos_2542, ((param4_self.attr8_Position) - (local3_Pos_2542)))));
	return "";
	
};
method9_type3_XML_19_ParseIdentifier_Str = window['method9_type3_XML_19_ParseIdentifier_Str'];
window['method9_type3_XML_7_Get_Str'] = function(param4_self) {
	if ((((param4_self.attr8_Position) >= ((param4_self.attr8_Text_Str).length)) ? 1 : 0)) {
		throw new GLBException("XML Error - Unexpected End Of File", "\src\Utils\XMLReader.gbas", 145);
		
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
var const11_VERSION_Str = "1", const11_XMLNAME_Str = "WIN32", const12_FUNC_IS_FUNC = 1, const11_FUNC_IS_SUB = 2, const14_FUNC_IS_METHOD = 3, const13_FUNC_IS_PROTO = 4, const22_IDENTIFIERFUNC_VERSION = 1000, const13_VARI_IS_LOCAL = 1, const14_VARI_IS_GLOBAL = 2, const12_VARI_IS_ATTR = 3, const14_VARI_IS_STATIC = 4, const13_VARI_IS_PARAM = 5, const13_VARI_IS_CONST = 6, const13_VARI_IS_ALIAS = 7, const22_IDENTIFIERVARI_VERSION = 2000, const22_IDENTIFIERTYPE_VERSION = 3000, const16_DATATYPE_VERSION = 4000, const13_TOKEN_VERSION = 5000, const11_SCOPE_IS_IF = 1, const13_SCOPE_IS_FUNC = 2, const13_SCOPE_IS_LOOP = 3, const13_SCOPE_IS_MAIN = 4, const12_SCOPE_IS_TRY = 5, const15_SCOPE_IS_SELECT = 6, const12_EXPR_VERSION = 1, const11_OP_IS_UNAER = 1, const12_OP_IS_BINAER = 2, const10_OP_IS_BOOL = 3, const16_EXPR_IS_OPERATOR = 1, const13_EXPR_IS_SCOPE = 2, const11_EXPR_IS_INT = 3, const13_EXPR_IS_FLOAT = 4, const11_EXPR_IS_STR = 5, const16_EXPR_IS_FUNCCALL = 6, const13_EXPR_IS_EMPTY = 7, const13_EXPR_IS_DEBUG = 8, const12_EXPR_IS_VARI = 9, const14_EXPR_IS_ASSIGN = 10, const11_EXPR_IS_DIM = 11, const13_EXPR_IS_REDIM = 12, const13_EXPR_IS_ARRAY = 13, const16_EXPR_IS_CAST2INT = 15, const18_EXPR_IS_CAST2FLOAT = 16, const19_EXPR_IS_CAST2STRING = 17, const14_EXPR_IS_ACCESS = 18, const14_EXPR_IS_RETURN = 19, const12_EXPR_IS_GOTO = 20, const13_EXPR_IS_LABEL = 21, const16_EXPR_IS_FUNCDATA = 22, const17_EXPR_IS_PROTOCALL = 23, const10_EXPR_IS_IF = 24, const13_EXPR_IS_WHILE = 25, const14_EXPR_IS_REPEAT = 26, const11_EXPR_IS_FOR = 27, const13_EXPR_IS_BREAK = 29, const16_EXPR_IS_CONTINUE = 30, const11_EXPR_IS_TRY = 31, const13_EXPR_IS_THROW = 32, const15_EXPR_IS_RESTORE = 33, const12_EXPR_IS_READ = 34, const14_EXPR_IS_DEFVAL = 35, const17_EXPR_IS_DIMASEXPR = 36, const13_EXPR_IS_ALIAS = 37, const15_EXPR_IS_FOREACH = 38, const11_EXPR_IS_INC = 39, const15_EXPR_IS_DIMPUSH = 40, const11_EXPR_IS_LEN = 41, const15_EXPR_IS_DIMDATA = 42, const14_EXPR_IS_DELETE = 43, const14_EXPR_IS_DIMDEL = 44, const13_EXPR_IS_BOUND = 45, const11_EXPR_IS_NOT = 46, const13_EXPR_IS_DUMMY = 47, const17_EXPR_IS_ADDRESSOF = 48, const14_EXPR_IS_ASSERT = 49, const19_EXPR_IS_DEBUGOUTPUT = 50, const11_EXPR_IS_IIF = 51, const15_EXPR_IS_REQUIRE = 52, const13_EXPR_IS_SUPER = 53, const16_EXPR_IS_CAST2OBJ = 54, const6_BL_EXT = 1, const7_BL_FILE = 2, const19_GL_DEPTH_BUFFER_BIT = 256, const21_GL_STENCIL_BUFFER_BIT = 1024, const19_GL_COLOR_BUFFER_BIT = 16384, const8_GL_FALSE = 0, const7_GL_TRUE = 1, const9_GL_POINTS = 0, const8_GL_LINES = 1, const12_GL_LINE_LOOP = 2, const13_GL_LINE_STRIP = 3, const12_GL_TRIANGLES = 4, const17_GL_TRIANGLE_STRIP = 5, const15_GL_TRIANGLE_FAN = 6, const7_GL_ZERO = 0, const6_GL_ONE = 1, const12_GL_SRC_COLOR = 768, const22_GL_ONE_MINUS_SRC_COLOR = 769, const12_GL_SRC_ALPHA = 770, const22_GL_ONE_MINUS_SRC_ALPHA = 771, const12_GL_DST_ALPHA = 772, const22_GL_ONE_MINUS_DST_ALPHA = 773, const12_GL_DST_COLOR = 774, const22_GL_ONE_MINUS_DST_COLOR = 775, const21_GL_SRC_ALPHA_SATURATE = 776, const11_GL_FUNC_ADD = 32774, const17_GL_BLEND_EQUATION = 32777, const21_GL_BLEND_EQUATION_RGB = 32777, const23_GL_BLEND_EQUATION_ALPHA = 34877, const16_GL_FUNC_SUBTRACT = 32778, const24_GL_FUNC_REVERSE_SUBTRACT = 32779, const16_GL_BLEND_DST_RGB = 32968, const16_GL_BLEND_SRC_RGB = 32969, const18_GL_BLEND_DST_ALPHA = 32970, const18_GL_BLEND_SRC_ALPHA = 32971, const17_GL_CONSTANT_COLOR = 32769, const27_GL_ONE_MINUS_CONSTANT_COLOR = 32770, const17_GL_CONSTANT_ALPHA = 32771, const27_GL_ONE_MINUS_CONSTANT_ALPHA = 32772, const14_GL_BLEND_COLOR = 32773, const15_GL_ARRAY_BUFFER = 34962, const23_GL_ELEMENT_ARRAY_BUFFER = 34963, const23_GL_ARRAY_BUFFER_BINDING = 34964, const31_GL_ELEMENT_ARRAY_BUFFER_BINDING = 34965, const14_GL_STREAM_DRAW = 35040, const14_GL_STATIC_DRAW = 35044, const15_GL_DYNAMIC_DRAW = 35048, const14_GL_BUFFER_SIZE = 34660, const15_GL_BUFFER_USAGE = 34661, const24_GL_CURRENT_VERTEX_ATTRIB = 34342, const8_GL_FRONT = 1028, const7_GL_BACK = 1029, const17_GL_FRONT_AND_BACK = 1032, const13_GL_TEXTURE_2D = 3553, const12_GL_CULL_FACE = 2884, const8_GL_BLEND = 3042, const9_GL_DITHER = 3024, const15_GL_STENCIL_TEST = 2960, const13_GL_DEPTH_TEST = 2929, const15_GL_SCISSOR_TEST = 3089, const22_GL_POLYGON_OFFSET_FILL = 32823, const27_GL_SAMPLE_ALPHA_TO_COVERAGE = 32926, const18_GL_SAMPLE_COVERAGE = 32928, const11_GL_NO_ERROR = 0, const15_GL_INVALID_ENUM = 1280, const16_GL_INVALID_VALUE = 1281, const20_GL_INVALID_OPERATION = 1282, const16_GL_OUT_OF_MEMORY = 1285, const5_GL_CW = 2304, const6_GL_CCW = 2305, const13_GL_LINE_WIDTH = 2849, const27_GL_ALIASED_POINT_SIZE_RANGE = 33901, const27_GL_ALIASED_LINE_WIDTH_RANGE = 33902, const17_GL_CULL_FACE_MODE = 2885, const13_GL_FRONT_FACE = 2886, const14_GL_DEPTH_RANGE = 2928, const18_GL_DEPTH_WRITEMASK = 2930, const20_GL_DEPTH_CLEAR_VALUE = 2931, const13_GL_DEPTH_FUNC = 2932, const22_GL_STENCIL_CLEAR_VALUE = 2961, const15_GL_STENCIL_FUNC = 2962, const15_GL_STENCIL_FAIL = 2964, const26_GL_STENCIL_PASS_DEPTH_FAIL = 2965, const26_GL_STENCIL_PASS_DEPTH_PASS = 2966, const14_GL_STENCIL_REF = 2967, const21_GL_STENCIL_VALUE_MASK = 2963, const20_GL_STENCIL_WRITEMASK = 2968, const20_GL_STENCIL_BACK_FUNC = 34816, const20_GL_STENCIL_BACK_FAIL = 34817, const31_GL_STENCIL_BACK_PASS_DEPTH_FAIL = 34818, const31_GL_STENCIL_BACK_PASS_DEPTH_PASS = 34819, const19_GL_STENCIL_BACK_REF = 36003, const26_GL_STENCIL_BACK_VALUE_MASK = 36004, const25_GL_STENCIL_BACK_WRITEMASK = 36005, const11_GL_VIEWPORT = 2978, const14_GL_SCISSOR_BOX = 3088, const20_GL_COLOR_CLEAR_VALUE = 3106, const18_GL_COLOR_WRITEMASK = 3107, const19_GL_UNPACK_ALIGNMENT = 3317, const17_GL_PACK_ALIGNMENT = 3333, const19_GL_MAX_TEXTURE_SIZE = 3379, const20_GL_MAX_VIEWPORT_DIMS = 3386, const16_GL_SUBPIXEL_BITS = 3408, const11_GL_RED_BITS = 3410, const13_GL_GREEN_BITS = 3411, const12_GL_BLUE_BITS = 3412, const13_GL_ALPHA_BITS = 3413, const13_GL_DEPTH_BITS = 3414, const15_GL_STENCIL_BITS = 3415, const23_GL_POLYGON_OFFSET_UNITS = 10752, const24_GL_POLYGON_OFFSET_FACTOR = 32824, const21_GL_TEXTURE_BINDING_2D = 32873, const17_GL_SAMPLE_BUFFERS = 32936, const10_GL_SAMPLES = 32937, const24_GL_SAMPLE_COVERAGE_VALUE = 32938, const25_GL_SAMPLE_COVERAGE_INVERT = 32939, const33_GL_NUM_COMPRESSED_TEXTURE_FORMATS = 34466, const29_GL_COMPRESSED_TEXTURE_FORMATS = 34467, const12_GL_DONT_CARE = 4352, const10_GL_FASTEST = 4353, const9_GL_NICEST = 4354, const23_GL_GENERATE_MIPMAP_HINT = 33170, const7_GL_BYTE = 5120, const16_GL_UNSIGNED_BYTE = 5121, const8_GL_SHORT = 5122, const17_GL_UNSIGNED_SHORT = 5123, const6_GL_INT = 5124, const15_GL_UNSIGNED_INT = 5125, const8_GL_FLOAT = 5126, const8_GL_FIXED = 5132, const18_GL_DEPTH_COMPONENT = 6402, const8_GL_ALPHA = 6406, const6_GL_RGB = 6407, const7_GL_RGBA = 6408, const12_GL_LUMINANCE = 6409, const18_GL_LUMINANCE_ALPHA = 6410, const25_GL_UNSIGNED_SHORT_4_4_4_4 = 32819, const25_GL_UNSIGNED_SHORT_5_5_5_1 = 32820, const23_GL_UNSIGNED_SHORT_5_6_5 = 33635, const18_GL_FRAGMENT_SHADER = 35632, const16_GL_VERTEX_SHADER = 35633, const21_GL_MAX_VERTEX_ATTRIBS = 34921, const29_GL_MAX_VERTEX_UNIFORM_VECTORS = 36347, const22_GL_MAX_VARYING_VECTORS = 36348, const35_GL_MAX_COMBINED_TEXTURE_IMAGE_UNITS = 35661, const33_GL_MAX_VERTEX_TEXTURE_IMAGE_UNITS = 35660, const26_GL_MAX_TEXTURE_IMAGE_UNITS = 34930, const31_GL_MAX_FRAGMENT_UNIFORM_VECTORS = 36349, const14_GL_SHADER_TYPE = 35663, const16_GL_DELETE_STATUS = 35712, const14_GL_LINK_STATUS = 35714, const18_GL_VALIDATE_STATUS = 35715, const19_GL_ATTACHED_SHADERS = 35717, const18_GL_ACTIVE_UNIFORMS = 35718, const28_GL_ACTIVE_UNIFORM_MAX_LENGTH = 35719, const20_GL_ACTIVE_ATTRIBUTES = 35721, const30_GL_ACTIVE_ATTRIBUTE_MAX_LENGTH = 35722, const27_GL_SHADING_LANGUAGE_VERSION = 35724, const18_GL_CURRENT_PROGRAM = 35725, const8_GL_NEVER = 512, const7_GL_LESS = 513, const8_GL_EQUAL = 514, const9_GL_LEQUAL = 515, const10_GL_GREATER = 516, const11_GL_NOTEQUAL = 517, const9_GL_GEQUAL = 518, const9_GL_ALWAYS = 519, const7_GL_KEEP = 7680, const10_GL_REPLACE = 7681, const7_GL_INCR = 7682, const7_GL_DECR = 7683, const9_GL_INVERT = 5386, const12_GL_INCR_WRAP = 34055, const12_GL_DECR_WRAP = 34056, const9_GL_VENDOR = 7936, const11_GL_RENDERER = 7937, const10_GL_VERSION = 7938, const13_GL_EXTENSIONS = 7939, const10_GL_NEAREST = 9728, const9_GL_LINEAR = 9729, const25_GL_NEAREST_MIPMAP_NEAREST = 9984, const24_GL_LINEAR_MIPMAP_NEAREST = 9985, const24_GL_NEAREST_MIPMAP_LINEAR = 9986, const23_GL_LINEAR_MIPMAP_LINEAR = 9987, const21_GL_TEXTURE_MAG_FILTER = 10240, const21_GL_TEXTURE_MIN_FILTER = 10241, const17_GL_TEXTURE_WRAP_S = 10242, const17_GL_TEXTURE_WRAP_T = 10243, const10_GL_TEXTURE = 5890, const19_GL_TEXTURE_CUBE_MAP = 34067, const27_GL_TEXTURE_BINDING_CUBE_MAP = 34068, const30_GL_TEXTURE_CUBE_MAP_POSITIVE_X = 34069, const30_GL_TEXTURE_CUBE_MAP_NEGATIVE_X = 34070, const30_GL_TEXTURE_CUBE_MAP_POSITIVE_Y = 34071, const30_GL_TEXTURE_CUBE_MAP_NEGATIVE_Y = 34072, const30_GL_TEXTURE_CUBE_MAP_POSITIVE_Z = 34073, const30_GL_TEXTURE_CUBE_MAP_NEGATIVE_Z = 34074, const28_GL_MAX_CUBE_MAP_TEXTURE_SIZE = 34076, const11_GL_TEXTURE0 = 33984, const11_GL_TEXTURE1 = 33985, const11_GL_TEXTURE2 = 33986, const11_GL_TEXTURE3 = 33987, const11_GL_TEXTURE4 = 33988, const11_GL_TEXTURE5 = 33989, const11_GL_TEXTURE6 = 33990, const11_GL_TEXTURE7 = 33991, const11_GL_TEXTURE8 = 33992, const11_GL_TEXTURE9 = 33993, const12_GL_TEXTURE10 = 33994, const12_GL_TEXTURE11 = 33995, const12_GL_TEXTURE12 = 33996, const12_GL_TEXTURE13 = 33997, const12_GL_TEXTURE14 = 33998, const12_GL_TEXTURE15 = 33999, const12_GL_TEXTURE16 = 34000, const12_GL_TEXTURE17 = 34001, const12_GL_TEXTURE18 = 34002, const12_GL_TEXTURE19 = 34003, const12_GL_TEXTURE20 = 34004, const12_GL_TEXTURE21 = 34005, const12_GL_TEXTURE22 = 34006, const12_GL_TEXTURE23 = 34007, const12_GL_TEXTURE24 = 34008, const12_GL_TEXTURE25 = 34009, const12_GL_TEXTURE26 = 34010, const12_GL_TEXTURE27 = 34011, const12_GL_TEXTURE28 = 34012, const12_GL_TEXTURE29 = 34013, const12_GL_TEXTURE30 = 34014, const12_GL_TEXTURE31 = 34015, const17_GL_ACTIVE_TEXTURE = 34016, const9_GL_REPEAT = 10497, const16_GL_CLAMP_TO_EDGE = 33071, const18_GL_MIRRORED_REPEAT = 33648, const13_GL_FLOAT_VEC2 = 35664, const13_GL_FLOAT_VEC3 = 35665, const13_GL_FLOAT_VEC4 = 35666, const11_GL_INT_VEC2 = 35667, const11_GL_INT_VEC3 = 35668, const11_GL_INT_VEC4 = 35669, const7_GL_BOOL = 35670, const12_GL_BOOL_VEC2 = 35671, const12_GL_BOOL_VEC3 = 35672, const12_GL_BOOL_VEC4 = 35673, const13_GL_FLOAT_MAT2 = 35674, const13_GL_FLOAT_MAT3 = 35675, const13_GL_FLOAT_MAT4 = 35676, const13_GL_SAMPLER_2D = 35678, const15_GL_SAMPLER_CUBE = 35680, const30_GL_VERTEX_ATTRIB_ARRAY_ENABLED = 34338, const27_GL_VERTEX_ATTRIB_ARRAY_SIZE = 34339, const29_GL_VERTEX_ATTRIB_ARRAY_STRIDE = 34340, const27_GL_VERTEX_ATTRIB_ARRAY_TYPE = 34341, const33_GL_VERTEX_ATTRIB_ARRAY_NORMALIZED = 34922, const30_GL_VERTEX_ATTRIB_ARRAY_POINTER = 34373, const37_GL_VERTEX_ATTRIB_ARRAY_BUFFER_BINDING = 34975, const33_GL_IMPLEMENTATION_COLOR_READ_TYPE = 35738, const35_GL_IMPLEMENTATION_COLOR_READ_FORMAT = 35739, const17_GL_COMPILE_STATUS = 35713, const18_GL_INFO_LOG_LENGTH = 35716, const23_GL_SHADER_SOURCE_LENGTH = 35720, const18_GL_SHADER_COMPILER = 36346, const24_GL_SHADER_BINARY_FORMATS = 36344, const28_GL_NUM_SHADER_BINARY_FORMATS = 36345, const12_GL_LOW_FLOAT = 36336, const15_GL_MEDIUM_FLOAT = 36337, const13_GL_HIGH_FLOAT = 36338, const10_GL_LOW_INT = 36339, const13_GL_MEDIUM_INT = 36340, const11_GL_HIGH_INT = 36341, const14_GL_FRAMEBUFFER = 36160, const15_GL_RENDERBUFFER = 36161, const8_GL_RGBA4 = 32854, const10_GL_RGB5_A1 = 32855, const9_GL_RGB565 = 36194, const20_GL_DEPTH_COMPONENT16 = 33189, const16_GL_STENCIL_INDEX = 6401, const17_GL_STENCIL_INDEX8 = 36168, const21_GL_RENDERBUFFER_WIDTH = 36162, const22_GL_RENDERBUFFER_HEIGHT = 36163, const31_GL_RENDERBUFFER_INTERNAL_FORMAT = 36164, const24_GL_RENDERBUFFER_RED_SIZE = 36176, const26_GL_RENDERBUFFER_GREEN_SIZE = 36177, const25_GL_RENDERBUFFER_BLUE_SIZE = 36178, const26_GL_RENDERBUFFER_ALPHA_SIZE = 36179, const26_GL_RENDERBUFFER_DEPTH_SIZE = 36180, const28_GL_RENDERBUFFER_STENCIL_SIZE = 36181, const37_GL_FRAMEBUFFER_ATTACHMENT_OBJECT_TYPE = 36048, const37_GL_FRAMEBUFFER_ATTACHMENT_OBJECT_NAME = 36049, const39_GL_FRAMEBUFFER_ATTACHMENT_TEXTURE_LEVEL = 36050, const47_GL_FRAMEBUFFER_ATTACHMENT_TEXTURE_CUBE_MAP_FACE = 36051, const20_GL_COLOR_ATTACHMENT0 = 36064, const19_GL_DEPTH_ATTACHMENT = 36096, const21_GL_STENCIL_ATTACHMENT = 36128, const7_GL_NONE = 0, const23_GL_FRAMEBUFFER_COMPLETE = 36053, const36_GL_FRAMEBUFFER_INCOMPLETE_ATTACHMENT = 36054, const44_GL_FRAMEBUFFER_INCOMPLETE_MISSING_ATTACHMENT = 36055, const36_GL_FRAMEBUFFER_INCOMPLETE_DIMENSIONS = 36057, const26_GL_FRAMEBUFFER_UNSUPPORTED = 36061, const22_GL_FRAMEBUFFER_BINDING = 36006, const23_GL_RENDERBUFFER_BINDING = 36007, const24_GL_MAX_RENDERBUFFER_SIZE = 34024, const32_GL_INVALID_FRAMEBUFFER_OPERATION = 1286, global10_LastExprID = 0.0, global5_Exprs_ref = [new GLBArray()], global8_LastType = new type14_IdentifierType(), global12_voidDatatype = new type8_Datatype(), global11_intDatatype = new type8_Datatype(), global13_floatDatatype = new type8_Datatype(), global11_strDatatype = new type8_Datatype(), global9_Operators_ref = [new GLBArray()], global10_KeywordMap = new type7_HashMap(), global8_Compiler = new type9_TCompiler(), global7_Defines = new GLBArray(), global10_LastDefine = new type7_TDefine(), global10_Generators = new GLBArray(), global13_SettingIn_Str = "", global11_SHLASHF_Str = "", MaxPasses = 0, global9_GFX_WIDTH = 0.0, global10_GFX_HEIGHT = 0.0, global10_FULLSCREEN = 0, global9_FRAMERATE = 0, global11_APPNAME_Str = "", global9_DEBUGMODE = 0, global7_CONSOLE = 0.0, global6_STRICT = 0.0, global15_USRDEF_VERS_Str = "", global14_GbapOutput_Str = "", global12_GbapPath_Str = "", global12_GbapName_Str = "", global6_Ignore = 0, global13_OptimizeLevel = 0, global12_CurrentScope = 0, global14_ForEachCounter = 0, global11_CurrentFunc = 0, global12_LabelDef_Str = "", global8_IsInGoto = 0, global11_LoopBreakID = 0, global14_LoopContinueID = 0, global11_LastDummyID = 0, global14_StaticText_Str = "", global6_Indent = 0, global9_Templates = new GLBArray(), global9_Libraries = new GLBArray(), global10_Blacklists = new GLBArray(), global7_Actions = new GLBArray(), global8_Mode_Str = "", global10_Target_Str = "", global13_SettingIn_Str = "", global9_Templates = new GLBArray(), global8_Lang_Str = "", global22_DirectoryStructure_Str = "", global5_NoRun = 0, global6_Objs3D = new GLBArray();
// set default statics:
window['initStatics'] = function() {
	static12_Factor_DIMASEXPRErr = 0;
static12_Keyword_SelectHelper = 0.0, static7_Keyword_GOTOErr = 0;

}
initStatics = window['initStatics'];
for (var __init = 0; __init < preInitFuncs.length; __init++) preInitFuncs[__init]();
