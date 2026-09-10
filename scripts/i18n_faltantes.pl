use strict; use warnings; use utf8;
binmode(STDOUT, ':encoding(UTF-8)');

# Lista las cadenas en español que la aplicación pide traducir y que todavía
# no están en el diccionario de js/i18n.js. Fuentes:
#   - tt('...') y TT('...', ...) en los .js
#   - atributos data-i18n / data-i18n-ph / data-i18n-title en index.html
#   - contenido de los elementos con data-i18n-auto (con los espacios
#     colapsados, que es como los busca i18n.js)
# Uso: perl scripts/i18n_faltantes.pl [ficheros...]

local $/;

open(my $h, '<:encoding(UTF-8)', 'js/i18n.js') or die "js/i18n.js: $!";
my $dic = <$h>; close $h;

my %tiene;
# Las claves van tras '{' o tras ',': hay varias por línea, así que no vale
# anclar al principio de línea.
while ($dic =~ /(?:^|[,{])\s*'((?:[^'\\]|\\.)*)'\s*:/gm) {
  my $k = $1; $k =~ s/\\'/'/g; $k =~ s/\\\\/\\/g;
  $tiene{$k} = 1;
}
printf("diccionario: %d entradas\n", scalar keys %tiene);

my @files = @ARGV ? @ARGV : (glob('js/*.js'), 'index.html');
my (%falta, %donde);

for my $f (@files) {
  next if $f =~ /i18n\.js$/;
  open(my $g, '<:encoding(UTF-8)', $f) or next;
  my $s = <$g>; close $g;

  if ($f =~ /\.js$/) {
    while ($s =~ /\bt?[tT]\(\s*'((?:[^'\\]|\\.)*)'/g) {
      my $k = $1; $k =~ s/\\'/'/g;
      next unless $k =~ /\S/;
      next if $tiene{$k};
      # solo interesa lo que lleva letras; los símbolos sueltos no se traducen
      next unless $k =~ /\p{L}{2}/;
      $falta{$k} = 1; $donde{$k} = $f;
    }
  } else {
    while ($s =~ /data-i18n(?:-ph|-title)?="([^"]*)"/g) {
      my $k = $1;
      next unless $k =~ /\p{L}{2}/;
      next if $tiene{$k};
      $falta{$k} = 1; $donde{$k} = $f;
    }
    while ($s =~ /<([a-z0-9]+)([^>]*\bdata-i18n-auto\b[^>]*)>(.*?)<\/\1>/gs) {
      my $k = $3;
      $k =~ s/\s+/ /g; $k =~ s/^ //; $k =~ s/ $//;
      next unless $k =~ /\p{L}{2}/;
      next if $tiene{$k};
      $falta{$k} = 1; $donde{$k} = $f;
    }
  }
}

my @k = sort keys %falta;
printf("faltan: %d\n\n", scalar @k);
for my $k (@k) {
  printf("%-14s %s\n", $donde{$k}, $k);
}
