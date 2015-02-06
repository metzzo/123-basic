# Overview
## [Module 2D] (#2D)
* [PUSHLOOP] (PUSHLOOP)
* [POPLOOP] (POPLOOP)
* [GETCURRENTLOOP$] (GETCURRENTLOOP$)
* [RETURNTOLOOP] (RETURNTOLOOP)

# 2D
Everything you need to perform high performance 2D operations on the web

## PUSHLOOP
>`NATIVE FUNCTION PUSHLOOP AS void: loop$`

Parameter | Description
-----------|-----------------------------------------------------------------------
`loop$`|Describes the name of the SUB which is jumped to

```
SUB GLB_ON_LOOP:
	PUSHLOOP "GLB_ON_MENU"
ENDSUB
SUB GLB_ON_MENU:
	PUSHLOOP "GLB_ON_GAME"
ENDSUB
SUB GLB_ON_GAME:
	// game \o/
ENDSUB
```

This command pushes the given SUB loop$ onto the loop stack. The last sub on the stack is executed when the canvas is rendering. Use this method instead of a main loop (which would not work on the web).
When the application is started, the 'GLB_ON_LOOP' is called as default, if it exists.

See also: [PUSHLOOP] (#PUSHLOOP), [GETCURRENTLOOP$] (#GETCURRENTLOOP$), [RETURNTOLOOP] (#RETURNTOLOOP)
## POPLOOP
>`NATIVE FUNCTION POPLOOP AS void:`

```
SUB GLB_ON_LOOP:
	POPLOOP 
ENDSUB
```

This command pops the currently executing game loop sub from the loop stack. Keep in mind that this does not affect the currently executing sub, it is only for the next execution.

See also: [POPLOOP] (#POPLOOP), [GETCURRENTLOOP$] (#GETCURRENTLOOP$), [RETURNTOLOOP] (#RETURNTOLOOP)
## GETCURRENTLOOP$
```
SUB GLB_ON_LOOP:
	PRINT GETCURRENTLOOP$(), 10, 10
ENDSUB
```

Returns the name of the currently executing game loop sub.

See also: [POPLOOP] (#POPLOOP), [PUSHLOOP] (#PUSHLOOP), [RETURNTOLOOP] (#RETURNTOLOOP)
## RETURNTOLOOP
>`NATIVE FUNCTION RETURNTOLOOP: loop$`

Parameter | Description
-----------|-----------------------------------------------------------------------
`loop$`|Describes the name of the SUB which is jumped to

```
SUB GLB_ON_LOOP:
	PUSHLOOP "TEST_LOOP"
ENDSUB
SUB TEST_LOOP:
	PUSHLOOP "TEST_LOOP2"
ENDSUB
SUB TEST_LOOP2:
	RETURNTOLOOP "GLB_ON_LOOP"
ENDSUB
```

Returns to the first occurence of the loop sub on the stack with the given `name$` (skipping other loops if necessary)

See also: [POPLOOP] (#POPLOOP), [PUSHLOOP] (#PUSHLOOP), [RETURNTOLOOP] (#RETURNTOLOOP)
