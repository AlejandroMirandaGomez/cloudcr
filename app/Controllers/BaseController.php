<?php

declare(strict_types=1);

namespace CloudCR\Controllers;

use CloudCR\Core\Request;

abstract class BaseController
{
    /** @return array{limit:int,offset:int} */
    protected function paginacionDesde(Request $r): array
    {
        $limit  = (int) ($r->query('limit') ?? 50);
        $offset = (int) ($r->query('offset') ?? 0);

        return [
            'limit'  => max(1, min($limit, 200)),
            'offset' => max(0, $offset),
        ];
    }
}