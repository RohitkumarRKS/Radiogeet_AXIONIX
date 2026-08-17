[Setup]
; App Metadata
AppName=Radiogeet AXIONIX
AppVersion=1.0.0
AppPublisher=Radiogeet Digital Pvt. Ltd.
AppPublisherURL=https://radiogeet.com/
AppSupportURL=https://radiogeet.com/
AppUpdatesURL=https://radiogeet.com/

; Compiler Settings
DefaultDirName={localappdata}\RadiogeetAXIONIX
DefaultGroupName=Radiogeet AXIONIX
DisableProgramGroupPage=yes
OutputDir=installer_output
OutputBaseFilename=RadiogeetAXIONIX_Setup_v1.0.0
Compression=lzma
SolidCompression=yes
WizardStyle=modern

; Icon Settings
SetupIconFile=static\images\icon2.ico
UninstallDisplayIcon={app}\RadiogeetAXIONIX.exe

; Required Privileges
; "lowest" allows installation without UAC admin prompt (since we install to AppData)
PrivilegesRequired=lowest

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked

[Files]
Source: "dist\RadiogeetAXIONIX\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs
; Add any extra files needed next to the exe here, if any.
; PyInstaller bundle is self-contained so we only need the exe.

[Icons]
Name: "{group}\Radiogeet AXIONIX"; Filename: "{app}\RadiogeetAXIONIX.exe"
Name: "{group}\{cm:UninstallProgram,Radiogeet AXIONIX}"; Filename: "{uninstallexe}"
Name: "{autodesktop}\Radiogeet AXIONIX"; Filename: "{app}\RadiogeetAXIONIX.exe"; Tasks: desktopicon

[UninstallDelete]
Type: filesandordirs; Name: "{commonappdata}\RadiogeetAxionix"
Type: filesandordirs; Name: "{localappdata}\RadiogeetAxionix"
Type: filesandordirs; Name: "{%USERPROFILE}\.radiogeet_axionix"

[Run]
Filename: "{app}\RadiogeetAXIONIX.exe"; Description: "{cm:LaunchProgram,Radiogeet AXIONIX}"; Flags: nowait postinstall skipifsilent
