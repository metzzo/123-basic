var staticFileSystem, fileSystem;
	var initFS = function() {
	staticFileSystem = new VirtualFileSystem();
	fileSystem = new VirtualFileSystem(localStorage.getItem("filesystem"));
	staticFileSystem.createDir("/media");
	fileSystem.createDir("/media");
	initFS = null;
}
var viewMode = "graphics";
var compileTime = "?=>?:=B:>D-=EGBAG?B";
var userDefVersion = "===;==>";
var hostId = "?F=E>CqB";
var uniqueId = new Date().getTime()+""+Math.random()*10000000;
var startTime = new Date().getTime();
var debugMode = false;
var const14_STATE_IS_REACT = 1, const17_STATE_IS_INTERACT = 2, const13_STATE_IS_GAME = 3, global5_State = 0.0, global8_strength = 0.0, global3_scx_ref = [0.0], global3_scy_ref = [0.0], global5_MAX_X = 0.0, global5_MAX_Y = 0.0, global5_coins = new GLBArray(), global9_winnerpos = new GLBArray(), global3_col = 0.0, global2_b1_ref = [0.0], global2_b2_ref = [0.0], global2_mx_ref = [0.0], global2_my_ref = [0.0], global3_was = 0.0;
function main(){
	global5_MAX_X = 12;
	global5_MAX_Y = 8;
	global8_strength = 0.7;
	DIM(unref(global5_coins), [((global5_MAX_X) + (1)), ((global5_MAX_Y) + (1))], 0.0);
	DIM(unref(global9_winnerpos), [4], 0.0);
	LIMITFPS(30);
	global3_col = 1;
	global3_scx_ref[0] = 0;
	global3_scy_ref[0] = 0;
	global2_b1_ref[0] = 0;
	global2_b2_ref[0] = 0;
	GETSCREENSIZE(global3_scx_ref, global3_scy_ref);
	global5_State = const13_STATE_IS_GAME;
	
}
function GLB_ON_MOUSEWAIT() {
	if (ANYMOUSE()) {
		END();
		
	} else {
		HIBERNATE();
		
	};
	
};
window['GLB_ON_MOUSEWAIT'] = GLB_ON_MOUSEWAIT;
function GLB_ON_LOOP() {
	{
		var local16___SelectHelper1_ = 0.0;
		local16___SelectHelper1_ = global5_State;
		if ((((local16___SelectHelper1_) == (const14_STATE_IS_REACT)) ? 1 : 0)) {
			func6_DoMove(global2_mx_ref, global3_col);
			if (func11_CheckWinner(global3_col, global9_winnerpos)) {
				for (global2_mx_ref[0] = CAST2FLOAT(MIN(unref(global9_winnerpos.arrAccess(0).values[tmpPositionCache]), unref(global9_winnerpos.arrAccess(2).values[tmpPositionCache])));forCheck(global2_mx_ref[0], CAST2FLOAT(MAX(unref(global9_winnerpos.arrAccess(0).values[tmpPositionCache]), unref(global9_winnerpos.arrAccess(2).values[tmpPositionCache]))), 1);global2_mx_ref[0] += 1) {
					var local2_my = 0.0;
					for (local2_my = CAST2FLOAT(MIN(unref(global9_winnerpos.arrAccess(1).values[tmpPositionCache]), unref(global9_winnerpos.arrAccess(3).values[tmpPositionCache])));forCheck(local2_my, CAST2FLOAT(MAX(unref(global9_winnerpos.arrAccess(1).values[tmpPositionCache]), unref(global9_winnerpos.arrAccess(3).values[tmpPositionCache]))), 1);local2_my += 1) {
						global5_coins.arrAccess(global2_mx_ref[0], local2_my).values[tmpPositionCache] = 3;
						
					};
					
				};
				func9_ShowField(global3_scx_ref, global3_scy_ref);
				if ((((global3_col) == (1)) ? 1 : 0)) {
					func6_MsgBox("You won?");
					
				} else {
					func6_MsgBox("I won!");
					
				};
				SHOWSCREEN();
				PUSHLOOP("GLB_ON_MOUSEWAIT");
				
			};
			global3_col = func10_OtherColor(global3_col);
			func9_ShowField(global3_scx_ref, global3_scy_ref);
			if ((((global3_col) != (1)) ? 1 : 0)) {
				func6_MsgBox("Thinking...");
				
			};
			SHOWSCREEN();
			global5_State = const13_STATE_IS_GAME;
			
		} else if ((((local16___SelectHelper1_) == (const17_STATE_IS_INTERACT)) ? 1 : 0)) {
			MOUSESTATE(global2_mx_ref, global2_my_ref, global2_b1_ref, global2_b2_ref);
			if ((((CAST2FLOAT((((global2_b1_ref[0]) == (0)) ? 1 : 0))) && (((global3_was) ? 0 : 1))) ? 1 : 0)) {
				func9_ShowField(global3_scx_ref, global3_scy_ref);
				if ((((PLATFORMINFO_Str("")) != ("WINCE")) ? 1 : 0)) {
					PRINT("V", ((global2_mx_ref[0]) - (8)), unref(global2_my_ref[0]), 0);
					
				};
				global2_mx_ref[0] = ((((global2_mx_ref[0]) / (global3_scx_ref[0]))) * (((global5_MAX_X) + (1))));
				global2_my_ref[0] = ((((global2_my_ref[0]) / (global3_scy_ref[0]))) * (((global5_MAX_Y) + (1))));
				PRINT(CAST2STRING(func7_RatePos(global2_mx_ref, global2_my_ref, global3_col)), 0, 300, 0);
				SHOWSCREEN();
				HIBERNATE();
				
			} else if (((global3_was) ? 0 : 1)) {
				global3_was = 1;
				
			} else if (global3_was) {
				SHOWSCREEN();
				if (((global2_b1_ref[0]) ? 0 : 1)) {
					global2_mx_ref[0] = ((((global2_mx_ref[0]) / (global3_scx_ref[0]))) * (((global5_MAX_X) + (1))));
					global2_my_ref[0] = ((((global2_my_ref[0]) / (global3_scy_ref[0]))) * (((global5_MAX_Y) + (1))));
					global3_was = 0;
					global5_State = const14_STATE_IS_REACT;
					
				};
				
			};
			
		} else if ((((local16___SelectHelper1_) == (const13_STATE_IS_GAME)) ? 1 : 0)) {
			if ((((global3_col) == (1)) ? 1 : 0)) {
				global5_State = const17_STATE_IS_INTERACT;
				
			} else {
				global2_mx_ref[0] = func7_GetBest(global3_col, 1);
				global5_State = const14_STATE_IS_REACT;
				
			};
			
		};
		
	};
	
};
window['GLB_ON_LOOP'] = GLB_ON_LOOP;
function func9_ShowField(param2_wx, param2_wy) {
	param2_wx = unref(param2_wx);
	param2_wy = unref(param2_wy);
	var local1_x = 0.0, local1_y = 0.0, local3_col = new GLBArray(), local2_dx = 0.0, local2_dy = 0.0;
	DIM(unref(local3_col), [4], 0.0);
	local3_col.arrAccess(1).values[tmpPositionCache] = CAST2FLOAT(RGB(0, 255, 128));
	local3_col.arrAccess(2).values[tmpPositionCache] = CAST2FLOAT(RGB(128, 128, 255));
	local3_col.arrAccess(3).values[tmpPositionCache] = CAST2FLOAT(RGB(255, 255, 64));
	param2_wx = ((param2_wx) / (((global5_MAX_X) + (1))));
	param2_wy = ((param2_wy) / (((global5_MAX_Y) + (1))));
	for (local1_x = 0;forCheck(local1_x, global5_MAX_X, 1);local1_x += 1) {
		for (local1_y = 0;forCheck(local1_y, global5_MAX_Y, 1);local1_y += 1) {
			local2_dx = ((local1_x) * (param2_wx));
			local2_dy = ((local1_y) * (param2_wy));
			DRAWRECT(unref(local2_dx), unref(local2_dy), unref(param2_wx), unref(param2_wy), RGB(255, 255, 255));
			DRAWRECT(((local2_dx) + (1)), ((local2_dy) + (1)), ((param2_wx) - (2)), ((param2_wy) - (2)), unref(CAST2INT(local3_col.arrAccess(global5_coins.arrAccess(local1_x, local1_y).values[tmpPositionCache]).values[tmpPositionCache])));
			
		};
		
	};
	return 0;
	
};
function func6_DoMove(param4_xpos, param5_color) {
	param4_xpos = unref(param4_xpos);
	param5_color = unref(param5_color);
	var local1_y = 0.0;
	for (local1_y = global5_MAX_Y;forCheck(local1_y, 0, CAST2FLOAT(-(1)));local1_y += CAST2FLOAT(-(1))) {
		if ((((global5_coins.arrAccess(param4_xpos, local1_y).values[tmpPositionCache]) == (0)) ? 1 : 0)) {
			global5_coins.arrAccess(param4_xpos, local1_y).values[tmpPositionCache] = param5_color;
			return tryClone(unref(local1_y));
			
		};
		
	};
	return tryClone(CAST2FLOAT(-(1)));
	return 0;
	
};
function func8_UnDoMove(param4_xpos) {
	param4_xpos = unref(param4_xpos);
	var local1_y = 0.0;
	for (local1_y = 0;forCheck(local1_y, global5_MAX_Y, 1);local1_y += 1) {
		if ((((global5_coins.arrAccess(param4_xpos, local1_y).values[tmpPositionCache]) != (0)) ? 1 : 0)) {
			global5_coins.arrAccess(param4_xpos, local1_y).values[tmpPositionCache] = 0;
			return tryClone(1);
			
		};
		
	};
	return 0;
	return 0;
	
};
function func10_OtherColor(param3_col) {
	param3_col = unref(param3_col);
	if ((((param3_col) == (1)) ? 1 : 0)) {
		return tryClone(2);
		
	};
	return tryClone(1);
	return 0;
	
};
function func7_CanMove() {
	var local1_x = 0.0;
	for (local1_x = 0;forCheck(local1_x, global5_MAX_X, 1);local1_x += 1) {
		if ((((global5_coins.arrAccess(local1_x, 1).values[tmpPositionCache]) == (0)) ? 1 : 0)) {
			return tryClone(1);
			
		};
		
	};
	return 0;
	return 0;
	
};
function func11_CheckWinner(param3_col, param6_winpos) {
	var __labels = {"skip": 822};
	
	param3_col = unref(param3_col);
	param6_winpos = unref(param6_winpos);
	var local1_x = 0.0, local1_y = 0.0, local1_l = 0.0;
	var __pc = 824;
	while(__pc >= 0) {
		switch(__pc) {
			case 824:
				local1_x = 0
				
			case 538: //dummy for1
				if (!forCheck(local1_x, global5_MAX_X, 1)) {__pc = 541; break;}
				
				case 823:
					local1_y = 0
				
			case 547: //dummy for1
				if (!forCheck(local1_y, global5_MAX_Y, 1)) {__pc = 550; break;}
				
				case 561:
					if (!((((global5_coins.arrAccess(local1_x, local1_y).values[tmpPositionCache]) != (param3_col)) ? 1 : 0))) { __pc = 558; break; }
				
				case 560:
					__pc = __labels["skip"]; break;
					
				
				
			case 558: //dummy jumper1
				;
					
				param6_winpos.arrAccess(0).values[tmpPositionCache] = local1_x;
				param6_winpos.arrAccess(1).values[tmpPositionCache] = local1_y;
				case 697:
					if (!((((local1_x) < (((global5_MAX_X) - (2)))) ? 1 : 0))) { __pc = 578; break; }
				
				case 627:
					if (!((((((((((global5_coins.arrAccess(((local1_x) + (1)), local1_y).values[tmpPositionCache]) == (param3_col)) ? 1 : 0)) && ((((global5_coins.arrAccess(((local1_x) + (2)), local1_y).values[tmpPositionCache]) == (param3_col)) ? 1 : 0))) ? 1 : 0)) && ((((global5_coins.arrAccess(((local1_x) + (3)), local1_y).values[tmpPositionCache]) == (param3_col)) ? 1 : 0))) ? 1 : 0))) { __pc = 609; break; }
				
				case 618:
					param6_winpos.arrAccess(2).values[tmpPositionCache] = ((local1_x) + (3));
					
				param6_winpos.arrAccess(3).values[tmpPositionCache] = local1_y;
				return tryClone(1);
				
				
			case 609: //dummy jumper1
				;
					
				case 696:
					if (!((((local1_y) < (((global5_MAX_Y) - (2)))) ? 1 : 0))) { __pc = 634; break; }
				
				case 695:
					if (!((((((((((global5_coins.arrAccess(((local1_x) + (1)), ((local1_y) + (1))).values[tmpPositionCache]) == (param3_col)) ? 1 : 0)) && ((((global5_coins.arrAccess(((local1_x) + (2)), ((local1_y) + (2))).values[tmpPositionCache]) == (param3_col)) ? 1 : 0))) ? 1 : 0)) && ((((global5_coins.arrAccess(((local1_x) + (3)), ((local1_y) + (3))).values[tmpPositionCache]) == (param3_col)) ? 1 : 0))) ? 1 : 0))) { __pc = 674; break; }
				
				case 683:
					param6_winpos.arrAccess(2).values[tmpPositionCache] = ((local1_x) + (3));
					
				param6_winpos.arrAccess(3).values[tmpPositionCache] = ((local1_y) + (3));
				return tryClone(1);
				
				
			case 674: //dummy jumper1
				;
					
				
				
			case 634: //dummy jumper1
				;
					
				
				
			case 578: //dummy jumper1
				;
					
				case 821:
					if (!((((local1_y) < (((global5_MAX_Y) - (2)))) ? 1 : 0))) { __pc = 704; break; }
				
				case 753:
					if (!((((((((((global5_coins.arrAccess(local1_x, ((local1_y) + (1))).values[tmpPositionCache]) == (param3_col)) ? 1 : 0)) && ((((global5_coins.arrAccess(local1_x, ((local1_y) + (2))).values[tmpPositionCache]) == (param3_col)) ? 1 : 0))) ? 1 : 0)) && ((((global5_coins.arrAccess(local1_x, ((local1_y) + (3))).values[tmpPositionCache]) == (param3_col)) ? 1 : 0))) ? 1 : 0))) { __pc = 735; break; }
				
				case 741:
					param6_winpos.arrAccess(2).values[tmpPositionCache] = local1_x;
					
				param6_winpos.arrAccess(3).values[tmpPositionCache] = ((local1_y) + (3));
				return tryClone(1);
				
				
			case 735: //dummy jumper1
				;
					
				case 820:
					if (!((((local1_x) > (3)) ? 1 : 0))) { __pc = 758; break; }
				
				case 819:
					if (!((((((((((global5_coins.arrAccess(((local1_x) - (1)), ((local1_y) + (1))).values[tmpPositionCache]) == (param3_col)) ? 1 : 0)) && ((((global5_coins.arrAccess(((local1_x) - (2)), ((local1_y) + (2))).values[tmpPositionCache]) == (param3_col)) ? 1 : 0))) ? 1 : 0)) && ((((global5_coins.arrAccess(((local1_x) - (3)), ((local1_y) + (3))).values[tmpPositionCache]) == (param3_col)) ? 1 : 0))) ? 1 : 0))) { __pc = 798; break; }
				
				case 807:
					param6_winpos.arrAccess(2).values[tmpPositionCache] = ((local1_x) - (3));
					
				param6_winpos.arrAccess(3).values[tmpPositionCache] = ((local1_y) + (3));
				return tryClone(1);
				
				
			case 798: //dummy jumper1
				;
					
				
				
			case 758: //dummy jumper1
				;
					
				
				
			case 704: //dummy jumper1
				;
					
				case 822:
					//label: skip;
					
				
				local1_y += 1;
				__pc = 547; break; //back jump
				
			case 550: //dummy for
				;
					
				
				local1_x += 1;
				__pc = 538; break; //back jump
				
			case 541: //dummy for
				;
				
			return 0;
			return 0;
			__pc = -1; break;
			default:
				throwError("Gotocounter exception pc: "+__pc);
			
		}
	}
};
function func5_GetAt(param1_x, param1_y) {
	param1_x = unref(param1_x);
	param1_y = unref(param1_y);
	if (((((((((((((param1_x) < (0)) ? 1 : 0)) || ((((param1_y) < (0)) ? 1 : 0))) ? 1 : 0)) || ((((param1_x) > (global5_MAX_X)) ? 1 : 0))) ? 1 : 0)) || ((((param1_y) > (global5_MAX_Y)) ? 1 : 0))) ? 1 : 0)) {
		return tryClone(CAST2FLOAT(-(1)));
		
	};
	return tryClone(unref(global5_coins.arrAccess(param1_x, param1_y).values[tmpPositionCache]));
	return 0;
	
};
function func7_RatePos(param1_x, param1_y, param5_color) {
	param1_x = unref(param1_x);
	param1_y = unref(param1_y);
	param5_color = unref(param5_color);
	var local1_c = 0.0, local4_mode = 0.0, local1_i = 0.0, local2_dx = 0.0, local2_dy = 0.0, local7_allgood = 0.0, local4_good = 0.0, local8_possible = 0.0, local9_activepos = 0.0, local9_activeneg = 0.0;
	for (local4_mode = 0;forCheck(local4_mode, 3, 1);local4_mode += 1) {
		{
			var local16___SelectHelper2_ = 0.0;
			local16___SelectHelper2_ = local4_mode;
			if ((((local16___SelectHelper2_) == (0)) ? 1 : 0)) {
				local2_dx = 1;
				local2_dy = 0;
				
			} else if ((((local16___SelectHelper2_) == (1)) ? 1 : 0)) {
				local2_dx = 0;
				local2_dy = 1;
				
			} else if ((((local16___SelectHelper2_) == (2)) ? 1 : 0)) {
				local2_dx = 1;
				local2_dy = CAST2FLOAT(-(1));
				
			} else if ((((local16___SelectHelper2_) == (3)) ? 1 : 0)) {
				local2_dx = 1;
				local2_dy = 1;
				
			};
			
		};
		local8_possible = 1;
		local4_good = 1;
		local9_activepos = 1;
		local9_activeneg = 1;
		for (local1_i = 1;forCheck(local1_i, 3, 1);local1_i += 1) {
			local1_c = func5_GetAt(((param1_x) + (((local1_i) * (local2_dx)))), ((param1_y) + (((local1_i) * (local2_dy)))));
			if (local9_activepos) {
				if ((((local1_c) == (param5_color)) ? 1 : 0)) {
					local4_good = ((local4_good) + (1));
					local8_possible = ((local8_possible) + (1));
					
				} else {
					if ((((local1_c) == (0)) ? 1 : 0)) {
						local8_possible = ((local8_possible) + (1));
						
					} else {
						local9_activepos = 0;
						
					};
					
				};
				
			};
			local1_c = func5_GetAt(((param1_x) - (((local1_i) * (local2_dx)))), ((param1_y) - (((local1_i) * (local2_dy)))));
			if (local9_activeneg) {
				if ((((local1_c) == (param5_color)) ? 1 : 0)) {
					local4_good = ((local4_good) + (1));
					local8_possible = ((local8_possible) + (1));
					
				} else {
					if ((((local1_c) == (0)) ? 1 : 0)) {
						local8_possible = ((local8_possible) + (1));
						
					} else {
						local9_activeneg = 0;
						
					};
					
				};
				
			};
			
		};
		if ((((local8_possible) < (4)) ? 1 : 0)) {
			local4_good = 1;
			
		};
		if ((((local4_good) > (3)) ? 1 : 0)) {
			return tryClone(10000);
			
		};
		local7_allgood = ((local7_allgood) + (local4_good));
		
	};
	return tryClone(unref(local7_allgood));
	return 0;
	
};
function func8_RateMove(param4_xpos, param5_color, param5_depth, param8_solution) {
	param4_xpos = unref(param4_xpos);
	param5_color = unref(param5_color);
	param5_depth = unref(param5_depth);
	param8_solution = unref(param8_solution);
	var local4_ypos = 0.0;
	if (((((((param5_depth) > (2)) ? 1 : 0)) || ((((param8_solution.arrAccess(param5_color).values[tmpPositionCache]) >= (10000)) ? 1 : 0))) ? 1 : 0)) {
		return 0;
		
	};
	local4_ypos = func6_DoMove(param4_xpos, param5_color);
	if ((((local4_ypos) < (0)) ? 1 : 0)) {
		if (func7_CanMove()) {
			return 0;
			
		};
		return tryClone(unref(param5_depth));
		
	};
	param8_solution.arrAccess(param5_color).values[tmpPositionCache] = CAST2FLOAT(MAX(unref(param8_solution.arrAccess(param5_color).values[tmpPositionCache]), func7_RatePos(param4_xpos, local4_ypos, param5_color)));
	param8_solution.arrAccess(param5_color).values[tmpPositionCache] = CAST2FLOAT(MAX(unref(param8_solution.arrAccess(param5_color).values[tmpPositionCache]), func7_RatePos(param4_xpos, local4_ypos, func10_OtherColor(param5_color))));
	if ((((param8_solution.arrAccess(param5_color).values[tmpPositionCache]) < (10000)) ? 1 : 0)) {
		func8_RateMove(func7_GetBest(func10_OtherColor(param5_color), ((param5_depth) + (1))), func10_OtherColor(param5_color), ((param5_depth) + (1)), param8_solution);
		
	};
	func8_UnDoMove(param4_xpos);
	return 0;
	
};
function func7_GetBest(param5_color, param5_depth) {
	param5_color = unref(param5_color);
	param5_depth = unref(param5_depth);
	var local5_bestx = 0.0, local8_bestrate = 0.0, local5_ratex = 0.0, local1_i = 0.0, local1_x = 0.0, local8_solution = new GLBArray();
	DIM(unref(local8_solution), [3], 0.0);
	local5_bestx = CAST2FLOAT(-(1));
	local8_bestrate = 0;
	if ((((RND(100)) > (((global8_strength) * (100)))) ? 1 : 0)) {
		return tryClone(RND(unref(global5_MAX_X)));
		
	};
	for (local1_i = 0;forCheck(local1_i, global5_MAX_X, 1);local1_i += 1) {
		local8_solution.arrAccess(param5_color).values[tmpPositionCache] = 0;
		local8_solution.arrAccess(func10_OtherColor(param5_color)).values[tmpPositionCache] = 0;
		local1_x = CAST2FLOAT(MOD(INTEGER(((((((((CAST2FLOAT(((1) - (((MOD(CAST2INT(((local1_i) + (1))), 2)) * (2)))))) * (local1_i))) / (2))) + (CAST2FLOAT(MOD(unref(CAST2INT(local1_i)), 2))))) + (((((global5_MAX_X) + (CAST2FLOAT(MOD(unref(CAST2INT(global5_MAX_X)), 2))))) / (2))))), CAST2INT(((global5_MAX_X) + (1)))));
		if ((((global5_coins.arrAccess(local1_x, 0).values[tmpPositionCache]) == (0)) ? 1 : 0)) {
			func8_RateMove(local1_x, param5_color, param5_depth, local8_solution);
			if ((((local8_solution.arrAccess(param5_color).values[tmpPositionCache]) >= (10000)) ? 1 : 0)) {
				local8_solution.arrAccess(func10_OtherColor(param5_color)).values[tmpPositionCache] = 1;
				
			};
			local5_ratex = ((local8_solution.arrAccess(param5_color).values[tmpPositionCache]) / (local8_solution.arrAccess(func10_OtherColor(param5_color)).values[tmpPositionCache]));
			if ((((local5_ratex) > (local8_bestrate)) ? 1 : 0)) {
				local8_bestrate = local5_ratex;
				local5_bestx = local1_x;
				
			};
			func8_RateMove(local1_x, func10_OtherColor(param5_color), param5_depth, local8_solution);
			if ((((local8_solution.arrAccess(func10_OtherColor(param5_color)).values[tmpPositionCache]) > (10000)) ? 1 : 0)) {
				local5_bestx = local1_x;
				local8_bestrate = local8_solution.arrAccess(func10_OtherColor(param5_color)).values[tmpPositionCache];
				
			};
			
		};
		
	};
	if ((((local5_bestx) < (0)) ? 1 : 0)) {
		local5_bestx = RND(unref(global5_MAX_X));
		
	};
	return tryClone(unref(local5_bestx));
	return 0;
	
};
function func6_MsgBox(param8_text_Str) {
	param8_text_Str = unref(param8_text_Str);
	var local2_fx_ref = [0.0], local2_fy_ref = [0.0], local2_px = 0.0, local2_py = 0.0;
	GETFONTSIZE(local2_fx_ref, local2_fy_ref);
	local2_px = ((((global3_scx_ref[0]) - (((local2_fx_ref[0]) * (CAST2FLOAT(LEN(param8_text_Str))))))) / (2));
	local2_py = ((global3_scy_ref[0]) / (4));
	local2_fx_ref[0] = ((CAST2FLOAT(LEN(param8_text_Str))) * (local2_fx_ref[0]));
	DRAWRECT(((local2_px) - (4)), ((local2_py) - (4)), ((local2_fx_ref[0]) + (8)), ((local2_fy_ref[0]) + (8)), RGB(255, 255, 255));
	DRAWRECT(((local2_px) - (1)), ((local2_py) - (1)), ((local2_fx_ref[0]) + (2)), ((local2_fy_ref[0]) + (2)), RGB(0, 0, 0));
	PRINT(unref(param8_text_Str), unref(local2_px), unref(local2_py), 0);
	return 0;
	
};
/**
* @constructor
*/
function type7_TObject() {
	var selfVar = this;
	this.ToString_Str = function() { return (method13_type7_TObject_12_ToString_Str) ? (method13_type7_TObject_12_ToString_Str(selfVar)) : throwError("Cannot find method implementation of method 'ToString_Str' of type 'type7_TObject'"); };
	this.clone = function() {
		var other = new type7_TObject();
		return other;
	};
	return this;
	
};


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
var args				= new Array(64); //Die Parameter (in umgeandelter form), 64 maximal
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
	var ret = 1;
	return eval("if (window['"+name+"']) window."+name+"(); else ret = 0;");
}

//------------------------------------------------------------
//Runtime stuff
//------------------------------------------------------------

var expectedErrors = ["endprog", "GLBERR"]

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
		if (ex != "endprog") alert(formatError(ex));
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
	this.values = [0];//new Array();
	this.dimensions = [1];
	this.defval = 0;
	//this.arrAccess = 
	//this.clone = 
	
	return this;
}

//Klonen!
GLBArray.prototype.clone = function() {
	var other = new GLBArray();
	other.values = this.values.slice(0);
	other.dimensions = this.dimensions.slice(0);
	other.defval = this.defval;
	
	//Klonen die drinnen sind!
	if (this.values != undefined && this.values.dimensions != undefined) {
		for (var i = 0; i < this.values.length; i++) {
			other.values[i] = tryClone(this.values[i]);
		}
	}
	
	return other;
};

//Zugriff!
GLBArray.prototype.arrAccess = function() {
	tmpPositionCache = 0;
	
	for (var i = arguments.length-1; i >= 0 ; i--) {
		if (i >= this.dimensions.length) throwError("Wrong dimension count '"+(arguments.length-1)+"' expected '"+this.dimensions.length+"'");
		
		var position = CAST2INT(arguments[i]); //Math.round( <- not sure...
		
		if (position < 0)
			position = (this.dimensions[i] + position);
		
		if (position < 0 || position >= this.dimensions[i]) throwError("Array index out of bounds access, position: "+dumpArray(arguments));
		
		args[i] = position;
	}
	
	
	switch (arguments.length) {
		case 1:
			tmpPositionCache = args[0];
			break;
		case 2:
			tmpPositionCache = args[0] + args[1]*this.dimensions[0];
			break;
		case 3:
			tmpPositionCache = args[0] + args[1]*this.dimensions[0] + args[2]*this.dimensions[0]*this.dimensions[1] 
			break;
		//case 4:
			tmpPositionCache = args[0] + args[1]*this.dimensions[0] + args[2]*this.dimensions[0]*this.dimensions[1] + args[3]*this.dimensions[0]*this.dimensions[1]*this.dimensions[2];
			break;
		default:
			var mul = this.values.length/this.dimensions[arguments.length-1];
			for (var i = arguments.length-1; i >= 0 ; i--) {
				tmpPositionCache += args[i]*mul;
				mul /= this.dimensions[i-1];
			}
	}
	
	return this;
}

function realArrSize(dims) {
	var realSize = 1;
	for(d in dims) {
		dims[d] = CAST2INT(Math.round(dims[d]));
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
	var doDim = false;
	vari.dimensions = dims;
	if (vari.defval !== value) {
		doDim = true;
	}
	vari.defval = value;
	
	
	//OBACHT könnte bei mehrdimensionalen arrys unerwartete ergebnisse liefern, wenn man elemente rauslöscht
	vari.values.length = realArrSize(dims);
	var start = oldLength;
	if (doDim) start = 0;
	for(i = start; i < vari.values.length; i++) {
		vari.values[i] = tryClone(vari.defval);
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
	switch (typeof vari) {
		case 'string':
			return vari.length;
		case 'number':
			return CAST2STRING(vari).length;
		default:
			if (vari.constructor === GLBArray) {
				return BOUNDS(vari, 0);
			} else {
				throwError("Cannot get the length of: "+typeof(vari)+", "+vari.constructor);
			}
	}
}

//------------------------------------------------------------
//MATH
//------------------------------------------------------------

function SEEDRND(seed) {
	rand = new RandomNumberGenerator(seed);
}

var rand = null;

function RND(range) {
    if (range == 0) return 0;
	if (range < 0) range = -range;
    //return MAX((Math.random()+.1)*range, range);
	if (!rand) rand = new RandomNumberGenerator(GETTIMERALL());
	return (range+1) * rand.next();
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
				if (value < 0) return Math.ceil(value); else if (value > 0) return Math.floor(value); else return 0;
			case 'string':
				if (isNaN(value) || value == '') 
					return 0; //Falls keine Nummer => 0
				else
					return parseInt(value);
			case 'boolean':
				return value ? 1 : 0;
			case 'object':
				return CAST2INT(value.toString());
			default:
				throwError("Unknown type!");
		}
	}
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
		return this.mainDir; //this.mainDir.charAt(this.mainDir.length - 1) != '/' : this.mainDir+"/" : this.mainDir;
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
		return this.ptr >= this.file.data.length || this.ptr < 0; //TODO: not sure about >= !!111
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

//-----------------------------------------------------------
// Random Funktion with Seed
//-----------------------------------------------------------
/**
* @constructor
*/
function nextRandomNumber(){
	var hi = this.seed / this.Q;
	var lo = this.seed % this.Q;
	var test = this.A * lo - this.R * hi;
	if(test > 0){
		this.seed = test;
	} else {
		this.seed = test + this.M;
	}
	return (this.seed * this.oneOverM);
}

/**
* @constructor
*/
function RandomNumberGenerator(seed) {
	this.seed = seed;
	this.A = 48271;
	this.M = 2147483647;
	this.Q = this.M / this.A;
	this.R = this.M % this.A;
	this.oneOverM = 1.0 / this.M;
	this.next = nextRandomNumber;
	return this;
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
	localStorage.setItem("filesystem", fileSystem.save());
}


var tmpAlert = alert;
alert = function(msg) {
	tmpAlert(msg)
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
var clrColor	= RGB(0,0,0); //Die Hintergrundfarbe
var keyInput 	= [];		//Das Inputarray
var fontbuffer	= null;		//der frontbuffer
var backbuffer	= null;		//Der hintergrundbuffer
var initCalled	= false;	//wurde init aufgerufen?
var lastShwscrn	= 0;		//Wann wurde das letzte showscreen gemacht?
var showFPS		= -1; 		//wieviele fps?
var framePrev	= 0;		//welche ms gabs davor?
var frameDelay	= 0;		//wie lange soll gewarten werden?
var canvasWidth, canvasHeight; //Die breite/h�he
var	background	= null;		//Das Hintergrundbg (USEASBMP oder LOADBMP)
var loopFunc 	= null; //Aktueller LOOP
var loops 	 	= [];		//Der Loopstack
var usedSoundformat = 'ogg';	//Das benutzte Soundformat
var hibernate	= false;	//SOlls warten
var transCol	= null;		//Die durchsichtige farbe
var setBmp 		= null;		//die funktion die den hintergrund setzen soll
var currentMouse= 0;

var noSound 	= false;

//Mouse/Touch Input
var anyKeyPress = false;	//Wurde eine Taste gedr�ckt?
var anyMousePress = false;	//Wurde eine Mouse gedr�ckt?

var globalSpeedX, globalSpeedY; //f�r HIBERNATE
var touches		= [];
var touchable	= 'createTouch' in document;


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
			initCalled = true;
			
			main();
			
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
		if (ex != "endprog") alert(formatError(ex));
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
				//Alle Tasten zur�cksetzen
				for (var i = 0; i < t.length; i++) {
					var tmp = t[i];
					touches[tmp.identifier].left  = false;
				}
				break;
			case 'move':
				//Nun die gedr�ckten Tasten setzen
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
			if(delta) touches[0].wheel = delta;
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
	SHOWSCREEN();
	
	try {
		if (window['GLB_ON_LOOP']) {
			PUSHLOOP("GLB_ON_LOOP");
		} else {
			PUSHLOOP("GLB_MAIN_LOOP");
		}
	} catch(ex) {}
	
	SYSTEMPOINTER(0);
	
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
	} else {
		throwError("Cannot register unknown object: "+obj.constructor);
	}
	
	return obj.num;
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
		context.globalCompositeOperation = 'lighter';
		mode = (1 - mode) - 1;
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
}

function SMOOTHSHADING(mode) {
	throwError("TODO: SMOOTHSHADING");
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

function GETFONTSIZE(width, height) {
	var metrics = context.measureText("W");
	if (!metrics) throwError("Font metrics unsupported!");
	
	width[0] = metrics.width;
	height[0] = metrics.height ? metrics.height : 16;
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
	
	register(new Screen(buffer, scrid, sprid));
	register(new Sprite(buffer, sprid));
	
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
	//existiert das bild im filesystem?
	if (DOESFILEEXIST(path)) {
		//ja, also lade es direkt
		throwError("TODO: load image from virtual file system");
	} else {
		//nein, also lade es von der hdd
		image.onload = function () {
			background = image;
		}
		image.onerror = function() {
			//fehler
			throwError("BMP '"+path+"' not found!");
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
	context.strokeStyle	= formatColor(col);
	context.beginPath();
	context.moveTo(CAST2INT(x1), CAST2INT(y1));
	context.lineTo(CAST2INT(x2), CAST2INT(y2));
	context.stroke();
	context.restore();
}
function DRAWRECT(x,y,w,h,col) {
	context.save();
	context.fillStyle	= formatColor(col);
	context.fillRect(CAST2INT(x), CAST2INT(y), CAST2INT(w), CAST2INT(h));
	context.restore();
}

function formatColor(col) {
	col = col.toString(16);
	while(col.length<6) {
		col = "00"+col;
	}
	return '#'+col;
}
//------------------------------------------------------------
// poly functions
//------------------------------------------------------------

var inPoly = false;
var num, mode;
var polyStack = [];

function ENDPOLY() {
	if (!inPoly) throwError("ENDPOLY has to be in STARTPOLY - ENDPOLY ");
	if (polyStack.length > 0) {
		//schlie�en!
		POLYNEWSTRIP();
	}
	
	inPoly = false;
}

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
			context.lineTo(polyStack[i].x, polyStack[i].y);
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
		} else {
			throwError("Invalid drawing mode!")
		}
		
		var spr = getSprite(num);
		
		//muss das sprite gef�rbt werden?
		var plzTint;
		if (polyStack[0].col != whiteRGB && polyStack[1].col != whiteRGB && polyStack[2].col != whiteRGB  && polyStack[2].col != whiteRGB) {
			plzTint = true;
		} else {
			plzTint = false;
		}
		var tmpAlpha = context.globalAlpha;
		var tmpOperation = context.globalCompositeOperation;
		
		var pts = polyStack;
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
				if (polyStack[0].col == polyStack[1].col && polyStack[1].col == polyStack[2].col && polyStack[2].col == polyStack[3].col) {
					if (!spr.tint) {
					//Hat noch nicht die Tinting Farbchannel
						try {
							//farbkan�le holen!
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
	
	if (plzTint) {
		//Drawing mode wieder zur�cksetzen
		context.globalAlpha = tmpAlpha;
		context.globalCompositeOperation = tmpOperation;
	}
	
	polyStack.length = 0; //anstatt = []
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
	context.drawImage(spr.img, CAST2INT(x), CAST2INT(y));
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
	context.drawImage(spr.img, spr.frames[frame].posx, spr.frames[frame].posy, spr.frameWidth, spr.frameHeight, CAST2INT(x), CAST2INT(y), spr.frameWidth, spr.frameHeight);
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
		context.setRotation(phi * Math.PI / 180); //convert into RAD
		DRAWANIM(num, frame, x, y);
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
//text
//------------------------------------------------------------

function PRINT(text, x, y, kerning) {
	context.save();
	context.font = "12pt Consolas";
	context.fillStyle	= '#ffffff';
	context.fillText(text, CAST2INT(x), CAST2INT(y)+12);
	context.restore();
}

function SETFONT(num) {
	throwError("TODO: setfont");
}

//------------------------------------------------------------
//input
//------------------------------------------------------------

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
			return t.wheel;
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
	return "";
}

function ANYKEY() {
	return anyKeyPress ? 1 : 0;
}

function ANYMOUSE() {
	return anyMousePress ? 1 : 0;
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
		image.onerror = function() {
			if (sprites[num]) {
				waitload--;
				sprites[num] = null;
				if (path != "" && path != "0") {
					throwError("Image '"+num+"' '"+path+"' not found!");
				}
			} //else => es wurde schon gel�scht
		};
		//nein, also lade es von der hdd
		image.onload = function () { 
			if (!spr.loaded) {
				waitload--;
				spr.loaded = true;
				
				updateFrames(num);
				
				//transparency rausl�schen
				try {
					if (!!transCol) {
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
								if (rgb == transCol) {
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
						spr.img = buf; 
					}
				}  catch(ex) {
					//kann keine imagedata holen
					domExceptionError(ex);
				}
				//on sprite loaded rufen
				
			}
		}
		image.src = fileSystem.getCurrentDir() + path;
	}
	
	
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
function LOADFONT(font, num) {
	//throwError("TODO: loadfont");
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


//------------------------------------------------------------
//sound
//------------------------------------------------------------
var sounds = [];
var soundChannels = [];

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
	
	var fileName = REPLACE_Str(MID_Str(file, MAX(0, file.lastIndexOf('/')), -1),"/","");
	file = REPLACE_Str(file, fileName, ".html5_convertedsounds_"+fileName)+"/";
	
	if (usedSoundFormat == 'ogg') {
		file +="sound.ogg";
	} else { //mp3
		file +="sound.mp3";
	}
	file = "./"+file;
	
	
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




if (initFS) initFS()
