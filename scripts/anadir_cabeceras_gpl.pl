use strict; use warnings; use utf8;
my $holder = shift or die "uso: perl cab.pl 'Nombre del titular'\n";
my $year = 2026;
for my $f (glob('js/*.js')) {
  open(my $h, '<:encoding(UTF-8)', $f) or die "$f: $!";
  my $s = do { local $/; <$h> }; close $h;
  next if $s =~ /GNU General Public License/;   # idempotente
  my $hdr = "/* PCAPro \x{2014} an\x{e1}lisis de componentes principales en el navegador.\n"
          . "   Copyright (C) $year  $holder\n\n"
          . "   This program is free software: you can redistribute it and/or modify it\n"
          . "   under the terms of the GNU General Public License as published by the Free\n"
          . "   Software Foundation, either version 3 of the License, or (at your option)\n"
          . "   any later version. This program is distributed WITHOUT ANY WARRANTY; see\n"
          . "   the GNU General Public License for more details. You should have received\n"
          . "   a copy of the License along with this program; if not, see\n"
          . "   <https://www.gnu.org/licenses/>. */\n\n";
  open(my $o, '>:encoding(UTF-8)', $f) or die $!;
  print $o $hdr . $s; close $o;
  print "  + $f\n";
}
