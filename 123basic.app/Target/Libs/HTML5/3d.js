var gl = null;


function InitOpenGLES2() {
	if (!window.canvas) throwError("Canvas not found...");
	var names = [ "webgl", "experimental-webgl", "moz-webgl", "webkit-3d" ];
	for (var i=0; i<names.length; i++) {
		try { 
			gl = canvas.getContext(names[i]);
			if (gl) { break; }
		} catch (e) { }
	}
	if (!gl) {
		throwError("No known OpenGL context detected! Is it enabled?");
	} else {
		gl.clearColor(0.0, 0.0, 0.0, 1.0);
		
		gl.enable(gl.DEPTH_TEST);
	}
}
