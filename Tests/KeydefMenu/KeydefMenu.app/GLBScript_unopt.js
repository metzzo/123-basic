var staticFileSystem, fileSystem;
	var initFS = function() {
	staticFileSystem = new VirtualFileSystem();
	fileSystem = new VirtualFileSystem(localStorage.getItem("filesystem"));
	staticFileSystem.createDir("/media");
	fileSystem.createDir("/media");
	staticFileSystem.createFile("/keys.ini", [91, 114, 111, 111, 116, 93, 13, 10, 49, 110, 97, 109, 101, 61, 83, 116, 97, 114, 116, 13, 10, 49, 116, 121, 112, 101, 61, 98, 117, 116, 116, 111, 110, 13, 10, 49, 118, 97, 108, 117, 101, 61, 49, 13, 10, 50, 110, 97, 109, 101, 61, 69, 120, 105, 116, 13, 10, 50, 116, 121, 112, 101, 61, 98, 117, 116, 116, 111, 110, 13, 10, 50, 118, 97, 108, 117, 101, 61, 45, 49, 13, 10, 51, 110, 97, 109, 101, 61, 79, 112, 116, 105, 111, 110, 115, 13, 10, 51, 116, 121, 112, 101, 61, 100, 105, 114, 13, 10, 51, 118, 97, 108, 117, 101, 61, 111, 112, 116, 105, 111, 110, 115, 13, 10, 91, 111, 112, 116, 105, 111, 110, 115, 93, 13, 10, 49, 110, 97, 109, 101, 61, 73, 110, 112, 117, 116, 13, 10, 49, 116, 121, 112, 101, 61, 100, 105, 114, 13, 10, 49, 118, 97, 108, 117, 101, 61, 107, 101, 121, 99, 111, 110, 102, 105, 103, 13, 10, 50, 110, 97, 109, 101, 61, 77, 117, 115, 105, 99, 13, 10, 50, 116, 121, 112, 101, 61, 116, 111, 103, 103, 108, 101, 58, 32, 111, 102, 102, 44, 32, 111, 110, 13, 10, 50, 118, 97, 108, 117, 101, 61, 49, 13, 10, 51, 110, 97, 109, 101, 61, 86, 111, 108, 117, 109, 101, 13, 10, 51, 116, 121, 112, 101, 61, 116, 111, 103, 103, 108, 101, 58, 32, 50, 53, 44, 32, 53, 48, 44, 32, 55, 53, 44, 32, 49, 48, 48, 13, 10, 51, 118, 97, 108, 117, 101, 61, 50, 13, 10, 91, 107, 101, 121, 99, 111, 110, 102, 105, 103, 93, 13, 10, 49, 110, 97, 109, 101, 61, 80, 108, 97, 121, 101, 114, 32, 49, 13, 10, 49, 116, 121, 112, 101, 61, 100, 105, 114, 13, 10, 49, 118, 97, 108, 117, 101, 61, 107, 101, 121, 99, 111, 110, 102, 105, 103, 49, 13, 10, 50, 110, 97, 109, 101, 61, 80, 108, 97, 121, 101, 114, 32, 50, 13, 10, 50, 116, 121, 112, 101, 61, 100, 105, 114, 13, 10, 50, 118, 97, 108, 117, 101, 61, 107, 101, 121, 99, 111, 110, 102, 105, 103, 50, 13, 10, 51, 110, 97, 109, 101, 61, 80, 108, 97, 121, 101, 114, 32, 51, 13, 10, 51, 116, 121, 112, 101, 61, 100, 105, 114, 13, 10, 51, 118, 97, 108, 117, 101, 61, 107, 101, 121, 99, 111, 110, 102, 105, 103, 51, 13, 10, 52, 110, 97, 109, 101, 61, 80, 108, 97, 121, 101, 114, 32, 52, 13, 10, 52, 116, 121, 112, 101, 61, 100, 105, 114, 13, 10, 52, 118, 97, 108, 117, 101, 61, 107, 101, 121, 99, 111, 110, 102, 105, 103, 52, 13, 10, 91, 107, 101, 121, 99, 111, 110, 102, 105, 103, 49, 93, 13, 10, 49, 110, 97, 109, 101, 61, 85, 112, 13, 10, 49, 116, 121, 112, 101, 61, 107, 101, 121, 13, 10, 49, 118, 97, 108, 117, 101, 61, 75, 50, 48, 48, 13, 10, 50, 110, 97, 109, 101, 61, 68, 111, 119, 110, 13, 10, 50, 116, 121, 112, 101, 61, 107, 101, 121, 13, 10, 50, 118, 97, 108, 117, 101, 61, 75, 50, 48, 56, 13, 10, 51, 110, 97, 109, 101, 61, 76, 101, 102, 116, 13, 10, 51, 116, 121, 112, 101, 61, 107, 101, 121, 13, 10, 51, 118, 97, 108, 117, 101, 61, 75, 50, 48, 51, 13, 10, 52, 110, 97, 109, 101, 61, 82, 105, 103, 104, 116, 13, 10, 52, 116, 121, 112, 101, 61, 107, 101, 121, 13, 10, 52, 118, 97, 108, 117, 101, 61, 75, 50, 48, 53, 13, 10, 53, 110, 97, 109, 101, 61, 66, 117, 116, 116, 111, 110, 13, 10, 53, 116, 121, 112, 101, 61, 107, 101, 121, 13, 10, 53, 118, 97, 108, 117, 101, 61, 75, 50, 56, 13, 10, 91, 107, 101, 121, 99, 111, 110, 102, 105, 103, 50, 93, 13, 10, 49, 110, 97, 109, 101, 61, 85, 112, 13, 10, 49, 116, 121, 112, 101, 61, 107, 101, 121, 13, 10, 49, 118, 97, 108, 117, 101, 61, 74, 48, 45, 50, 13, 10, 50, 110, 97, 109, 101, 61, 68, 111, 119, 110, 13, 10, 50, 116, 121, 112, 101, 61, 107, 101, 121, 13, 10, 50, 118, 97, 108, 117, 101, 61, 74, 48, 45, 51, 13, 10, 51, 110, 97, 109, 101, 61, 76, 101, 102, 116, 13, 10, 51, 116, 121, 112, 101, 61, 107, 101, 121, 13, 10, 51, 118, 97, 108, 117, 101, 61, 74, 48, 45, 48, 13, 10, 52, 110, 97, 109, 101, 61, 82, 105, 103, 104, 116, 13, 10, 52, 116, 121, 112, 101, 61, 107, 101, 121, 13, 10, 52, 118, 97, 108, 117, 101, 61, 74, 48, 45, 49, 13, 10, 53, 110, 97, 109, 101, 61, 66, 117, 116, 116, 111, 110, 13, 10, 53, 116, 121, 112, 101, 61, 107, 101, 121, 13, 10, 53, 118, 97, 108, 117, 101, 61, 74, 48, 45, 49, 54, 13, 10, 91, 107, 101, 121, 99, 111, 110, 102, 105, 103, 51, 93, 13, 10, 49, 110, 97, 109, 101, 61, 85, 112, 13, 10, 49, 116, 121, 112, 101, 61, 107, 101, 121, 13, 10, 49, 118, 97, 108, 117, 101, 61, 75, 55, 50, 13, 10, 50, 110, 97, 109, 101, 61, 68, 111, 119, 110, 13, 10, 50, 116, 121, 112, 101, 61, 107, 101, 121, 13, 10, 50, 118, 97, 108, 117, 101, 61, 75, 56, 48, 13, 10, 51, 110, 97, 109, 101, 61, 76, 101, 102, 116, 13, 10, 51, 116, 121, 112, 101, 61, 107, 101, 121, 13, 10, 51, 118, 97, 108, 117, 101, 61, 75, 55, 53, 13, 10, 52, 110, 97, 109, 101, 61, 82, 105, 103, 104, 116, 13, 10, 52, 116, 121, 112, 101, 61, 107, 101, 121, 13, 10, 52, 118, 97, 108, 117, 101, 61, 75, 55, 55, 13, 10, 53, 110, 97, 109, 101, 61, 66, 117, 116, 116, 111, 110, 13, 10, 53, 116, 121, 112, 101, 61, 107, 101, 121, 13, 10, 53, 118, 97, 108, 117, 101, 61, 75, 56, 50, 13, 10, 91, 107, 101, 121, 99, 111, 110, 102, 105, 103, 52, 93, 13, 10, 49, 110, 97, 109, 101, 61, 85, 112, 13, 10, 49, 116, 121, 112, 101, 61, 107, 101, 121, 13, 10, 49, 118, 97, 108, 117, 101, 61, 75, 49, 55, 13, 10, 50, 110, 97, 109, 101, 61, 68, 111, 119, 110, 13, 10, 50, 116, 121, 112, 101, 61, 107, 101, 121, 13, 10, 50, 118, 97, 108, 117, 101, 61, 75, 51, 49, 13, 10, 51, 110, 97, 109, 101, 61, 76, 101, 102, 116, 13, 10, 51, 116, 121, 112, 101, 61, 107, 101, 121, 13, 10, 51, 118, 97, 108, 117, 101, 61, 75, 51, 48, 13, 10, 52, 110, 97, 109, 101, 61, 82, 105, 103, 104, 116, 13, 10, 52, 116, 121, 112, 101, 61, 107, 101, 121, 13, 10, 52, 118, 97, 108, 117, 101, 61, 75, 51, 50, 13, 10, 53, 110, 97, 109, 101, 61, 66, 117, 116, 116, 111, 110, 13, 10, 53, 116, 121, 112, 101, 61, 107, 101, 121, 13, 10, 53, 118, 97, 108, 117, 101, 61, 75, 49, 54, 13, 10]);
	initFS = null;
}
var viewMode = "graphics";
var compileTime = "?=>?:=B:=A-?>G@BG?>";
var userDefVersion = "===;==>";
var hostId = "?F=E>CqB";
var uniqueId = new Date().getTime()+""+Math.random()*10000000;
var startTime = new Date().getTime();
var debugMode = false;
var global6_g_ctrl = new GLBArray(), global12_menu_dir_Str = "", global8_menu_pos = 0.0, global9_menu_fade = 0.0, global12_menu_keymode = 0.0, global9_menu_back = 0.0, global14_menu_nullstate = new type12_KEYDEF_STATE(), global4_item = 0.0, global3_pos = new GLBArray();
function main(){
	var local1_i = 0.0;
	DIM(unref(global6_g_ctrl), [4], new type7_CONTROL());
	func8_MenuInit("keys.ini");
	while (1) {
		global4_item = func8_MenuShow();
		if (global4_item) {
			break;
			
		};
		SHOWSCREEN();
		
	};
	if (CAST2FLOAT((((global4_item) == (CAST2FLOAT(-(1)))) ? 1 : 0))) {
		END();
		
	};
	DIM(unref(global3_pos), [4, 2], 0.0);
	INIOPEN("keys.ini");
	for (local1_i = 0;forCheck(local1_i, 3, 1);local1_i += 1) {
		global6_g_ctrl.arrAccess(local1_i).values[tmpPositionCache].attr6_up_Str = INIGET_Str((("keyconfig") + (CAST2STRING(((local1_i) + (1))))), "1value", "NO_DATA");
		global6_g_ctrl.arrAccess(local1_i).values[tmpPositionCache].attr8_down_Str = INIGET_Str((("keyconfig") + (CAST2STRING(((local1_i) + (1))))), "2value", "NO_DATA");
		global6_g_ctrl.arrAccess(local1_i).values[tmpPositionCache].attr7_lft_Str = INIGET_Str((("keyconfig") + (CAST2STRING(((local1_i) + (1))))), "3value", "NO_DATA");
		global6_g_ctrl.arrAccess(local1_i).values[tmpPositionCache].attr8_rght_Str = INIGET_Str((("keyconfig") + (CAST2STRING(((local1_i) + (1))))), "4value", "NO_DATA");
		global6_g_ctrl.arrAccess(local1_i).values[tmpPositionCache].attr10_button_Str = INIGET_Str((("keyconfig") + (CAST2STRING(((local1_i) + (1))))), "5value", "NO_DATA");
		global3_pos.arrAccess(local1_i, 0).values[tmpPositionCache] = 100;
		global3_pos.arrAccess(local1_i, 1).values[tmpPositionCache] = ((20) + (((local1_i) * (20))));
		
	};
	while (1) {
		PRINT((("Music: ") + (INIGET_Str("options", "2value", "NO_DATA"))), 0, 0, 0);
		PRINT((("volume:") + (INIGET_Str("options", "3value", "NO_DATA"))), 0, 20, 0);
		for (local1_i = 0;forCheck(local1_i, 3, 1);local1_i += 1) {
			global3_pos.arrAccess(local1_i, 0).values[tmpPositionCache]+=CAST2INT(((func10_keydef_key(global6_g_ctrl.arrAccess(local1_i).values[tmpPositionCache].attr8_rght_Str)) - (func10_keydef_key(global6_g_ctrl.arrAccess(local1_i).values[tmpPositionCache].attr7_lft_Str))));
			global3_pos.arrAccess(local1_i, 1).values[tmpPositionCache]+=CAST2INT(((func10_keydef_key(global6_g_ctrl.arrAccess(local1_i).values[tmpPositionCache].attr8_down_Str)) - (func10_keydef_key(global6_g_ctrl.arrAccess(local1_i).values[tmpPositionCache].attr6_up_Str))));
			PRINT((("Player ") + (CAST2STRING(local1_i))), unref(global3_pos.arrAccess(local1_i, 0).values[tmpPositionCache]), unref(global3_pos.arrAccess(local1_i, 1).values[tmpPositionCache]), 0);
			
		};
		SHOWSCREEN();
		
	};
	
}
function func15_keydef_getstate(param2_st) {
	param2_st = unref(param2_st);
	var local1_i = 0.0, local1_j = 0.0, local2_nj = 0.0;
	for (local1_i = 1;forCheck(local1_i, 255, 1);local1_i += 1) {
		param2_st.attr4_keys.arrAccess(local1_i).values[tmpPositionCache] = CAST2FLOAT(KEY(unref(CAST2INT(local1_i))));
		
	};
	local2_nj = CAST2FLOAT(GETNUMJOYSTICKS());
	DIM(unref(param2_st.attr4_joys), [local2_nj, 48], 0.0);
	for (local1_i = 0;forCheck(local1_i, ((local2_nj) - (1)), 1);local1_i += 1) {
		for (local1_j = 0;forCheck(local1_j, 47, 1);local1_j += 1) {
			param2_st.attr4_joys.arrAccess(local1_i, local1_j).values[tmpPositionCache] = func15_keydef_joystate(local1_i, local1_j, 0.4);
			
		};
		
	};
	return 0;
	
};
function func15_keydef_joystate(param4_njoy, param3_nax, param8_deadzone) {
	param4_njoy = unref(param4_njoy);
	param3_nax = unref(param3_nax);
	param8_deadzone = unref(param8_deadzone);
	var local2_ax = 0.0;
	{
		var local16___SelectHelper4_ = 0.0;
		local16___SelectHelper4_ = param3_nax;
		if ((((local16___SelectHelper4_) == (0)) ? 1 : 0)) {
			local2_ax = GETJOYX(unref(CAST2INT(param4_njoy)));
			if (CAST2FLOAT((((local2_ax) < (-(param8_deadzone))) ? 1 : 0))) {
				return tryClone(ABS(unref(local2_ax)));
				
			};
			
		} else if ((((local16___SelectHelper4_) == (1)) ? 1 : 0)) {
			local2_ax = GETJOYX(unref(CAST2INT(param4_njoy)));
			if (CAST2FLOAT((((local2_ax) > (param8_deadzone)) ? 1 : 0))) {
				return tryClone(unref(local2_ax));
				
			};
			
		} else if ((((local16___SelectHelper4_) == (2)) ? 1 : 0)) {
			local2_ax = GETJOYY(unref(CAST2INT(param4_njoy)));
			if (CAST2FLOAT((((local2_ax) < (-(param8_deadzone))) ? 1 : 0))) {
				return tryClone(ABS(unref(local2_ax)));
				
			};
			
		} else if ((((local16___SelectHelper4_) == (3)) ? 1 : 0)) {
			local2_ax = GETJOYY(unref(CAST2INT(param4_njoy)));
			if (CAST2FLOAT((((local2_ax) > (param8_deadzone)) ? 1 : 0))) {
				return tryClone(unref(local2_ax));
				
			};
			
		} else if ((((local16___SelectHelper4_) == (4)) ? 1 : 0)) {
			local2_ax = GETJOYZ(unref(CAST2INT(param4_njoy)));
			if (CAST2FLOAT((((local2_ax) < (-(param8_deadzone))) ? 1 : 0))) {
				return tryClone(ABS(unref(local2_ax)));
				
			};
			
		} else if ((((local16___SelectHelper4_) == (5)) ? 1 : 0)) {
			local2_ax = GETJOYZ(unref(CAST2INT(param4_njoy)));
			if (CAST2FLOAT((((local2_ax) > (param8_deadzone)) ? 1 : 0))) {
				return tryClone(unref(local2_ax));
				
			};
			
		} else if ((((local16___SelectHelper4_) == (6)) ? 1 : 0)) {
			local2_ax = GETJOYRX(unref(CAST2INT(param4_njoy)));
			if (CAST2FLOAT((((local2_ax) < (-(param8_deadzone))) ? 1 : 0))) {
				return tryClone(ABS(unref(local2_ax)));
				
			};
			
		} else if ((((local16___SelectHelper4_) == (7)) ? 1 : 0)) {
			local2_ax = GETJOYRX(unref(CAST2INT(param4_njoy)));
			if (CAST2FLOAT((((local2_ax) > (param8_deadzone)) ? 1 : 0))) {
				return tryClone(unref(local2_ax));
				
			};
			
		} else if ((((local16___SelectHelper4_) == (8)) ? 1 : 0)) {
			local2_ax = GETJOYRY(unref(CAST2INT(param4_njoy)));
			if (CAST2FLOAT((((local2_ax) < (-(param8_deadzone))) ? 1 : 0))) {
				return tryClone(ABS(unref(local2_ax)));
				
			};
			
		} else if ((((local16___SelectHelper4_) == (9)) ? 1 : 0)) {
			local2_ax = GETJOYRY(unref(CAST2INT(param4_njoy)));
			if (CAST2FLOAT((((local2_ax) > (param8_deadzone)) ? 1 : 0))) {
				return tryClone(unref(local2_ax));
				
			};
			
		} else if ((((local16___SelectHelper4_) == (10)) ? 1 : 0)) {
			local2_ax = GETJOYRZ(unref(CAST2INT(param4_njoy)));
			if (CAST2FLOAT((((local2_ax) < (-(param8_deadzone))) ? 1 : 0))) {
				return tryClone(ABS(unref(local2_ax)));
				
			};
			
		} else if ((((local16___SelectHelper4_) == (11)) ? 1 : 0)) {
			local2_ax = GETJOYRZ(unref(CAST2INT(param4_njoy)));
			if (CAST2FLOAT((((local2_ax) > (param8_deadzone)) ? 1 : 0))) {
				return tryClone(unref(local2_ax));
				
			};
			
		} else if ((((local16___SelectHelper4_) == (12)) ? 1 : 0)) {
			local2_ax = GETDIGIX(unref(CAST2INT(param4_njoy)));
			if (CAST2FLOAT((((local2_ax) > (0)) ? 1 : 0))) {
				return tryClone(ABS(unref(local2_ax)));
				
			};
			
		} else if ((((local16___SelectHelper4_) == (13)) ? 1 : 0)) {
			local2_ax = GETDIGIX(unref(CAST2INT(param4_njoy)));
			if (CAST2FLOAT((((local2_ax) > (0)) ? 1 : 0))) {
				return tryClone(unref(local2_ax));
				
			};
			
		} else if ((((local16___SelectHelper4_) == (14)) ? 1 : 0)) {
			local2_ax = GETDIGIY(unref(CAST2INT(param4_njoy)));
			if (CAST2FLOAT((((local2_ax) > (0)) ? 1 : 0))) {
				return tryClone(ABS(unref(local2_ax)));
				
			};
			
		} else if ((((local16___SelectHelper4_) == (15)) ? 1 : 0)) {
			local2_ax = GETDIGIY(unref(CAST2INT(param4_njoy)));
			if (CAST2FLOAT((((local2_ax) > (0)) ? 1 : 0))) {
				return tryClone(unref(local2_ax));
				
			};
			
		} else {
			local2_ax = GETJOYBUTTON(unref(CAST2INT(param4_njoy)), CAST2INT(((param3_nax) - (16))));
			if (local2_ax) {
				return tryClone(1);
				
			};
			
		};
		
	};
	return tryClone(0);
	return 0;
	
};
function func10_keydef_key(param11_keyname_Str) {
	param11_keyname_Str = unref(param11_keyname_Str);
	var local9_names_Str = new GLBArray(), local5_t_Str = "", local1_i = 0.0, local4_njoy = 0.0, local3_pos = 0.0;
	local5_t_Str = MID_Str(unref(param11_keyname_Str), 0, 1);
	if (CAST2FLOAT((((local5_t_Str) == ("K")) ? 1 : 0))) {
		param11_keyname_Str = MID_Str(unref(param11_keyname_Str), 1, 256);
		return tryClone(CAST2FLOAT(KEY(unref(CAST2INT(param11_keyname_Str)))));
		
	};
	if (CAST2FLOAT((((local5_t_Str) == ("J")) ? 1 : 0))) {
		local4_njoy = CAST2FLOAT(MID_Str(unref(param11_keyname_Str), 1, 1));
		local3_pos = CAST2FLOAT(INSTR(unref(param11_keyname_Str), "-", 0));
		if (CAST2FLOAT((((local3_pos) >= (0)) ? 1 : 0))) {
			return tryClone(func15_keydef_joystate(local4_njoy, CAST2FLOAT(MID_Str(unref(param11_keyname_Str), CAST2INT(((local3_pos) + (1))), 128)), 0));
			
		};
		
	};
	return tryClone(0);
	return 0;
	
};
function func24_keydef_get_nice_name_Str(param13_shortname_Str) {
	param13_shortname_Str = unref(param13_shortname_Str);
	var local8_none_Str = "", local9_names_Str = new GLBArray(), local5_t_Str = "", local1_i = 0.0, local4_njoy = 0.0;
	local8_none_Str = "*NONE*";
	local5_t_Str = MID_Str(unref(param13_shortname_Str), 0, 1);
	if (CAST2FLOAT((((local5_t_Str) == ("K")) ? 1 : 0))) {
		param13_shortname_Str = MID_Str(unref(param13_shortname_Str), 1, 256);
		if (CAST2FLOAT((((LEN(param13_shortname_Str)) == (0)) ? 1 : 0))) {
			return tryClone(unref(local8_none_Str));
			
		};
		func15_keydef_keynames(local9_names_Str);
		return tryClone(unref(local9_names_Str.arrAccess(param13_shortname_Str).values[tmpPositionCache]));
		
	};
	if (CAST2FLOAT((((local5_t_Str) == ("J")) ? 1 : 0))) {
		if (CAST2FLOAT((((SPLITSTR(unref(param13_shortname_Str), unref(local9_names_Str), "-", 1)) != (2)) ? 1 : 0))) {
			return tryClone(CAST2STRING(0));
			
		};
		return tryClone((((((("J") + (CAST2STRING(INTEGER(CAST2FLOAT(((MID_Str(unref(local9_names_Str.arrAccess(0).values[tmpPositionCache]), 1, 16)) + (CAST2STRING(1))))))))) + (","))) + (func18_keydef_joyname_Str(CAST2FLOAT(local9_names_Str.arrAccess(1).values[tmpPositionCache])))));
		
	};
	return tryClone(unref(local8_none_Str));
	return "";
	
};
function func19_keydef_get_name_Str(param5_state, param9_nullstate) {
	param5_state = unref(param5_state);
	param9_nullstate = unref(param9_nullstate);
	var local1_i = 0.0, local1_j = 0.0, local9_names_Str = new GLBArray();
	for (local1_i = 0;forCheck(local1_i, 255, 1);local1_i += 1) {
		if (CAST2FLOAT((((param5_state.attr4_keys.arrAccess(local1_i).values[tmpPositionCache]) && (CAST2FLOAT((((param9_nullstate.attr4_keys.arrAccess(local1_i).values[tmpPositionCache]) == (0)) ? 1 : 0)))) ? 1 : 0))) {
			return tryClone((("K") + (CAST2STRING(local1_i))));
			
		};
		
	};
	for (local1_i = 0;forCheck(local1_i, CAST2FLOAT(((MIN(unref(CAST2FLOAT(BOUNDS(param5_state.attr4_joys, 0))), unref(CAST2FLOAT(BOUNDS(param9_nullstate.attr4_joys, 0))))) - (1))), 1);local1_i += 1) {
		for (local1_j = 0;forCheck(local1_j, 47, 1);local1_j += 1) {
			if (CAST2FLOAT((((param5_state.attr4_joys.arrAccess(local1_i, local1_j).values[tmpPositionCache]) && (CAST2FLOAT((((param9_nullstate.attr4_joys.arrAccess(local1_i, local1_j).values[tmpPositionCache]) == (0)) ? 1 : 0)))) ? 1 : 0))) {
				return tryClone((((((("J") + (CAST2STRING(local1_i)))) + ("-"))) + (CAST2STRING(local1_j))));
				
			};
			
		};
		
	};
	return "";
	return "";
	
};
function func18_keydef_joyname_Str(param1_i) {
	param1_i = unref(param1_i);
	{
		var local16___SelectHelper5_ = 0.0;
		local16___SelectHelper5_ = param1_i;
		if ((((local16___SelectHelper5_) == (0)) ? 1 : 0)) {
			return "NEG_X";
			
		} else if ((((local16___SelectHelper5_) == (1)) ? 1 : 0)) {
			return "POS_X";
			
		} else if ((((local16___SelectHelper5_) == (2)) ? 1 : 0)) {
			return "NEG_Y";
			
		} else if ((((local16___SelectHelper5_) == (3)) ? 1 : 0)) {
			return "POS_Y";
			
		} else if ((((local16___SelectHelper5_) == (4)) ? 1 : 0)) {
			return "NEG_Z";
			
		} else if ((((local16___SelectHelper5_) == (5)) ? 1 : 0)) {
			return "POS_Z";
			
		} else if ((((local16___SelectHelper5_) == (6)) ? 1 : 0)) {
			return "NEG_RX";
			
		} else if ((((local16___SelectHelper5_) == (7)) ? 1 : 0)) {
			return "POS_RX";
			
		} else if ((((local16___SelectHelper5_) == (8)) ? 1 : 0)) {
			return "NEG_RY";
			
		} else if ((((local16___SelectHelper5_) == (9)) ? 1 : 0)) {
			return "POS_RY";
			
		} else if ((((local16___SelectHelper5_) == (10)) ? 1 : 0)) {
			return "NEG_RZ";
			
		} else if ((((local16___SelectHelper5_) == (11)) ? 1 : 0)) {
			return "POS_RZ";
			
		} else if ((((local16___SelectHelper5_) == (12)) ? 1 : 0)) {
			return "NEG_POVX";
			
		} else if ((((local16___SelectHelper5_) == (13)) ? 1 : 0)) {
			return "POS_POVX";
			
		} else if ((((local16___SelectHelper5_) == (14)) ? 1 : 0)) {
			return "NEG_POVY";
			
		} else if ((((local16___SelectHelper5_) == (15)) ? 1 : 0)) {
			return "POS_POVY";
			
		} else {
			return tryClone((("BUT_") + (CAST2STRING(((param1_i) - (15))))));
			
		};
		
	};
	return "";
	
};
function func15_keydef_keynames(param9_names_Str) {
	param9_names_Str = unref(param9_names_Str);
	DIM(unref(param9_names_Str), [256], "");
	param9_names_Str.arrAccess(1).values[tmpPositionCache] = "ESC";
	param9_names_Str.arrAccess(2).values[tmpPositionCache] = "1";
	param9_names_Str.arrAccess(3).values[tmpPositionCache] = "2";
	param9_names_Str.arrAccess(4).values[tmpPositionCache] = "3";
	param9_names_Str.arrAccess(5).values[tmpPositionCache] = "4";
	param9_names_Str.arrAccess(6).values[tmpPositionCache] = "5";
	param9_names_Str.arrAccess(7).values[tmpPositionCache] = "6";
	param9_names_Str.arrAccess(8).values[tmpPositionCache] = "7";
	param9_names_Str.arrAccess(9).values[tmpPositionCache] = "8";
	param9_names_Str.arrAccess(10).values[tmpPositionCache] = "9";
	param9_names_Str.arrAccess(11).values[tmpPositionCache] = "0";
	param9_names_Str.arrAccess(12).values[tmpPositionCache] = "MINUS";
	param9_names_Str.arrAccess(13).values[tmpPositionCache] = "EQUALS";
	param9_names_Str.arrAccess(14).values[tmpPositionCache] = "BACK";
	param9_names_Str.arrAccess(15).values[tmpPositionCache] = "TAB";
	param9_names_Str.arrAccess(16).values[tmpPositionCache] = "Q";
	param9_names_Str.arrAccess(17).values[tmpPositionCache] = "W";
	param9_names_Str.arrAccess(18).values[tmpPositionCache] = "E";
	param9_names_Str.arrAccess(19).values[tmpPositionCache] = "R";
	param9_names_Str.arrAccess(20).values[tmpPositionCache] = "T";
	param9_names_Str.arrAccess(21).values[tmpPositionCache] = "Y";
	param9_names_Str.arrAccess(22).values[tmpPositionCache] = "U";
	param9_names_Str.arrAccess(23).values[tmpPositionCache] = "I";
	param9_names_Str.arrAccess(24).values[tmpPositionCache] = "O";
	param9_names_Str.arrAccess(25).values[tmpPositionCache] = "P";
	param9_names_Str.arrAccess(26).values[tmpPositionCache] = "LBRACKET";
	param9_names_Str.arrAccess(27).values[tmpPositionCache] = "RBRACKET";
	param9_names_Str.arrAccess(28).values[tmpPositionCache] = "RETURN";
	param9_names_Str.arrAccess(29).values[tmpPositionCache] = "LCONTROL";
	param9_names_Str.arrAccess(30).values[tmpPositionCache] = "A";
	param9_names_Str.arrAccess(31).values[tmpPositionCache] = "S";
	param9_names_Str.arrAccess(32).values[tmpPositionCache] = "D";
	param9_names_Str.arrAccess(33).values[tmpPositionCache] = "F";
	param9_names_Str.arrAccess(34).values[tmpPositionCache] = "G";
	param9_names_Str.arrAccess(35).values[tmpPositionCache] = "H";
	param9_names_Str.arrAccess(36).values[tmpPositionCache] = "J";
	param9_names_Str.arrAccess(37).values[tmpPositionCache] = "K";
	param9_names_Str.arrAccess(38).values[tmpPositionCache] = "L";
	param9_names_Str.arrAccess(39).values[tmpPositionCache] = "SEMICOLON";
	param9_names_Str.arrAccess(40).values[tmpPositionCache] = "APOSTROPHE";
	param9_names_Str.arrAccess(41).values[tmpPositionCache] = "GRAVE";
	param9_names_Str.arrAccess(42).values[tmpPositionCache] = "LSHIFT";
	param9_names_Str.arrAccess(43).values[tmpPositionCache] = "BACKSLASH";
	param9_names_Str.arrAccess(44).values[tmpPositionCache] = "Z";
	param9_names_Str.arrAccess(45).values[tmpPositionCache] = "X";
	param9_names_Str.arrAccess(46).values[tmpPositionCache] = "C";
	param9_names_Str.arrAccess(47).values[tmpPositionCache] = "V";
	param9_names_Str.arrAccess(48).values[tmpPositionCache] = "B";
	param9_names_Str.arrAccess(49).values[tmpPositionCache] = "N";
	param9_names_Str.arrAccess(50).values[tmpPositionCache] = "M";
	param9_names_Str.arrAccess(51).values[tmpPositionCache] = "COMMA";
	param9_names_Str.arrAccess(52).values[tmpPositionCache] = "PERIOD";
	param9_names_Str.arrAccess(53).values[tmpPositionCache] = "SLASH";
	param9_names_Str.arrAccess(54).values[tmpPositionCache] = "RSHIFT";
	param9_names_Str.arrAccess(55).values[tmpPositionCache] = "MULTIPLY";
	param9_names_Str.arrAccess(56).values[tmpPositionCache] = "LMENU";
	param9_names_Str.arrAccess(57).values[tmpPositionCache] = "SPACE";
	param9_names_Str.arrAccess(58).values[tmpPositionCache] = "CAPITAL";
	param9_names_Str.arrAccess(59).values[tmpPositionCache] = "F1";
	param9_names_Str.arrAccess(60).values[tmpPositionCache] = "F2";
	param9_names_Str.arrAccess(61).values[tmpPositionCache] = "F3";
	param9_names_Str.arrAccess(62).values[tmpPositionCache] = "F4";
	param9_names_Str.arrAccess(63).values[tmpPositionCache] = "F5";
	param9_names_Str.arrAccess(64).values[tmpPositionCache] = "F6";
	param9_names_Str.arrAccess(65).values[tmpPositionCache] = "F7";
	param9_names_Str.arrAccess(66).values[tmpPositionCache] = "F8";
	param9_names_Str.arrAccess(67).values[tmpPositionCache] = "F9";
	param9_names_Str.arrAccess(68).values[tmpPositionCache] = "F10";
	param9_names_Str.arrAccess(69).values[tmpPositionCache] = "NUMLOCK";
	param9_names_Str.arrAccess(70).values[tmpPositionCache] = "SCROLL";
	param9_names_Str.arrAccess(71).values[tmpPositionCache] = "NUMPAD7";
	param9_names_Str.arrAccess(72).values[tmpPositionCache] = "NUMPAD8";
	param9_names_Str.arrAccess(73).values[tmpPositionCache] = "NUMPAD9";
	param9_names_Str.arrAccess(74).values[tmpPositionCache] = "SUBTRACT";
	param9_names_Str.arrAccess(75).values[tmpPositionCache] = "NUMPAD4";
	param9_names_Str.arrAccess(76).values[tmpPositionCache] = "NUMPAD5";
	param9_names_Str.arrAccess(77).values[tmpPositionCache] = "NUMPAD6";
	param9_names_Str.arrAccess(78).values[tmpPositionCache] = "ADD";
	param9_names_Str.arrAccess(79).values[tmpPositionCache] = "NUMPAD1";
	param9_names_Str.arrAccess(80).values[tmpPositionCache] = "NUMPAD2";
	param9_names_Str.arrAccess(81).values[tmpPositionCache] = "NUMPAD3";
	param9_names_Str.arrAccess(82).values[tmpPositionCache] = "NUMPAD0";
	param9_names_Str.arrAccess(83).values[tmpPositionCache] = "DECIMAL";
	param9_names_Str.arrAccess(86).values[tmpPositionCache] = "OEM_102";
	param9_names_Str.arrAccess(87).values[tmpPositionCache] = "F11";
	param9_names_Str.arrAccess(88).values[tmpPositionCache] = "F12";
	param9_names_Str.arrAccess(100).values[tmpPositionCache] = "F13";
	param9_names_Str.arrAccess(101).values[tmpPositionCache] = "F14";
	param9_names_Str.arrAccess(102).values[tmpPositionCache] = "F15";
	param9_names_Str.arrAccess(112).values[tmpPositionCache] = "KANA";
	param9_names_Str.arrAccess(115).values[tmpPositionCache] = "ABNT_C1";
	param9_names_Str.arrAccess(121).values[tmpPositionCache] = "CONVERT";
	param9_names_Str.arrAccess(123).values[tmpPositionCache] = "NOCONVERT";
	param9_names_Str.arrAccess(125).values[tmpPositionCache] = "YEN";
	param9_names_Str.arrAccess(126).values[tmpPositionCache] = "ABNT_C2";
	param9_names_Str.arrAccess(141).values[tmpPositionCache] = "NUMPADEQUALS";
	param9_names_Str.arrAccess(144).values[tmpPositionCache] = "PREVTRACK";
	param9_names_Str.arrAccess(145).values[tmpPositionCache] = "AT";
	param9_names_Str.arrAccess(146).values[tmpPositionCache] = "COLON";
	param9_names_Str.arrAccess(147).values[tmpPositionCache] = "UNDERLINE";
	param9_names_Str.arrAccess(148).values[tmpPositionCache] = "KANJI";
	param9_names_Str.arrAccess(149).values[tmpPositionCache] = "STOP";
	param9_names_Str.arrAccess(150).values[tmpPositionCache] = "AX";
	param9_names_Str.arrAccess(151).values[tmpPositionCache] = "UNLABELED";
	param9_names_Str.arrAccess(153).values[tmpPositionCache] = "NEXTTRACK";
	param9_names_Str.arrAccess(156).values[tmpPositionCache] = "NUMPADENTER";
	param9_names_Str.arrAccess(157).values[tmpPositionCache] = "RCONTROL";
	param9_names_Str.arrAccess(160).values[tmpPositionCache] = "MUTE";
	param9_names_Str.arrAccess(161).values[tmpPositionCache] = "CALCULATOR";
	param9_names_Str.arrAccess(162).values[tmpPositionCache] = "PLAYPAUSE";
	param9_names_Str.arrAccess(164).values[tmpPositionCache] = "MEDIASTOP";
	param9_names_Str.arrAccess(174).values[tmpPositionCache] = "VOLUMEDOWN";
	param9_names_Str.arrAccess(176).values[tmpPositionCache] = "VOLUMEUP";
	param9_names_Str.arrAccess(178).values[tmpPositionCache] = "WEBHOME";
	param9_names_Str.arrAccess(179).values[tmpPositionCache] = "NUMPADCOMMA";
	param9_names_Str.arrAccess(181).values[tmpPositionCache] = "DIVIDE";
	param9_names_Str.arrAccess(183).values[tmpPositionCache] = "SYSRQ";
	param9_names_Str.arrAccess(184).values[tmpPositionCache] = "RMENU";
	param9_names_Str.arrAccess(197).values[tmpPositionCache] = "PAUSE";
	param9_names_Str.arrAccess(199).values[tmpPositionCache] = "HOME";
	param9_names_Str.arrAccess(200).values[tmpPositionCache] = "UP";
	param9_names_Str.arrAccess(201).values[tmpPositionCache] = "PRIOR";
	param9_names_Str.arrAccess(203).values[tmpPositionCache] = "LEFT";
	param9_names_Str.arrAccess(205).values[tmpPositionCache] = "RIGHT";
	param9_names_Str.arrAccess(207).values[tmpPositionCache] = "END";
	param9_names_Str.arrAccess(208).values[tmpPositionCache] = "DOWN";
	param9_names_Str.arrAccess(209).values[tmpPositionCache] = "NEXT";
	param9_names_Str.arrAccess(210).values[tmpPositionCache] = "INSERT";
	param9_names_Str.arrAccess(211).values[tmpPositionCache] = "DELETE";
	param9_names_Str.arrAccess(219).values[tmpPositionCache] = "LWIN";
	param9_names_Str.arrAccess(220).values[tmpPositionCache] = "RWIN";
	param9_names_Str.arrAccess(221).values[tmpPositionCache] = "APPS";
	param9_names_Str.arrAccess(222).values[tmpPositionCache] = "POWER";
	param9_names_Str.arrAccess(223).values[tmpPositionCache] = "SLEEP";
	param9_names_Str.arrAccess(227).values[tmpPositionCache] = "WAKE";
	param9_names_Str.arrAccess(229).values[tmpPositionCache] = "WEBSEARCH";
	param9_names_Str.arrAccess(230).values[tmpPositionCache] = "WEBFAVORITES";
	param9_names_Str.arrAccess(231).values[tmpPositionCache] = "WEBREFRESH";
	param9_names_Str.arrAccess(232).values[tmpPositionCache] = "WEBSTOP";
	param9_names_Str.arrAccess(233).values[tmpPositionCache] = "WEBFORWARD";
	param9_names_Str.arrAccess(234).values[tmpPositionCache] = "WEBBACK";
	param9_names_Str.arrAccess(235).values[tmpPositionCache] = "MYCOMPUTER";
	param9_names_Str.arrAccess(236).values[tmpPositionCache] = "MAIL";
	param9_names_Str.arrAccess(237).values[tmpPositionCache] = "MEDIASELECT";
	return 0;
	
};
function func8_MenuInit(param8_file_Str) {
	param8_file_Str = unref(param8_file_Str);
	INIOPEN(unref(param8_file_Str));
	INIPUT("root", "button", "");
	global12_menu_dir_Str = "root";
	global9_menu_fade = 0.1;
	global8_menu_pos = 0;
	global9_menu_back = 0;
	global12_menu_keymode = 0;
	func15_keydef_getstate(global14_menu_nullstate);
	return 0;
	
};
function func12_MenuNavigate() {
	if (CAST2FLOAT(KEY(200))) {
		return tryClone(1);
		
	};
	if (CAST2FLOAT(KEY(203))) {
		return tryClone(2);
		
	};
	if (CAST2FLOAT(KEY(208))) {
		return tryClone(3);
		
	};
	if (CAST2FLOAT(KEY(205))) {
		return tryClone(4);
		
	};
	if (CAST2FLOAT(KEY(28))) {
		return tryClone(5);
		
	};
	return tryClone(0);
	return 0;
	
};
function func8_MenuShow() {
	var local4_keys = new type12_KEYDEF_STATE(), local3_num = 0.0, local1_i = 0.0, local1_k = 0.0, local1_n = 0.0, local5_k_Str = "", local8_name_Str = "", local9_items_Str = new GLBArray(), local9_types_Str = new GLBArray(), local4_vals = new GLBArray(), local7_val_Str = new GLBArray();
	local3_num = 0;
	while (1) {
		local3_num+=1;
		local8_name_Str = INIGET_Str(unref(global12_menu_dir_Str), ((CAST2STRING(local3_num)) + ("name")), "NO_DATA");
		if (CAST2FLOAT((((local8_name_Str) == ("NO_DATA")) ? 1 : 0))) {
			break;
			
		};
		REDIM(unref(local9_items_Str), [local3_num], "" );
		REDIM(unref(local9_types_Str), [local3_num], "" );
		REDIM(unref(local4_vals), [local3_num], 0.0 );
		local9_items_Str.arrAccess(((local3_num) - (1))).values[tmpPositionCache] = local8_name_Str;
		local9_types_Str.arrAccess(((local3_num) - (1))).values[tmpPositionCache] = LCASE_Str(INIGET_Str(unref(global12_menu_dir_Str), ((CAST2STRING(local3_num)) + ("type")), "NO_DATA"));
		local4_vals.arrAccess(((local3_num) - (1))).values[tmpPositionCache] = CAST2FLOAT(INIGET_Str(unref(global12_menu_dir_Str), ((CAST2STRING(local3_num)) + ("value")), "NO_DATA"));
		
	};
	if (CAST2FLOAT((((global9_menu_fade) == (0)) ? 1 : 0))) {
		if (CAST2FLOAT((((global12_menu_keymode) == (0)) ? 1 : 0))) {
			local1_k = func12_MenuNavigate();
			if (CAST2FLOAT((((local1_k) != (static13_MenuShow_last_key_down)) ? 1 : 0))) {
				{
					var local16___SelectHelper1_ = 0.0;
					local16___SelectHelper1_ = local1_k;
					if ((((local16___SelectHelper1_) == (1)) ? 1 : 0)) {
						global8_menu_pos+=-(1);
						
					} else if ((((local16___SelectHelper1_) == (3)) ? 1 : 0)) {
						global8_menu_pos+=1;
						
					} else if ((((local16___SelectHelper1_) == (2)) ? 1 : 0)) {
						if (CAST2FLOAT((((global12_menu_dir_Str) != ("root")) ? 1 : 0))) {
							global9_menu_back = 1;
							global9_menu_fade = -(0.1);
							
						};
						
					} else if (((((((local16___SelectHelper1_) >= (4)) ? 1 : 0)) && ((((local16___SelectHelper1_) <= (5)) ? 1 : 0))) ? 1 : 0)) {
						{
							var local16___SelectHelper2_ = "";
							local16___SelectHelper2_ = MID_Str(unref(local9_types_Str.arrAccess(global8_menu_pos).values[tmpPositionCache]), 0, 3);
							if ((((local16___SelectHelper2_) == ("dir")) ? 1 : 0)) {
								global9_menu_fade = -(0.1);
								
							} else if ((((local16___SelectHelper2_) == ("but")) ? 1 : 0)) {
								global9_menu_fade = -(0.1);
								
							} else if ((((local16___SelectHelper2_) == ("tog")) ? 1 : 0)) {
								local1_n = CAST2FLOAT(((SPLITSTR(unref(local9_types_Str.arrAccess(global8_menu_pos).values[tmpPositionCache]), unref(static7_MenuShow_tmp_Str), " ,:", 1)) - (1)));
								if (local1_n) {
									local4_vals.arrAccess(global8_menu_pos).values[tmpPositionCache] = CAST2FLOAT(MOD(CAST2INT(((((local4_vals.arrAccess(global8_menu_pos).values[tmpPositionCache]) + (local1_n))) + (1))), unref(CAST2INT(local1_n))));
									INIPUT(unref(global12_menu_dir_Str), ((CAST2STRING(((global8_menu_pos) + (1)))) + ("value")), unref(CAST2STRING(local4_vals.arrAccess(global8_menu_pos).values[tmpPositionCache])));
									
								};
								
							} else if ((((local16___SelectHelper2_) == ("key")) ? 1 : 0)) {
								global12_menu_keymode = 1;
								
							};
							
						};
						
					} else {
						static13_MenuShow_last_key_down = CAST2FLOAT(-(1));
						
					};
					
				};
				
			};
			if (CAST2FLOAT((((local1_k) > (0)) ? 1 : 0))) {
				static13_MenuShow_last_key_down = local1_k;
				
			};
			
		} else {
			if (CAST2FLOAT(KEY(1))) {
				global12_menu_keymode = 0;
				
			} else {
				func15_keydef_getstate(local4_keys);
				local5_k_Str = func19_keydef_get_name_Str(local4_keys, global14_menu_nullstate);
				if (CAST2FLOAT((((local5_k_Str) != ("")) ? 1 : 0))) {
					INIPUT(unref(global12_menu_dir_Str), ((CAST2STRING(((global8_menu_pos) + (1)))) + ("value")), unref(local5_k_Str));
					global12_menu_keymode = CAST2FLOAT(-(1));
					
				} else {
					if (CAST2FLOAT((((global12_menu_keymode) < (0)) ? 1 : 0))) {
						global12_menu_keymode = 0;
						
					};
					
				};
				
			};
			
		};
		
	};
	if (CAST2FLOAT((((local3_num) > (1)) ? 1 : 0))) {
		global8_menu_pos = CAST2FLOAT(MOD(CAST2INT(((((global8_menu_pos) + (local3_num))) - (1))), CAST2INT(((local3_num) - (1)))));
		
	} else {
		global8_menu_pos = 0;
		
	};
	if (CAST2FLOAT((((global9_menu_fade) > (0)) ? 1 : 0))) {
		global9_menu_fade+=CAST2INT(((CAST2FLOAT(MIN(20, CAST2FLOAT(GETTIMER())))) / (500)));
		if (CAST2FLOAT((((global9_menu_fade) > (1)) ? 1 : 0))) {
			global9_menu_fade = 0;
			
		};
		
	};
	if (CAST2FLOAT((((global9_menu_fade) < (0)) ? 1 : 0))) {
		global9_menu_fade+=-(CAST2INT(((CAST2FLOAT(MIN(20, CAST2FLOAT(GETTIMER())))) / (500))));
		if (CAST2FLOAT((((global9_menu_fade) <= (CAST2FLOAT(-(1)))) ? 1 : 0))) {
			global9_menu_fade = 0;
			if (global9_menu_back) {
				global9_menu_back = 0;
				global12_menu_dir_Str = "root";
				global9_menu_fade = 0.1;
				
			} else {
				{
					var local16___SelectHelper3_ = "";
					local16___SelectHelper3_ = local9_types_Str.arrAccess(global8_menu_pos).values[tmpPositionCache];
					if ((((local16___SelectHelper3_) == ("dir")) ? 1 : 0)) {
						global12_menu_dir_Str = INIGET_Str(unref(global12_menu_dir_Str), ((CAST2STRING(((global8_menu_pos) + (1)))) + ("value")), "NO_DATA");
						if (CAST2FLOAT((((global12_menu_dir_Str) == ("NO_DATA")) ? 1 : 0))) {
							global12_menu_dir_Str = "root";
							
						};
						global9_menu_fade = 0.1;
						global8_menu_pos = 0;
						
					} else if ((((local16___SelectHelper3_) == ("button")) ? 1 : 0)) {
						return tryClone(unref(local4_vals.arrAccess(global8_menu_pos).values[tmpPositionCache]));
						
					};
					
				};
				
			};
			
		};
		
	};
	DIM(unref(local7_val_Str), [local3_num], "");
	for (local1_i = 1;forCheck(local1_i, ((local3_num) - (1)), 1);local1_i += 1) {
		if (CAST2FLOAT((((MID_Str(LCASE_Str(unref(local9_types_Str.arrAccess(((local1_i) - (1))).values[tmpPositionCache])), 0, 6)) == ("toggle")) ? 1 : 0))) {
			local1_k = CAST2FLOAT(((SPLITSTR(unref(local9_types_Str.arrAccess(((local1_i) - (1))).values[tmpPositionCache]), unref(static7_MenuShow_tmp_Str), " ,:", 1)) - (1)));
			if (local1_k) {
				local7_val_Str.arrAccess(((local1_i) - (1))).values[tmpPositionCache] = static7_MenuShow_tmp_Str.arrAccess(((local4_vals.arrAccess(((local1_i) - (1))).values[tmpPositionCache]) + (1))).values[tmpPositionCache];
				
			};
			
		};
		if (CAST2FLOAT((((LCASE_Str(unref(local9_types_Str.arrAccess(((local1_i) - (1))).values[tmpPositionCache]))) == ("key")) ? 1 : 0))) {
			local7_val_Str.arrAccess(((local1_i) - (1))).values[tmpPositionCache] = func24_keydef_get_nice_name_Str(INIGET_Str(unref(global12_menu_dir_Str), ((CAST2STRING(local1_i)) + ("value")), "NO_DATA"));
			
		};
		
	};
	func8_MenuDraw(global9_menu_fade, global8_menu_pos, local9_items_Str, local7_val_Str);
	return 0;
	
};
function func8_MenuDraw(param4_fade, param3_sel, param9_items_Str, param10_values_Str) {
	param4_fade = unref(param4_fade);
	param3_sel = unref(param3_sel);
	param9_items_Str = unref(param9_items_Str);
	param10_values_Str = unref(param10_values_Str);
	var local2_sx_ref = [0.0], local2_sy_ref = [0.0], local1_l = 0.0, local2_fx_ref = [0.0], local2_fy_ref = [0.0], local3_num = 0.0, local1_x = 0.0, local1_y = 0.0, local1_w = 0.0, local1_h = 0.0, local1_i = 0.0, local2_ty = 0.0, local5_t_Str = "";
	GETSCREENSIZE(local2_sx_ref, local2_sy_ref);
	GETFONTSIZE(local2_fx_ref, local2_fy_ref);
	local3_num = CAST2FLOAT(BOUNDS(param9_items_Str, 0));
	if (CAST2FLOAT((((local3_num) == (0)) ? 1 : 0))) {
		return 0;
		
	};
	local1_w = CAST2FLOAT(INTEGER(((local2_sx_ref[0]) * (0.75))));
	local1_h = ((((4) + (local3_num))) * (local2_fy_ref[0]));
	if (CAST2FLOAT((((param4_fade) > (0)) ? 1 : 0))) {
		param4_fade = ((1) - (param4_fade));
		
	};
	local1_x = ((((param4_fade) * (local2_sx_ref[0]))) + (((((local2_sx_ref[0]) - (local1_w))) / (2))));
	local1_y = ((((local2_sy_ref[0]) - (local1_h))) / (2));
	ALPHAMODE(-(0.5));
	DRAWRECT(unref(local1_x), unref(local1_y), unref(local1_w), unref(local1_h), RGB(0, 0, 0));
	ALPHAMODE(0);
	if (global12_menu_keymode) {
		PRINT((("REDEFINE: ") + (param9_items_Str.arrAccess(global8_menu_pos).values[tmpPositionCache])), unref(local1_x), ((local1_y) + (local2_fy_ref[0])), 0);
		
	} else {
		for (local1_i = 0;forCheck(local1_i, ((local3_num) - (1)), 1);local1_i += 1) {
			local2_ty = ((((local1_y) + (((local2_fy_ref[0]) * (2))))) + (((local1_i) * (local2_fy_ref[0]))));
			if (CAST2FLOAT((((local1_i) == (param3_sel)) ? 1 : 0))) {
				ALPHAMODE(-(0.7));
				DRAWRECT(unref(local1_x), unref(local2_ty), unref(local1_w), unref(local2_fy_ref[0]), RGB(255, 255, 255));
				ALPHAMODE(0);
				
			};
			PRINT(unref(param9_items_Str.arrAccess(local1_i).values[tmpPositionCache]), ((local1_x) + (local2_fx_ref[0])), unref(local2_ty), 0);
			local1_l = CAST2FLOAT(LEN(param10_values_Str.arrAccess(local1_i).values[tmpPositionCache]));
			if (local1_l) {
				PRINT((((("[") + (param10_values_Str.arrAccess(local1_i).values[tmpPositionCache]))) + ("]")), ((((local1_x) + (local1_w))) - (((((local1_l) + (3))) * (local2_fx_ref[0])))), unref(local2_ty), 0);
				
			};
			
		};
		for (local1_i = CAST2FLOAT(-(1));forCheck(local1_i, local3_num, 1);local1_i += 1) {
			local2_ty = ((((local1_y) + (((local2_fy_ref[0]) * (2))))) + (((local1_i) * (local2_fy_ref[0]))));
			PRINT("|", unref(local1_x), unref(local2_ty), 0);
			PRINT("|", ((((local1_x) + (local1_w))) - (local2_fx_ref[0])), unref(local2_ty), 0);
			
		};
		local3_num = CAST2FLOAT(((INTEGER(((local1_w) / (local2_fx_ref[0])))) - (1)));
		for (local1_i = 0;forCheck(local1_i, local3_num, 1);local1_i += 1) {
			local5_t_Str = "-";
			if (CAST2FLOAT(((((((local1_i) == (0)) ? 1 : 0)) || ((((local1_i) == (local3_num)) ? 1 : 0))) ? 1 : 0))) {
				local5_t_Str = "#";
				
			};
			PRINT(unref(local5_t_Str), ((local1_x) + (((local1_i) * (local2_fx_ref[0])))), unref(local1_y), 0);
			PRINT(unref(local5_t_Str), ((local1_x) + (((local1_i) * (local2_fx_ref[0])))), ((((local1_y) + (local1_h))) - (local2_fy_ref[0])), 0);
			
		};
		
	};
	return 0;
	
};
/**
* @constructor
*/
function type7_CONTROL() {
	this.attr7_lft_Str = "";
	this.attr8_rght_Str = "";
	this.attr6_up_Str = "";
	this.attr8_down_Str = "";
	this.attr10_button_Str = "";
	this.clone = function() {
		var other = new Object();
		other.attr7_lft_Str = tryClone(this.attr7_lft_Str);
		other.attr8_rght_Str = tryClone(this.attr8_rght_Str);
		other.attr6_up_Str = tryClone(this.attr6_up_Str);
		other.attr8_down_Str = tryClone(this.attr8_down_Str);
		other.attr10_button_Str = tryClone(this.attr10_button_Str);
		other.clone = this.clone;
		return other;
	};
	return this;
	
};
/**
* @constructor
*/
function type12_KEYDEF_STATE() {
	this.attr4_keys = new GLBArray();
	this.attr4_joys = new GLBArray();
	this.attr4_keys = DIM(new GLBArray(), [256], [0.0]);
	this.attr4_joys = DIM(new GLBArray(), [4, 48], [0.0]);
	this.clone = function() {
		var other = new Object();
		other.attr4_keys = tryClone(this.attr4_keys);
		other.attr4_joys = tryClone(this.attr4_joys);
		other.clone = this.clone;
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
	if (callStack.length > 0) {
		throw msg;
	} else {
		alert(msg);
		END();
	}
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
	this.values = new Array();
	this.dimensions = [0];
	this.defval = 0;
	this.arrAccess = function() {
		//if (debugMode) {
		//	stackPush("Array access", __debugInfo);
		//}
		//var wrongPosition = function() {
			//if (tmpPositionCache < 0 || tmpPositionCache >= this.values.length) {
			//}
		//}
		
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
				tmpPositionCache = args[0] + args[1]*this.dimensions[0] + args[1]*this.dimensions[0]*this.dimensions[1] + args[2]*this.dimensions[0]*this.dimensions[1]*this.dimensions[2];
				break;
			case 4:
				tmpPositionCache = args[0] + args[1]*this.dimensions[0] + args[1]*this.dimensions[0]*this.dimensions[1] + args[2]*this.dimensions[0]*this.dimensions[1]*this.dimensions[2] + args[2]*this.dimensions[0]*this.dimensions[1]*this.dimensions[2]*this.dimensions[3];
				break;
			default:
				var mul = this.values.length/this.dimensions[arguments.length-1];
				for (var i = arguments.length-1; i >= 0 ; i--) {
					tmpPositionCache += args[i]*mul;
					mul /= this.dimensions[i-1];
				}
		}
		//if (debugMode) {
		//	stackPop();
		//}
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
	if (value instanceof Array) { //not sure about this
		return [CAST2INT(value[0])];
	} else {
		switch (typeof value) {
			case 'function':
				return 1;
			case 'undefined':
				return 0;
			case 'number':
				if (value < 0) value = Math.ceil(value); else if (value > 0) value = Math.floor(value);
		}
		switch(""+value) {
			case 'true':
				value = 1;
			case 'false':
				value = 0;
		}
		
		if (debugMode && false) {
			var v = value;
			value = parseInt(value); //String(
			if (isNaN(value)) {
				throwError("Not a number: '"+v+"'");
			}
		} else {
			value = parseInt(value); //String(
			if (isNaN(value)) {
				value = 0;
			}
		}
		
		
		return value;
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
				return 0.0;
		}
		switch(""+value) {
			case 'true':
				value = 1;
			case 'false':
				value = 0;
		}
		
		if (debugMode && false) {
			var v = value;
			value = parseFloat(value); //String(
			if (isNaN(value)) {
				throwError("Not a number: '"+v+"'");
			}
		} else {
			value = parseFloat(value); //String(
			if (isNaN(value)) {
				value = 0.0;
			}
		}
		return value;
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
				return "0";
		}
		
		return ""+value;
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
var mouseX		= 0;		//Die X Position der Maus
var mouseY		= 0;		//Die Y Position der Maus
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
var anyKeyPress = false;	//Wurde eine Taste gedr�ckt?
var anyMousePress = false;	//Wurde eine Mouse gedr�ckt?
var	background	= null;		//Das Hintergrundbg (USEASBMP oder LOADBMP)
var loopFunc 	= null; //Aktueller LOOP
var loops 	 	= [];		//Der Loopstack
var usedSoundformat = 'ogg';	//Das benutzte Soundformat
var hibernate	= false;	//SOlls warten
var mouseLeft = false, mouseRight = false, mouseMiddle = false; //Mouse states
var mouseSpeedX = 0, mouseSpeedY = 0; //X/Y Speed der Maus
var lastMouseX, lastMouseY;	//Wie wars vorher?
var transCol	= null;		//Die durchsichtige farbe
var setBmp 		= null;		//die funktion die den hintergrund setzen soll
//------------------------------------------------------------
// Basic 2D stuff
//------------------------------------------------------------

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
			
			mouseSpeedX = mouseX - lastMouseX;
			mouseSpeedY = mouseY - lastMouseY;
			if (hibernate) {
				if (ANYMOUSE() || ANYKEY() || mouseSpeedX || mouseSpeedY) {
					hibernate = false;
				}
			} else {
				canvasWidth = canvas.width; 
				canvasHeight = canvas.height;
				
				var func = function() {
					if (!waitload) {
						loopFunc(); //mainloop
					} else if (GLB_ON_LOADING) {
						GLB_ON_LOADING();
					}
				}
				
				if (showFPS == -1) {
					func();
				} else {
					var frameStart = GETTIMERALL();
					var frameDelta = frameStart - framePrev;
					
					if (frameDelta >= frameDelay) {
						func();
							
						frameDelay = showFPS;
						if (frameDelta > frameDelay) {
							frameDelay = frameDelay - (frameDelta - frameDelay);
						}
						framePrev = frameStart;
					}
				}
				
			}
			anyKeyPress = false;
			anyMousePress = false;
			lastMouseX = mouseX;
			lastMouseY = mouseY;
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

function init2D(canvasName) {
	var myAudio = document.createElement('audio'); 
    var canPlayMp3 = false, canPlayOgg = false;
    if (myAudio.canPlayType) {
		canPlayMp3 = !!myAudio.canPlayType && "" != myAudio.canPlayType('audio/mpeg');
		if (canPlayMp3 == "maybe" || canPlayMp3 == "probably" || canPlayMp3 == true) canPlayMp3 = true; else canPlayMp3 = false;
		canPlayOgg = !!myAudio.canPlayType && "" != myAudio.canPlayType('audio/ogg; codecs="vorbis"');
		if (canPlayOgg == "maybe" || canPlayOgg == "probably" || canPlayOgg == true) canPlayOgg = true; else canPlayOgg = false;
	}
	if (!canPlayOgg && !canPlayMp3) throwError("Your browser is not able to play sound... please use a newer browser.");
	
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
	
    canvas.style.cursor = 'none'; //hide pointer
    
	function finishEvent(e){
		if(e.stopPropagation){
			e.stopPropagation();
			e.preventDefault();
		} else {
			e.cancelBubble=true;
			e.returnValue=false;
		}
	}
	
	//mouse listener
    canvas.onmousemove = function(ev) {
    	if(!ev) ev = window.event();
		mouseX = ev.clientX - canvas.offsetLeft;
		mouseY = ev.clientY - canvas.offsetTop;
    }
	canvas.onmousedown=function( e ) {
		if(!e) e = window.event();
		anyMousePress = true;
		switch( e.button ){
			case 0: mouseLeft 	= true; break;
			case 1: mouseMiddle = true; break;
			case 2: mouseRight 	= true; break;
		}
		finishEvent(e);
	}
	
	canvas.onmouseup=function( e ) {
		if(!e) e = window.event();
		switch( e.button ){
			case 0: mouseLeft 	= false; break;
			case 1: mouseMiddle = false; break;
			case 2: mouseRight 	= false; break;
		}
		finishEvent(e);
	}
	
	canvas.onmouseout=function( e ){
		mouseLeft 	= false;
		mouseRight	= false;
		mouseMiddle = false;
		finishEvent(e);
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
	//return parseInt((conv2Hex(r) + conv2Hex(g) + conv2Hex(b)), 16);//.toString(10);
	return r*0x10000 + g*0x100 + b;
}

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
	if (oScreen && oScreen.spr) getSprite(oScreen.spr).data = null;
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
		context.scale(sx, sy);
		DRAWSPRITE(num, x, y);
		context.restore();
	}
}

function STRETCHSPRITE(num,  x, y, width, height) {
	var spr = getSprite(num);
	if (width != 0 && height != 0) {
		context.drawImage(spr.img, CAST2INT(x), CAST2INT(y), CAST2INT(width), CAST2INT(height));
	}
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
	switch(info) {
		case 0:
			return mouseSpeedX;
		case 1:
			return mouseSpeedY;
		case 2:
			return 0; //TODO: MOUSEWHEEL
		case 3:
			return mouseLeft ? 1 : 0;
		case 4:
			return mouseRight ? 1 : 0;
		case 5:
			return mouseMiddle ? 1 : 0;
	}
}

function MOUSESTATE(x, y, ml, mr) {
	x[0] 	= mouseX;
	y[0] 	= mouseY;
	ml[0]	= mouseLeft ? 1 : 0;
	mr[0]	= mouseRight ? 1 : 0;
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
	
	return isPixelCollision(s1.data, x1, y1, s2.data, x2, y2) ? 1 : 0;
}

function ANIMCOLL(ani1, tile, x1, y1, ani2, time2, x2, y2) {
	throwError("TODO: animcoll");
}

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
	for (var i = 0; i < soundChannels.length; i++) {
		if (!!soundChannels[i] && soundChannels[i].playing) soundChannels[i].stop();
	}
}

function SOUNDPLAYING(chn) {
	return (!!soundChannels[chn] && soundChannels[chn].playing ) ? 0 : 1;
}
function PLAYMUSIC(file, loop) {
	return;
	var s = LOADSOUND(file, 0, 1);
	s.loop = loop;
	s.music = true;
}

function STOPMUSIC() {
	if (SOUNDPLAYING(0)) {
		soundChannels[0].stop();
	}
}

function ISMUSICPLAYING() {
	return SOUNDPLAYING(0);
}




// set default statics:
var static7_MenuShow_tmp_Str = new GLBArray(), static13_MenuShow_last_key_down = CAST2FLOAT(-(1));
if (initFS) initFS()
