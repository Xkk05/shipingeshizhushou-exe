[Setup]
AppId={{A92AAE7C-5C73-44C0-B1A2-71B000014CDD}
AppName=视频格式助手
AppVersion=1.0.0
AppVerName=视频格式助手 1.0.0
AppPublisher=鲲穹AI
AppPublisherURL=https://www.kunqiu.ai/
AppSupportURL=https://www.kunqiu.ai/support/
AppUpdatesURL=https://www.kunqiu.ai/updates/
DefaultDirName={autopf}\视频格式助手
DefaultGroupName=视频格式助手
AllowNoIcons=yes
OutputDir=release
OutputBaseFilename=视频格式助手 InnoSetup 1.0.0
SetupIconFile=public\app.ico
Compression=lzma
SolidCompression=yes
WizardStyle=modern
PrivilegesRequired=lowest
ArchitecturesAllowed=x64
ArchitecturesInstallIn64BitMode=x64
UninstallDisplayIcon={app}\视频格式助手.ico
UninstallDisplayName=视频格式助手
VersionInfoVersion=1.0.0.0
VersionInfoCompany=鲲穹AI
VersionInfoDescription=专业的视频格式转换工具
VersionInfoCopyright=Copyright (C) 2024 鲲穹AI
VersionInfoProductName=视频格式助手
VersionInfoProductVersion=1.0.0
DisableProgramGroupPage=yes
DisableReadyPage=yes
WizardImageFile=
WizardSmallImageFile=
ShowLanguageDialog=no
; 静默安装支持
SilentInstall=yes
; 静默安装时自动创建桌面快捷方式
AlwaysCreateDesktopIcon=yes

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "创建桌面快捷方式"; GroupDescription: "附加图标:"; Flags: checkedonce
Name: "quicklaunchicon"; Description: "创建快速启动栏图标"; GroupDescription: "附加图标:"; Flags: unchecked; OnlyBelowVersion: 6.1
Name: "startmenu"; Description: "创建开始菜单项"; GroupDescription: "附加图标:"; Flags: checkedonce
Name: "associate"; Description: "关联常见视频文件格式"; GroupDescription: "文件关联:"; Flags: unchecked

[Files]
Source: "release\win-unpacked\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "public\app.ico"; DestDir: "{app}"; DestName: "app.ico"; Flags: ignoreversion
; NOTE: Don't use "Flags: ignoreversion" on any shared system files

[Icons]
Name: "{group}\视频格式助手"; Filename: "{app}\视频格式助手.exe"; IconFilename: "{app}\app.ico"; Tasks: startmenu
Name: "{group}\卸载视频格式助手"; Filename: "{uninstallexe}"; Tasks: startmenu
Name: "{autodesktop}\视频格式助手"; Filename: "{app}\视频格式助手.exe"; IconFilename: "{app}\app.ico"; Tasks: desktopicon
Name: "{userappdata}\Microsoft\Internet Explorer\Quick Launch\视频格式助手"; Filename: "{app}\视频格式助手.exe"; IconFilename: "{app}\app.ico"; Tasks: quicklaunchicon

[Run]
Filename: "{app}\视频格式助手.exe"; Description: "启动视频格式助手"; Flags: nowait postinstall skipifsilent

[UninstallDelete]
Type: filesandordirs; Name: "{app}"

[Registry]
Root: HKCR; Subkey: ".mp4"; ValueType: string; ValueName: ""; ValueData: "VideoFormatHelper"; Flags: uninsdeletevalue; Tasks: associate
Root: HKCR; Subkey: ".avi"; ValueType: string; ValueName: ""; ValueData: "VideoFormatHelper"; Flags: uninsdeletevalue; Tasks: associate
Root: HKCR; Subkey: ".mkv"; ValueType: string; ValueName: ""; ValueData: "VideoFormatHelper"; Flags: uninsdeletevalue; Tasks: associate
Root: HKCR; Subkey: ".mov"; ValueType: string; ValueName: ""; ValueData: "VideoFormatHelper"; Flags: uninsdeletevalue; Tasks: associate
Root: HKCR; Subkey: ".wmv"; ValueType: string; ValueName: ""; ValueData: "VideoFormatHelper"; Flags: uninsdeletevalue; Tasks: associate
Root: HKCR; Subkey: "VideoFormatHelper"; ValueType: string; ValueName: ""; ValueData: "视频格式助手文件"; Flags: uninsdeletekey; Tasks: associate
Root: HKCR; Subkey: "VideoFormatHelper\DefaultIcon"; ValueType: string; ValueName: ""; ValueData: "{app}\app.ico"; Tasks: associate
Root: HKCR; Subkey: "VideoFormatHelper\shell\open\command"; ValueType: string; ValueName: ""; ValueData: """{app}\视频格式助手.exe"" ""%1"""; Tasks: associate

[Code]
procedure InitializeWizard;
begin
  WizardForm.LicenseAcceptedRadio.Checked := True;
end;

procedure CurStepChanged(CurStep: TSetupStep);
begin
  if CurStep = ssPostInstall then
  begin
    // 静默安装时强制创建桌面快捷方式
    if WizardSilent then
    begin
      // 创建桌面快捷方式
      CreateShortCut(ExpandConstant('{autodesktop}\视频格式助手.lnk'), 
                     ExpandConstant('{app}\视频格式助手.exe'), 
                     '', 
                     ExpandConstant('{app}\app.ico'), 
                     0);
      
      // 创建开始菜单快捷方式
      CreateShortCut(ExpandConstant('{group}\视频格式助手.lnk'), 
                     ExpandConstant('{app}\视频格式助手.exe'), 
                     '', 
                     ExpandConstant('{app}\app.ico'), 
                     0);
    end;
  end;
end;

function InitializeSetup(): Boolean;
begin
  Result := True;
end;

// 静默安装时自动选择任务
function ShouldSkipPage(PageID: Integer): Boolean;
begin
  Result := False;
  if WizardSilent then
  begin
    case PageID of
      wpSelectTasks:
      begin
        // 静默安装时自动选择创建桌面快捷方式和开始菜单
        WizardForm.TasksList.Checked[0] := True; // desktopicon
        WizardForm.TasksList.Checked[2] := True; // startmenu
        Result := True;
      end;
    end;
  end;
end;
