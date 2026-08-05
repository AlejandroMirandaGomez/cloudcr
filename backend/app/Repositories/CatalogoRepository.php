<?php

declare(strict_types=1);

namespace CloudCR\Repositories;

final class CatalogoRepository extends BaseRepository
{
    private const TABLAS = [
        'normas'             => 'Normas',
        'dominios_norma'     => 'Dominios_Norma',
        'tipos'              => 'Tipos_Control',
        'conceptos'          => 'Conceptos_Ciberseguridad',
        'dominios_seguridad' => 'Dominios_Seguridad',
        'capacidades'        => 'Capacidades_Operativas',
    ];

    public function todos(): array
    {
        $catalogos = [];

        foreach (self::TABLAS as $clave => $tabla) {
            $catalogos[$clave] = $this->listar($tabla);
        }

        return $catalogos;
    }

    private function listar(string $tabla): array
    {
        $esDominioNorma = $tabla === 'Dominios_Norma';
        $columnas       = $esDominioNorma ? 'id, clausula, nombre' : 'id, nombre';
        $orden          = $esDominioNorma ? 'clausula' : 'id';

        return array_map(
            static function (array $f): array {
                $f['id'] = (int) $f['id'];
                if (isset($f['clausula'])) {
                    $f['clausula'] = (int) $f['clausula'];
                }
                return $f;
            },
            $this->run("SELECT $columnas FROM $tabla ORDER BY $orden")->fetchAll()
        );
    }
}
