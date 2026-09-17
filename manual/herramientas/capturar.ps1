# Toma una captura de la app para el manual y, con la misma receta, lista la posición de los
# elementos pedidos con marks: (en % de la imagen) para colocar las marcas numeradas.
# Requiere el servidor local de PCAPro en el puerto 8790 (servidor.ps1).
# Ejemplo:
#   powershell -File capturar.ps1 -Nombre app-inicio -Receta "lang:es;marks:#startBtn|#demoBtn"
param(
  [Parameter(Mandatory = $true)][string]$Nombre,
  [string]$Receta = '',
  [int]$Ancho = 1400,
  [int]$Alto = 860,
  [int]$Tiempo = 30000
)
$edge = 'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'
$img = Join-Path (Split-Path $PSScriptRoot -Parent) "img\$Nombre.png"
$receta = $Receta.Replace('#', '%23').Replace(' ', '%20')
$url = "http://localhost:8790/manual/herramientas/captura.html?w=$Ancho&h=$Alto&do=$receta"

& $edge --headless=new --disable-gpu --hide-scrollbars "--window-size=$Ancho,$Alto" --force-device-scale-factor=2 "--virtual-time-budget=$Tiempo" "--screenshot=$img" $url 2>$null | Out-Null
if (Test-Path $img) { Write-Output "captura: $img" } else { Write-Output "NO se generó la captura" }

if ($Receta -match 'marks:') {
  # la salida de --dump-dom solo se recoge bien pasando por un archivo
  $tmp = Join-Path $env:TEMP "pcapro_marcas_$Nombre.html"
  & $edge --headless=new --disable-gpu --hide-scrollbars "--window-size=$Ancho,$Alto" "--virtual-time-budget=$Tiempo" --dump-dom $url 2>$null | Out-File -FilePath $tmp -Encoding utf8
  # el comentario de captura.html también menciona <pre id="marcas">: se busca el elemento real
  $m = [regex]::Match((Get-Content $tmp -Raw), '</iframe>\s*<pre id="marcas">([\s\S]*?)</pre>')
  if ($m.Success) { Write-Output ([System.Net.WebUtility]::HtmlDecode($m.Groups[1].Value)) } else { Write-Output 'sin marcas' }
}
