# Р“РµРЅРµСЂСѓС” apple-touch-startup-image: С„РѕРЅ #050507 С– Р»РѕРіРѕС‚РёРї Сѓ С‚РѕРјСѓ Р¶ РјС–СЃС†С–/СЂРѕР·РјС–СЂС–, С‰Рѕ Р№ РїРѕС‡Р°С‚РєРѕРІРёР№ РєР°РґСЂ РµРєСЂР°РЅР° Р·Р°РІР°РЅС‚Р°Р¶РµРЅРЅСЏ
# (С†РµРЅС‚СЂ 50% Г— 46%, СЂРѕР·РјС–СЂ 116 pt Г— BOOT_START). Р—Р°РїСѓСЃРє: powershell -File tools/make-splash.ps1
Add-Type -AssemblyName System.Drawing
$root = Split-Path -Parent $PSScriptRoot
$logo = [System.Drawing.Image]::FromFile((Join-Path $root 'src\logo-256.jpg'))
$startScale = 2.4   # РјР°С” Р·Р±С–РіР°С‚РёСЃСЏ Р· --bs Сѓ src/style.css
$devs = @(@(440,956,3),@(430,932,3),@(420,912,3),@(402,874,3),@(393,852,3),@(390,844,3),@(428,926,3),@(375,812,3))
foreach ($d in $devs) {
  $w = $d[0]*$d[2]; $h = $d[1]*$d[2]
  $bmp = New-Object System.Drawing.Bitmap $w, $h
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = 'AntiAlias'; $g.InterpolationMode = 'HighQualityBicubic'; $g.PixelOffsetMode = 'HighQuality'
  $g.Clear([System.Drawing.Color]::FromArgb(255,5,5,7))
  $size = 116 * $startScale * $d[2]
  $x = $w/2 - $size/2; $y = $h*0.46 - $size/2; $r = $size*26/116
  $path = New-Object System.Drawing.Drawing2D.GraphicsPath
  $path.AddArc($x,$y,2*$r,2*$r,180,90); $path.AddArc($x+$size-2*$r,$y,2*$r,2*$r,270,90)
  $path.AddArc($x+$size-2*$r,$y+$size-2*$r,2*$r,2*$r,0,90); $path.AddArc($x,$y+$size-2*$r,2*$r,2*$r,90,90); $path.CloseFigure()
  $g.SetClip($path)
  $g.DrawImage($logo, [float]$x, [float]$y, [float]$size, [float]$size)
  $g.Dispose()
  $out = Join-Path $root ("docs\assets\splash\s-{0}x{1}.jpg" -f $w,$h)
  $enc=[System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders()|Where-Object{$_.MimeType -eq 'image/jpeg'}; $ep=New-Object System.Drawing.Imaging.EncoderParameters 1; $ep.Param[0]=New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality,[long]90); $bmp.Save($out,$enc,$ep); $bmp.Dispose()
  Write-Host $out
}
$logo.Dispose()

