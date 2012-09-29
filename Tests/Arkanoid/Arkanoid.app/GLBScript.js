if(typeof preInitFuncs == "undefined") {
  preInitFuncs = []
}
preInitFuncs.push(function() {
  if(viewMode == "console" && typeof inEditorPreview == "undefined") {
    if(document) {
      window.onload = function(e) {
        var e = document.createElement("textarea");
        e.style.width = "100%";
        e.style.height = "480px";
        e.id = "GLBCONSOLE";
        document.body.appendChild(e);
        updateConsole()
      }
    }else {
      updateConsole()
    }
  }
});
var startTime = (new Date).getTime();
function GLBException(text, file, line) {
  this.text = text;
  this.line = line;
  this.file = file
}
function GLBExitException() {
}
GLBExitException.prototype.toString = function() {
  return"GLB Exit"
};
GLBException.prototype.toString = function() {
  return"Unhandled exception '" + text + "' in file '" + this.file + "' in line'" + this.line + "'"
};
GLBException.prototype.getText = function() {
  return this.text
};
GLBException.prototype.toString = function() {
  return"Uncought GLBException '" + this.text + "' stacktrace: " + STACKTRACE_Str()
};
var waitload = 0;
var exec = false;
var tmpPositionCache = -1;
var arrargs = new Array(64);
var consoleOutput;
var consoleSize = 1E4;
var currentDir;
var mainCall = false;
function STDOUT(text) {
  if(consoleOutput == undefined) {
    consoleOutput = document ? document.getElementById("GLBCONSOLE") : null
  }
  if(consoleOutput) {
    consoleOutput.value = consoleOutput.value + text;
    consoleOutput.scrollTop = consoleOutput.scrollHeight
  }else {
    console.log(text)
  }
}
function STDERR(text) {
  STDOUT("Error: " + text)
}
function STDCOLOR(back, fore) {
}
function DEBUG(text) {
  console.log(text)
}
function END() {
  window.onbeforeunload();
  throw new GLBExitException;
}
function GETTIMERALL() {
  return(new Date).getTime() - startTime
}
function PLATFORMINFO_Str(info) {
  switch(info) {
    case "":
      return"HTML5";
    case "DOCUMENTS":
    ;
    case "APPDATA":
    ;
    case "TEMP":
      return"/";
    case "ID":
      return"" + uniqueId;
    case "DEVICE":
      return"DESKTOP";
    case "BATTERY":
      var bat = navigator.battery || window.navigator.battery || navigator.battery || navigator.mozBattery || navigator.webkitBattery;
      return bat ? bat.level * 100 : 100;
    case "TIME":
      var d = new Date;
      var f = function(val) {
        val = CAST2STRING(val);
        if(val.length == 1) {
          val = "0" + val
        }
        return val
      };
      return f(d.getFullYear()) + "-" + f(d.getMonth()) + "-" + f(d.getDate()) + " " + f(d.getHours()) + ":" + f(d.getMinutes()) + ":" + f(d.getSeconds());
    case "COMPILED":
      return rot13(compileTime);
    case "VERSION":
      return rot13(userDefVersion);
    case "HOSTID":
      return rot13(hostId);
    case "LOCALE":
      return navigator.language || window.navigator.userLanguage || window.navigator.language;
    default:
      if(info.length > "GLEXT:".length && MID_Str(info, 0, "GLEXT:".length) == "GLEXT:") {
        return"0"
      }else {
        return""
      }
  }
}
function GETLASTERROR_Str() {
  return"0 Successfull"
}
function SHELLCMD(cmd, wait, show, rv) {
  try {
    rv[0] = CAST2FLOAT(eval(cmd))
  }catch(ex) {
    rv[0] = 0;
    rv[0] = 0;
    throwError("SHELLCMD raised ab error.")
  }
}
function SHELLEND(cmd) {
  try {
    eval(cmd)
  }catch(ex) {
    throwError("SHELLEND raised an error")
  }
  END()
}
function CALLBYNAME(name) {
  var ret = 1;
  return eval("if (window['" + name + "']) window." + name + "(); else ret = 0;")
}
var callStack = [];
function StackFrame(name, info, dbg) {
  this.name = name;
  this.info = info;
  this.dbg = dbg
}
function stackPush(name, info) {
  callStack.push(new StackFrame(name, info, __debugInfo))
}
function stackPop() {
  var obj = callStack.pop();
  __debugInfo = obj.dbg
}
function stackTrace() {
  var output = "";
  for(var i = callStack.length - 1;i >= 0;i--) {
    output += "\tin '" + callStack[i].name + "' in file '" + MID_Str(callStack[i].info, INSTR(callStack[i].info, ":") + 1) + "' in line '" + MID_Str(callStack[i].info, 0, INSTR(callStack[i].info, ":")) + "'\n"
  }
  return output
}
function throwError(msg) {
  throw msg;
}
function formatError(msg) {
  msg = msg.message ? msg.message : msg.toString();
  if(msg.indexOf("GLBERR") == 0) {
    msg = msg.substring("GLBERR".length)
  }
  if(debugMode) {
    msg = "Error:\n '" + msg + "' ";
    var info = __debugInfo;
    msg += "\nAppeared in line '" + MID_Str(info, 0, INSTR(info, ":")) + "' in file '" + MID_Str(info, INSTR(info, ":") + 1) + "' ";
    msg += "\n\n" + stackTrace()
  }
  return msg
}
function dumpArray(arr) {
  var acc = "";
  var start = false;
  for(var i = 0;i < arr.length;i++) {
    if(start) {
      acc += ", "
    }
    acc += "'" + arr[i] + "'";
    start = true
  }
  return"[" + acc + "]"
}
function toCheck(cur, to, step) {
  if(step > 0) {
    return cur <= to
  }else {
    if(step < 0) {
      return cur >= to
    }else {
      return true
    }
  }
}
function untilCheck(cur, to, step) {
  if(step > 0) {
    return cur < to
  }else {
    if(step < 0) {
      return cur > to
    }else {
      return true
    }
  }
}
function isKnownException(ex) {
  return ex instanceof GLBExitException || ex instanceof GLBException
}
function unref(v) {
  if(v instanceof Array) {
    return v[0]
  }else {
    return v
  }
}
function ref(v) {
  if(v instanceof Array) {
    return v
  }else {
    return[v]
  }
}
function tryClone(o) {
  switch(typeof o) {
    case "undefined":
    ;
    case "function":
    ;
    case "string":
    ;
    case "boolean":
    ;
    case "number":
      break;
    default:
      if(o instanceof Array) {
        return[tryClone(o[0])]
      }else {
        return o.clone()
      }
  }
  return o
}
function updateConsole() {
  try {
    if(!mainCall) {
      main();
      mainCall = true
    }
    if(!waitload && !exec) {
      exec = true;
      if(typeof GLB_ON_INIT == "function") {
        GLB_ON_INIT()
      }
    }else {
      window.requestAnimFrame(updateConsole, 100)
    }
  }catch(ex) {
    if(ex instanceof GLBExitException) {
      alert(formatError(ex))
    }
  }
}
function castobj(obj, target) {
  if(obj instanceof Array) {
    if(obj[0] instanceof target) {
      return obj
    }else {
      return[eval("new " + target + "()")]
    }
  }else {
    if(obj instanceof target) {
      return obj
    }else {
      return eval("new " + target + "()")
    }
  }
}
var dataLabel, dataPosition;
function RESTORE(label) {
  dataLabel = label;
  dataPosition = 0
}
function READ() {
  var d = dataLabel[dataPosition];
  dataPosition++;
  return d
}
function CAST2INT(value) {
  if(value instanceof Array) {
    return[CAST2INT(value[0])]
  }else {
    switch(typeof value) {
      case "function":
        return 1;
      case "undefined":
        throwError("Cannot cast 'undefined'");
      case "number":
        return~~value;
      case "string":
        if(isNaN(value) || value == "") {
          return 0
        }else {
          return parseInt(value, 10)
        }
      ;
      case "boolean":
        return value ? 1 : 0;
      case "object":
        return CAST2INT(value.toString());
      default:
        throwError("Unknown type!")
    }
  }
}
function INT2STR(value) {
  if(isNaN(value) || value == "") {
    return 0
  }else {
    return parseInt(value, 10)
  }
}
function INTEGER(value) {
  return CAST2INT(value)
}
function CAST2FLOAT(value) {
  if(value instanceof Array) {
    return[CAST2FLOAT(value[0])]
  }else {
    switch(typeof value) {
      case "function":
        return 1;
      case "undefined":
        throwError("Cannot cast 'undefined'");
      case "number":
        return value;
      case "string":
        if(isNaN(value) || value == "") {
          return 0
        }else {
          return parseFloat(value)
        }
      ;
      case "boolean":
        return value ? 1 : 0;
      case "object":
        return CAST2FLOAT(value.toString());
      default:
        throwError("Unknown type!")
    }
  }
}
function FLOAT2STR(value) {
  if(isNaN(value) || value == "") {
    return 0
  }else {
    return parseFloat(value)
  }
}
function STACKTRACE_Str() {
  return stackTrace()
}
function CAST2STRING(value) {
  if(value instanceof Array) {
    return[CAST2STRING(value[0])]
  }else {
    switch(typeof value) {
      case "function":
        return"1";
      case "undefined":
        throwError("Cannot cast undefined to string");
      case "boolean":
        return value ? "1" : "0";
      case "number":
        return"" + value;
      case "string":
        return value;
      case "object":
        return value.toString();
      default:
        throwError("Unknown type")
    }
  }
}
function PUTENV(name, value) {
  localStorage.setItem(("env_" + name).toLowerCase(), value)
}
function GETENV_Str(name) {
  return localStorage.getItem(("env_" + name).toLowerCase())
}
function SLEEP(time) {
  var start = GETTIMERALL();
  while(GETTIMERALL() - start < time) {
  }
}
if(!window.localStorage) {
  Object.defineProperty(window, "localStorage", new function() {
    var aKeys = [], oStorage = {};
    Object.defineProperty(oStorage, "getItem", {value:function(sKey) {
      return sKey ? this[sKey] : null
    }, writable:false, configurable:false, enumerable:false});
    Object.defineProperty(oStorage, "key", {value:function(nKeyId) {
      return aKeys[nKeyId]
    }, writable:false, configurable:false, enumerable:false});
    Object.defineProperty(oStorage, "setItem", {value:function(sKey, sValue) {
      if(!sKey) {
        return
      }
      document.cookie = escape(sKey) + "=" + escape(sValue) + "; path=/"
    }, writable:false, configurable:false, enumerable:false});
    Object.defineProperty(oStorage, "length", {get:function() {
      return aKeys.length
    }, configurable:false, enumerable:false});
    Object.defineProperty(oStorage, "removeItem", {value:function(sKey) {
      if(!sKey) {
        return
      }
      var sExpDate = new Date;
      sExpDate.setDate(sExpDate.getDate() - 1);
      document.cookie = escape(sKey) + "=; expires=" + sExpDate.toGMTString() + "; path=/"
    }, writable:false, configurable:false, enumerable:false});
    this.get = function() {
      var iThisIndx;
      for(var sKey in oStorage) {
        iThisIndx = aKeys.indexOf(sKey);
        if(iThisIndx === -1) {
          oStorage.setItem(sKey, oStorage[sKey])
        }else {
          aKeys.splice(iThisIndx, 1)
        }
        delete oStorage[sKey]
      }
      for(;aKeys.length > 0;aKeys.splice(0, 1)) {
        oStorage.removeItem(aKeys[0])
      }
      for(var iCouple, iKey, iCouplId = 0, aCouples = document.cookie.split(/\s*;\s*/);iCouplId < aCouples.length;iCouplId++) {
        iCouple = aCouples[iCouplId].split(/\s*=\s*/);
        if(iCouple.length > 1) {
          oStorage[iKey = unescape(iCouple[0])] = unescape(iCouple[1]);
          aKeys.push(iKey)
        }
      }
      return oStorage
    };
    this.configurable = false;
    this.enumerable = true
  })
}
function NETWEBEND(url) {
  window.location = url;
  END()
}
window.requestAnimFrame = function() {
  return window.requestAnimationFrame || window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame || window.oRequestAnimationFrame || window.msRequestAnimationFrame || function(callback, element) {
    window.setTimeout(callback, 1E3 / 60)
  }
}();
function checkBrowserName(name) {
  var agent = navigator.userAgent.toLowerCase();
  if(agent.indexOf(name.toLowerCase()) > -1) {
    return true
  }
  return false
}
window.onbeforeunload = function(e) {
  e = e || window.event;
  CALLBYNAME("GLB_ON_QUIT");
  saveFileSystem()
};
function saveFileSystem() {
  if(localStorage) {
    localStorage.setItem("filesystem", fileSystem.save())
  }
}
function GLBArray() {
  this.values = [];
  this.dimensions = [0];
  this.defval = 0;
  return this
}
GLBArray.prototype.clone = function() {
  var other = new GLBArray;
  other.dimensions = this.dimensions.slice(0);
  other.defval = this.defval;
  switch(typeof this.defval) {
    case "number":
    ;
    case "string":
    ;
    case "boolean":
    ;
    case "function":
      other.values = this.values.slice(0);
      break;
    default:
      if(this.values != undefined && this.values.dimensions != undefined) {
        for(var i = 0;i < this.values.length;i++) {
          other.values[i] = tryClone(this.values[i])
        }
      }else {
        other.values = []
      }
  }
  return other
};
GLBArray.prototype.arrAccess = function() {
  tmpPositionCache = 0;
  for(var i = arguments.length - 1;i >= 0;i--) {
    if(i >= this.dimensions.length) {
      throwError("Wrong dimension count '" + (arguments.length - 1) + "' expected '" + this.dimensions.length + "'")
    }
    var position = arguments[i];
    if(position < 0) {
      position = this.dimensions[i] + position
    }
    if(position < 0 || position >= this.dimensions[i]) {
      throwError("Array index out of bounds access, position: " + dumpArray(arguments))
    }
    arrargs[i] = position
  }
  switch(arguments.length) {
    case 1:
      tmpPositionCache = arrargs[0];
      break;
    case 2:
      tmpPositionCache = arrargs[0] + arrargs[1] * this.dimensions[0];
      break;
    case 3:
      tmpPositionCache = arrargs[0] + arrargs[1] * this.dimensions[0] + arrargs[2] * this.dimensions[0] * this.dimensions[1];
      break;
    case 4:
      tmpPositionCache = arrargs[0] + arrargs[1] * this.dimensions[0] + arrargs[2] * this.dimensions[0] * this.dimensions[1] + arrargs[3] * this.dimensions[0] * this.dimensions[1] * this.dimensions[2];
      break;
    default:
      var mul = this.values.length / this.dimensions[arguments.length - 1];
      for(var i = arguments.length - 1;i >= 0;i--) {
        tmpPositionCache += arrargs[i] * mul;
        mul /= this.dimensions[i - 1]
      }
  }
  return this
};
function realArrSize(dims) {
  var realSize = 1;
  for(d in dims) {
    dims[d] = CAST2INT(dims[d]);
    realSize *= dims[d]
  }
  return realSize
}
function DIM(vari, dims, value) {
  vari.values = new Array(realArrSize(dims));
  vari.dimensions = dims;
  vari.defval = value;
  for(var i = 0;i < vari.values.length;i++) {
    vari.values[i] = tryClone(value)
  }
  return vari
}
function REDIM(vari, dims, value) {
  var oldLength = vari.values.length;
  var doDim = false, action;
  vari.dimensions = dims;
  if(vari.defval !== value) {
    doDim = true;
    if(value instanceof Array && !(vari.defval instanceof Array)) {
      action = 1
    }else {
      if(!(value instanceof Array) && vari.defval instanceof Array) {
        action = 2
      }else {
        action = 0
      }
    }
  }
  vari.defval = value;
  vari.values.length = realArrSize(dims);
  var start = oldLength;
  if(doDim) {
    start = 0
  }
  for(i = start;i < vari.values.length;i++) {
    if(vari.values[i]) {
      if(action == 1) {
        vari.values[i] = [vari.values[i]]
      }else {
        if(action == 2) {
          vari.values[i] = vari.values[i][0]
        }
      }
    }else {
      vari.values[i] = tryClone(vari.defval)
    }
  }
  return vari
}
function BOUNDS(array, dimension) {
  return array.dimensions[dimension]
}
function DIMPUSH(array, value) {
  REDIM(array, [array.values.length + 1], array.defval);
  array.values[array.values.length - 1] = tryClone(value)
}
function DIMDEL(array, position) {
  array.values.splice(position, 1);
  array.dimensions[0]--
}
function DIMDATA(array, values) {
  array.values = values;
  array.dimensions = [values.length]
}
function SEEDRND(seed) {
  randomseed = seed
}
function RND(range) {
  if(range == 0) {
    return 0
  }
  if(range < 0) {
    range = -range
  }
  return(range + 1) * random()
}
function MIN(a, b) {
  if(a < b) {
    return a
  }else {
    return b
  }
}
function MAX(a, b) {
  if(a > b) {
    return a
  }else {
    return b
  }
}
function ABS(a) {
  return Math.abs(a)
}
function SGN(a) {
  return a > 0 ? 1 : a < 0 ? -1 : 0
}
function SIN(a) {
  return Math.sin(deg2rad(a))
}
function COS(a) {
  return Math.cos(deg2rad(a))
}
function TAN(a) {
  return Math.tan(deg2rad(a))
}
function ACOS(a) {
  return Math.acos(deg2rad(a))
}
function ASIN(a) {
  return Math.asin(deg2rad(a))
}
function ASL(num, shift) {
  return num << shift
}
function ASR(num, shift) {
  return num >> shift
}
function ATAN(dy, dx) {
  return rad2deg(Math.atan2(dy, dx))
}
function bAND(a, b) {
  return a & b
}
function bOR(a, b) {
  return a | b
}
function bXOR(a, b) {
  return a ^ b
}
function bNOT(a) {
  return~a
}
function MOD(a, b) {
  return CAST2INT(a % b)
}
function FMOD(num, div) {
  return num % div
}
function FINDPATH(map, result, heu, startx, starty, endx, endy) {
  alert("TODO: findpath")
}
function LOGN(a) {
  return Math.log(a)
}
function POW(a, b) {
  return Math.pow(a, b)
}
function SQR(a) {
  return Math.sqrt(a)
}
function SWAP(a, b) {
  var tmp = a;
  a[0] = b[0];
  b[0] = tmp[0]
}
function SORTARRAY(array, cmp) {
  var cmpFunc;
  if(cmp == 0) {
    cmpFunc = function(a, b) {
      a = unref(a);
      b = unref(b);
      switch(typeof o) {
        case "undefined":
        ;
        case "function":
        ;
        case "string":
        ;
        case "boolean":
        ;
        case "number":
          return a < b ? -1 : a > b ? 1 : 0;
        default:
          throwError("TODO: Default sortarray with types!");
          return
      }
    }
  }else {
    cmpFunc = function(a, b) {
      return cmp([a], [b])
    }
  }
  array.values.sort(cmpFunc)
}
function deg2rad(val) {
  return val * (Math.PI / 180)
}
function rad2deg(val) {
  return val * (180 / Math.PI)
}
var randomseed = (new Date).getTime();
function random() {
  randomseed = (randomseed * 9301 + 49297) % 233280;
  return randomseed / 233280
}
function FORMAT_Str(numLetter, numKommas, Number) {
  var str = CAST2STRING(Number);
  var l = INSTR(str, ".");
  var r = REVINSTR(str, ".");
  for(var i = l;i < numLetter;i++) {
    str = " " + str
  }
  for(var i = r;i < numKommas;i++) {
    str = str + "0"
  }
  for(var i = numLetter;i < l;i++) {
    str = MID_Str(str, 1)
  }
  for(var i = numKommas;i < r;i++) {
    str = MID_Str(str, 0, str.length - 1)
  }
  return str
}
function ENCRYPT_Str(code, text) {
  var add = 0;
  for(i = 0;i < code.length;i++) {
    add += ASC(code, i)
  }
  add = add % 16;
  var newText = "";
  for(i = 0;i < text.length;i++) {
    newText = newText + CHR_Str(ASC(text, i) + add)
  }
  return newText
}
function DECRYPT_Str(code, text) {
  var add = 0;
  for(i = 0;i < code.length;i++) {
    add += ASC(code, i)
  }
  add = add % 16;
  var newText = "";
  for(i = 0;i < text.length;i++) {
    newText = newText + CHR_Str(ASC(text, i) - add)
  }
  return newText
}
function LCASE_Str(str) {
  return str.toLowerCase()
}
function UCASE_Str(str) {
  return str.toUpperCase()
}
function MID_Str(str, start, count) {
  try {
    if(count == -1) {
      return str.substr(start)
    }else {
      return str.substr(start, count)
    }
  }catch(ex) {
    throwError("string error (MID$): '" + str + "' start: '" + start + "' count: '" + count + "'")
  }
}
function LEFT_Str(str, count) {
  try {
    return str.substr(0, count)
  }catch(ex) {
    throwError("string error (LEFT$): '" + str + "' count: '" + count + "'")
  }
}
function RIGHT_Str(str, count) {
  try {
    return str.substr(str.length - count, count)
  }catch(ex) {
    throwError("string error (RIGHT$): '" + str + "' count: '" + count + "'")
  }
}
function INSTR(str, text, start) {
  if(start == -1) {
    return str.indexOf(text)
  }else {
    return str.indexOf(text, start)
  }
}
function REVINSTR(str, text, start) {
  if(start == -1) {
    return str.lastIndexOf(text)
  }else {
    return str.lastIndexOf(text, start)
  }
}
function CHR_Str(character) {
  return String.fromCharCode(character)
}
function REPLACE_Str(text, from, to) {
  var i = 0;
  for(;;) {
    i = text.indexOf(from, i);
    if(i == -1) {
      return text
    }
    text = text.substring(0, i) + to + text.substring(i + from.length);
    i += to.length
  }
  return text
}
function TRIM_Str(text, repl) {
  return LTRIM_Str(RTRIM_Str(text, repl), repl)
}
function LTRIM_Str(text, repl) {
  for(i = 0;i < text.length;i++) {
    var c = text.charAt(i);
    if(repl.indexOf(c) == -1) {
      return text.substr(i)
    }
  }
  return""
}
function RTRIM_Str(text, repl) {
  for(i = text.length - 1;i >= 0;i--) {
    var c = text.charAt(i);
    if(repl.indexOf(c) == -1) {
      return text.substr(0, i + 1)
    }
  }
  return""
}
function ASC(text, index) {
  try {
    return text.charCodeAt(index)
  }catch(ex) {
    throwError("string error (ASC): '" + text + "' index: '" + index + "'")
  }
}
function SPLITSTR(text, array, split, dropEmpty) {
  try {
    var last = 0;
    REDIM(array, [0], array.defval);
    for(var i = 0;i <= text.length;i++) {
      var c = text.charAt(i);
      if(split.indexOf(c) != -1 || i == text.length) {
        var t = MID_Str(text, last, i - last);
        if(t != "" || !dropEmpty) {
          if(array.defval instanceof Array) {
            DIMPUSH(array, [t])
          }else {
            DIMPUSH(array, t)
          }
        }
        last = i + 1
      }
    }
    return split.length
  }catch(ex) {
    throwError("string error (SPLITSTR): '" + str + "' split: '" + split + "' dropEmpty: " + dropEmpty)
  }
}
function URLENCODE_Str(url) {
  return encodeURI(url)
}
function URLDECODE_Str(url) {
  return decodeURI(url)
}
function createXMLHttpRequest() {
  try {
    return new XMLHttpRequest
  }catch(e) {
  }
  try {
    return new ActiveXObject("Msxml2.XMLHTTP")
  }catch(e) {
  }
  throwError("XMLHttpRequest not supported");
  return null
}
function loadText(text) {
  var load = createXMLHttpRequest();
  if(text.charAt(0) == "/") {
    text = text.substring(1)
  }
  load.open("get", text, false);
  load.requestType = "text";
  load.send(null);
  return load.responseText
}
var fileSystem = new VirtualFileSystem(localStorage ? localStorage.getItem("filesystem") : "");
var staticFileSystem = new VirtualFileSystem;
var text = loadText("DIR_STRUCTURE");
if(text == null) {
  throwError("Cannot load dir structure!")
}else {
  var lines = text.split("\n");
  for(var pos = 0;pos < lines.length;pos++) {
    var line = lines[pos];
    if(line.indexOf(":") != -1) {
      var command = line.substring(0, line.indexOf(":"));
      var param = line.substring(line.indexOf(":") + 1);
      switch(command) {
        case "var":
          if(param.indexOf("=") != -1) {
            var name = param.substring(0, param.indexOf("="));
            var value = param.substring(param.indexOf("=") + 1);
            if(typeof isInWebWorker == "undefined") {
              window[name] = value
            }else {
              eval(name + " = '" + value + "'")
            }
          }else {
            throwError("Expecting '='")
          }
          break;
        case "folder":
          fileSystem.createDir(param);
          staticFileSystem.createDir(param);
          break;
        case "static":
          staticFileSystem.createFile(param, []);
          break;
        case "editable":
          staticFileSystem.createFile(param, function(file) {
            var text = loadText(file.path + ".GLBSCRIPT_DATA");
            file.data = text.split(",");
            return file.data
          });
          break;
        default:
          throwError("Unknown command '" + command + "'")
      }
    }
  }
}
var channels = [];
function GENFILE() {
  for(var i = 0;i < channels.length;i++) {
    if(!channels[i]) {
      return i
    }
  }
  return channels.length
}
function rawpath(path, dir) {
  path = (TRIM_Str(dir.getFileSystem().getCurrentDir(), " ") + TRIM_Str(path, " ")).toLowerCase();
  var last = 0;
  var curDir = dir;
  for(var i = 0;i < path.length;i++) {
    switch(path.charAt(i)) {
      case "/":
        if(i > 0) {
          var name = path.substr(last, i - last);
          curDir = curDir.getSubDir(name);
          last = i + 1
        }else {
          last = 1
        }
        break;
      case ".":
        var nextSymbol = function() {
          i++;
          return i < path.length
        };
        if(!nextSymbol()) {
          break
        }
        if(path.charAt(i) == ".") {
          curDir = curDir.getParent();
          if(!nextSymbol()) {
            break
          }
          if(path.charAt(i) != "/") {
            throwError("Expecting '/'")
          }
          last = i + 1
        }else {
          if(path.charAt(i) == "/") {
            last = i + 1
          }
        }
        break
    }
  }
  return new FilePointer(path.substr(last, path.length - last), curDir)
}
function FilePointer(name, dir) {
  this.name = name;
  this.dir = dir
}
function VirtualFileSystem(text) {
  this.mainDir = new VirtualDirectory("", null, this);
  this.curDir = "";
  this.copyFile = function(from, to) {
    if(this.doesFileExist(form)) {
      var data = this.getFile(from).getData();
      this.createFile(to, data)
    }
  };
  this.getCurrentDir = function() {
    return this.curDir
  };
  this.setCurrentDir = function(dir) {
    if(RIGHT_Str(dir, 1) != "/") {
      dir += "/"
    }
    this.curDir = dir
  };
  this.getFile = function(file) {
    var d = rawpath(file, this.mainDir);
    return d.dir.getFile(d.name)
  };
  this.getDir = function(dir) {
    var d = rawpath(dir, this.mainDir);
    return d.dir
  };
  this.doesFileExist = function(file) {
    try {
      var d = rawpath(file, this.mainDir);
      return d.dir.doesFileExist(d.name)
    }catch(ex) {
    }
    return false
  };
  this.doesDirExist = function(dir) {
    try {
      var d = rawpath(dir, this.mainDir);
      return d.dir.doesDirExist(d.name)
    }catch(ex) {
    }
    return false
  };
  this.removeFile = function(file) {
    var d = rawpath(file, this.mainDir);
    d.dir.removeFile(d.name)
  };
  this.removeDir = function(path) {
    var d = rawpath(path, this.mainDir);
    d.dir.removePath(d.name)
  };
  this.createFile = function(file, data) {
    if(!this.doesFileExist(file)) {
      var d = rawpath(file, this.mainDir);
      return d.dir.createFile(file, d.name, data)
    }else {
      var f = this.getFile(file);
      f.data = data;
      return f
    }
  };
  this.createDir = function(dir) {
    if(!this.doesDirExist(dir)) {
      var d = rawpath(dir, this.mainDir);
      return d.dir.createDir(d.name)
    }else {
      return this.getDir(dir)
    }
  };
  this["cD"] = this.createDir;
  this["cF"] = this.createFile;
  this.getMainDir = function() {
    return this.mainDir
  };
  this.save = function() {
    return this.mainDir.save()
  };
  if(text != undefined) {
    window["filesystem"] = this;
    eval(REPLACE_Str(text, "t.", "window.filesystem."))
  }
}
function VirtualDirectory(name, parent, system) {
  this.name = name;
  this.parent = parent;
  this.subDirs = [];
  this.files = [];
  this.fileSystem = system;
  this.getList = function() {
    return this.subDirs.concat(this.files)
  };
  this.getFileSystem = function() {
    return this.fileSystem
  };
  this.doesDirExist = function(dir) {
    for(var i = 0;i < this.subDirs.length;i++) {
      if(this.subDirs[i].name == dir) {
        return true
      }
    }
    return false
  };
  this.doesFileExist = function(file) {
    for(var i = 0;i < this.files.length;i++) {
      if(this.files[i].name == file) {
        return true
      }
    }
    return false
  };
  this.removeFile = function(file) {
    for(var i = 0;i < this.files.length;i++) {
      if(this.files[i].name == file) {
        this.files.splice(i, 1);
        return
      }
    }
    throwError("FileNotFound " + file)
  };
  this.removeDir = function(file) {
    for(var i = 0;i < this.subDirs.length;i++) {
      if(this.subDirs[i].name == file) {
        this.subDirs.splice(i, 1);
        return
      }
    }
    throwError("DirNotFound " + file)
  };
  this.createDir = function(name) {
    var d = new VirtualDirectory(name, this, this.fileSystem);
    this.subDirs.push(d);
    return d
  };
  this.createFile = function(path, name, data) {
    var f = new VirtualFile(this, name, data, path);
    this.files.push(f);
    return f
  };
  this.getFile = function(name) {
    for(var i = 0;i < this.files.length;i++) {
      if(this.files[i].name == name) {
        return this.files[i]
      }
    }
    throwError("file not found")
  };
  this.getDir = function(name) {
    for(var i = 0;i < this.subDirs.length;i++) {
      if(this.subDirs[i].name == name) {
        return this.subDirs[i]
      }
    }
    throwError("Dir not found")
  };
  this.getSubDir = function(name) {
    for(var i = 0;i < this.subDirs.length;i++) {
      if(this.subDirs[i].name == name) {
        return this.subDirs[i]
      }
    }
    throwError("Dir not found: " + name)
  };
  this.getParent = function() {
    return this.parent
  };
  this.getPath = function() {
    return(!!this.getParent() ? this.getParent().getPath() + "/" : "") + this.name
  };
  this.save = function() {
    var text = "";
    if(this.getParent() != null) {
      text = 't.cD("' + this.getPath() + '");\n'
    }
    for(var i = 0;i < this.files.length;i++) {
      text += this.files[i].save()
    }
    for(var i = 0;i < this.subDirs.length;i++) {
      text += this.subDirs[i].save()
    }
    return text
  }
}
function VirtualFile(dir, name, data, path) {
  this.name = name;
  this.data = data;
  this.dir = dir;
  this.path = path;
  this.getName = function() {
    return this.name
  };
  this.getData = function() {
    if(typeof this.data == "function") {
      return this.data(this)
    }else {
      return this.data
    }
  };
  this.save = function() {
    return't.cF("' + this.dir.getPath() + "/" + this.name + '", ' + JSON.stringify(this.getData()) + ");\n"
  }
}
function Channel(channel, file, mode) {
  this.channel = channel;
  this.mode = mode;
  this.ptr = 0;
  file = file.toLowerCase();
  if(fileSystem.doesFileExist(file)) {
    this.file = fileSystem.getFile(file)
  }else {
    if(staticFileSystem.doesFileExist(file)) {
      if(mode == 1) {
        this.file = staticFileSystem.getFile(file)
      }else {
        var tmp = staticFileSystem.getFile(file);
        this.file = fileSystem.createFile(file, tmp.getData())
      }
    }else {
      if(mode != 1) {
        try {
          this.file = fileSystem.createFile(file, [])
        }catch(ex) {
          throwError("cannot create file: " + file)
        }
      }else {
        throwError("file not found: " + file)
      }
    }
  }
  if(mode == -1) {
    this.ptr = this.file.getData().length
  }
  this.updateSize = function() {
    if(this.ptr > this.file.getData().length) {
      this.file.getData().length = this.ptr
    }
  };
  this.checkPosition = function() {
    if(this.ptr > this.file.getData().length) {
      throwError("Reached end of file: '" + this.ptr + "' filesize: '" + this.file.getData().length + "'")
    }
  };
  this.ENDOFFILE = function() {
    return this.ptr >= this.file.getData().length || this.ptr < 0
  };
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
        break
    }
    if(this.ENDOFFILE()) {
      this.ptr = this.file.getData().length
    }
  };
  this.READLINE = function() {
    var line = "";
    var character = "";
    while((character = String.fromCharCode(this.file.getData()[this.ptr])) != "\n" && this.ptr < this.file.getData().length) {
      line = line + character;
      this.ptr++
    }
    this.checkPosition();
    this.ptr++;
    if(line.substr(line.length - 1, 1) == "\r") {
      line = line.substr(0, line.length - 1)
    }
    return line
  };
  this.READBYTE = function() {
    this.ptr++;
    var tmp = new Int8Array(1);
    tmp[0] = this.file.getData()[this.ptr - 1];
    this.checkPosition();
    return tmp[0]
  };
  this.READUBYTE = function() {
    this.ptr++;
    var tmp = new Uint8Array(1);
    tmp[0] = this.file.getData()[this.ptr - 1];
    this.checkPosition();
    return tmp[0]
  };
  this.READWORD = function() {
    this.ptr += 2;
    var buf = new ArrayBuffer(2);
    var view8 = new Uint8Array(buf);
    view8[0] = this.file.getData()[this.ptr - 2];
    view8[1] = this.file.getData()[this.ptr - 1];
    var tmp = new Int16Array(buf);
    this.checkPosition();
    return tmp[0]
  };
  this.READUWORD = function() {
    this.ptr += 2;
    var buf = new ArrayBuffer(2);
    var view8 = new Uint8Array(buf);
    view8[0] = this.file.getData()[this.ptr - 2];
    view8[1] = this.file.getData()[this.ptr - 1];
    var tmp = new Uint16Array(buf);
    this.checkPosition();
    return tmp[0]
  };
  this.READLONG = function() {
    this.ptr += 4;
    var buf = new ArrayBuffer(4);
    var view8 = new Uint8Array(buf);
    view8[0] = this.file.getData()[this.ptr - 4];
    view8[1] = this.file.getData()[this.ptr - 3];
    view8[2] = this.file.getData()[this.ptr - 2];
    view8[3] = this.file.getData()[this.ptr - 1];
    var tmp = new Int32Array(buf);
    this.checkPosition();
    return tmp[0]
  };
  this.READULONG = function() {
    this.ptr += 4;
    var buf = new ArrayBuffer(4);
    var view8 = new Uint8Array(buf);
    view8[0] = this.file.getData()[this.ptr - 4];
    view8[1] = this.file.getData()[this.ptr - 3];
    view8[2] = this.file.getData()[this.ptr - 2];
    view8[3] = this.file.getData()[this.ptr - 1];
    var tmp = new Uint32Array(buf);
    this.checkPosition();
    return tmp[0]
  };
  this.READIEEE = function() {
    this.ptr += 8;
    var buf = new ArrayBuffer(8);
    var view8 = new Uint8Array(buf);
    view8[0] = this.file.getData()[this.ptr - 8];
    view8[1] = this.file.getData()[this.ptr - 7];
    view8[2] = this.file.getData()[this.ptr - 6];
    view8[3] = this.file.getData()[this.ptr - 5];
    view8[4] = this.file.getData()[this.ptr - 4];
    view8[5] = this.file.getData()[this.ptr - 3];
    view8[6] = this.file.getData()[this.ptr - 2];
    view8[7] = this.file.getData()[this.ptr - 1];
    var tmp = new Float64Array(buf);
    this.checkPosition();
    return tmp[0]
  };
  this.READSHORTIEEE = function() {
    this.ptr += 4;
    var buf = new ArrayBuffer(4);
    var view8 = new Uint8Array(buf);
    view8[0] = this.file.getData()[this.ptr - 4];
    view8[1] = this.file.getData()[this.ptr - 3];
    view8[2] = this.file.getData()[this.ptr - 2];
    view8[3] = this.file.getData()[this.ptr - 1];
    var tmp = new Float32Array(buf);
    this.checkPosition();
    return tmp[0]
  };
  this.READSTR = function(count) {
    var text = "";
    for(var i = 0;i < count;i++) {
      text += CHR_Str(this.READUBYTE())
    }
    return text
  };
  this.WRITEBYTE = function(data) {
    var tmp = new Int8Array(1);
    tmp[0] = data;
    this.file.getData()[this.ptr] = tmp[0];
    this.ptr++;
    this.updateSize()
  };
  this.WRITEUBYTE = function(data) {
    var tmp = new Uint8Array(1);
    tmp[0] = data;
    this.file.getData()[this.ptr] = tmp[0];
    this.ptr++;
    this.updateSize()
  };
  this.WRITEWORD = function(data) {
    var buffer = new ArrayBuffer(2);
    var wordView = new Int16Array(buffer);
    wordView[0] = data;
    var byteView = new Uint8Array(buffer);
    for(var i = 0;i < byteView.length;i++) {
      this.WRITEUBYTE(byteView[i])
    }
    this.updateSize()
  };
  this.WRITEUWORD = function(data) {
    var buffer = new ArrayBuffer(2);
    var wordView = new Uint16Array(buffer);
    wordView[0] = data;
    var byteView = new Uint8Array(buffer);
    for(var i = 0;i < byteView.length;i++) {
      this.WRITEUBYTE(byteView[i])
    }
    this.updateSize()
  };
  this.WRITELONG = function(data) {
    var buffer = new ArrayBuffer(4);
    var longView = new Int32Array(buffer);
    longView[0] = data;
    var byteView = new Uint8Array(buffer);
    for(var i = 0;i < byteView.length;i++) {
      this.WRITEUBYTE(byteView[i])
    }
    this.updateSize()
  };
  this.WRITEULONG = function(data) {
    var buffer = new ArrayBuffer(4);
    var longView = new Uint32Array(buffer);
    longView[0] = data;
    var byteView = new Uint8Array(buffer);
    for(var i = 0;i < byteView.length;i++) {
      this.WRITEUBYTE(byteView[i])
    }
    this.updateSize()
  };
  this.WRITEIEEE = function(data) {
    var buffer = new ArrayBuffer(8);
    var floatView = new Float64Array(buffer);
    floatView[0] = data;
    var byteView = new Uint8Array(buffer);
    for(var i = 0;i < byteView.length;i++) {
      this.WRITEUBYTE(byteView[i])
    }
    this.updateSize()
  };
  this.WRITESHORTIEEE = function(data) {
    var buffer = new ArrayBuffer(4);
    var floatView = new Float32Array(buffer);
    floatView[0] = data;
    var byteView = new Uint8Array(buffer);
    for(var i = 0;i < byteView.length;i++) {
      this.WRITEUBYTE(byteView[i])
    }
    this.updateSize()
  };
  this.WRITESTR = function(data) {
    for(var i = 0;i < data.length;i++) {
      this.WRITEUBYTE(ASC(data, i))
    }
    this.updateSize()
  };
  this.WRITELINE = function(data) {
    this.WRITESTR(data + "\r\n")
  }
}
function OPENFILE(channel, file, mode) {
  try {
    channels[channel] = new Channel(channel, file, mode);
    if(channel >= channels.length) {
      channels.length = channel + 1
    }
    return 1
  }catch(ex) {
    return 0
  }
}
function getChannel(chn) {
  if(!channels[chn]) {
    throwError("Cannot find channel: " + chn)
  }
  return channels[chn]
}
function ENDOFFILE(channel) {
  return getChannel(channel).ENDOFFILE() ? 1 : 0
}
function FILEPOSITION(channel) {
  return getChannel(channel).ptr
}
function FILESEEK(channel, bytes, dir) {
  getChannel(channel).FILESEEK(bytes, dir)
}
function KILLFILE(file) {
  try {
    if(fileSystem.doesDirExist(file)) {
      fileSystem.removeDir(file)
    }else {
      if(fileSystem.doesFileExist(file)) {
        fileSystem.removeFile(file)
      }
    }
  }catch(ex) {
  }
  try {
    if(staticFileSystem.doesDirExist(file)) {
      staticFileSystem.removeDir(file)
    }else {
      if(staticFileSystem.doesFileExist(file)) {
        staticFileSystem.removeFile(file)
      }
    }
  }catch(ex) {
  }
}
function CLOSEFILE(channel) {
  channels[channel] = null;
  saveFileSystem()
}
function READUBYTE(channel, b) {
  b[0] = getChannel(channel).READUBYTE()
}
function READBYTE(channel, b) {
  b[0] = getChannel(channel).READBYTE()
}
function READWORD(channel, b) {
  b[0] = getChannel(channel).READWORD()
}
function READUWORD(channel, b) {
  b[0] = getChannel(channel).READUWORD()
}
function READLONG(channel, b) {
  b[0] = getChannel(channel).READLONG()
}
function READULONG(channel, b) {
  b[0] = getChannel(channel).READULONG()
}
function READSHORTIEEE(channel, b) {
  b[0] = getChannel(channel).READSHORTIEEE()
}
function READIEEE(channel, b) {
  b[0] = getChannel(channel).READIEEE()
}
function READLINE(channel, line) {
  line[0] = getChannel(channel).READLINE()
}
function READSTR(channel, str, count) {
  str[0] = getChannel(channel).READSTR(count)
}
function WRITEUBYTE(channel, data) {
  getChannel(channel).WRITEUBYTE(data)
}
function WRITEBYTE(channel, data) {
  getChannel(channel).WRITEBYTE(data)
}
function WRITEWORD(channel, data) {
  getChannel(channel).WRITEWORD(data)
}
function WRITEUWORD(channel, data) {
  getChannel(channel).WRITEUWORD(data)
}
function WRITELONG(channel, data) {
  getChannel(channel).WRITELONG(data)
}
function WRITEULONG(channel, data) {
  getChannel(channel).WRITEULONG(data)
}
function WRITESHORTIEEE(channel, data) {
  getChannel(channel).WRITESHORTIEEE(data)
}
function WRITEIEEE(channel, data) {
  getChannel(channel).WRITEIEEE(data)
}
function WRITELINE(channel, data) {
  getChannel(channel).WRITELINE(data)
}
function WRITESTR(channel, data) {
  getChannel(channel).WRITESTR(data)
}
function SETSHOEBOX(data, media) {
}
function GETCOMMANDLINE_Str() {
  var c = window.location.href;
  var l = INSTR(c, "?");
  if(l == -1) {
    return""
  }
  return REPLACE_Str(MID_Str(c, l + 1), "&", " ")
}
function GETCURRENTDIR_Str() {
  return fileSystem.getCurrentDir()
}
function SETCURRENTDIR(dir) {
  if(dir == "") {
    return
  }
  var tmpDir = rawpath(dir, fileSystem.getMainDir());
  dir = tmpDir.dir.getPath() + dir;
  var fs1 = false, fs2 = false;
  try {
    fileSystem.setCurrentDir(dir);
    fs1 = true
  }catch(ex) {
  }
  try {
    staticFileSystem.setCurrentDir(dir);
    fs2 = true
  }catch(ex) {
  }
  return fs1 && fs2 ? 1 : 0
}
function DOESFILEEXIST(file) {
  return fileSystem.doesFileExist(file) || staticFileSystem.doesFileExist(file) ? 1 : 0
}
function DOESDIREXIST(dir) {
  return fileSystem.doesDirExist(dir) || staticFileSystem.doesDirExist(dir) ? 1 : 0
}
function GETFILESIZE(file) {
  try {
    var f = null;
    if(fileSystem.doesFileExist(file)) {
      f = fileSystem.getFile(file)
    }else {
      if(staticFileSystem.doesFileExist(file)) {
        f = staticFileSystem.getFile(file)
      }else {
        throwError("Cannot find file: " + file)
      }
    }
    if(!!f) {
      return f.getData().length
    }
  }catch(ex) {
  }
  return 0
}
function GETFILELIST(find, files) {
  try {
    REDIM(files, [0], files.defval);
    var doesMatch = function(name) {
      var i = 0, j = 0;
      for(var j = 0;j <= find.length;j++) {
        var c = find.charAt(j);
        switch(c) {
          case "*":
            j++;
            var endTok = find.charAt(j);
            j--;
            while(name.charAt(i) != endTok && i < name.length) {
              i++
            }
            break;
          case "?":
            i++;
            break;
          default:
            if(c != name.charAt(i)) {
              return false
            }
            i++
        }
      }
      return true
    };
    var data = fileSystem.getDir("").getList().concat(staticFileSystem.getDir("").getList());
    var numDir = 0, numFile = 0;
    var output = [];
    output.push(".");
    output.push("..");
    for(var i = 0;i < data.length;i++) {
      var o = data[i];
      if(doesMatch(o.name)) {
        if(o instanceof VirtualDirectory) {
          numDir++
        }else {
          if(o instanceof VirtualFile) {
            numFile++
          }else {
            throwError("Unknown file type")
          }
        }
        output.push(o.name)
      }
    }
    for(var i = 0;i < output.length;i++) {
      if(files.defval instanceof Array) {
        DIMPUSH(files, [output[i]])
      }else {
        DIMPUSH(files, output[i])
      }
    }
    return numDir * 4096 + numFile
  }catch(ex) {
    throwError("GETFILELIST error: find: '" + find + "'")
  }
}
function COPYFILE(source, dest) {
  fileSystem.copyFile(source, dest);
  staticFileSystem.copyFile(source, dest)
}
function CREATEDIR(dir) {
  try {
    fileSystem.createDir(dir);
    staticFileSystem.createDir(dir);
    return 1
  }catch(ex) {
  }
  return 0
}
function INI(file) {
  this.parse = function(text) {
    try {
      var lines = text.replace("\r").split("\n");
      var cat = "";
      for(var i = 0;i < lines.length;i++) {
        var l = lines[i];
        if(INSTR(l, ";") != -1) {
          l = MID_Str(l, 0, INSTR(l, ";"))
        }
        if(MID_Str(l, 0, 1) == "[") {
          cat = MID_Str(l, 1, REVINSTR(l, "]") - 1)
        }else {
          if(INSTR(l, "=") != -1) {
            var k = MID_Str(l, 0, INSTR(l, "="));
            var v = MID_Str(l, INSTR(l, "=") + 1);
            INIPUT(cat, k, v)
          }
        }
      }
    }catch(ex) {
      throwError("INI parse error: '" + text * "'")
    }
  };
  this.put = function(cat, key, value) {
    try {
      cat = cat.toLowerCase();
      var c;
      for(var i = 0;i < this.cats.length;i++) {
        if(this.cats[i].name == cat) {
          c = this.cats[i];
          if(key == "" && value == "") {
            this.cats.splice(i, 1);
            return
          }
          break
        }
      }
      if(!c) {
        c = new INICat(cat);
        this.cats.push(c)
      }
      c.put(key, value)
    }catch(ex) {
      throwError("INIPUT error cat: '" + cat + "' key: '" + key + "' value: '" + value + "'")
    }
  };
  this.get = function(cat, key) {
    try {
      cat = cat.toLowerCase();
      var c;
      for(var i = 0;i < this.cats.length;i++) {
        if(this.cats[i].name == cat) {
          c = this.cats[i];
          break
        }
      }
      if(!c) {
        c = new INICat(cat)
      }
      return c.get(key)
    }catch(ex) {
      throwError("INIGET error cat: '" + cat + "' key: '" + key + "'")
    }
  };
  this.save = function() {
    var text = "";
    for(var i = 0;i < this.cats.length;i++) {
      text += "[" + this.cats[i].name + "]\n";
      text += this.cats[i].save()
    }
    return text
  };
  this.cats = [];
  this.channel = 1337 * 2;
  try {
    OPENFILE(this.channel, file, 0);
    var size = GETFILESIZE(file);
    if(size > 0) {
      var text = [""];
      READSTR(this.channel, text, size);
      var o = curIni;
      curIni = this;
      this.parse(text[0]);
      curIni = o
    }
  }catch(ex) {
    throwError("INI load error: '" + file + "'")
  }
}
function INICat(name) {
  this.name = name;
  this.keys = [];
  this.put = function(key, value) {
    key = key.toLowerCase();
    var kv;
    for(var i = 0;i < this.keys.length;i++) {
      if(this.keys[i].key == key) {
        kv = this.keys[i];
        if(value == "") {
          this.keys.splice(i, 1);
          return
        }
        break
      }
    }
    if(!kv) {
      kv = new INIKeyValue(key, value);
      this.keys.push(kv)
    }
  };
  this.get = function(key) {
    key = key.toLowerCase();
    var kv;
    for(var i = 0;i < this.keys.length;i++) {
      if(this.keys[i].key == key) {
        kv = this.keys[i];
        break
      }
    }
    if(!kv) {
      kv = new INIKeyValue(key, "");
      this.keys.push(kv)
    }
    return kv.value
  };
  this.save = function() {
    var text = "";
    for(var i = 0;i < this.keys.length;i++) {
      text += this.keys[i].key + "=" + this.keys[i].value + "\n"
    }
    return text
  }
}
function INIKeyValue(key, value) {
  this.key = key;
  this.value = value
}
var curIni = null;
function INIOPEN(file) {
  if(!!curIni) {
    var text = curIni.save();
    WRITESTR(curIni.channel, text);
    CLOSEFILE(curIni.channel)
  }
  if(file == "") {
    curIni = null
  }else {
    curIni = new INI(file)
  }
}
function INIPUT(cat, name, key) {
  if(!!curIni) {
    curIni.put(cat, name, key)
  }
}
function INIGET_Str(cat, name) {
  if(!!curIni) {
    return curIni.get(cat, name)
  }
}
if(typeof preInitFuncs == "undefined") {
  preInitFuncs = []
}
preInitFuncs.push(function() {
  if(viewMode == "2d" || typeof inEditorPreview != "undefined") {
    if(typeof window == "undefined") {
      window = {}
    }
    window.onload = function(e) {
      if(typeof GFX_WIDTH == "undefined") {
        window["GFX_WIDTH"] = 640
      }
      if(typeof GFX_HEIGHT == "undefined") {
        window["GFX_HEIGHT"] = 480
      }
      var c = document.createElement("canvas");
      c.width = GFX_WIDTH;
      c.height = GFX_HEIGHT;
      c.id = "GLBCANVAS";
      document.body.appendChild(c);
      init2D("GLBCANVAS")
    }
  }
});
var sprites = [];
var screens = [];
var waitload = 0;
var curScreen = null;
var context = null;
var canvas = null;
var clrColor = RGB(0, 0, 0);
var keyInput = [];
var fontbuffer = null;
var backbuffer = null;
var initCalled = false;
var lastShwscrn = 0;
var showFPS = -1;
var framePrev = 0;
var frameDelay = 0;
var canvasWidth, canvasHeight;
var background = null;
var loopFunc = null;
var loops = [];
var usedSoundformat = "ogg";
var hibernate = false;
var transCol = null;
var setBmp = null;
var currentMouse = 0;
var metrics = null;
var noSound = false;
var anyKeyPress = false;
var anyMousePress = false;
var globalSpeedX, globalSpeedY;
var touches = [];
var touchable = document ? "createTouch" in document : false;
var doCurrentFunction = function() {
  if(!waitload) {
    loopFunc()
  }else {
    if(GLB_ON_LOADING) {
      GLB_ON_LOADING()
    }
  }
  if(inPoly) {
    ENDPOLY()
  }
  if(inViewport) {
    context.restore();
    inViewport = false
  }
};
function update2D() {
  try {
    if(!initCalled) {
      initCalled = true;
      main()
    }else {
      if(setBmp) {
        setBmp();
        setBmp = null
      }
      updateTouches();
      if(hibernate) {
        if(ANYMOUSE() || ANYKEY() || globalSpeedX || globalSpeedY) {
          hibernate = false
        }
      }else {
        canvasWidth = canvas.width;
        canvasHeight = canvas.height;
        if(showFPS == -1) {
          doCurrentFunction()
        }else {
          var frameStart = GETTIMERALL();
          var frameDelta = frameStart - framePrev;
          if(frameDelta >= frameDelay) {
            doCurrentFunction();
            frameDelay = showFPS;
            if(frameDelta > frameDelay) {
              frameDelay = frameDelay - (frameDelta - frameDelay)
            }
            framePrev = frameStart
          }
        }
      }
      anyKeyPress = false
    }
    window.requestAnimFrame(update2D, frontbuffer.canvas)
  }catch(ex) {
    if(!(ex instanceof GLBExitException)) {
      alert(formatError(ex))
    }
  }
}
function domExceptionError(ex) {
  if(ex instanceof DOMException) {
    if(ex.code == 18) {
      throwError("Cannot access to ressource (maybe pixel data?). If you use Chrome, please run in localhost or use another browser!")
    }else {
      throwError("Unknown DOM error :(")
    }
  }else {
    throw ex;
  }
}
function PUSHLOOP(loop) {
  var f = eval("window['" + loop + "']");
  if(f == undefined) {
    loopFunc = function() {
      throwError("Call to undefined loop!")
    };
    throwError("Cannot push undefined loop: '" + loop + "'")
  }
  loopFunc = f;
  loops.push([f, loop])
}
function POPLOOP() {
  loops.pop();
  if(loops.length == 0) {
    throwError("Cannot pop loop, because loop stack is empty!")
  }
  var f = loops[loops.length - 1];
  loopFunc = f[0]
}
function GETCURRENTLOOP_Str() {
  var f = loops[loops.length - 1];
  return f[1]
}
function RETURNTOLOOP(loop) {
  var f = eval("window." + loop);
  if(f == undefined) {
    throwError("Cannot return to undefined loop: '" + loop + "'")
  }
  while(GETCURRENTLOOP_Str() != loop) {
    POPLOOP()
  }
}
function X_MAKE2D() {
}
function SHOWSCREEN() {
  lastShwscrn = GETTIMERALL();
  if(initCalled) {
    USESCREEN(-2);
    CLEARSCREEN(clrColor);
    USESCREEN(-1);
    frontbuffer.context.drawImage(backbuffer.canvas, 0, 0);
    CLEARSCREEN(clrColor);
    if(!!background) {
      backbuffer.context.drawImage(background, 0, 0)
    }
  }
}
function init2D(canvasName) {
  var myAudio = document.createElement("audio");
  var canPlayMp3 = false, canPlayOgg = false;
  if(myAudio.canPlayType) {
    canPlayMp3 = !!myAudio.canPlayType && "" != myAudio.canPlayType("audio/mpeg");
    if(canPlayMp3 == "maybe" || canPlayMp3 == "probably" || canPlayMp3 == true) {
      canPlayMp3 = true
    }else {
      canPlayMp3 = false
    }
    canPlayOgg = !!myAudio.canPlayType && "" != myAudio.canPlayType('audio/ogg; codecs="vorbis"');
    if(canPlayOgg == "maybe" || canPlayOgg == "probably" || canPlayOgg == true) {
      canPlayOgg = true
    }else {
      canPlayOgg = false
    }
  }
  if(!canPlayOgg && !canPlayMp3) {
    noSound = true;
    console.log("No sound playback possible!")
  }
  if(canPlayOgg) {
    usedSoundFormat = "ogg"
  }else {
    usedSoundFormat = "mp3"
  }
  frontbuffer = new Screen(document.getElementById(canvasName), -2);
  register(frontbuffer);
  var cnvs = document.createElement("canvas");
  cnvs.width = frontbuffer.canvas.width;
  cnvs.height = frontbuffer.canvas.height;
  backbuffer = new Screen(cnvs, -1);
  register(backbuffer);
  if(typeof GLB_ON_LOADING == "undefined") {
    GLB_ON_LOADING = null
  }
  USESCREEN(-2);
  if(!context) {
    throwError("Canvas unsupported, please use a newer browser.");
    END()
  }
  function finishEvent(e) {
    if(e.stopPropagation) {
      e.stopPropagation();
      e.preventDefault()
    }else {
      e.cancelBubble = true;
      e.returnValue = false
    }
  }
  canvas.oncontextmenu = function() {
    return false
  };
  touches.push(new Touch);
  if(!touchable) {
    canvas.onmousemove = function(ev) {
      if(!ev) {
        ev = window.event()
      }
      touches[0].x = ev.clientX - canvas.offsetLeft;
      touches[0].y = ev.clientY - canvas.offsetTop
    };
    canvas.onmousedown = function(e) {
      if(!e) {
        e = window.event()
      }
      switch(e.button) {
        case 0:
          touches[0].left = true;
          break;
        case 1:
          touches[0].middle = true;
          break;
        case 2:
          touches[0].right = true;
          break
      }
      finishEvent(e)
    };
    canvas.onmouseup = function(e) {
      if(!e) {
        e = window.event()
      }
      switch(e.button) {
        case 0:
          touches[0].left = false;
          break;
        case 1:
          touches[0].middle = false;
          break;
        case 2:
          touches[0].right = false;
          break
      }
      finishEvent(e)
    };
    canvas.onmouseout = function(e) {
      if(!e) {
        e = window.event()
      }
      touches[0].left = false;
      touches[0].right = false;
      touches[0].middle = false;
      finishEvent(e)
    };
    wheel = function(ev) {
      var delta = 0;
      if(!ev) {
        ev = window.event
      }
      if(ev.wheelDelta) {
        delta = ev.wheelDelta / 120;
        if(window.opera) {
          delta = -delta
        }
      }else {
        if(ev.detail) {
          delta = -ev.detail / 3
        }
      }
      touches[0].wheel = delta > 0 ? 1 : delta < 0 ? -1 : 0;
      if(ev.preventDefault) {
        ev.preventDefault()
      }
      ev.returnValue = false;
      finishEvent(ev)
    };
    if(window.addEventListener) {
      window.addEventListener("DOMMouseScroll", wheel, false)
    }
    window.onmousewheel = document.onmousewheel = wheel
  }else {
    canvas.addEventListener("touchmove", function(event) {
      updateTouches(event.touches, "move");
      finishEvent(event)
    }, false);
    canvas.addEventListener("touchstart", function(event) {
      updateTouches(event.touches, "start");
      finishEvent(event)
    }, false);
    canvas.addEventListener("touchend", function(event) {
      updateTouches(event.changedTouches, "end");
      finishEvent(event)
    }, false)
  }
  document.onkeydown = canvas.onkeydown = function(ev) {
    if(!ev) {
      ev = window.event()
    }
    keyInput[ev.keyCode] = true;
    anyKeyPress = true;
    finishEvent(ev)
  };
  document.onkeyup = canvas.onkeyup = function(ev) {
    if(!ev) {
      ev = window.event()
    }
    keyInput[ev.keyCode] = false;
    finishEvent(ev)
  };
  USESCREEN(-1);
  CLEARSCREEN(RGB(0, 0, 0));
  SHOWSCREEN();
  try {
    if(window["GLB_ON_LOOP"]) {
      PUSHLOOP("GLB_ON_LOOP")
    }else {
      PUSHLOOP("GLB_MAIN_LOOP")
    }
  }catch(ex) {
  }
  SYSTEMPOINTER(0);
  update2D()
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
  initCalled = false
}
function register(obj) {
  if(obj instanceof Sprite) {
    sprites[obj.num] = obj;
    if(obj.num >= sprites.length) {
      sprites.length = obj.num + 1
    }
  }else {
    if(obj instanceof Screen) {
      screens[obj.num] = obj;
      if(obj.num >= screens.length) {
        screens.length = obj.num + 1
      }
    }else {
      if(obj instanceof Sound) {
        sounds[obj.num] = obj;
        if(obj.num >= sounds.length) {
          sounds.length = obj.num + 1
        }
      }else {
        if(obj instanceof SoundChannel) {
          soundChannels[obj.num] = obj;
          if(obj.num >= soundChannels.length) {
            soundChannels.length = obj.num + 1
          }
        }else {
          throwError("Cannot register unknown object: " + obj.constructor)
        }
      }
    }
  }
  return obj.num
}
function FOCEFEEDBACK(joy, dur, x, y) {
  var f = navigator.vibrate || navigator.mozVibrate;
  if(f) {
    f(dur)
  }
}
function GETTIMER() {
  return GETTIMERALL() - lastShwscrn
}
function ALPHAMODE(mode) {
}
function SETPIXEL(x, y, col) {
  DRAWRECT(x, y, 1, 1, col)
}
function LIMITFPS(fps) {
  showFPS = fps
}
function RGB(r, g, b) {
  r = r % 256;
  g = g % 256;
  b = b % 256;
  return r * 65536 + g * 256 + b
}
var whiteRGB = RGB(255, 255, 255);
function SETTRANSPARENCY(rgb) {
  transCol = rgb
}
function SMOOTHSHADING(mode) {
}
function SETSCREEN(width, height) {
  canvas.width = width;
  canvas.height = height
}
var inViewport = false;
function VIEWPORT(x, y, width, height) {
  if(inViewport) {
    context.restore();
    inViewport = false
  }
  if(x != 0 || y != 0 || width != 0 || height != 0) {
    context.save();
    context.beginPath();
    context.rect(x, y, width, height);
    context.clip();
    inViewport = true
  }
}
function ALLOWESCAPE(allow) {
  throwError("TODO: allowescape")
}
function AUTOPAUSE(mode) {
  throwError("TODO: autopause")
}
function HIBERNATE() {
  hibernate = true
}
function GETSCREENSIZE(width, height) {
  width[0] = canvas.width;
  height[0] = canvas.height
}
function GETSPRITESIZE(num, width, height) {
  width[0] = 0;
  height[0] = 0;
  if(sprites[num] && sprites[num].loaded) {
    width[0] = sprites[num].img.width;
    height[0] = sprites[num].img.height
  }
}
function GETDESKTOPSIZE(width, height) {
  width[0] = window.innerWidth;
  height[0] = window.innerHeight
}
function GETFONTSIZE(width, height) {
  if(!metrics) {
    metrics = context.measureText("W");
    if(!metrics) {
      throwError("Font metrics unsupported!")
    }
  }
  width[0] = metrics.width;
  height[0] = metrics.height ? metrics.height : 16
}
function ISFULLSCREEN() {
  throwError("TODO: isfullscreen")
}
function GETPIXEL(x, y) {
  var index = x * 4 + y * canvas.width * 4;
  throwError("TODO: getpixel");
  return RGB(index, index + 1, index + 2)
}
function SAVEBMP(file) {
  throwError("TODO: savebmp")
}
function SAVESPRITE(file, num) {
  throwError("TODO: savesprite")
}
function DRAWLINE(x1, y1, x2, y2, col) {
  context.save();
  context.strokeStyle = formatColor(col);
  context.beginPath();
  context.moveTo(CAST2INT(x1), CAST2INT(y1));
  context.lineTo(CAST2INT(x2), CAST2INT(y2));
  context.stroke();
  context.restore()
}
function DRAWRECT(x, y, w, h, col) {
  context.save();
  context.fillStyle = formatColor(col);
  context.fillRect(CAST2INT(x), CAST2INT(y), CAST2INT(w), CAST2INT(h));
  context.restore()
}
function formatColor(col) {
  col = col.toString(16);
  while(col.length < 6) {
    col = "00" + col
  }
  return"#" + col
}
function PRINT(text, x, y, kerning) {
  context.save();
  context.font = "12pt Consolas";
  context.fillStyle = "#ffffff";
  context.fillText(text, ~~(x + 0.5), ~~(y + 0.5) + 12);
  context.restore()
}
function SETFONT(num) {
  throwError("TODO: setfont")
}
function LOOPMOVIE(movie) {
  throwError("TODO: loopmovie")
}
function PLAYMOVIE(movie) {
  throwError("TODO:playmovie")
}
var sounds = [];
var soundChannels = [];
function genSoundChannel() {
  for(var i = 1;i < soundChannels.length;i++) {
    if(!soundChannels[i]) {
      return i
    }
  }
  return soundChannels.length + 1
}
function Sound(file, num, buffer) {
  this.num = num;
  this.file = file;
  this.loaded = false;
  this.buffers = [];
  this.buffers.length = buffer;
  this.sound = new Audio(file);
  this.sound.load();
  waitload++;
  var snd = this;
  this.sound.addEventListener("onerror", function() {
    waitload--;
    if(file != "" && file != "0") {
      throwError("Sound '" + num + "' '" + file + "' not found!")
    }
  }, false);
  this.sound.addEventListener("canplaythrough", function() {
    if(!snd.loaded) {
      waitload--;
      for(var i = 0;i < snd.buffers.length;i++) {
        snd.buffers[i] = new SoundChannel(this)
      }
    }
    snd.loaded = true
  }, false)
}
function SoundChannel(sound) {
  this.sound = sound.cloneNode(true);
  this.sound.load();
  this.num = genSoundChannel();
  this.loaded = false;
  this.playing = false;
  this.playTime = 0;
  this.play = function() {
    if(this.playing) {
      this.stop()
    }
    this.sound.currentTime = 0;
    this.playing = true;
    this.playTime = GETTIMERALL();
    this.sound.play()
  };
  this.stop = function() {
    this.sound.pause();
    this.sound.currentTime = 0;
    this.playing = false;
    this.playTime = 0
  };
  var sndchn = this;
  this.sound.addEventListener("canplaythrough", function() {
    if(!sndchn.loaded) {
      waitload--
    }
    sndchn.loaded = true
  }, false);
  this.sound.addEventListener("ended", function() {
    sndchn.stop()
  }, false);
  waitload++
}
function LOADSOUND(file, num, buffer) {
  if(noSound) {
    return
  }
  var fileName = REPLACE_Str(MID_Str(file, MAX(0, file.lastIndexOf("/")), -1), "/", "");
  file = REPLACE_Str(file, fileName, ".html5_convertedsounds_" + fileName) + "/";
  if(usedSoundFormat == "ogg") {
    file += "sound.ogg"
  }else {
    file += "sound.mp3"
  }
  file = "./" + file;
  var sound = new Sound(file, num, buffer);
  register(sound);
  return sound
}
function PLAYSOUND(num, pan, volume) {
  if(noSound) {
    return
  }
  var s = sounds[num];
  if(!s) {
    return 0
  }else {
    var curChn = null, lowestPlaytime = GETTIMERALL() + 1;
    for(var i = 0;i < s.buffers.length && lowestPlaytime != 0;i++) {
      if(s.buffers[i].playTime < lowestPlaytime) {
        lowestPlaytime = s.buffers[i].playTime;
        curChn = s.buffers[i]
      }
    }
    if(!!curChn) {
      curChn.play()
    }else {
      throwError("No channel available...")
    }
    return curChn.num
  }
}
function HUSH() {
  if(noSound) {
    return
  }
  for(var i = 0;i < soundChannels.length;i++) {
    if(!!soundChannels[i] && soundChannels[i].playing) {
      soundChannels[i].stop()
    }
  }
}
function SOUNDPLAYING(chn) {
  if(noSound) {
    return false
  }
  return!!soundChannels[chn] && soundChannels[chn].playing ? 0 : 1
}
function PLAYMUSIC(file, loop) {
  if(noSound) {
    return
  }
  return;
  var s = LOADSOUND(file, 0, 1);
  s.loop = loop;
  s.music = true
}
function STOPMUSIC() {
  if(noSound) {
    return
  }
  if(SOUNDPLAYING(0)) {
    soundChannels[0].stop()
  }
}
function ISMUSICPLAYING() {
  if(noSound) {
    return false
  }
  return SOUNDPLAYING(0)
}
function Touch() {
  this.lastx = 0;
  this.lasty = 0;
  this.speedx = 0;
  this.speedy = 0;
  this.x = 0;
  this.y = 0;
  this.left = false;
  this.right = false;
  this.middle = false;
  this.wheel = 0;
  this.reallywheel = 0
}
function updateTouches(t, state) {
  anyMousePress = false;
  if(t) {
    switch(state) {
      case "start":
        for(var i = touches.length;i < t.length - 1;i++) {
          var tmp = t[i];
          touches[tmp.identifier].left = true
        }
        touches.length = t.length;
        break;
      case "end":
        for(var i = 0;i < t.length;i++) {
          var tmp = t[i];
          touches[tmp.identifier].left = false
        }
        break;
      case "move":
        for(var i = 0;i < t.length;i++) {
          var tmp = t[i];
          touches[tmp.identifier].left = true;
          touches[tmp.identifier].x = tmp.clientX - canvas.offsetLeft;
          touches[tmp.identifier].y = tmp.clientY - canvas.offsetTop
        }
        break
    }
  }else {
    globalSpeedX = 0;
    globalSpeedY = 0;
    for(var i = 0;i < touches.length;i++) {
      var touch = touches[i];
      touch.reallywheel = touch.wheel;
      touch.wheel = 0;
      touch.speedx = touch.x - touch.lastx;
      touch.speedy = touch.y - touch.lasty;
      globalSpeedX += touch.speedx;
      globalSpeedY += touch.speedy;
      touch.lastX = touch.x;
      touch.lastY = touch.y;
      if(touch.left || touch.right || touch.middle) {
        anyMousePress = true
      }
    }
  }
}
function MOUSEAXIS(info) {
  if(currentMouse >= 0 && currentMouse < touches.length) {
  }else {
    return
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
      return t.middle ? 1 : 0
  }
}
function SETACTIVEMOUSE(mouse) {
  currentMouse = mouse;
  if(mouse < 0 || mouse >= touches.length) {
    throwError("Invalid mouse index '" + mouse + "' max: '" + touches.length + "'")
  }
}
function GETMOUSECOUNT() {
  return touches.length
}
function MOUSESTATE(x, y, ml, mr) {
  if(currentMouse >= 0 && currentMouse < touches.length) {
  }else {
    return
  }
  var t = touches[currentMouse];
  x[0] = t.x;
  y[0] = t.y;
  ml[0] = t.left ? 1 : 0;
  mr[0] = t.right ? 1 : 0
}
function SYSTEMPOINTER(show) {
  if(show) {
    canvas.style.cursor = ""
  }else {
    canvas.style.cursor = "none"
  }
}
function KEY(key) {
  key = glb2jsKeyCode(key);
  return keyInput[key] ? 1 : 0
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
    ;
    case 157:
      return 17;
    case 56:
    ;
    case 29:
    ;
    case 184:
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
    case KEY_SCROLLLOCK = 145:
      return 70
  }
}
function INKEY_Str() {
  return""
}
function ANYKEY() {
  return anyKeyPress ? 1 : 0
}
function ANYMOUSE() {
  return anyMousePress ? 1 : 0
}
function Sprite(img, num) {
  this.img = img;
  this.num = num;
  this.data = null;
  this.loaded = false;
  this.tint = null;
  this.frames = null;
  this.frameWidth = -1;
  this.frameHeight = -1
}
function getSprite(num) {
  if(!!sprites[num]) {
    if(!sprites[num].loaded) {
      throwError("Image not yet loaded '" + num + "'")
    }
    return sprites[num]
  }else {
    throwError("Image not available '" + num + "'")
  }
}
function LOADSPRITE(path, num) {
  var image = new Image;
  var spr = new Sprite(image, num);
  image.onerror = function() {
    if(sprites[num]) {
      waitload--;
      sprites[num] = null;
      if(path != "" && path != "0") {
        throwError("Image '" + num + "' '" + path + "' not found!")
      }
    }
  };
  image.onload = function() {
    if(!spr.loaded) {
      waitload--;
      spr.loaded = true;
      updateFrames(num);
      try {
        if(!!transCol) {
          var width = image.width, height = image.height;
          var buf = document.createElement("canvas");
          buf.width = width;
          buf.height = height;
          var scrn = new Screen(buf, -42);
          scrn.context.drawImage(image, 0, 0);
          var imageData = scrn.context.getImageData(0, 0, width, height);
          for(var y = 0;y < height;y++) {
            inpos = y * width * 4;
            outpos = inpos;
            for(var x = 0;x < width;x++) {
              var r = imageData.data[inpos++];
              var g = imageData.data[inpos++];
              var b = imageData.data[inpos++];
              var a = imageData.data[inpos++];
              var rgb = RGB(r, g, b);
              if(rgb == transCol) {
                a = 0
              }
              imageData.data[outpos++] = r;
              imageData.data[outpos++] = g;
              imageData.data[outpos++] = b;
              imageData.data[outpos++] = a
            }
          }
          scrn.context.putImageData(imageData, 0, 0);
          spr.img = buf
        }
      }catch(ex) {
        domExceptionError(ex)
      }
    }
  };
  image.src = fileSystem.getCurrentDir() + path;
  register(spr);
  waitload++
}
function SETSPRITEANIM(num, frmw, frmh) {
  var spr = sprites[num];
  if(!spr) {
    throwError("Cannot SETSPRITEANIM to unloaded sprite '" + num + "'")
  }
  spr.frames = null;
  if(frmw && frmh) {
    spr.frameWidth = frmw;
    spr.frameHeight = frmh
  }else {
    spr.frameWidth = -1;
    spr.frameHeight = -1
  }
  if(spr.loaded) {
    updateFrames(num)
  }
}
function updateFrames(num) {
  var spr = getSprite(num);
  if(spr.frameWidth != -1 && spr.frameHeight != -1) {
    spr.frameWidth = MAX(MIN(spr.frameWidth, spr.img.width), 0);
    spr.frameHeight = MAX(MIN(spr.frameHeight, spr.img.height), 0);
    spr.frames = [];
    var i = 0;
    for(var y = 0;y < spr.img.height;y += spr.frameHeight) {
      for(var x = 0;x < spr.img.width;x += spr.frameWidth) {
        spr.frames.push({posx:x, posy:y})
      }
    }
  }
}
function LOADANIM(path, num, width, height) {
  LOADSPRITE(path, num, width, height);
  SETSPRITEANIM(num, width, height)
}
function LOADFONT(font, num) {
}
function MEM2SPRITE(pixels, num, width, height) {
  throwError("TODO: mem2sprite")
}
function SPRITE2MEM(pixels, num) {
  var isref = pixels.deval instanceof Array;
  var spr = getSprite(num);
  if(isref) {
    DIM(pixels, [spr.img.width * spr.img.height], [0])
  }else {
    DIM(pixels, [spr.img.width * spr.img.height], 0)
  }
  var width = spr.img.width, height = spr.img.height;
  var buf = document.createElement("canvas");
  buf.width = width;
  buf.height = height;
  var scrn = new Screen(buf, -42);
  scrn.context.drawImage(spr.img, 0, 0);
  try {
    var imageData = scrn.context.getImageData(0, 0, width, height);
    for(var y = 0;y < height;y++) {
      var inpos = y * width * 4;
      for(var x = 0;x < width;x++) {
        var r = imageData.data[inpos++];
        var g = imageData.data[inpos++];
        var b = imageData.data[inpos++];
        var a = imageData.data[inpos++];
        var v = bOR(RGB(r, g, b), ASL(a, 24));
        if(isref) {
          v = [v]
        }
        pixels.arrAccess(x + y * width).values[tmpPositionCache] = v
      }
    }
  }catch(ex) {
    return 0
  }
  return 1
}
function LOADSPRITEMEM(file, w, h, pixels) {
  throwError("TODO: loadspritemem")
}
var inPoly = false;
var num, mode;
var polyStack = [];
var tmpPolyStack = new Array(3);
function ENDPOLY() {
  if(!inPoly) {
    throwError("ENDPOLY has to be in STARTPOLY - ENDPOLY ")
  }
  if(polyStack.length > 0) {
    if(polyStack.length == 4) {
      POLYNEWSTRIP()
    }else {
      if(mode == 1) {
        if(polyStack.length % 3 != 0) {
          throwError("Polyvector cannot draw non power of 3 triangles")
        }
        var spr = getSprite(num);
        for(var i = 0;i < polyStack.length;i += 3) {
          tmpPolyStack[0] = polyStack[i];
          tmpPolyStack[1] = polyStack[i + 1];
          tmpPolyStack[2] = polyStack[i + 2];
          drawPolygon(false, simpletris, tmpPolyStack, spr)
        }
        context.restore()
      }else {
        throwError("Missing ENDPOLY function.")
      }
    }
    polyStack.length = 0
  }
  inPoly = false
}
var simpletris = [[0, 1, 2]];
var tris2 = [[0, 1, 2], [2, 3, 1]];
var tris1 = [[0, 1, 2], [2, 3, 0]];
function POLYNEWSTRIP() {
  if(!inPoly) {
    throwError("POLYNEWSTRIP has to be in STARTPOLY - ENDPOLY ")
  }
  if(num == -1) {
    context.fillStyle = formatColor(polyStack[0].col);
    context.beginPath();
    context.moveTo(0, 0);
    for(var i = 0;i < polyStack.length;i++) {
      context.lineTo(~~(polyStack[i].x + 0.5), ~~(polyStack[i].y + 0.5))
    }
    context.closePath();
    context.fill();
    polyStack.length = 0
  }else {
    var tris;
    if(mode == 2) {
      tris = tris2
    }else {
      if(mode == 1) {
        tris = tris1
      }else {
        if(mode == 0) {
          tris = tris1
        }else {
          throwError("Invalid drawing mode!")
        }
      }
    }
    var spr = getSprite(num);
    var plzTint;
    if(polyStack[0].col != whiteRGB && polyStack[1].col != whiteRGB && polyStack[2].col != whiteRGB && polyStack[2].col != whiteRGB) {
      plzTint = true
    }else {
      plzTint = false
    }
    var tmpAlpha = context.globalAlpha;
    var tmpOperation = context.globalCompositeOperation;
    drawPolygon(plzTint, tris, polyStack, spr)
  }
  if(plzTint) {
    context.globalAlpha = tmpAlpha;
    context.globalCompositeOperation = tmpOperation
  }
  polyStack.length = 0
}
function drawPolygon(plzTint, tris, polyStack, spr) {
  var pts = polyStack;
  for(var t = 0;t < tris.length;t++) {
    var pp = tris[t];
    var x0 = pts[pp[0]].x, x1 = pts[pp[1]].x, x2 = pts[pp[2]].x;
    var y0 = pts[pp[0]].y, y1 = pts[pp[1]].y, y2 = pts[pp[2]].y;
    var u0 = pts[pp[0]].u, u1 = pts[pp[1]].u, u2 = pts[pp[2]].u;
    var v0 = pts[pp[0]].v, v1 = pts[pp[1]].v, v2 = pts[pp[2]].v;
    context.save();
    context.beginPath();
    context.moveTo(x0, y0);
    context.lineTo(x1, y1);
    context.lineTo(x2, y2);
    context.closePath();
    context.clip();
    var delta = u0 * v1 + v0 * u2 + u1 * v2 - v1 * u2 - v0 * u1 - u0 * v2;
    var delta_a = x0 * v1 + v0 * x2 + x1 * v2 - v1 * x2 - v0 * x1 - x0 * v2;
    var delta_b = u0 * x1 + x0 * u2 + u1 * x2 - x1 * u2 - x0 * u1 - u0 * x2;
    var delta_c = u0 * v1 * x2 + v0 * x1 * u2 + x0 * u1 * v2 - x0 * v1 * u2 - v0 * u1 * x2 - u0 * x1 * v2;
    var delta_d = y0 * v1 + v0 * y2 + y1 * v2 - v1 * y2 - v0 * y1 - y0 * v2;
    var delta_e = u0 * y1 + y0 * u2 + u1 * y2 - y1 * u2 - y0 * u1 - u0 * y2;
    var delta_f = u0 * v1 * y2 + v0 * y1 * u2 + y0 * u1 * v2 - y0 * v1 * u2 - v0 * u1 * y2 - u0 * y1 * v2;
    context.transform(delta_a / delta, delta_d / delta, delta_b / delta, delta_e / delta, delta_c / delta, delta_f / delta);
    if(plzTint) {
      if(polyStack[0].col == polyStack[1].col && polyStack[1].col == polyStack[2].col && polyStacj.length > 2 && polyStack[2].col == polyStack[3].col) {
        if(!spr.tint) {
          try {
            spr.tint = generateRGBKs(spr.img)
          }catch(ex) {
            domExceptionError(ex)
          }
        }
        if(spr.tint) {
          var red = (polyStack[t].col & 16711680) / 65536;
          var green = (polyStack[t].col & 65280) / 256;
          var blue = polyStack[t].col & 255;
          context.globalAlpha = 1;
          context.globalCompositeOperation = "copy";
          context.drawImage(spr.tint[3], 0, 0);
          context.globalCompositeOperation = "lighter";
          if(red > 0) {
            context.globalAlpha = red / 255;
            context.drawImage(spr.tint[0], 0, 0)
          }
          if(green > 0) {
            context.globalAlpha = green / 255;
            context.drawImage(spr.tint[1], 0, 0)
          }
          if(blue > 0) {
            context.globalAlpha = blue / 255;
            context.drawImage(spr.tint[2], 0, 0)
          }
        }else {
        }
      }else {
      }
    }else {
      context.drawImage(spr.img, 0, 0)
    }
    context.restore()
  }
}
function POLYVECTOR(posx, posy, tx, ty, color) {
  if(!inPoly) {
    throwError("POLYVECTOR has to be in STARTPOLY - ENDPODRAWANIMLY ")
  }
  if(polyStack[polyStack.length]) {
    polyStack[polyStack.length].x = posx;
    polyStack[polyStack.length].y = posy;
    polyStack[polyStack.length].u = tx;
    polyStack[polyStack.length].v = ty;
    polyStack[polyStack.length].col = color;
    polyStack.length++
  }else {
    polyStack.push({x:posx, y:posy, u:tx, v:ty, col:color})
  }
}
function STARTPOLY(n, m) {
  if(inPoly) {
    throwError("STARTPOLY has not to be in STARTPOLY - ENDPOLY ")
  }
  inPoly = true;
  polyStack.length = 0;
  num = n;
  mode = m
}
function GENSPRITE() {
  for(var i = 0;i < sprites.length;i++) {
    if(!sprites[i]) {
      return i
    }
  }
  return sprites.length
}
function DRAWSPRITE(num, x, y) {
  var spr = getSprite(num);
  context.drawImage(spr.img, ~~(x + 0.5), ~~(y + 0.5))
}
function ROTOSPRITE(num, x, y, phi) {
  if(phi % 360 == 0) {
    DRAWSPRITE(num, x, y)
  }else {
    context.save();
    context.setRotation(phi * Math.PI / 180);
    DRAWSPRITE(num, x, y);
    context.restore()
  }
}
function ZOOMSPRITE(num, x, y, sx, sy) {
  if(sx == 1 && sy == 1) {
    DRAWSPRITE(num, x, y)
  }else {
    if(sx != 0 && sy != 0) {
      context.save();
      context.translate(x, y);
      context.scale(sx, sy);
      DRAWSPRITE(num, 0, 0);
      context.restore()
    }
  }
}
function STRETCHSPRITE(num, x, y, width, height) {
  var spr = getSprite(num);
  if(width != 0 && height != 0) {
    context.save();
    var sx = width / spr.img.width, sy = height / spr.img.height;
    context.translate(x, y);
    context.scale(sx, sy);
    DRAWSPRITE(num, 0, 0);
    context.restore()
  }
}
function ROTOZOOMSPRITE(num, x, y, phi, scale) {
  context.save();
  context.translate(x, y);
  context.scale(scale, scale);
  ROTOSPRITE(num, 0, 0, phi);
  context.restore()
}
function DRAWANIM(num, frame, x, y) {
  var spr = getSprite(num);
  if(spr.frames == null) {
    throwError("DRAWANIM can only draw an animation!")
  }
  frame = frame % spr.frames.length;
  if(frame < 0) {
    throwError("Invalid frame '" + frame + "'")
  }
  context.drawImage(spr.img, ~~(spr.frames[frame].posx + 0.5), ~~(spr.frames[frame].posy + 0.5), spr.frameWidth, spr.frameHeight, CAST2INT(x), CAST2INT(y), spr.frameWidth, spr.frameHeight)
}
function ROTOZOOMANIM(num, frame, x, y, phi, scale) {
  context.save();
  context.translate(x, y);
  context.scale(scale, scale);
  ROTOANIM(num, frame, 0, 0, phi);
  context.restore()
}
function ROTOANIM(num, frame, x, y, phi) {
  if(phi % 360 == 0) {
    DRAWANIM(num, frame, x, y)
  }else {
    context.save();
    context.setRotation(phi * Math.PI / 180);
    DRAWANIM(num, frame, x, y);
    context.restore()
  }
}
function ZOOMANIM(num, frame, x, y, sx, sy) {
  if(sx == 1 && sy == 1) {
    DRAWANIM(num, frame, x, y)
  }else {
    if(sx != 0 && sy != 0) {
      context.save();
      context.translate(x, y);
      context.scale(sx, sy);
      DRAWANIM(num, frame, 0, 0);
      context.restore()
    }
  }
}
function STRETCHANIM(num, frame, x, y, width, height) {
  var spr = getSprite(num);
  if(width != 0 && height != 0) {
    context.save();
    var sx = width / spr.img.frameWidth, sy = height / spr.img.frameHeight;
    context.translate(x, y);
    context.scale(sx, sy);
    DRAWANIM(num, frame, 0, 0);
    context.restore()
  }
}
function GRABSPRITE(num, x, y, width, height) {
  if(width < 1 || height < 1) {
    throwError("Invalid width/height!")
  }
  try {
    var data = context.getImageData(x, y, width, height);
    var canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    var ctxt = canvas.getContext("2d");
    ctxt.putImageData(data, 0, 0);
    var spr = new Sprite(canvas, num);
    spr.loaded = true;
    register(spr)
  }catch(ex) {
    domExceptionError(ex)
  }
}
function SPRCOLL(spr1, x1, y1, spr2, x2, y2) {
  var s1, s2;
  s1 = getSprite(spr1);
  s2 = getSprite(spr2);
  if(!s1.data || !s2.data) {
    var getMyData = function(s) {
      try {
        var canvas = document.createElement("canvas");
        canvas.width = s.img.width;
        canvas.height = s.img.height;
        var context = canvas.getContext("2d");
        context.drawImage(s.img, 0, 0);
        s.data = context.getImageData(0, 0, canvas.width, canvas.height)
      }catch(ex) {
        domExceptionError(ex)
      }
    };
    if(s1.data == null) {
      getMyData(s1)
    }
    if(s2.data == null) {
      getMyData(s2)
    }
  }
  return isPixelCollision(s1.data, x1, y1, s2.data, x2, y2) ? 1 : 0
}
function ANIMCOLL(ani1, tile, x1, y1, ani2, time2, x2, y2) {
  throwError("TODO: animcoll")
}
function isPixelCollision(first, x, y, other, x2, y2) {
  var isCentred = false;
  x = Math.round(x);
  y = Math.round(y);
  x2 = Math.round(x2);
  y2 = Math.round(y2);
  var w = first.width, h = first.height, w2 = other.width, h2 = other.height;
  if(isCentred) {
    x -= w / 2 + 0.5 << 0;
    y -= h / 2 + 0.5 << 0;
    x2 -= w2 / 2 + 0.5 << 0;
    y2 -= h2 / 2 + 0.5 << 0
  }
  var xMin = Math.max(x, x2), yMin = Math.max(y, y2), xMax = Math.min(x + w, x2 + w2), yMax = Math.min(y + h, y2 + h2);
  if(xMin >= xMax || yMin >= yMax) {
    return false
  }
  var xDiff = xMax - xMin, yDiff = yMax - yMin;
  var pixels = first.data, pixels2 = other.data;
  if(xDiff < 4 && yDiff < 4) {
    for(var pixelX = xMin;pixelX < xMax;pixelX++) {
      for(var pixelY = yMin;pixelY < yMax;pixelY++) {
        if(pixels[(pixelX - x + (pixelY - y) * w) * 4 + 3] !== 0 && pixels2[(pixelX - x2 + (pixelY - y2) * w2) * 4 + 3] !== 0) {
          return true
        }
      }
    }
  }else {
    var incX = xDiff / 3, incY = yDiff / 3;
    incX = ~~incX === incX ? incX : incX + 1 | 0;
    incY = ~~incY === incY ? incY : incY + 1 | 0;
    for(var offsetY = 0;offsetY < incY;offsetY++) {
      for(var offsetX = 0;offsetX < incX;offsetX++) {
        for(var pixelY = yMin + offsetY;pixelY < yMax;pixelY += incY) {
          for(var pixelX = xMin + offsetX;pixelX < xMax;pixelX += incX) {
            if(pixels[(pixelX - x + (pixelY - y) * w) * 4 + 3] !== 0 && pixels2[(pixelX - x2 + (pixelY - y2) * w2) * 4 + 3] !== 0) {
              return true
            }
          }
        }
      }
    }
  }
  return false
}
function generateRGBKs(img) {
  var w = img.width;
  var h = img.height;
  var rgbks = [];
  var canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  var ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0);
  var pixels = ctx.getImageData(0, 0, w, h).data;
  for(var rgbI = 0;rgbI < 4;rgbI++) {
    var canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    var ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0);
    var to = ctx.getImageData(0, 0, w, h);
    var toData = to.data;
    for(var i = 0, len = pixels.length;i < len;i += 4) {
      toData[i] = rgbI === 0 ? pixels[i] : 0;
      toData[i + 1] = rgbI === 1 ? pixels[i + 1] : 0;
      toData[i + 2] = rgbI === 2 ? pixels[i + 2] : 0;
      toData[i + 3] = pixels[i + 3]
    }
    ctx.putImageData(to, 0, 0);
    var imgComp = new Image;
    imgComp.src = canvas.toDataURL();
    rgbks.push(imgComp)
  }
  return rgbks
}
function BOXCOLL(x1, y1, breite1, hoehe1, x2, y2, breite2, hoehe2) {
  if(x1 <= x2 + breite2 && y1 <= y2 + hoehe2 && x1 + breite1 >= x2 && y1 + hoehe1 >= y2) {
    return 1
  }else {
    return 0
  }
}
function Screen(buffer, num, sprid) {
  this.canvas = buffer;
  this.context = buffer.getContext("2d");
  this.realwidth = this.canvas.width;
  this.realheight = this.canvas.height;
  this.realx = this.canvas.offsetLeft;
  this.realy = this.canvas.offsetRight;
  this.num = num + 2;
  this.spr = sprid;
  if(this.context == null) {
    throwError("Given buffer does not support '2d'")
  }
}
function CREATESCREEN(scrid, sprid, width, height) {
  var buffer = document.createElement("canvas");
  buffer.width = width;
  buffer.height = height;
  register(new Screen(buffer, scrid, sprid));
  register(new Sprite(buffer, sprid))
}
function USESCREEN(id) {
  var oScreen = curScreen;
  if(oScreen && oScreen.spr) {
    getSprite(oScreen.spr).data = null;
    getSprite(oScreen.spr).tint = null
  }
  curScreen = screens[id + 2];
  if(!curScreen) {
    curScreen = oScreen
  }else {
    context = curScreen.context;
    canvas = curScreen.canvas
  }
}
function BLENDSCREEN(file, duration) {
  throwError("TODO: blendscreen")
}
function CLEARSCREEN(col) {
  context.save();
  context.fillStyle = formatColor(col);
  context.fillRect(0, 0, canvas.width, canvas.height);
  clrColor = col;
  context.restore()
}
function BLACKSCREEN() {
  CLEARSCREEN(RGB(0, 0, 0))
}
function USEASBMP() {
  background = backbuffer.canvas;
  var buffer = document.createElement("canvas");
  buffer.width = canvasWidth;
  buffer.height = canvasHeight;
  backbuffer = new Screen(buffer, -1);
  register(backbuffer);
  USESCREEN(-1)
}
function LOADBMP(path) {
  var image = new Image;
  image.onload = function() {
    background = image
  };
  image.onerror = function() {
    throwError("BMP '" + path + "' not found!")
  };
  image.src = fileSystem.getCurrentDir() + path
}
var debugMode = false;
window["main"] = function() {
  GETSCREENSIZE(global7_screenx_ref, global7_screeny_ref);
  LOADSOUND("boing.wav", 0, 4);
  LOADSOUND("bwah.wav", 1, 1);
  DIM(unref(global6_colors), [3], 0);
  global6_colors.arrAccess(0).values[tmpPositionCache] = RGB(127, 25, 255);
  global6_colors.arrAccess(1).values[tmpPositionCache] = RGB(50, 255, 50);
  global6_colors.arrAccess(2).values[tmpPositionCache] = RGB(255, 255, 255);
  DIM(unref(global3_hit), [20, 30], 0);
  DIM(unref(global2_bx), [100], 0);
  DIM(unref(global2_by), [100], 0);
  DIM(unref(global5_bdirx), [100], 0);
  DIM(unref(global5_bdiry), [100], 0);
  DIM(unref(global4_batx), [4], 0);
  DIM(unref(global4_baty), [4], 0);
  global4_batx.arrAccess(0).values[tmpPositionCache] = global7_screenx_ref[0] / 2;
  global4_baty.arrAccess(0).values[tmpPositionCache] = 400;
  global7_maxball = 0;
  global6_maxbat = 0;
  global2_bx.arrAccess(0).values[tmpPositionCache] = 580;
  global2_by.arrAccess(0).values[tmpPositionCache] = 350;
  global5_bdirx.arrAccess(0).values[tmpPositionCache] = 1.2;
  global5_bdiry.arrAccess(0).values[tmpPositionCache] = -1;
  global2_bx.arrAccess(1).values[tmpPositionCache] = 160;
  global2_by.arrAccess(1).values[tmpPositionCache] = 350;
  global5_bdirx.arrAccess(1).values[tmpPositionCache] = -1;
  global5_bdiry.arrAccess(1).values[tmpPositionCache] = 1.2;
  for(local1_x_603 = 0;toCheck(local1_x_603, 19, 1);local1_x_603 += 1) {
    for(local1_y_604 = 0;toCheck(local1_y_604, 9, 1);local1_y_604 += 1) {
      global3_hit.arrAccess(~~local1_x_603, ~~local1_y_604).values[tmpPositionCache] = RND(2) + 1
    }
  }
};
window["GLB_ON_LOOP"] = function() {
  MOUSESTATE(global2_mx_ref, global2_my_ref, global2_b1_ref, global2_b2_ref);
  global2_mx_ref[0] = global2_mx_ref[0] * 640 / global7_screenx_ref[0];
  if(global2_mx_ref[0] > 640 ? 1 : 0) {
    global2_mx_ref[0] = 640
  }
  global4_batx.arrAccess(0).values[tmpPositionCache] = global2_mx_ref[0] - 32;
  global5_dtime = GETTIMER() / 8;
  for(global1_i = 0;toCheck(global1_i, global7_maxball, 1);global1_i += 1) {
    global5_swapy = 0;
    global5_swapx = 0;
    global2_xa = global2_bx.arrAccess(~~global1_i).values[tmpPositionCache];
    global2_ya = global2_by.arrAccess(~~global1_i).values[tmpPositionCache];
    global2_bx.arrAccess(~~global1_i).values[tmpPositionCache] = global2_xa + global5_bdirx.arrAccess(~~global1_i).values[tmpPositionCache] * global5_dtime;
    if(func8_BallColl(global1_i)) {
      global2_bx.arrAccess(~~global1_i).values[tmpPositionCache] = global2_xa;
      global5_swapx = 1
    }
    global2_by.arrAccess(~~global1_i).values[tmpPositionCache] = global2_ya + global5_bdiry.arrAccess(~~global1_i).values[tmpPositionCache] * global5_dtime;
    if(func8_BallColl(global1_i)) {
      global2_by.arrAccess(~~global1_i).values[tmpPositionCache] = global2_ya;
      global5_swapy = 1
    }
    for(global1_j = 0;toCheck(global1_j, global6_maxbat, 1);global1_j += 1) {
      if(BOXCOLL(unref(~~global4_batx.arrAccess(~~global1_j).values[tmpPositionCache]), unref(~~global4_baty.arrAccess(~~global1_j).values[tmpPositionCache]), 128, 16, unref(~~global2_xa), unref(~~global2_ya), 16, 16) && (global5_bdiry.arrAccess(~~global1_i).values[tmpPositionCache] > 0 ? 1 : 0) ? 1 : 0) {
        global5_swapy = 1;
        global5_swapx = 0;
        global5_bdirx.arrAccess(~~global1_i).values[tmpPositionCache] = (global2_xa - global4_batx.arrAccess(~~global1_j).values[tmpPositionCache] - 24) / 50;
        global2_by.arrAccess(~~global1_i).values[tmpPositionCache] = global2_ya
      }
    }
    if(global5_swapy) {
      global5_bdiry.arrAccess(~~global1_i).values[tmpPositionCache] = -global5_bdiry.arrAccess(~~global1_i).values[tmpPositionCache]
    }
    if(global5_swapx) {
      global5_bdirx.arrAccess(~~global1_i).values[tmpPositionCache] = -global5_bdirx.arrAccess(~~global1_i).values[tmpPositionCache]
    }
    if(global5_swapx || global5_swapy ? 1 : 0) {
      PLAYSOUND(0, 0, 1)
    }
  }
  ShowAll();
  SHOWSCREEN()
};
window["GLB_ON_LOOP"] = GLB_ON_LOOP;
window["ShowAll"] = function() {
  var local1_x_606 = 0, local1_y_607 = 0, local1_f_608 = 0;
  local1_f_608 = global7_screenx_ref[0] / 640;
  for(local1_x_606 = 0;toCheck(local1_x_606, 19, 1);local1_x_606 += 1) {
    for(local1_y_607 = 0;toCheck(local1_y_607, 29, 1);local1_y_607 += 1) {
      if(global3_hit.arrAccess(~~local1_x_606, ~~local1_y_607).values[tmpPositionCache] > 0 ? 1 : 0) {
        DRAWRECT(local1_x_606 * 32 * local1_f_608, local1_y_607 * 16 * local1_f_608, 30 * local1_f_608, 14 * local1_f_608, unref(~~global6_colors.arrAccess(~~(global3_hit.arrAccess(~~local1_x_606, ~~local1_y_607).values[tmpPositionCache] - 1)).values[tmpPositionCache]))
      }
    }
  }
  for(local1_x_606 = 0;toCheck(local1_x_606, global7_maxball, 1);local1_x_606 += 1) {
    DRAWRECT(global2_bx.arrAccess(~~local1_x_606).values[tmpPositionCache] * local1_f_608, global2_by.arrAccess(~~local1_x_606).values[tmpPositionCache] * local1_f_608, 16 * local1_f_608, 16 * local1_f_608, RGB(255, 255, 64))
  }
  for(local1_x_606 = 0;toCheck(local1_x_606, global6_maxbat, 1);local1_x_606 += 1) {
    DRAWRECT(global4_batx.arrAccess(~~local1_x_606).values[tmpPositionCache] * local1_f_608, global4_baty.arrAccess(~~local1_x_606).values[tmpPositionCache] * local1_f_608, 128 * local1_f_608, 16 * local1_f_608, RGB(255, 255, 64))
  }
};
window["ShowAll"] = ShowAll;
window["func8_BallColl"] = function(param3_num) {
  param3_num = unref(param3_num);
  var local5_docol_610 = 0;
  local5_docol_610 = 0;
  if(global2_bx.arrAccess(~~param3_num).values[tmpPositionCache] < 0 ? 1 : 0) {
    global2_bx.arrAccess(~~param3_num).values[tmpPositionCache] = 0;
    local5_docol_610 = 1
  }
  if(global2_bx.arrAccess(~~param3_num).values[tmpPositionCache] >= 624 ? 1 : 0) {
    global2_bx.arrAccess(~~param3_num).values[tmpPositionCache] = 623;
    local5_docol_610 = 1
  }
  if(global2_by.arrAccess(~~param3_num).values[tmpPositionCache] < 0 ? 1 : 0) {
    global2_by.arrAccess(~~param3_num).values[tmpPositionCache] = 0
  }
  if(global2_by.arrAccess(~~param3_num).values[tmpPositionCache] >= 464 ? 1 : 0) {
    global5_bdiry.arrAccess(~~param3_num).values[tmpPositionCache] = -ABS(unref(global5_bdiry.arrAccess(~~param3_num).values[tmpPositionCache]));
    global2_by.arrAccess(~~param3_num).values[tmpPositionCache] = 300;
    PLAYSOUND(1, 0, 1);
    return 0
  }
  global1_h = func17_TouchBlockAtPixel(global2_bx.arrAccess(~~param3_num).values[tmpPositionCache] / 32, global2_by.arrAccess(~~param3_num).values[tmpPositionCache] / 16);
  global1_h = global1_h + func17_TouchBlockAtPixel((global2_bx.arrAccess(~~param3_num).values[tmpPositionCache] + 16) / 32, global2_by.arrAccess(~~param3_num).values[tmpPositionCache] / 16);
  global1_h = global1_h + func17_TouchBlockAtPixel((global2_bx.arrAccess(~~param3_num).values[tmpPositionCache] + 16) / 32, (global2_by.arrAccess(~~param3_num).values[tmpPositionCache] + 16) / 16);
  global1_h = global1_h + func17_TouchBlockAtPixel(global2_bx.arrAccess(~~param3_num).values[tmpPositionCache] / 32, (global2_by.arrAccess(~~param3_num).values[tmpPositionCache] + 16) / 16);
  if(global1_h == 0 ? 1 : 0) {
    return tryClone(unref(local5_docol_610))
  }
  return tryClone(1);
  return 0
};
window["func17_TouchBlockAtPixel"] = function(param1_x, param1_y) {
  param1_x = unref(param1_x);
  param1_y = unref(param1_y);
  var local1_h_614 = 0;
  local1_h_614 = global3_hit.arrAccess(~~param1_x, ~~param1_y).values[tmpPositionCache];
  if(local1_h_614) {
    global3_hit.arrAccess(~~param1_x, ~~param1_y).values[tmpPositionCache] = 0;
    return tryClone(1)
  }
  return 0;
  return 0
};
window["method13_type7_TObject_12_ToString_Str"] = function(param4_self) {
  param4_self = unref(param4_self);
  return"Object";
  return""
};
window["method13_type7_TObject_6_Equals"] = function(param3_Obj, param4_self) {
  param3_Obj = unref(param3_Obj);
  param4_self = unref(param4_self);
  if(param3_Obj == param4_self ? 1 : 0) {
    return 1
  }else {
    return tryClone(0)
  }
  return 0
};
window["method13_type7_TObject_10_ToHashCode"] = function(param4_self) {
  param4_self = unref(param4_self);
  return 0;
  return 0
};
var vtbl_type7_TObject = {ToString_Str:method13_type7_TObject_12_ToString_Str, Equals:method13_type7_TObject_6_Equals, ToHashCode:method13_type7_TObject_10_ToHashCode};
window["type7_TObject"] = function() {
  this.vtbl = vtbl_type7_TObject;
  return this
};
window["type7_TObject"].prototype.clone = function() {
  var other = new type7_TObject;
  other.vtbl = this.vtbl;
  return other
};
type7_TObject.prototype.ToString_Str = function() {
  return this.vtbl.ToString_Str(this)
};
type7_TObject.prototype.Equals = function() {
  return this.vtbl.Equals(arguments[0], this)
};
type7_TObject.prototype.ToHashCode = function() {
  return this.vtbl.ToHashCode(this)
};
var global7_screenx_ref = [0], global7_screeny_ref = [0], global3_col = 0, global1_i = 0, global1_j = 0, global2_xa = 0, global2_ya = 0, global2_mx_ref = [0], global2_my_ref = [0], global2_b1_ref = [0], global2_b2_ref = [0], global5_swapx = 0, global5_swapy = 0, global6_colors = new GLBArray, global3_hit = new GLBArray, global2_bx = new GLBArray, global2_by = new GLBArray, global5_bdirx = new GLBArray, global5_bdiry = new GLBArray, global4_batx = new GLBArray, global4_baty = new GLBArray, global7_maxball = 
0, global6_maxbat = 0, global5_dtime = 0, global1_h = 0;
window["initStatics"] = function() {
};
for(var __init = 0;__init < preInitFuncs.length;__init++) {
  preInitFuncs[__init]()
}
;
