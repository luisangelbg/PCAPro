# =====================================================================
#  PCAPro — Generador de los conjuntos de datos de practica del taller
#
#  Genera cinco archivos CSV con ESTRUCTURA CONOCIDA: el instructor sabe
#  de antemano cuantos componentes deben salir, que variables cargan en
#  cada uno y que anomalias estan sembradas a proposito. Asi el alumno
#  puede verificar que llego al resultado correcto.
#
#  Los datos son SIMULADOS. No representan mediciones reales y no deben
#  usarse para reportar resultados cientificos. Los rangos si estan
#  calibrados para ser fisicamente plausibles (no hay materia organica
#  negativa ni pendientes menores que cero).
#
#  Uso:  clic derecho > "Ejecutar con PowerShell"
#        (o:  powershell -ExecutionPolicy Bypass -File generar_datos.ps1)
#
#  La semilla esta fija: el archivo generado hoy es identico al que
#  genere cualquier otra persona. Para una variante distinta (otro grupo,
#  un examen) cambia la semilla:   .\generar_datos.ps1 -Semilla 777
#
#  NOTA DE POWERSHELL: los nombres de variable NO distinguen mayusculas,
#  por eso los arreglos de filas se llaman $filas1..$filas5 y no $f1..$f5
#  (chocarian con los factores latentes $F1..$F4). Y la funcion de formato
#  no puede llamarse 'R': es alias de Invoke-History.
# =====================================================================

param(
  [int]$Semilla = 20260905,
  [string]$Salida = (Join-Path $PSScriptRoot "datos")
)

if (-not (Test-Path $Salida)) { New-Item -ItemType Directory -Force $Salida | Out-Null }

$rng = [System.Random]::new($Semilla)

# --- normal estandar por Box-Muller ---
function Get-Normal {
  $u = 0.0; $v = 0.0
  while ($u -le 0) { $u = $rng.NextDouble() }
  while ($v -le 0) { $v = $rng.NextDouble() }
  return [Math]::Sqrt(-2.0 * [Math]::Log($u)) * [Math]::Cos(2.0 * [Math]::PI * $v)
}
function Fmt([double]$x, [int]$d) {
  return [Math]::Round($x, $d).ToString([System.Globalization.CultureInfo]::InvariantCulture)
}
# recorta a un rango fisicamente plausible sin deformar el centro de la distribucion
function Lim([double]$x, [double]$min, [double]$max) {
  if ($x -lt $min) { return $min }
  if ($x -gt $max) { return $max }
  return $x
}

function Save-Csv($nombre, $encabezado, $filas) {
  $ruta = Join-Path $Salida $nombre
  $sb = New-Object System.Text.StringBuilder
  [void]$sb.AppendLine(($encabezado -join ","))
  foreach ($f in $filas) { [void]$sb.AppendLine(($f -join ",")) }
  [System.IO.File]::WriteAllText($ruta, $sb.ToString(), (New-Object System.Text.UTF8Encoding $true))
  Write-Host ("  OK  {0,-36} {1,4} filas" -f $nombre, $filas.Count) -ForegroundColor Green
}

Write-Host ""
Write-Host "Generando conjuntos de practica (semilla $Semilla)..." -ForegroundColor Cyan
Write-Host ""

# =====================================================================
# PRACTICA 1 — SUELOS
#   n = 90 · 6 variables activas · 2 factores latentes · 3 sitios
#   F1 fertilidad quimica : MO, N_total, P_disponible
#   F2 textura fisica     : Arena (+), Arcilla (-), Densidad (+)
#   Esperado: 2 componentes, ~80 % de varianza, KMO aceptable, sin
#             anomalias. Es la practica "que sale bien".
# =====================================================================
$h1 = @("ID","Sitio","MO_pct","N_total_pct","P_disponible_ppm","Arena_pct","Arcilla_pct","Densidad_aparente_g_cm3")
$filas1 = @()
$sitios = @("Ladera alta","Ladera media","Vega")
for ($i = 0; $i -lt 90; $i++) {
  $g = [int][Math]::Floor($i / 30)
  $F1 = (Get-Normal) * 0.85 + ($g - 1) * 0.75     # fertilidad: sube hacia la vega
  $F2 = (Get-Normal) * 0.85 - ($g - 1) * 0.45     # textura: se hace mas fina

  $mo  = Lim (3.15 + 0.62 * $F1 + (Get-Normal) * 0.30)  0.6  6.5
  $n   = Lim (0.168 + 0.030 * $F1 + (Get-Normal) * 0.015) 0.04 0.32
  $p   = Lim (17.0 + 3.60 * $F1 + (Get-Normal) * 1.85)  2.0 34.0
  $are = Lim (44.0 + 8.50 * $F2 + (Get-Normal) * 4.20) 12.0 78.0
  $arc = Lim (27.0 - 6.80 * $F2 + (Get-Normal) * 3.40)  5.0 55.0
  $den = Lim (1.320 + 0.085 * $F2 + (Get-Normal) * 0.042) 1.02 1.68

  $filas1 += ,@(("S{0:d3}" -f ($i+1)), $sitios[$g],
                (Fmt $mo 2), (Fmt $n 3), (Fmt $p 1), (Fmt $are 1), (Fmt $arc 1), (Fmt $den 3))
}
Save-Csv "practica1_suelos.csv" $h1 $filas1

# =====================================================================
# PRACTICA 2 — SEMILLAS
#   n = 120 · 9 variables activas · 3 factores + tres trampas sembradas
#   F1 tamano      : Largo, Ancho, Peso   (+ Area, REDUNDANTE)
#   F2 dureza      : Grosor, Dureza
#   F3 composicion : Aceite, Proteina (-)
#   TRAMPAS:
#     a) Area_mm2 = pi/4 * Largo * Ancho  -> |r| > 0.95, determinante ~ 0
#     b) Humedad_pct es ruido puro        -> comunalidad y MSA bajos
#     c) 3 atipicos multivariantes: filas G017, G058 y G101
# =====================================================================
$h2 = @("ID","Especie","Largo_mm","Ancho_mm","Area_mm2","Peso_mg","Grosor_mm","Dureza_N","Aceite_pct","Proteina_pct","Humedad_pct")
$filas2 = @()
$esp = @("Silvestre","Cultivada")
for ($i = 0; $i -lt 120; $i++) {
  $g = [int][Math]::Floor($i / 60)
  $F1 = (Get-Normal) * 0.85 + ($g - 0.5) * 1.00
  $F2 = (Get-Normal) * 0.85 + ($g - 0.5) * 0.50
  $F3 = (Get-Normal) * 0.90

  $largo = Lim (8.40 + 0.92 * $F1 + (Get-Normal) * 0.42)  5.2 12.0
  $ancho = Lim (4.90 + 0.50 * $F1 + (Get-Normal) * 0.24)  3.2  7.0
  $peso  = Lim (41.0 + 6.80 * $F1 + (Get-Normal) * 3.20) 15.0 70.0
  $gros  = Lim (2.05 + 0.28 * $F2 + (Get-Normal) * 0.13)  1.2  3.1
  $dur   = Lim (18.6 + 3.10 * $F2 + (Get-Normal) * 1.45)  8.0 31.0
  $ace   = Lim (28.4 + 3.40 * $F3 + (Get-Normal) * 1.60) 17.0 40.0
  $pro   = Lim (21.7 - 2.50 * $F3 + (Get-Normal) * 1.20) 12.0 32.0
  $hum   = Lim (9.60 + (Get-Normal) * 1.15) 6.0 13.5      # ruido puro, sin factor

  # atipicos: combinaciones raras de valores posibles, no valores imposibles
  if ($i -eq 16)  { $largo = 11.6; $ancho = 3.45; $dur = 29.5 }   # larga y angosta, muy dura
  if ($i -eq 57)  { $ace   = 39.5; $pro   = 30.8 }                # alta en aceite Y en proteina
  if ($i -eq 100) { $peso  = 17.5; $gros  = 3.05 }                # muy ligera pero muy gruesa

  $area = [Math]::PI / 4.0 * $largo * $ancho                      # redundante a proposito

  $filas2 += ,@(("G{0:d3}" -f ($i+1)), $esp[$g],
                (Fmt $largo 2), (Fmt $ancho 2), (Fmt $area 2), (Fmt $peso 1),
                (Fmt $gros 2), (Fmt $dur 1), (Fmt $ace 1), (Fmt $pro 1), (Fmt $hum 2))
}
Save-Csv "practica2_semillas.csv" $h2 $filas2

# =====================================================================
# PRACTICA 3 — ESCALAS DISPARES
#   n = 100 · 7 variables en unidades muy distintas · 2 factores
#   Se corre DOS VECES: sin escalar y con estandarizacion z.
#   Sin escalar, Volumen_mm3 (DE ~ 55 000) acapara el CP1 solo por su
#   unidad de medida. Con z aparecen los dos factores reales.
#   F1 tamano  : Altura, Peso, Volumen
#   F2 quimica : Conductividad, pH (-), Clorofila
#   Densidad es practicamente independiente de ambos.
# =====================================================================
$h3 = @("ID","Parcela","Altura_cm","Peso_kg","Volumen_mm3","Conductividad_uS_cm","pH","Clorofila_SPAD","Densidad_g_cm3")
$filas3 = @()
for ($i = 0; $i -lt 100; $i++) {
  $par = "P" + [string](1 + ($i % 4))
  $F1 = (Get-Normal) * 0.90
  $F2 = (Get-Normal) * 0.90

  $alt = Lim (152.0 + 18.5 * $F1 + (Get-Normal) * 8.0)   95.0 215.0
  $pes = Lim (61.0 + 8.60 * $F1 + (Get-Normal) * 3.9)    34.0  92.0
  $vol = Lim (248000.0 + 54000.0 * $F1 + (Get-Normal) * 23000.0) 90000.0 430000.0
  $con = Lim (1180.0 + 262.0 * $F2 + (Get-Normal) * 112.0) 480.0 1980.0
  $ph  = Lim (6.55 - 0.34 * $F2 + (Get-Normal) * 0.145)   5.30  7.90
  $clo = Lim (39.8 + 4.35 * $F2 + (Get-Normal) * 1.90)   24.0  56.0
  $den = Lim (0.812 + (Get-Normal) * 0.049) 0.66 0.97

  $filas3 += ,@(("E{0:d3}" -f ($i+1)), $par,
                (Fmt $alt 1), (Fmt $pes 2), (Fmt $vol 0), (Fmt $con 1), (Fmt $ph 2), (Fmt $clo 1), (Fmt $den 3))
}
Save-Csv "practica3_escalas.csv" $h3 $filas3

# =====================================================================
# PRACTICA 4 — SIN ESTRUCTURA
#   n = 80 · 6 variables INDEPENDIENTES entre si
#   No hay factores latentes. Es la practica del "no": KMO bajo y ningun
#   componente retenible por analisis paralelo. Ensena que a veces la
#   respuesta correcta es NO hacer ACP.
# =====================================================================
$h4 = @("ID","Lote","Temperatura_C","Precipitacion_mm","Altitud_m","Pendiente_grados","Pedregosidad_pct","Profundidad_cm")
$filas4 = @()
for ($i = 0; $i -lt 80; $i++) {
  $lote = "L" + [string](1 + ($i % 2))
  $filas4 += ,@(("N{0:d3}" -f ($i+1)), $lote,
                (Fmt (Lim (18.5 + (Get-Normal) * 2.9)   11.0  26.0) 1),
                (Fmt (Lim (740.0 + (Get-Normal) * 105.0) 450.0 1050.0) 1),
                (Fmt (Lim (1850.0 + (Get-Normal) * 220.0) 1200.0 2500.0) 0),
                (Fmt (Lim (14.0 + (Get-Normal) * 3.0)     3.0  26.0) 1),
                (Fmt (Lim (24.0 + (Get-Normal) * 5.5)     6.0  45.0) 1),
                (Fmt (Lim (52.0 + (Get-Normal) * 8.0)    26.0  80.0) 1))
}
Save-Csv "practica4_sin_estructura.csv" $h4 $filas4

# =====================================================================
# PROYECTO INTEGRADOR — AGRONOMIA
#   n = 150 · 12 variables activas · 4 factores · 2 variables de grupo
#   1 cuantitativa suplementaria (Rendimiento) · 6 celdas faltantes
#   F1 vigor vegetativo : Altura, Biomasa, Area_foliar, Diametro_tallo
#   F2 estado hidrico   : Conductancia, Potencial_hidrico (+), Temp_hoja (-)
#   F3 nutricion        : N_foliar, Clorofila, P_foliar
#   F4 fenologia        : Dias_floracion, Dias_madurez
#   Rendimiento depende de F1 y F3 (no de F4): proyectado como
#   suplementario debe caer entre esos dos ejes.
#   Tratamiento (4 niveles) desplaza F1, F2 y F3; Bloque (3) casi no.
# =====================================================================
$h5 = @("Parcela","Tratamiento","Bloque","Altura_cm","Biomasa_g","Area_foliar_cm2","Diametro_tallo_mm",
        "Conductancia_mmol","Potencial_hidrico_MPa","Temp_hoja_C","N_foliar_pct","Clorofila_SPAD",
        "P_foliar_pct","Dias_floracion","Dias_madurez","Rendimiento_kg_ha")
$filas5 = @()
$trat = @("Testigo","Riego","Fertilizacion","Riego+Fert")
for ($i = 0; $i -lt 150; $i++) {
  $ti = $i % 4
  $bi = [int][Math]::Floor($i / 50)
  $riego = 0.0; $fert = 0.0
  if ($ti -eq 1 -or $ti -eq 3) { $riego = 1.0 }
  if ($ti -eq 2 -or $ti -eq 3) { $fert = 1.0 }

  $F1 = (Get-Normal) * 0.82 + 0.50 * $riego + 0.55 * $fert + 0.10 * ($bi - 1)
  $F2 = (Get-Normal) * 0.82 + 0.95 * $riego
  $F3 = (Get-Normal) * 0.82 + 0.90 * $fert
  $F4 = (Get-Normal) * 0.90

  $alt = Lim (96.0 + 12.5 * $F1 + (Get-Normal) * 5.4)     58.0 145.0
  $bio = Lim (318.0 + 52.0 * $F1 + (Get-Normal) * 23.0)  150.0 520.0
  $afo = Lim (2140.0 + 345.0 * $F1 + (Get-Normal) * 155.0) 1100.0 3400.0
  $dia = Lim (12.60 + 1.55 * $F1 + (Get-Normal) * 0.70)    8.0  18.5
  $con = Lim (246.0 + 41.0 * $F2 + (Get-Normal) * 18.0)  120.0 400.0
  $pot = Lim (-1.55 + 0.28 * $F2 + (Get-Normal) * 0.115) -2.45 -0.55   # siempre negativo
  $tem = Lim (28.40 - 1.70 * $F2 + (Get-Normal) * 0.78)  22.5  34.5
  $nfo = Lim (3.050 + 0.380 * $F3 + (Get-Normal) * 0.170) 1.80  4.60
  $clo = Lim (41.20 + 4.40 * $F3 + (Get-Normal) * 1.95)  25.0  58.0
  $pfo = Lim (0.2980 + 0.0350 * $F3 + (Get-Normal) * 0.0160) 0.170 0.440
  $dfl = Lim (68.0 + 4.80 * $F4 + (Get-Normal) * 2.10)    52.0  85.0
  $dma = Lim (124.0 + 7.00 * $F4 + (Get-Normal) * 3.00)  100.0 150.0
  # el rendimiento responde al vigor y a la nutricion, no a la fenologia
  $ren = Lim (4820.0 + 560.0 * $F1 + 380.0 * $F3 + (Get-Normal) * 240.0) 2800.0 7200.0

  $fila = @(("PAR{0:d3}" -f ($i+1)), $trat[$ti], ("B" + [string]($bi+1)),
            (Fmt $alt 1), (Fmt $bio 1), (Fmt $afo 1), (Fmt $dia 2), (Fmt $con 1), (Fmt $pot 3), (Fmt $tem 2),
            (Fmt $nfo 3), (Fmt $clo 1), (Fmt $pfo 4), (Fmt $dfl 1), (Fmt $dma 1), (Fmt $ren 1))

  # 6 celdas faltantes repartidas
  if ($i -eq 22)  { $fila[7]  = "" }
  if ($i -eq 45)  { $fila[11] = "NA" }
  if ($i -eq 61)  { $fila[4]  = "" }
  if ($i -eq 88)  { $fila[9]  = "NA" }
  if ($i -eq 103) { $fila[12] = "" }
  if ($i -eq 130) { $fila[6]  = "" }

  $filas5 += ,$fila
}
Save-Csv "proyecto_integrador_agronomia.csv" $h5 $filas5

Write-Host ""
Write-Host "Listo. Archivos en: $Salida" -ForegroundColor Cyan
Write-Host "La estructura sembrada esta documentada en CLAVES_instructor.md" -ForegroundColor DarkGray
Write-Host ""
