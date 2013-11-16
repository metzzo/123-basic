cd ../../Tests
set SAVE=%CD%
set IGNORE=ftp.txt 
for /D %%i in (./*) do (
	cd %%i
	cd "%%i.app"
	echo open SERVER>ftp.txt
	echo USERNAME>>ftp.txt
	echo PASSWORD>>ftp.txt
	echo binary>>ftp.txt
	echo cd /public_html/>>ftp.txt
	echo mkdir newdemos/>>ftp.txt
	echo cd newdemos/>>ftp.txt
	echo mkdir %%i>>ftp.txt
	echo cd %%i>>ftp.txt
	setlocal disableDelayedExpansion
	for /f "delims=" %%A in ('forfiles /s /m * /c "cmd /c echo @relpath"') do (
		set "file=%%~A"
		setlocal enableDelayedExpansion
		set k=!file:~2!
		set relpath=!k:\=/! 
		if not !file:~2!==%IGNORE% (
			if exist !file:~2!/nul (
				echo mkdir !relpath!/>>ftp.txt
			) else (
				echo put !relpath! !relpath!>>ftp.txt
			)
		)
		endlocal
	)
	echo disconnect>>ftp.txt
	echo bye>>ftp.txt
	ftp -s:ftp.txt
	del ftp.txt
	cd %SAVE%
)


