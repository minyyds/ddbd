!macro customInstall
  WriteRegStr HKCU "Software\Classes\myapp" "" "URL:myapp Protocol"
  WriteRegStr HKCU "Software\Classes\myapp" "URL Protocol" ""
  WriteRegStr HKCU "Software\Classes\myapp\shell\open\command" "" '"$INSTDIR\ddbd.exe" "%1"'
!macroend

!macro customUninstall
  DeleteRegKey HKCU "Software\Classes\myapp"
!macroend