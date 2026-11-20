# Applique le design system Marly aux ecrans de apps/web/src :
# remplace les couleurs ecrites en dur par les jetons (bg-surface, text-muted...).
# -Simulation : affiche les fichiers concernes sans rien modifier.
param([switch]$Simulation)

$racine = (Resolve-Path (Join-Path $PSScriptRoot "..\apps\web\src")).Path
$utf8 = New-Object System.Text.UTF8Encoding $false

# 1. Remplacements qui dependent du contexte (expressions regulieres)
$expressions = @(
  # Bouton orange (renvoi, envoyer maintenant) : texte clair sur fond orange fonce
  @('bg-\[#7A4A00\]([^"`]*?)text-white', 'bg-warning-ink$1text-warning-bg'),
  # Bordures des champs, boutons secondaires et puces : trait plus visible
  @('(rounded-(?:xl|lg|full) border )border-marly-bord', '$1border-line-strong')
)

# 2. Remplacements simples, dans cet ordre
$correspondances = [ordered]@{
  'bg-[#FFF2DB]'      = 'bg-warning-bg'
  'bg-[#FFF8EC]'      = 'bg-warning-bg'
  'text-[#7A4A00]'    = 'text-warning-ink'
  'text-[#6E4300]'    = 'text-warning-ink'
  'text-[#8A5300]'    = 'text-warning-ink'
  'border-[#F0C97A]'  = 'border-warning-line'
  'border-[#7A4A00]'  = 'border-warning-ink'
  'bg-[#7A4A00]'      = 'bg-warning-ink'
  'border-[#F6F0E4]'  = 'border-line'
  'bg-[#E6EEF9]'      = 'bg-info-bg'
  'text-[#1D4F91]'    = 'text-info-ink'
  'bg-[#E3F5EC]'      = 'bg-success-bg'
  'text-[#11734B]'    = 'text-success-ink'
  'bg-[#FDECEC]'      = 'bg-danger-bg'
  'text-[#A12A2A]'    = 'text-danger-ink'
  'bg-[#EEF1F5]'      = 'bg-neutral-bg'
  'bg-[#E9EDF3]'      = 'bg-sunken'
  'bg-[#1FA855]'      = 'bg-whatsapp'
  'bg-marly-bleu'     = 'bg-action'
  'border-marly-bleu' = 'border-action'
  'text-marly-bleu'   = 'text-heading'
  'text-marly-texte'  = 'text-ink'
  'text-marly-gris'   = 'text-muted'
  'border-marly-bord' = 'border-line'
  'bg-marly-fond'     = 'bg-page'
  'bg-white'          = 'bg-surface'
  'stroke="#10294A"'  = 'stroke="currentColor"'
}

$fichiers = Get-ChildItem $racine -Recurse -File -Include *.tsx, *.ts
$modifies = 0
foreach ($fichier in $fichiers) {
  $avant = [System.IO.File]::ReadAllText($fichier.FullName, $utf8)
  $texte = $avant
  foreach ($e in $expressions) { $texte = [regex]::Replace($texte, $e[0], $e[1]) }
  foreach ($cle in $correspondances.Keys) { $texte = $texte.Replace($cle, $correspondances[$cle]) }
  if ($texte -ne $avant) {
    $modifies++
    if (-not $Simulation) { [System.IO.File]::WriteAllText($fichier.FullName, $texte, $utf8) }
    "modifie : " + $fichier.FullName.Substring($racine.Length + 1)
  }
}
""
"$modifies fichier(s) modifie(s)" + $(if ($Simulation) { " (simulation : rien n'a ete ecrit)" } else { "" })
""
"Couleurs encore ecrites en dur (a verifier) :"
$restes = $fichiers | Select-String -Pattern '#[0-9A-Fa-f]{6}|marly-(bleu|vert|texte|gris|bord|fond)'
if ($restes) {
  $restes | ForEach-Object { "  " + $_.Path.Substring($racine.Length + 1) + ":" + $_.LineNumber + "  " + $_.Line.Trim() }
} else {
  "  aucune"
}