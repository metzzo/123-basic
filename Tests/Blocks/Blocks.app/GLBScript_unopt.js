var fileSystem = new VirtualFileSystem(localStorage.getItem("filesystem"));
var staticFileSystem = new VirtualFileSystem();
staticFileSystem.createDir("/media");
fileSystem.createDir("/media");
var viewMode = "graphics";
var compileTime = "?=>?:=A:>=->CG?>G>@";
var userDefVersion = "===;==>";
var hostId = "?F=E>CqB";
var uniqueId = new Date().getTime()+""+Math.random()*10000000;
var startTime = new Date().getTime();
var debugMode = false;
var global8_bTriTris = 0, global6_fdelay = 0.0, global6_blocks = new GLBArray(), global3_hit = new GLBArray(), global3_col = new GLBArray(), global5_a_Str = "", global5_b_Str = "", global5_score = 0.0, global10_scorelines = 0.0, global6_stonet = 0.0, global6_stonec = 0.0, global6_stonex = 0.0, global6_stoney = 0.0, global7_stonesx = 0.0, global7_stonesy = 0.0, global6_stoner = 0.0, global13_ReleaseRotate = 0.0, global5_Level = 0.0, global9_NeedLines = 0.0;
function main(){
	global8_bTriTris = 0;
	SETCURRENTDIR("Media");
	DIM(unref(global6_blocks), [7, 4, 4, 4], 0.0);
	DIM(unref(global3_hit), [40, 30], 0.0);
	DIM(unref(global3_col), [6], 0.0);
	LOADSPRITE("chicks.png", 100);
	InitStones();
	NewLevel();
	CLEARSCREEN(0);
	
}
function GLB_ON_LOOP() {
	MoveStone();
	ShowAll();
	ShowCurrent();
	PRINT((("FPS: ") + (CAST2STRING(func6_GetFPS()))), 400, 80, 0);
	SHOWSCREEN();
	
};
window['GLB_ON_LOOP'] = GLB_ON_LOOP;
function InitStones() {
	var local3_dot = 0.0, local1_x = 0.0;
	if (global8_bTriTris) {
		var local3_blk = 0.0;
		for (local3_blk = 0;forCheck(local3_blk, 5, 1);local3_blk += 1) {
			var local3_rot = 0.0;
			if ((((local3_blk) == (0)) ? 1 : 0)) {
				global5_a_Str = "   ***    *  *  *    ***    *  *  * ";
				
			};
			if ((((local3_blk) == (1)) ? 1 : 0)) {
				global5_a_Str = "   *  ** ** *      **  *        * **";
				
			};
			if ((((local3_blk) == (2)) ? 1 : 0)) {
				global5_a_Str = "*   *   *  * * *  *   *   *  * * *  ";
				
			};
			if ((((local3_blk) == (3)) ? 1 : 0)) {
				global5_a_Str = "**   *     *  * *    *   ** * *  *  ";
				
			};
			if ((((local3_blk) == (4)) ? 1 : 0)) {
				global5_a_Str = " ***      *   *  *     *** *  *   * ";
				
			};
			if ((((local3_blk) == (5)) ? 1 : 0)) {
				global5_a_Str = "   * * *  * *   *  * * *    *   * * ";
				
			};
			for (local3_rot = 0;forCheck(local3_rot, 3, 1);local3_rot += 1) {
				var local1_x = 0.0;
				for (local1_x = 0;forCheck(local1_x, 2, 1);local1_x += 1) {
					var local1_y = 0.0;
					for (local1_y = 0;forCheck(local1_y, 2, 1);local1_y += 1) {
						local3_dot = 0;
						global5_b_Str = MID_Str(unref(global5_a_Str), CAST2INT(((((local1_x) + (((local1_y) * (3))))) + (((local3_rot) * (9))))), 1);
						if ((((global5_b_Str) == ("*")) ? 1 : 0)) {
							local3_dot = 1;
							
						};
						global6_blocks.arrAccess(local3_blk, local3_rot, local1_x, local1_y).values[tmpPositionCache] = local3_dot;
						
					};
					
				};
				
			};
			
		};
		
	} else {
		var local3_blk = 0.0, local1_y = 0.0;
		for (local3_blk = 1;forCheck(local3_blk, 6, 1);local3_blk += 1) {
			var local3_rot = 0.0;
			if ((((local3_blk) == (1)) ? 1 : 0)) {
				global5_a_Str = "** **    ** **    ** **    ** **";
				
			};
			if ((((local3_blk) == (2)) ? 1 : 0)) {
				global5_a_Str = "****     **  *  *   ****   *  *  **";
				
			};
			if ((((local3_blk) == (3)) ? 1 : 0)) {
				global5_a_Str = "***  *    *  * ** *  ***   ** *  *";
				
			};
			if ((((local3_blk) == (4)) ? 1 : 0)) {
				global5_a_Str = "**  **    * ** *  **  **   * ** *";
				
			};
			if ((((local3_blk) == (5)) ? 1 : 0)) {
				global5_a_Str = " ****    *  **  *  ****    *  **  *";
				
			};
			if ((((local3_blk) == (6)) ? 1 : 0)) {
				global5_a_Str = "*** *     * **  *  * ***   *  ** *";
				
			};
			for (local3_rot = 0;forCheck(local3_rot, 3, 1);local3_rot += 1) {
				var local1_x = 0.0;
				for (local1_x = 0;forCheck(local1_x, 2, 1);local1_x += 1) {
					var local1_y = 0.0;
					for (local1_y = 0;forCheck(local1_y, 2, 1);local1_y += 1) {
						local3_dot = 0;
						global5_b_Str = MID_Str(unref(global5_a_Str), CAST2INT(((((local1_x) + (((local1_y) * (3))))) + (((local3_rot) * (9))))), 1);
						if ((((global5_b_Str) == ("*")) ? 1 : 0)) {
							local3_dot = 1;
							
						};
						global6_blocks.arrAccess(local3_blk, local3_rot, local1_x, local1_y).values[tmpPositionCache] = local3_dot;
						
					};
					
				};
				
			};
			
		};
		for (local1_y = 0;forCheck(local1_y, 3, 1);local1_y += 1) {
			global6_blocks.arrAccess(0, 0, local1_y, 1).values[tmpPositionCache] = 1;
			global6_blocks.arrAccess(0, 1, 1, local1_y).values[tmpPositionCache] = 1;
			global6_blocks.arrAccess(0, 2, local1_y, 1).values[tmpPositionCache] = 1;
			global6_blocks.arrAccess(0, 3, 1, local1_y).values[tmpPositionCache] = 1;
			
		};
		
	};
	for (local1_x = 0;forCheck(local1_x, 39, 1);local1_x += 1) {
		var local1_y = 0.0;
		for (local1_y = 0;forCheck(local1_y, 29, 1);local1_y += 1) {
			global3_hit.arrAccess(local1_x, local1_y).values[tmpPositionCache] = 99;
			
		};
		
	};
	for (local1_x = 1;forCheck(local1_x, 11, 1);local1_x += 1) {
		var local1_y = 0.0;
		for (local1_y = 0;forCheck(local1_y, 28, 1);local1_y += 1) {
			global3_hit.arrAccess(local1_x, local1_y).values[tmpPositionCache] = 0;
			
		};
		
	};
	global3_col.arrAccess(0).values[tmpPositionCache] = CAST2FLOAT(RGB(80, 180, 255));
	global3_col.arrAccess(1).values[tmpPositionCache] = CAST2FLOAT(RGB(255, 255, 80));
	global3_col.arrAccess(2).values[tmpPositionCache] = CAST2FLOAT(RGB(255, 125, 50));
	global3_col.arrAccess(3).values[tmpPositionCache] = CAST2FLOAT(RGB(255, 50, 50));
	global3_col.arrAccess(4).values[tmpPositionCache] = CAST2FLOAT(RGB(50, 255, 50));
	global3_col.arrAccess(5).values[tmpPositionCache] = CAST2FLOAT(RGB(128, 50, 255));
	global5_score = 0;
	NewStone();
	
};
window['InitStones'] = InitStones;
function ShowAll() {
	var local1_c = 0.0, local1_x = 0.0, local1_i = 0.0;
	for (local1_x = 0;forCheck(local1_x, 12, 1);local1_x += 1) {
		var local1_y = 0.0;
		for (local1_y = 29;forCheck(local1_y, 0, CAST2FLOAT(-(1)));local1_y += CAST2FLOAT(-(1))) {
			local1_c = global3_hit.arrAccess(local1_x, local1_y).values[tmpPositionCache];
			if ((((local1_c) > (0)) ? 1 : 0)) {
				if ((((local1_c) > (5)) ? 1 : 0)) {
					local1_c = 0;
					
				};
				func4_Lego(((local1_x) * (16)), ((local1_y) * (16)), local1_c);
				
			};
			
		};
		
	};
	for (local1_i = 0;forCheck(local1_i, 19, 1);local1_i += 1) {
		
	};
	PRINT((("$:") + (CAST2STRING(global5_score))), 400, 32, 0);
	PRINT((("L:") + (CAST2STRING(global10_scorelines))), 400, 50, 0);
	
};
window['ShowAll'] = ShowAll;
function func4_Lego(param1_x, param1_y, param1_c) {
	param1_x = unref(param1_x);
	param1_y = unref(param1_y);
	param1_c = unref(param1_c);
	DRAWRECT(((param1_x) + (4)), ((param1_y) - (4)), 7, 3, unref(CAST2INT(global3_col.arrAccess(param1_c).values[tmpPositionCache])));
	DRAWRECT(unref(param1_x), unref(param1_y), 15, 15, unref(CAST2INT(global3_col.arrAccess(param1_c).values[tmpPositionCache])));
	return 0;
	
};
function NewStone() {
	if (global8_bTriTris) {
		global6_stonet = RND(5);
		
	} else {
		global6_stonet = RND(6);
		
	};
	global6_stonec = ((RND(4)) + (1));
	global6_stonex = 4;
	global6_stoney = 4;
	global7_stonesx = 0;
	global7_stonesy = 0;
	global6_stoner = 0;
	global13_ReleaseRotate = 1;
	
};
window['NewStone'] = NewStone;
function ShowCurrent() {
	var local1_x = 0.0;
	for (local1_x = 0;forCheck(local1_x, 3, 1);local1_x += 1) {
		var local1_y = 0.0;
		for (local1_y = 0;forCheck(local1_y, 3, 1);local1_y += 1) {
			if (CAST2INT(global6_blocks.arrAccess(global6_stonet, global6_stoner, local1_x, local1_y).values[tmpPositionCache])) {
				var local2_bx = 0.0, local2_by = 0.0;
				local2_bx = ((((local1_x) + (global6_stonex))) * (16));
				local2_by = ((((local1_y) + (global6_stoney))) * (16));
				func4_Lego(((local2_bx) + (global7_stonesx)), ((local2_by) + (global7_stonesy)), global6_stonec);
				
			};
			
		};
		
	};
	
};
window['ShowCurrent'] = ShowCurrent;
function func13_CheckPosition(param2_px, param2_py) {
	var __labels = {"skip": 1305};
	
	param2_px = unref(param2_px);
	param2_py = unref(param2_py);
	var local1_x = 0.0, local1_y = 0.0, local6_isfree = 0.0;
	var __pc = 1230;
	while(__pc >= 0) {
		switch(__pc) {
			case 1230:
				local6_isfree = 1;
				
			case 1307:
				local1_x = 0
				
			case 1235: //dummy for1
				if (!forCheck(local1_x, 3, 1)) {__pc = 1239; break;}
				
				case 1306:
					local1_y = 0
				
			case 1245: //dummy for1
				if (!forCheck(local1_y, 3, 1)) {__pc = 1249; break;}
				
				case 1280:
					if (!(((((((((((((((local1_x) + (global6_stonex))) < (0)) ? 1 : 0)) || ((((((local1_y) + (global6_stoney))) < (0)) ? 1 : 0))) ? 1 : 0)) || ((((((local1_y) + (global6_stoney))) > (29)) ? 1 : 0))) ? 1 : 0)) || ((((((local1_x) + (global6_stonex))) > (39)) ? 1 : 0))) ? 1 : 0))) { __pc = 1277; break; }
				
				case 1279:
					__pc = __labels["skip"]; break;
					
				
				
			case 1277: //dummy jumper1
				;
					
				case 1304:
					if (!(CAST2INT(global6_blocks.arrAccess(global6_stonet, global6_stoner, local1_x, local1_y).values[tmpPositionCache]))) { __pc = 1287; break; }
				
				case 1303:
					if (!((((global3_hit.arrAccess(((local1_x) + (param2_px)), ((local1_y) + (param2_py))).values[tmpPositionCache]) != (0)) ? 1 : 0))) { __pc = 1299; break; }
				
				case 1302:
					return 0;
					
				
				
			case 1299: //dummy jumper1
				;
					
				
				
			case 1287: //dummy jumper1
				;
					
				case 1305:
					//label: skip;
					
				
				local1_y += 1;
				__pc = 1245; break; //back jump
				
			case 1249: //dummy for
				;
					
				
				local1_x += 1;
				__pc = 1235; break; //back jump
				
			case 1239: //dummy for
				;
				
			return tryClone(unref(local6_isfree));
			return 0;
			__pc = -1; break;
			default:
				throwError("Gotocounter exception pc: "+__pc);
			
		}
	}
};
function MoveStone() {
	var local2_dx = 0.0, local2_dy = 0.0;
	if ((((global7_stonesx) < (0)) ? 1 : 0)) {
		global7_stonesx = ((global7_stonesx) + (2));
		
	};
	if ((((global7_stonesx) > (0)) ? 1 : 0)) {
		global7_stonesx = ((global7_stonesx) - (2));
		
	};
	if ((((global7_stonesx) == (0)) ? 1 : 0)) {
		local2_dx = 0;
		if (KEY(203)) {
			local2_dx = CAST2FLOAT(-(1));
			
		};
		if (KEY(205)) {
			local2_dx = 1;
			
		};
		if (CAST2INT(func13_CheckPosition(((global6_stonex) + (local2_dx)), global6_stoney))) {
			global6_stonex = ((global6_stonex) + (local2_dx));
			global7_stonesx = ((-(local2_dx)) * (16));
			
		};
		
	};
	if (KEY(200)) {
		if (CAST2INT(global13_ReleaseRotate)) {
			global13_ReleaseRotate = 0;
			global6_stoner = CAST2FLOAT(MOD(CAST2INT(((global6_stoner) + (1))), 4));
			if ((((func13_CheckPosition(global6_stonex, global6_stoney)) == (0)) ? 1 : 0)) {
				global6_stoner = CAST2FLOAT(MOD(CAST2INT(((global6_stoner) + (3))), 4));
				
			};
			
		};
		
	} else {
		global13_ReleaseRotate = 1;
		
	};
	if ((((global7_stonesy) < (0)) ? 1 : 0)) {
		global7_stonesy = ((global7_stonesy) + (4));
		
	};
	if ((((global7_stonesy) == (0)) ? 1 : 0)) {
		global6_fdelay = ((global6_fdelay) + (1));
		
	};
	if ((((KEY(208)) && ((((global7_stonesy) == (0)) ? 1 : 0))) ? 1 : 0)) {
		global6_fdelay = 500;
		
	};
	if ((((global6_fdelay) > (((100) - (((global5_Level) * (10)))))) ? 1 : 0)) {
		global6_fdelay = 0;
		if (CAST2INT(func13_CheckPosition(global6_stonex, ((global6_stoney) + (1))))) {
			global6_stoney = ((global6_stoney) + (1));
			global7_stonesy = CAST2FLOAT(-(16));
			
		} else {
			StickStone();
			CheckLines();
			
		};
		
	};
	
};
window['MoveStone'] = MoveStone;
function StickStone() {
	var __labels = {"skip": 1002};
	
	var local1_x = 0.0, local1_y = 0.0;
	var __pc = 1004;
	while(__pc >= 0) {
		switch(__pc) {
			case 1004:
				local1_x = 0
				
			case 937: //dummy for1
				if (!forCheck(local1_x, 3, 1)) {__pc = 941; break;}
				
				case 1003:
					local1_y = 0
				
			case 947: //dummy for1
				if (!forCheck(local1_y, 3, 1)) {__pc = 951; break;}
				
				case 982:
					if (!(((((((((((((((local1_x) + (global6_stonex))) < (0)) ? 1 : 0)) || ((((((local1_y) + (global6_stoney))) < (0)) ? 1 : 0))) ? 1 : 0)) || ((((((local1_y) + (global6_stoney))) > (29)) ? 1 : 0))) ? 1 : 0)) || ((((((local1_x) + (global6_stonex))) > (39)) ? 1 : 0))) ? 1 : 0))) { __pc = 979; break; }
				
				case 981:
					__pc = __labels["skip"]; break;
					
				
				
			case 979: //dummy jumper1
				;
					
				case 1001:
					if (!(CAST2INT(global6_blocks.arrAccess(global6_stonet, global6_stoner, local1_x, local1_y).values[tmpPositionCache]))) { __pc = 989; break; }
				
				case 1000:
					global3_hit.arrAccess(((local1_x) + (global6_stonex)), ((local1_y) + (global6_stoney))).values[tmpPositionCache] = global6_stonec;
					
				
				
			case 989: //dummy jumper1
				;
					
				case 1002:
					//label: skip;
					
				
				local1_y += 1;
				__pc = 947; break; //back jump
				
			case 951: //dummy for
				;
					
				
				local1_x += 1;
				__pc = 937; break; //back jump
				
			case 941: //dummy for
				;
				
			NewStone();
			__pc = -1; break;
			default:
				throwError("Gotocounter exception pc: "+__pc);
			
		}
	}
};
window['StickStone'] = StickStone;
function CheckLines() {
	var local1_x = 0.0, local1_y = 0.0, local5_count = 0.0, local5_lines = 0.0;
	for (local1_y = 0;forCheck(local1_y, 28, 1);local1_y += 1) {
		local5_count = 0;
		for (local1_x = 1;forCheck(local1_x, 11, 1);local1_x += 1) {
			if ((((global3_hit.arrAccess(local1_x, local1_y).values[tmpPositionCache]) > (0)) ? 1 : 0)) {
				local5_count = ((local5_count) + (1));
				
			};
			
		};
		if ((((local5_count) == (11)) ? 1 : 0)) {
			func10_RemoveLine(local1_y);
			local5_lines = ((local5_lines) + (1));
			
		};
		
	};
	global5_score = ((global5_score) + (((local5_lines) * (local5_lines))));
	global10_scorelines = ((global10_scorelines) + (local5_lines));
	global9_NeedLines = ((global9_NeedLines) - (local5_lines));
	if ((((global9_NeedLines) <= (0)) ? 1 : 0)) {
		NewLevel();
		
	};
	
};
window['CheckLines'] = CheckLines;
function func10_RemoveLine(param2_ly) {
	param2_ly = unref(param2_ly);
	var local1_x = 0.0, local1_y = 0.0;
	for (local1_y = param2_ly;forCheck(local1_y, 1, CAST2FLOAT(-(1)));local1_y += CAST2FLOAT(-(1))) {
		for (local1_x = 1;forCheck(local1_x, 11, 1);local1_x += 1) {
			global3_hit.arrAccess(local1_x, local1_y).values[tmpPositionCache] = global3_hit.arrAccess(local1_x, ((local1_y) - (1))).values[tmpPositionCache];
			
		};
		
	};
	for (local1_x = 1;forCheck(local1_x, 11, 1);local1_x += 1) {
		global3_hit.arrAccess(local1_x, 0).values[tmpPositionCache] = 0;
		
	};
	return 0;
	
};
function NewLevel() {
	global5_Level = ((global5_Level) + (1));
	if ((((global5_Level) > (10)) ? 1 : 0)) {
		global5_Level = 10;
		
	};
	global9_NeedLines = 0;
	SETLOOP(unref(NewLevel_Loop));
	
};
window['NewLevel'] = NewLevel;
function NewLevel_Loop() {
	ShowAll();
	PRINT((("Level: ") + (CAST2STRING(global5_Level))), 20, 100, 0);
	SHOWSCREEN();
	if (ANYKEY()) {
		global9_NeedLines = 20;
		BLACKSCREEN();
		DRAWSPRITE(100, 320, 0);
		USEASBMP();
		SETLOOP(0);
		
	};
	
};
window['NewLevel_Loop'] = NewLevel_Loop;
function func6_GetFPS() {
	static8_GetFPS_fps_time = CAST2INT(GETTIMERALL());
	static11_GetFPS_fps_counter = ((static11_GetFPS_fps_counter) + (1));
	if ((((((static8_GetFPS_fps_time) - (static8_GetFPS_fps_temp))) > (1000)) ? 1 : 0)) {
		static8_GetFPS_fps_temp = static8_GetFPS_fps_time;
		static3_GetFPS_fps = static11_GetFPS_fps_counter;
		static11_GetFPS_fps_counter = 0;
		
	};
	return tryClone(unref(CAST2FLOAT(static3_GetFPS_fps)));
	return 0;
	
};
// set default statics:
var static8_GetFPS_fps_time = 0, static11_GetFPS_fps_counter = 0, static3_GetFPS_fps = 0, static8_GetFPS_fps_temp = 0;


//JS LIB: JS/lib.js

if (viewMode == 'console') {
	window.onload=function( e ){
		updateConsole();
	}
}

//alert = function() {}

//------------------------------------------------------------
//Funny variables
//------------------------------------------------------------

var waitload			= 0; //auf wieviel wird gewartet (gibts auch in 2d.js) 
var exec 				= false;
var tmpPositionCache 	= -1; 
var consoleOutput;
var consoleSize 		= 10000;
var currentDir;
var mainCall			= false;

//------------------------------------------------------------
//Output
//------------------------------------------------------------

function STDOUT(text) {
	if (consoleOutput == undefined) {
		consoleOutput = document.getElementById("console");
	}
	
	if (consoleOutput) {
		if (LEN(consoleOutput.value) + LEN(text) > consoleSize) {
			//consoleOutput.value = MID_Str(consoleOutput.value, (LEN(consoleOutput.value) + LEN(text)) - consoleSize);
		}
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

function KEYWAIT() {
	alert("TODO: keywait");
}

function MOUSEWAIT() {
	alert("TODO: mousewait");
}

function DEBUG(text) {
	console.log(text);
}

function END() {
	window.onbeforeunload();
	throw "endprog";
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
			//TODO: Andere Devices berücksichtigen
			return "DESKTOP";
		case "BATTERY":
			var bat = navigator.battery || window.navigator.battery || navigator.battery || navigator.mozBattery || navigator.webkitBattery;
			return bat ? bat.level*100 : 100;
		case "TIME":
			var d = new Date();
			var f = function(val) {
				val = CAST2STRING(val);
				if (LEN(val) == 1) val = "0" + val;
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
			if (LEN(info) > LEN("GLEXT:") && MID_Str(info, 0, LEN("GLEXT:")) == "GLEXT:") {
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
	try {
		eval("window."+name+"();");
		return 1;
	} finally {
		return 0;
	}
}

//------------------------------------------------------------
//Runtime stuff
//------------------------------------------------------------

var expectedErrors = ["endprog", "exitloop", "GLBERR"]

var callStack = []
/**
* @constructor
*/
function StackFrame(name, info) {
	this.name = name;
	this.info = info;
}

function stackPush(name, info) {
	callStack.push(new StackFrame(name, info));
}

function stackPop() {
	callStack.pop();
}

function stackTrace() {
	callStack = callStack.reverse();
	var output = "";
	for (var i = 0; i < callStack.length; i++) {
		output += "\tin '"+callStack[i].name+"' in file '"+MID_Str(callStack[i].info, INSTR(callStack[i].info, ":")+1)+"' in line '"+MID_Str(callStack[i].info, 0, INSTR(callStack[i].info, ":"))+"'\n";
	}
	callStack = callStack.reverse();
	return output;
}

function throwError(msg) {
	if (isKnownException(msg)) {
		throw msg; //wenn bekannt, dann nicht als fehler werfen
	} else {
		msg = "Error '"+msg+"'";
		if (debugMode) {
			var info = __debugInfo;
			//debug modus
			msg += "\nAppeared in line '"+MID_Str(info, 0, INSTR(info, ":"))+"' in file '"+MID_Str(info, INSTR(info, ":")+1)+"' "
			
			msg += "\n\n"+stackTrace();
		}
		throw msg;
	}
}

function forCheck(cur, to, step) {
	if (step > 0) {
		return cur <= to;
	} else if(step < 0) {
		return cur >= to;
	} else {
		return true;
	}
}

function isKnownException(ex) {
	ex = ex.toString();
	for(var i = 0; i < expectedErrors.length; i++) {
		if (ex.indexOf(expectedErrors[i]) == 0) return true
	}
	return false;
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
		if (ex != "endprog") throwError(ex);
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

//------------------------------------------------------------
//ARRAY FUN
//------------------------------------------------------------


/**
* Ein GLBArray ist ein Array, welches versucht die GLBArrays unter GLBasic so gut wie möglich zu simulieren.
* @constructor
*/
function GLBArray() {
	// optimize this beast of code
	this.values = new Array();
	this.dimensions = [0];
	this.defval = 0;
	this.arrAccess = function() {
		/*switch (this.arrAccess.arguments.length) {
			case 1:
				tmpPositionCache = CAST2INT(this.arrAccess.arguments[0]);
				break;
			case 2:
				tmpPositionCache = CAST2INT(this.arrAccess.arguments[0]) + CAST2INT(this.arrAccess.arguments[1])*this.dimensions[0];
				break;
			case 3:
				tmpPositionCache = CAST2INT(this.arrAccess.arguments[0]) + CAST2INT(this.arrAccess.arguments[1])*this.dimensions[0]  + CAST2INT(this.arrAccess.arguments[2])*this.dimensions[0]*this.dimensions[1] ;
				break;
			case 4:
				tmpPositionCache = CAST2INT(this.arrAccess.arguments[0]) + CAST2INT(this.arrAccess.arguments[1])*this.dimensions[0]  + CAST2INT(this.arrAccess.arguments[2])*this.dimensions[0]*this.dimensions[1]+ CAST2INT(this.arrAccess.arguments[2])*this.dimensions[0]*this.dimensions[1]*this.dimensions[];
				break;
			default:
				var mul = 1;
				var j = 0;
				tmpPositionCache = 0;
				for (var i = this.arrAccess.arguments.length-1; i >= 0 ; i--) {
					var position = CAST2INT(this.arrAccess.arguments[i]);
					
					if (position < 0)
						tmpPositionCache += (this.dimensions[i] + position)*mul;
					else
						tmpPositionCache += position*mul;
					
					mul += (this.dimensions[i] - 1);
				}
				break;
		}
		if (tmpPositionCache < 0 || tmpPositionCache >= this.values.length) {
			var acc = "";
			var start = false;
			for (var i = 0; i < this.arrAccess.arguments.length-1 ; i--) {
				if (start) acc += ", "
				acc += ""+CAST2INT(this.arrAccess.arguments[i]);
				start = true;
			}
			throwError("Array index out of bounds access, position: ["+acc+"]");
		}*/
		var mul = this.values.length/this.dimensions[this.arrAccess.arguments.length-1];
		var j = 1;
		tmpPositionCache = 0;
		for (var i = this.arrAccess.arguments.length-1; i >= 0 ; i--) {
		//for (var i = this.arrAccess.arguments.length-1; i >= 0 ; i--) {
			var position = CAST2INT(this.arrAccess.arguments[i]);
			
			if (position < 0)
				tmpPositionCache += (this.dimensions[i] + position)*mul;
			else
				tmpPositionCache += position*mul;
			
			if (tmpPositionCache < 0 || tmpPositionCache >= this.values.length) {
				var acc = "";
				var start = false;
				for (var i = 0; i < this.arrAccess.arguments.length-1 ; i--) {
					if (start) acc += ", "
					acc += ""+CAST2INT(this.arrAccess.arguments[i]);
					start = true;
				}
				throwError("Array index out of bounds access, position: ["+acc+"]");
			}
			
			mul /= this.dimensions[i-1];
			j++;
			//mul += (this.dimensions[i]+1)
		}
		return this;
	}
	this.clone = function() {
		var other = new GLBArray();
		other.values = this.values.slice(0);
		other.dimensions = this.dimensions.slice(0);
		other.defval = this.defval;
		other.arrAccess = this.arrAccess;
		
		if (this.values != undefined && this.values.dimensions != undefined) {
			for (var i = 0; i < this.values.length; i++) {
				other.values[i] = tryClone(this.values[i]);
			}
		}
		
		return other;
	};
	
	return this;
}

function realArrSize(dims) {
	var realSize = 1;
	for(d in dims) {
		realSize *= dims[d];
	}
	return realSize;
}

//Dimensioniert das gegebene Array
function DIM(vari, dims, value) {
	vari.values = [];
	vari.values.length = realArrSize(dims);
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
	
	vari.dimensions = dims;
	vari.defval = value;
	
	
	//OBACHT könnte bei mehrdimensionalen arrys unerwartete ergebnisse liefern, wenn man elemente rauslöscht
	vari.values.length = realArrSize(dims);
	for(i = 0; i < vari.values.length; i++) {
		if (i >= oldLength) {
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

function LEN(vari) {
	if (typeof(vari) == 'string' || typeof(vari) == 'number') {
		return CAST2STRING(vari).length//+1;
	} else if (vari.constructor === GLBArray) {
		return BOUNDS(vari, 0);
	} else {
		throwError("Cannot get the length of: "+typeof(vari)+", "+vari.constructor);
	}
}

//------------------------------------------------------------
//MATH
//------------------------------------------------------------

function SEEDRND(seed) {
	alert("TODO: seedrnd");
}

function RND(range) {
    if (range == 0) return 0;
    return Math.random()*range;
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
	return a%b;
}

function FMOD(num, div) {
	return mod%div;
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
					alert("TODO: Default sortarray with types!");
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

//Castet die gegebene Value in eine Ganzzahl (falls NaN kommt => 0 returnen)
function CAST2INT(value) {
	switch (typeof value) {
		case 'function':
			return 1;
		case 'undefined':
			return 0;
	}
	switch(""+value) {
		case 'true':
			value = 1;
		case 'false':
			value = 0;
	}
	
	if (debugMode) {
		var v = value;
		value = parseInt(String(value));
		if (isNaN(value)) {
			throwError("Not a number: '"+v+"'");
		}
	} else {
		value = parseInt(String(value));
		if (isNaN(value)) {
			value = 0;
		}
	}
	
	
	return value;
}

function INTEGER(value) {
	return CAST2INT(value);
}

//Castet die gegebene Value in eine Gleitkommazahl (falls NaN kommt => 0 returnen)
function CAST2FLOAT(value) {
	switch (typeof value) {
		case 'function':
			return 1.0;
		case 'undefined':
			return 0.0;
	}
	switch(""+value) {
		case 'true':
			value = 1;
		case 'false':
			value = 0;
	}
	
	
	value = parseFloat(String(value));
	if (isNaN(value)) {
		value = 0.0;
	}
	return value;
}

function STACKTRACE_Str() {
	return stackTrace();
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
		str = MID_Str(str, 0, LEN(str)-1);
	}
	
	return str;
}

function ENCRYPT_Str(code, text) {
	var add = 0;
	for (i = 0; i < LEN(code); i++) {
		add += ASC(code, i);
	}
	add = add %  16;
	
	var newText = "";
	for (i = 0; i < LEN(text); i++) {
		newText = newText + CHR_Str(ASC(text, i)+add);
	}
	return newText;
}

function DECRYPT_Str(code, text) {
	var add = 0;
	for (i = 0; i < LEN(code); i++) {
		add += ASC(code, i);
	}
	add = add % 16;
	
	var newText = "";
	for (i = 0; i < LEN(text); i++) {
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
		if (count == -1)
			return str.substr(start);
		else
			return str.substr(start, count);
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
		return str.substr(LEN(str) - count, count);
	} catch (ex) {
		throwError("string error (RIGHT$): '"+str+"' count: '"+count+"'");
	}
}

//Castet die gegebene Value in eine Zeichenkette
function CAST2STRING(value) {
	switch (typeof value) {
		case 'function':
			return "1";
		case 'undefined':
			return "0";
	}
	
	return ""+value;
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
		
		return LEN(split);
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
			var data = this.getFile(from).data;
			this.createFile(to, data);
		}
	}
	
	this.getCurrentDir = function() {
		return this.curDir;
	}	
	
	this.setCurrentDir = function(dir) {
		if (LEFT_Str(dir, 1) != "/") dir += "/" //muss mit / enden!
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
			var d = rawpath(file, this.mainDir);
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
			return d.dir.createFile(d.name, data);
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
		return this.mainDir;
	}
	
	this.save = function() {
		return this.mainDir.save();
	}
	
	if (text != undefined) {
		//temporär die kürzel erstellen
		window["fileSystem"] = this;
		eval(REPLACE_Str(text, "t.", "window.fileSystem."));
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
			if (this.subDirs[i].name == file) {
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
	
	this.createFile = function(name, data) {
		var f = new VirtualFile(this, name, data);
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
function VirtualFile(dir, name, data) {
	this.name = name;
	this.data = data;
	this.dir = dir;
	
	this.getName = function() {
		return this.name;
	}
	
	this.getData = function() {
		return this.data;
	}
	
	this.save = function() {
		return "t.cF(\""+this.dir.getPath()+"/"+this.name+"\", "+JSON.stringify(this.data)+");\n";
	}
}

/**
* @constructor
*/
function Channel(channel, file, mode) {
	this.channel = channel;
	this.mode = mode;
	this.ptr = 0;
	
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
				this.file = fileSystem.createFile(file, tmp.data);
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
		this.ptr = this.file.data.length;
	}
	
	this.updateSize = function() {
		if (this.ptr > this.file.data.length) this.file.data.length = this.ptr;
	}
	
	this.checkPosition = function() {
		if (this.ptr > this.file.data.length) throwError("Reached end of file: '"+this.ptr+"' filesize: '"+this.file.data.length+"'");
	}
	
	this.ENDOFFILE = function() {
		return this.ptr > this.file.data.length || this.ptr < 0;
	}
	this.FILESEEK = function(bytes, dir) {
		var old = this.ptr;
		switch(dir) {
			case -1:
				this.ptr = this.file.data.length - bytes;
				break;
			case 0:
				this.ptr = bytes;
				break;
			case 1:
				this.ptr += bytes;
				break;
		}
		if (this.ENDOFFILE()) this.ptr = old; //wenn außerhalb, dann zurücksetzen
	}
	
	//reads:
	this.READLINE = function() {
		var line = ""
		var character = "";
		while((character = String.fromCharCode(this.file.data[this.ptr])) != "\n" && (this.ptr < this.file.data.length)) {
			line = line + character;
			this.ptr++;
		}
		this.ptr++;
		//das \r am ende weg
		if (line.substr(line.length-1,1)=="\r") {
			line = line.substr(0, line.length-1);
		}
		this.checkPosition();
		return line;
	}
	this.READBYTE = function() {
		this.ptr++;
		var tmp = new Int8Array(1);
		tmp[0] = this.file.data[this.ptr-1]; //in ein byte converten
		this.checkPosition();
		return tmp[0];
	}
	this.READUBYTE = function() {
		this.ptr++;
		var tmp = new Uint8Array(1);
		tmp[0] = this.file.data[this.ptr-1]; //in ein ubyte casten
		this.checkPosition();
		return tmp[0];
	}
	this.READWORD = function() {
		this.ptr+=2;
		var buf = new ArrayBuffer(2);
		var view8 = new Uint8Array(buf);
		view8[0] = this.file.data[this.ptr-2];
		view8[1] = this.file.data[this.ptr-1];
		var tmp = new Int16Array(buf);
		this.checkPosition();
		return tmp[0];
	}
	this.READUWORD = function() {
		this.ptr+=2;
		var buf = new ArrayBuffer(2);
		var view8 = new Uint8Array(buf);
		view8[0] = this.file.data[this.ptr-2];
		view8[1] = this.file.data[this.ptr-1];
		var tmp = new Uint16Array(buf);
		this.checkPosition();
		return tmp[0];
	}
	this.READLONG = function() {
		this.ptr+=4;
		var buf = new ArrayBuffer(4);
		var view8 = new Uint8Array(buf);
		view8[0] = this.file.data[this.ptr-4];
		view8[1] = this.file.data[this.ptr-3];
		view8[2] = this.file.data[this.ptr-2];
		view8[3] = this.file.data[this.ptr-1];
		var tmp = new Int32Array(buf);
		this.checkPosition();
		return tmp[0];
	}
	this.READULONG = function() {
		this.ptr+=4;
		var buf = new ArrayBuffer(4);
		var view8 = new Uint8Array(buf);
		view8[0] = this.file.data[this.ptr-4];
		view8[1] = this.file.data[this.ptr-3];
		view8[2] = this.file.data[this.ptr-2];
		view8[3] = this.file.data[this.ptr-1];
		var tmp = new Uint32Array(buf);
		this.checkPosition();
		return tmp[0];
	}
	this.READIEEE = function() {
		this.ptr+=8;
		var buf = new ArrayBuffer(8);
		var view8 = new Uint8Array(buf);
		view8[0] = this.file.data[this.ptr-8];
		view8[1] = this.file.data[this.ptr-7];
		view8[2] = this.file.data[this.ptr-6];
		view8[3] = this.file.data[this.ptr-5];
		view8[4] = this.file.data[this.ptr-4];
		view8[5] = this.file.data[this.ptr-3];
		view8[6] = this.file.data[this.ptr-2];
		view8[7] = this.file.data[this.ptr-1];
		var tmp = new Float64Array(buf);
		this.checkPosition();
		return tmp[0];
	}
	this.READSHORTIEEE = function() {
		this.ptr+=4;
		var buf = new ArrayBuffer(4);
		var view8 = new Uint8Array(buf);
		view8[0] = this.file.data[this.ptr-4];
		view8[1] = this.file.data[this.ptr-3];
		view8[2] = this.file.data[this.ptr-2];
		view8[3] = this.file.data[this.ptr-1];
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
		this.file.data[this.ptr] = tmp[0];
		
		this.ptr++;
		this.updateSize();
	}
	this.WRITEUBYTE = function(data) {
		var tmp = new Uint8Array(1);
		tmp[0] = data;
		this.file.data[this.ptr] = tmp[0];
		
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
			//this.file.data[this.ptr] = ASC(data, i);
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
	var tmpDir = rawpath(fileSystem.getCurrentDir() + dir, fileSystem.getMainDir());
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
		if (!!f) return f.data.length;
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
						while(name.charAt(i) != endTok || i > name.length) i++; //bis es wieder zu einem spezialzeichen kommt, wiederholen
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

function PUTENV(name, value) {
	localStorage.setItem(("env_"+name).toLowerCase(), value);
}

function GETENV_Str(name) {
	return localStorage.getItem(("env_"+name).toLowerCase());
}

function rot13(text) {
	var newText = "";
	for (i = 0; i < LEN(text); i++) {
		newText = newText + CHR_Str(ASC(text, i)-13);
	}
	return newText;
}

function SLEEP(time) {
	var start = GETTIMERALL();
	while ((GETTIMERALL() - start)<time) {} //übler hack :/
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
					l = MID_Str(l, 0, INSTR_Str(l, ";"));
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
//-----------------------------------------------------------
//LocalStorage wrapper to cookies (if there is no localStorage
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

window.onbeforeunload = function (e) {
	e = e || window.event;
	
	//rufe noch GLB_ON_QUIT auf
	CALLBYNAME("GLB_ON_QUIT");
	
	//versuche nun das filesystem zu speichern
	saveFileSystem();
};

function saveFileSystem() {
	localStorage.setItem("filesystem", fileSystem.save());
}


//JS LIB: JS/2d.js
//------------------------------------------------------------
//Variables
//------------------------------------------------------------

if (viewMode == 'graphics') {
	window.onload=function( e ) {
		init2D('GLBCANVAS');
	}
}

var sprites		= []; 		//Alle Sprites im Array
var screens		= [];		//Alle Screens
var waitload	= 0; 		//Auf wieviele Sprites noch gewartet werden muss
var curScreen	= null;		//Der aktuell ausgew�hlte Screen
var context		= null; 	//Der JavaScript Kontext
var canvas		= null;		//Das Canvas auf das gezeichnet wird
var mouseX		= 0;		//Die X Position der Maus
var mouseY		= 0;		//Die Y Position der Maus
var clrColor	= RGB(0,0,0); //Die Hintergrundfarbe
var keyInput 	= [];		//Das Inputarray
var fontbuffer	= null;		//der frontbuffer
var backbuffer	= null;		//Der hintergrundbuffer
var initCalled	= false;	//wurde init aufgerufen?
var hasInit		= false;	//hat es init
var hasLoop		= false;	//hat es loop
var lastShwscrn	= 0;		//Wann wurde das letzte showscreen gemacht?
var showFPS		= -1; 		//wieviele fps?
var framePrev	= 0;		//welche ms gabs davor?
var frameDelay	= 0;		//wie lange soll gewarten werden?
var canvasWidth, canvasHeight; //Die breite/h�he
var anyKeyPress = false;	//Wurde eine Taste gedr�ckt?
var	background	= null;		//Das Hintergrundbg (USEASBMP oder LOADBMP)

var loopFunc = GLB_ON_LOOP;
//------------------------------------------------------------
// Basic 2D stuff
//------------------------------------------------------------

function update2D() {
	try {
		if (!waitload) {
			if (!initCalled) {
				initCalled = true;
				try {
					main();
					if (hasInit) GLB_ON_INIT(); //call the GLBasic defined initialization function
				} catch(ex) {
					if (ex != "exitloop") throwError(ex);
				}
			} else if (hasLoop) {
				canvasWidth = canvas.width; 
				canvasHeight = canvas.height;
				try {
					if (showFPS == -1) {
						loopFunc(); //mainloop
					} else {
						var frameStart = GETTIMERALL();
						var frameDelta = frameStart - framePrev;
						
						if (frameDelta >= frameDelay) {
							loopFunc(); //mainloop
							
							frameDelay = showFPS;
							if (frameDelta > frameDelay) {
								frameDelay = frameDelay - (frameDelta - frameDelay);
							}
							framePrev = frameStart;
						
						}
					}
				} catch(ex) {
					if (ex != "exitloop") throwError(ex);
				}
				anyKeyPress = false;
			}
		}
		window.requestAnimFrame(update2D, frontbuffer.canvas);
	} catch(ex) {
		if (ex != "endprog") throwError(ex);
	}
}

function SETLOOP(loop) {
	if (loop == 0) {
		loopFunc = GLB_ON_LOOP;
	} else {
		loopFunc = loop;
	}
	throw "exitloop";
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
			backbuffer.context.drawImage(background.canvas, 0, 0);
		}
	}
}

function init2D(canvasName) {
	hasInit = typeof(GLB_ON_INIT) == 'function';
	hasLoop = typeof(GLB_ON_LOOP) == 'function';
	
	frontbuffer = new Screen(document.getElementById(canvasName), -2);
	register(frontbuffer);
	
	var cnvs = document.createElement('canvas');
	cnvs.width = frontbuffer.canvas.width
	cnvs.height = frontbuffer.canvas.height
	backbuffer = new Screen(cnvs, -1);
	register(backbuffer);
	
	USESCREEN(-2);
    if (!context) {
		throwError("Canvas unsupported, please use a newer browser.");
		END();
	}
	
    canvas.style.cursor = 'none'; //hide pointer
    
	//mouse listener
    canvas.onmousemove = function(ev) {
    	if(!ev) ev = window.event();
		mouseX = ev.clientX - canvas.offsetLeft;
		mouseY = ev.clientY - canvas.offsetTop;
    }
	//key listener
	document.onkeydown = function(ev) {
		if(!ev) ev = window.event();
		keyInput[ev.keyCode] = true;
		anyKeyPress = true;
	}
	document.onkeyup = function(ev) {
		if(!ev) ev = window.event();
		keyInput[ev.keyCode] = false;
	}
	USESCREEN(-1);
	CLEARSCREEN(RGB(0,0,0)); //black background color
	
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
		if (obj.num>=screens.length) screens.length = obj.num + 3;
	} else {
		throwError("Cannot register unknown object: "+obj.constructor);
	}
}

//------------------------------------------------------------
//Basic classes (Sprite, Screen, etc)
//------------------------------------------------------------

/**
* @constructor
*/
function Sprite(img, num) {
	this.img = img;
	this.num = num;
	this.loaded = false;
}

/**
 * @constructor
 */
function Screen(buffer, num) {
	this.canvas = buffer;
	this.context = buffer.getContext('2d');
	this.realwidth = this.canvas.width;
	this.realheight = this.canvas.height;
	this.realx = this.canvas.offsetLeft;
	this.realy = this.canvas.offsetRight;
	this.num = num + 2;
	
	if (this.context == null) throwError("Given buffer does not support '2d'");
}


//------------------------------------------------------------
//Misc
//------------------------------------------------------------
function FOCEFEEDBACK(joy, dur, x, y) {
	var f = navigator.vibrate || navigator.mozVibrate;
	f(dur);
}

function GETTIMER() {
	return GETTIMERALL() - lastShwscrn;
}

function ALPHAMODE(mode) {
	throwError("TODO!");
}

function SETPIXEL(x, y, col) {
	DRAWRECT(x,y,1,1,col.toString(16));
}

function LIMITFPS(fps) {
	showFPS = fps;
}

function RGB(r, g, b) {
	function conv2Hex(d) {
		d = d.toString(16).toUpperCase();
		if (d.length < 2) d = "0"+d;
		return d;
	}
	if (r == undefined) r = 0;
	if (g == undefined) g = 0;
	if (b == undefined) b = 0;
	r = r%256; g = g%256; b = b%256
	//STDOUT(conv2Hex(r)+ "," + conv2Hex(g)+ "," + conv2Hex(b)+"<br>");
	return parseInt((conv2Hex(r) + conv2Hex(g) + conv2Hex(b)), 16);//.toString(10);
}

function SETTRANSPARENCY(rgb) {
	throwError("TODO: SETTRANS");
}

function SMOOTHSHADING(mode) {
	throwError("TODO: SMOOTHSHADING");
}

function SETSCREEN(width, height) {
	canvas.width = width;
	canvas.height = height;
}

function VIEWPORT(x, y, width, height) {
	if (x != 0 || y != 0 || width != canvas.width || height != canvas.height) {
		//clipping \o/
		context.beginPath();
		context.rect( x,y,width,height );
		context.clip();
		context.closePath();
	}
}

function ALLOWESCAPE(allow) {
	throwError("TODO: allowescape");
}

function AUTOPAUSE(mode) {
	throwError("TODO: autopause");
}

function HIBERNATE() {
	throwError("TODO: hibernate");
}

//------------------------------------------------------------
//get functions
//------------------------------------------------------------

function GETSCREENSIZE(width, height) {
	width[0] = canvasWidth
	height[0] = canvasHeight;
}

function GETSPRITESIZE(num, width, height) {
	width[0] = sprites[num].img.width;
	height[0] = sprites[num].img.height;
}

function GETDESKTOPSIZE(width, height) {
	width[0] = window.innerWidth;
	height[0] = window.innerHeight;
}

function GETFONTSIZE(width, height) {
	width[0] = 0;
	height[0] = 0;
	throwError("TODO: fontsize");
}

function ISFULLSCREEN() {
	throwError("TODO: isfullscreen");
}

function GETPIXEL(x, y) {
	var index	= (x * 4) + (y * canvas.width * 4);
	throwError("TODO: getpixel");
	return RGB(index, index + 1, index + 2);
}

//------------------------------------------------------------
// Screens
//------------------------------------------------------------

function CREATESCREEN(scrid, sprid, width, height) {
	var buffer = document.createElement('canvas');
    buffer.width = width;
    buffer.height = height;
	
	register(new Screen(buffer, scrid));
	
	sprites[sprid] = new Sprite(buffer, sprid);
	if (sprid >= sprites.length) sprites.length = sprid + 1;
}

function USESCREEN(id) {
	curScreen = screens[id + 2];
	context = curScreen.context;
	canvas = curScreen.canvas;
}

function BLENDSCREEN(file, duration) {
	throwError("TODO: blendscreen");
}

function CLEARSCREEN(col) {
	context.save();
	context.fillStyle = '#'+col.toString(16);
	context.fillRect(0,0,canvas.width, canvas.height);
	clrColor = col;
	context.restore();
}

function BLACKSCREEN() {
	CLEARSCREEN(RGB(0,0,0));
}

function USEASBMP() {
	background = backbuffer;
	var buffer = document.createElement('canvas');
    buffer.width = canvasWidth;
    buffer.height = canvasHeight;
	backbuffer = new Screen(buffer, -1);
	register(backbuffer);
	USESCREEN(-1);
}

function LOADBMP(path) {
	var image = new Image();
	//existiert das bild im filesystem?
	if (DOESFILEEXIST(path)) {
		//ja, also lade es direkt
		throwError("TODO: load image from virtual file system");
	} else {
		//nein, also lade es von der hdd
		image.onload = function () { 
			//backbuffer setzen
			BLACKSCREEN();
			var buf = document.createElement('canvas');
			buf.width = canvasWidth;
			buf.height = canvasHeight;
			
			var scrn = new Screen(buf, -42);
			scrn.context.drawImage(image, 0, 0);
			
			background = scrn;
		}
		image.src = fileSystem.getCurrentDir() + path;
	}
	
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
	context.strokeStyle	= '#'+col.toString(16)+"FF";
	context.beginPath();
	context.moveTo(x1, y1);
	context.lineTo(x2, y2);
	context.stroke();
	context.restore();
}
function DRAWRECT(x,y,w,h,col) {
	context.save();
	context.fillStyle	= '#'+col.toString(16);
	context.fillRect(x, y, w, h);
	context.restore();
}

//------------------------------------------------------------
// poly functions
//------------------------------------------------------------
function ENDPOLY() {
	throwError("TODO: endpoly");
}

function POLYVECTOR(x, y, tx, ty, col) {
	throwError("TODO: polyvector");
}

function STARTPOLY(num, mode) {
	throwError("TODO: startpoly");
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

function DRAWANIM(num, frame, x, y) {
	throwError("TODO: drawanim");
}

function DRAWSPRITE(num, x, y) {
	if (!!sprites[num]) {
		if (!sprites[num]) {
			throwError("Image not yet loaded, please refractor your code!");
		}
		context.drawImage(sprites[num].img, x, y);
	}
}

function ROTOSPRITE(num, x, y, phi) {
	if ((phi%360) == 0) {
		DRAWSPRITE(num, x, y);
	} else {
		context.save();
		context.setRotation(phi * Math.PI / 180); //convert into RAD
		DRAWSPRITE(num, x, y);
		context.restore();
	}
}

function ZOOMSPRITE(num, x, y, sx, sy) {
	if (sx == 1 && sy == 1) {
		DRAWSPRITE(num, x, y);
	} else if (sx != 0 && sy != 0){
		context.save();
		context.scale(sx, sy);
		DRAWSPRITE(num, x, y);
		context.restore();
	}
}

function STRETCHSPRITE(num,  x, y, width, height) {
	ZOOMSPRITE(num, x, y, width/sprites[num].img.width, height/sprites[num].img.height);
}

function ROTOZOOMSPRITE(num, x, y,phi, scale) {
	context.save();
	context.scale(scale, scale);
	ROTOSPRITE(num, x, y, phi);
	context.restore();
}

function ROTOZOOMANIM(num, frame, x, y,phi, scale) {
	throwError("TODO: rotozoomanim");
}

function ROTOANIM(num, frame, x, y, phi) {
	throwError("TODO: rotoanim");
}

function ZOOMANIM(num,frame, x, y, sx, sy) {
	throwError("TODO: zoomanim");
}

function STRETCHANIM(num,frame,  x, y, width, height) {
	throwError("TODO: stretchanim");
}


//------------------------------------------------------------
//text
//------------------------------------------------------------

function PRINT(text, x, y, kerning) {
	context.save();
	context.font = "12pt Consolas";
	context.fillStyle	= '#ffffff';
	context.fillText(text, x, y);
	context.restore();
}

function SETFONT(num) {
	throwError("TODO: setfont");
}

//------------------------------------------------------------
//input
//------------------------------------------------------------

function MOUSESTATE(x, y, ml, mr) {
	x[0] 	= mouseX;
	y[0] 	= mouseY;
	ml[0]	= 0;
	mr[0]	= 0;
}

function SYSTEMPOINTER(show) {
	if (show) {
		canvas.style.cursor = 'auto';
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
		/*case KEY_SEMICOLON = 186:
			return 186;
		case KEY_EQUAL = 187:
			return 187;
		case KEY_COMMA = 188:
			return 188;
		case KEY_DASH = 189:
			return 189;
		case KEY_PERIOD = 190:
			return 190;
		case KEY_SLASH = 191:
			return 191;
		case KEY_LBRACKET = 219:
			return 219;
		case KEY_BACKSLASH = 220:
			return 220;
		case KEY_RBRACKET = 221:
			return 221;
		case KEY_QUOTE = 222:
			return 222;*/
	}
}

function INKEY_Str() {
	return "";
}

function ANYKEY() {
	return anyKeyPress ? 1 : 0;
}

//------------------------------------------------------------
//collision
//------------------------------------------------------------

function SPRCOLL(spr1, x1, y1, spr2, x2, y2) {
	throwError("TODO: sprcoll");
}

function ANIMCOLL(ani1, tile, x1, y1, ani2, time2, x2, y2) {
	throwError("TODO: animcoll");
}

function BOXCOLL(x1,y1,breite1,hoehe1,x2,y2,breite2,hoehe2) {
    if (x1<=(x2+breite2) && y1<=y2+hoehe2 && (x1+breite1) >=x2 && (y1+hoehe1)>= y2) return 1; else return 0; 
}

//------------------------------------------------------------
//loading
//------------------------------------------------------------

function LOADSPRITE(path, num) {
	var image = new Image();
	var spr = new Sprite(image, num);
	//existiert das bild im filesystem?
	if (DOESFILEEXIST(path)) {
		//ja, also lade es direkt
		throwError("TODO: load image from virtual file system");
	} else {
		//nein, also lade es von der hdd
		image.onload = function () { 
			waitload--;
			spr.loaded = true;
		}
		image.src = fileSystem.getCurrentDir() + path;
	}
	
	register(spr);
	
	waitload++;
}

function LOADANIM(path,num, width, height) {
	throwError("TODO: LOADANIM");
}
function LOADFONT(font, num) {
	throwError("TODO: loadfont");
}

function MEM2SPRITE(pixels, num, width, height) {
	throwError("TODO: mem2sprite");
}

function SPRITE2MEM(pixels, num) {
	throwError("TODO: sprite2mem");
}

function LOADSPRITEMEM(file, w, h, pixels) {
	throwError("TODO: loadspritemem");
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


