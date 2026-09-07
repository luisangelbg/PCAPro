#!/usr/bin/perl
# Antepone el aviso de licencia GPL a cada fichero de js/.
#
# La GPL recomienda que cada fichero fuente lleve su propio aviso, para que
# siga siendo identificable si alguien lo copia suelto.
#
# Es idempotente: si el fichero ya menciona la licencia, lo deja como esta.
# Se puede correr las veces que haga falta.
#
#   perl scripts/anadir_cabeceras_gpl.pl
#   perl scripts/anadir_cabeceras_gpl.pl "Otro Titular"   # para reutilizarlo
#
# El titular va con escapes \x{} a proposito: pasar acentos por la linea de
# comandos depende de la codificacion del terminal y se corrompe con
# facilidad, sobre todo en Windows.

use strict;
use warnings;
use utf8;

my $holder = shift // "Luis \x{c1}ngel Barrera-Guzm\x{e1}n";
my $year   = 2026;

my @touched;
my @skipped;

for my $f (glob('js/*.js')) {
  open(my $h, '<:encoding(UTF-8)', $f) or die "$f: $!";
  my $s = do { local $/; <$h> };
  close $h;

  if ($s =~ /GNU General Public License/) { push @skipped, $f; next; }

  my $hdr = "/* PCAPro \x{2014} an\x{e1}lisis de componentes principales en el navegador.\n"
          . "   Copyright (C) $year  $holder\n\n"
          . "   This program is free software: you can redistribute it and/or modify it\n"
          . "   under the terms of the GNU General Public License as published by the Free\n"
          . "   Software Foundation, either version 3 of the License, or (at your option)\n"
          . "   any later version. This program is distributed WITHOUT ANY WARRANTY; see\n"
          . "   the GNU General Public License for more details. You should have received\n"
          . "   a copy of the License along with this program; if not, see\n"
          . "   <https://www.gnu.org/licenses/>. */\n\n";

  open(my $o, '>:encoding(UTF-8)', $f) or die "$f: $!";
  print $o $hdr . $s;
  close $o;
  push @touched, $f;
}

binmode(STDOUT, ':encoding(UTF-8)');
print "Titular: $holder\n";
print "Con cabecera nueva: ", scalar(@touched), "\n";
print "  + $_\n" for @touched;
print "Ya la tenian: ", scalar(@skipped), "\n" if @skipped;
